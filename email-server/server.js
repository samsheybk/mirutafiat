require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ImapFlow } = require('imapflow');
const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const multer = require('multer');
const webpush = require('web-push');

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const PUSH_STATE_FILE = path.join(DATA_DIR, 'push-state.json');
const TOKEN = process.env.MAIL_API_TOKEN || '';
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean) : [];
const TLS_REJECT_UNAUTHORIZED = String(process.env.TLS_REJECT_UNAUTHORIZED || '1') !== '0';
const ACCOUNTS_ENC_KEY = process.env.ACCOUNTS_ENC_KEY || '';

/* ---------- Web Push (notificaciones) ---------- */
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@fiat-ve.com';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
function sendPush(subscription, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Promise.reject(new Error('VAPID no configurado en el email-server/.env'));
  }
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

/* ---------- Aviso push de nuevos correos ----------
   Cada MAIL_POLL_SECONDS se revisa el INBOX de las cuentas con dueño
   (owner) y, si hay mensajes nuevos, se notifica a las suscripciones
   push registradas con el correo del dueño en Supabase. */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || '';
const POLL_SECONDS = Math.max(parseInt(process.env.MAIL_POLL_SECONDS || '60', 10), 15);

if (!TOKEN && !SUPABASE_URL) {
  console.error('FATAL: configura MAIL_API_TOKEN o SUPABASE_URL para autenticar la API del correo.');
  process.exit(1);
}

let pushState = loadJson(PUSH_STATE_FILE, { watermark: {} });
function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return fallback; }
}
function savePushState() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PUSH_STATE_FILE, JSON.stringify(pushState, null, 2));
  } catch (e) {}
}

async function subscriptionsForEmail(email) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !email) return [];
  const qs = 'select=endpoint,keys_auth,keys_p256dh&trabajador_email=eq.' + encodeURIComponent(email);
  const res = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?' + qs, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SERVICE_ROLE_KEY }
  });
  if (!res.ok) throw new Error('Supabase push_subscriptions: HTTP ' + res.status);
  const rows = await res.json();
  return (rows || []).map(r => ({
    endpoint: r.endpoint,
    keys: { auth: r.keys_auth || '', p256dh: r.keys_p256dh || '' }
  }));
}

async function notifyNewMail(acc, count, first) {
  if (!acc.owner) return;
  const subs = await subscriptionsForEmail(acc.owner);
  if (!subs.length) return;
  const title = count > 1 ? count + ' nuevos correos' : 'Nuevo correo';
  const from = (first && first.from) || acc.user || '';
  const subject = (first && first.subject) || '';
  const body = count > 1
    ? 'En tu bandeja de ' + (acc.name || acc.user)
    : 'De ' + from + (subject ? ': ' + subject : '');
  const payload = { title, body, url: '/modules/chatfiat.html', icon: '/icons/icon-192.png' };
  for (const sub of subs) {
    try { await sendPush(sub, payload); }
    catch (e) { console.error('[push] envío fallido (' + acc.user + '): ' + (e.message || e)); }
  }
}

async function pollNewMail() {
  const accounts = loadAccounts().filter(a => a.owner && a.user);
  for (const acc of accounts) {
    try {
      const imap = imapClient(acc);
      await imap.connect();
      try {
        const lock = await imap.getMailboxLock('INBOX');
        try {
          const uids = (await imap.search({ all: true }, { uid: true })).sort((a, b) => a - b);
          if (!uids.length) continue;
          const key = String(acc.id);
          const known = Object.prototype.hasOwnProperty.call(pushState.watermark, key);
          const last = pushState.watermark[key] || 0;
          const newUids = uids.filter(u => u > last);
          if (known && newUids.length) {
            const recent = uids.slice(-20);
            let first = null;
            for await (const msg of imap.fetch(recent.join(','), { uid: true, envelope: true })) {
              if (msg.uid > last) {
                const env = msg.envelope || {};
                const from = (env.from || [])[0];
                first = {
                  from: from ? ((from.name && from.name.trim()) || from.address || '') : '',
                  subject: env.subject || ''
                };
                break;
              }
            }
            await notifyNewMail(acc, newUids.length, first);
          }
          pushState.watermark[key] = uids[uids.length - 1];
          savePushState();
        } finally { lock.release(); }
      } finally { await imap.logout().catch(() => {}); }
    } catch (e) {
      console.error('[push] ' + (acc.user || acc.id) + ': ' + (e.message || e));
    }
  }
}
setTimeout(pollNewMail, 5000);
setInterval(pollNewMail, POLL_SECONDS * 1000);

