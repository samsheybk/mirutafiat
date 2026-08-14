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

const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const TOKEN = process.env.MAIL_API_TOKEN || '';
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);

const app = express();
app.use(cors());
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

/* ---------- Seguridad opcional (token Bearer) ---------- */
function requireToken(req, res, next) {
  if (!TOKEN) return next();
  if (req.headers.authorization === 'Bearer ' + TOKEN) return next();
  return res.status(401).json({ error: 'Token invalido' });
}

/* ---------- Utilidades IMAP/SMTP ---------- */
function imapClient(acc) {
  return new ImapFlow({
    host: acc.imapHost,
    port: parseInt(acc.imapPort, 10) || 993,
    secure: acc.imapSecure !== false,
    auth: { user: acc.user, pass: acc.pass },
    logger: false,
    tls: { rejectUnauthorized: false }
  });
}
function smtpTransport(acc) {
  return nodemailer.createTransport({
    host: acc.smtpHost || acc.imapHost,
    port: parseInt(acc.smtpPort, 10) || 465,
    secure: acc.smtpSecure !== false,
    auth: { user: acc.user, pass: acc.pass },
    tls: { rejectUnauthorized: false }
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
    res.status(500).json({ error: err.message || String(err) });
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

/* Cuentas */
app.get('/api/accounts', (req, res) => {
  res.json(loadAccounts().map(sanitize));
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
    pass: a.pass,
    fromName: a.fromName || ''
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
    pass: a.pass ? a.pass : old.pass,
    fromName: a.fromName !== undefined ? a.fromName : old.fromName
  };
  list[i] = acc;
  saveAccounts(list);
  res.json(sanitize(acc));
});

app.delete('/api/accounts/:id', (req, res) => {
  const list = loadAccounts();
  const i = list.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Cuenta no encontrada' });
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

  const mail = {
    from: { name: acc.fromName || acc.name || acc.user, address: acc.user },
    to: to,
    cc: (req.body.cc || '').toString() || undefined,
    bcc: (req.body.bcc || '').toString() || undefined,
    subject: (req.body.subject || '').toString(),
    text: (req.body.text || '').toString()
  };
  if (req.body.html) mail.html = req.body.html;
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

app.listen(PORT, () => {
  console.log('Email server escuchando en http://localhost:' + PORT);
});