const app = express();
app.use(cors({ origin: CORS_ORIGIN.length ? CORS_ORIGIN : false }));
app.use(express.json({ limit: '2mb' }));

/* ---------- Almacenamiento de cuentas (archivo local JSON) ---------- */
function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); }
  catch (e) { return []; }
}
function saveAccounts(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2));
}
function findAccount(id) {
  return loadAccounts().find(a => String(a.id) === String(id));
}
function newId() { return crypto.randomBytes(6).toString('hex'); }
function sanitize(a) { const { pass, ...rest } = a; return rest; }

/* Credenciales en reposo: se cifran con AES-256-GCM si ACCOUNTS_ENC_KEY está
   definida. Las claves viejas en texto plano se siguen leyendo (migración). */
function encryptPass(p) {
  if (!ACCOUNTS_ENC_KEY || !p) return p;
  try {
    const key = crypto.scryptSync(ACCOUNTS_ENC_KEY, 'fiat-mail', 32);
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([c.update(String(p), 'utf8'), c.final()]);
    return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: enc.toString('base64') };
  } catch (e) {
    return p;
  }
}
function decryptPass(e) {
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e !== 'object' || !e.iv || !e.tag || !e.data || !ACCOUNTS_ENC_KEY) return '';
  try {
    const key = crypto.scryptSync(ACCOUNTS_ENC_KEY, 'fiat-mail', 32);
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(e.iv, 'base64'));
    d.setAuthTag(Buffer.from(e.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(e.data, 'base64')), d.final()]).toString('utf8');
  } catch (err) {
    return '';
  }
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Agrega la firma de la cuenta al final del texto y del HTML */
function applySignature(acc, text, html) {
  const sig = String(acc.signature || '').trim();
  if (!sig) return { text: text || '', html: html || '' };
  const textSig = '\n\n--\n' + sig;
  const htmlSig = '<br><br>--<br>' + escHtml(sig).replace(/\n/g, '<br>');
  const t = (text || '') + textSig;
  if (html) return { text: t, html: html + htmlSig };
  const h = '<div style="font-family:inherit;font-size:14px;line-height:1.6;white-space:pre-wrap;">' +
    escHtml(text || '').replace(/\n/g, '<br>') + htmlSig + '</div>';
  return { text: t, html: h };
}

/* ---------- Autenticación de la API ----------
   Acepta dos formas:
   - "Authorization: Bearer <MAIL_API_TOKEN>"  (token de operación/ops)
   - "Authorization: Bearer <access_token de Supabase>"
     validado contra {SUPABASE_URL}/auth/v1/user, así el webmail se
     autentica con la sesión del usuario y no se confía en x-owner-email.
   Sin token válido: 401. */
async function verifySupabaseToken(token) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !token) return null;
  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: 'Bearer ' + token }
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.email ? String(user.email).toLowerCase() : null;
  } catch (e) {
    return null;
  }
}
async function requireAuth(req, res, next) {
  const h = String(req.headers.authorization || '');
  if (TOKEN && h === 'Bearer ' + TOKEN) { req.trusted = true; return next(); }
  if (h.indexOf('Bearer ') === 0) {
    const email = await verifySupabaseToken(h.slice(7));
    if (email) { req.verifiedEmail = email; return next(); }
  }
  return res.status(401).json({ error: 'No autorizado' });
}
app.use('/api', requireAuth);

/* ---------- Utilidades IMAP/SMTP ---------- */
function imapClient(acc) {
  return new ImapFlow({
    host: acc.imapHost,
    port: parseInt(acc.imapPort, 10) || 993,
    secure: acc.imapSecure !== false,
    auth: { user: acc.user, pass: decryptPass(acc.pass) },
    logger: false,
    tls: { rejectUnauthorized: TLS_REJECT_UNAUTHORIZED }
  });
}
function smtpTransport(acc) {
  return nodemailer.createTransport({
    host: acc.smtpHost || acc.imapHost,
    port: parseInt(acc.smtpPort, 10) || 465,
    secure: acc.smtpSecure !== false,
    auth: { user: acc.user, pass: decryptPass(acc.pass) },
    tls: { rejectUnauthorized: TLS_REJECT_UNAUTHORIZED }
  });
}
function parseAddress(addr) {
  if (!addr) return '';
  if (Array.isArray(addr)) return addr.map(parseAddress).join(', ');
  if (addr.value && addr.value[0]) return `${addr.value[0].address}`;
  if (addr.text) return addr.text;
  if (addr.address) return addr.address;
  return String(addr || '');
}
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(err => {
    if (res.headersSent) return next(err);
    console.error('[api]', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

/* ---------- Multer para adjuntos al redactar ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

/* ---------- Endpoints ---------- */

app.get('/api/status', (req, res) => {
  res.json({ ok: true, accounts: loadAccounts().length, time: new Date().toISOString() });
});

/* Cuentas. Una cuenta puede ser:
   - Privada: tiene `owner` (correo del trabajador); solo su dueño la ve/edita/elimina.
   - Compartida: sin `owner`; visible para todos y editable por cualquiera (intranet interna).
   El dueño se identifica con la cabecera x-owner-email enviada por el frontend. */
function ownerEmailOf(req) {
  if (req.verifiedEmail) return req.verifiedEmail;
  return String(req.get('x-owner-email') || '').trim().toLowerCase();
}
function canManage(account, ownerEmail) {
  const o = String(account.owner || '').toLowerCase();
  return !o || (ownerEmail && o === ownerEmail);
}

app.get('/api/accounts', (req, res) => {
  const ownerEmail = ownerEmailOf(req);
  const list = loadAccounts().filter(a =>
    ownerEmail
      ? (!a.owner || String(a.owner).toLowerCase() === ownerEmail)
      : !a.owner
  );
  res.json(list.map(sanitize));
});

app.post('/api/accounts', (req, res) => {
  const a = req.body || {};
  if (!a.user || !a.pass || !a.imapHost) {
    return res.status(400).json({ error: 'user, pass e imapHost son obligatorios' });
  }
  const acc = {
    id: newId(),
    name: a.name || a.user,
    imapHost: a.imapHost,
    imapPort: parseInt(a.imapPort, 10) || 993,
    imapSecure: a.imapSecure !== false,
    smtpHost: a.smtpHost || a.imapHost,
    smtpPort: parseInt(a.smtpPort, 10) || 465,
    smtpSecure: a.smtpSecure !== false,
    user: a.user,
    pass: encryptPass(a.pass),
    fromName: a.fromName || '',
    signature: a.signature || '',
    owner: a.shared ? '' : ownerEmailOf(req)
  };
  const list = loadAccounts();
  list.push(acc);
  saveAccounts(list);
  res.json(sanitize(acc));
});

app.put('/api/accounts/:id', (req, res) => {
  const list = loadAccounts();
  const i = list.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const a = req.body || {};
  const old = list[i];
  const ownerEmail = ownerEmailOf(req);
  if (!canManage(old, ownerEmail)) return res.status(403).json({ error: 'Solo el dueño de la cuenta puede modificarla' });
  const acc = {
    id: old.id,
    name: a.name || old.name,
    imapHost: a.imapHost || old.imapHost,
    imapPort: parseInt(a.imapPort, 10) || old.imapPort || 993,
    imapSecure: a.imapSecure !== undefined ? a.imapSecure : old.imapSecure,
    smtpHost: a.smtpHost || old.smtpHost || old.imapHost,
    smtpPort: parseInt(a.smtpPort, 10) || old.smtpPort || 465,
    smtpSecure: a.smtpSecure !== undefined ? a.smtpSecure : old.smtpSecure,
    user: a.user || old.user,
    pass: a.pass ? encryptPass(a.pass) : old.pass,
    fromName: a.fromName !== undefined ? a.fromName : old.fromName,
    signature: a.signature !== undefined ? a.signature : old.signature,
    owner: a.shared !== undefined ? (a.shared ? '' : ownerEmail) : old.owner
  };
  list[i] = acc;
  saveAccounts(list);
  res.json(sanitize(acc));
});

app.delete('/api/accounts/:id', (req, res) => {
  const list = loadAccounts();
  const i = list.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (!canManage(list[i], ownerEmailOf(req))) return res.status(403).json({ error: 'Solo el dueño de la cuenta puede eliminarla' });
  list.splice(i, 1);
  saveAccounts(list);
  res.json({ ok: true });
});

app.post('/api/accounts/:id/test', asyncHandler(async (req, res) => {
  const acc = findAccount(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const imap = imapClient(acc);
  await imap.connect();
  const info = await imap.list();
  await imap.logout();
  res.json({ ok: true, mailboxes: info.map(m => m.path) });
}));

/* Bandejas */
app.get('/api/mailboxes', asyncHandler(async (req, res) => {
  const acc = findAccount(req.query.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const imap = imapClient(acc);
  await imap.connect();
  try {
    const list = await imap.list();
    const out = [];
    for (const m of list) {
      let unseen = 0;
      try { unseen = (await imap.status(m.path, { unseen: true })).unseen || 0; } catch (e) {}
      out.push({ path: m.path, name: m.name, delim: m.delimiter, flags: m.flags, unseen });
    }
    res.json(out);
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Lista de mensajes */
app.get('/api/messages', asyncHandler(async (req, res) => {
  const acc = findAccount(req.query.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const mailbox = req.query.mailbox || 'INBOX';
  const q = (req.query.q || '').toString();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const per = Math.min(Math.max(parseInt(req.query.per, 10) || 50, 1), 200);

  const imap = imapClient(acc);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(mailbox);
    try {
      let uids;
      if (q) uids = await imap.search({ text: q }, { uid: true });
      else uids = await imap.search({ all: true }, { uid: true });
      uids = uids.slice(-1000).reverse();
      const items = [];
      if (uids.length) {
        for await (const msg of imap.fetch(uids.join(','), { uid: true, envelope: true, flags: true, internalDate: true })) {
          const env = msg.envelope || {};
          const from = (env.from || [])[0];
          items.push({
            uid: msg.uid,
            subject: env.subject || '(sin asunto)',
            from: from ? (from.name || '') + (from.name && from.address ? ' <' + from.address + '>' : from.address || '') : '(desconocido)',
            date: msg.internalDate ? new Date(msg.internalDate).toISOString() : null,
            seen: !(msg.flags && msg.flags.includes('\\Seen')),
            flagged: !!(msg.flags && msg.flags.includes('\\Flagged')),
            hasAttach: !!(env.attachments && env.attachments.length)
          });
        }
      }
      items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      items.reverse();
      const start = (page - 1) * per;
      res.json({ total: items.length, page, per, items: items.slice(start, start + per) });
    } finally { lock.release(); }
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Abrir mensaje */
app.get('/api/messages/:uid', asyncHandler(async (req, res) => {
  const acc = findAccount(req.query.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const mailbox = req.query.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);

  const imap = imapClient(acc);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(mailbox);
    try {
      let parsed = null;
      for await (const msg of imap.fetch(String(uid), { uid: true, source: true })) {
        parsed = await simpleParser(msg.source);
      }
      if (!parsed) return res.status(404).json({ error: 'Mensaje no encontrado' });
      res.json({
        uid,
        subject: parsed.subject || '(sin asunto)',
        from: parsed.from ? (parsed.from.name || '') + (parsed.from.name && parsed.from.address ? ' <' + parsed.from.address + '>' : parsed.from.address || '') : '',
        fromEmail: parsed.from && parsed.from.address ? parsed.from.address : '',
        to: parseAddress(parsed.to),
        cc: parseAddress(parsed.cc),
        date: parsed.date ? new Date(parsed.date).toISOString() : null,
        text: parsed.text || '',
        html: parsed.html || '',
        attachments: (parsed.attachments || []).map((att, i) => ({
          index: i,
          filename: att.filename || ('adjunto-' + i),
          contentType: att.contentType || 'application/octet-stream',
          size: att.size || 0
        }))
      });
    } finally { lock.release(); }
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Descargar adjunto */
app.get('/api/messages/:uid/attachment/:index', asyncHandler(async (req, res) => {
  const acc = findAccount(req.query.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const mailbox = req.query.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const index = parseInt(req.params.index, 10);

  const imap = imapClient(acc);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(mailbox);
    try {
      let att = null;
      for await (const msg of imap.fetch(String(uid), { uid: true, source: true })) {
        const parsed = await simpleParser(msg.source);
        const list = parsed.attachments || [];
        if (list[index]) att = list[index];
      }
      if (!att) return res.status(404).json({ error: 'Adjunto no encontrado' });
      const buf = typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content;
      const filename = encodeURIComponent(att.filename || ('adjunto-' + index));
      res.setHeader('Content-Type', att.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.send(buf);
    } finally { lock.release(); }
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Enviar correo */
app.post('/api/send', upload.array('attachments', 10), asyncHandler(async (req, res) => {
  const acc = findAccount(req.body.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const to = (req.body.to || '').toString();
  if (!to) return res.status(400).json({ error: 'El destinatario es obligatorio' });

  const text = (req.body.text || '').toString();
  const signed = applySignature(acc, text, req.body.html);
  const mail = {
    from: { name: acc.fromName || acc.name || acc.user, address: acc.user },
    to: to,
    cc: (req.body.cc || '').toString() || undefined,
    bcc: (req.body.bcc || '').toString() || undefined,
    subject: (req.body.subject || '').toString(),
    text: signed.text
  };
  if (signed.html) mail.html = signed.html;
  if (req.files && req.files.length) {
    mail.attachments = req.files.map(f => ({ filename: f.originalname, content: f.buffer, contentType: f.mimetype }));
  }

  const transport = smtpTransport(acc);
  const info = await transport.sendMail(mail);
  res.json({ ok: true, messageId: info.messageId });
}));

/* Marcas (leido/no leido, importante) */
app.post('/api/messages/:uid/flags', asyncHandler(async (req, res) => {
  const acc = findAccount(req.body.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const mailbox = req.body.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const flags = req.body.flags || [];
  const remove = !!req.body.remove;

  const imap = imapClient(acc);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(mailbox);
    try {
      if (remove) await imap.messageFlagsRemove(uid, flags, { uid: true });
      else await imap.messageFlagsAdd(uid, flags, { uid: true });
      res.json({ ok: true });
    } finally { lock.release(); }
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Eliminar mensaje */
app.delete('/api/messages/:uid', asyncHandler(async (req, res) => {
  const acc = findAccount(req.query.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const mailbox = req.query.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);

  const imap = imapClient(acc);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(mailbox);
    try {
      await imap.messageDelete(uid, { uid: true });
      res.json({ ok: true });
    } finally { lock.release(); }
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Mover mensaje a otra bandeja */
app.post('/api/messages/:uid/move', asyncHandler(async (req, res) => {
  const acc = findAccount(req.body.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const mailbox = req.body.mailbox || 'INBOX';
  const dest = req.body.dest;
  const uid = parseInt(req.params.uid, 10);
  if (!dest) return res.status(400).json({ error: 'dest es obligatorio' });

  const imap = imapClient(acc);
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock(mailbox);
    try {
      await imap.messageMove(uid, dest, { uid: true });
      res.json({ ok: true });
    } finally { lock.release(); }
  } finally {
    await imap.logout().catch(() => {});
  }
}));

/* Notificaciones push: prueba enviada por el propio navegador */
app.post('/api/push/test', asyncHandler(async (req, res) => {
  const sub = req.body && req.body.subscription;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: 'Falta la suscripción push' });
  }
  const payload = (req.body && req.body.payload) || {
    title: 'Intranet FIAT',
    body: 'Notificación de prueba'
  };
  await sendPush({ endpoint: sub.endpoint, keys: sub.keys }, payload);
  res.json({ ok: true });
}));

app.listen(PORT, () => {
  console.log('Email server escuchando en http://localhost:' + PORT);
});
