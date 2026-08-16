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
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const PUSH_STATE_FILE = path.join(DATA_DIR, 'push-state.json');
const TOKEN = process.env.MAIL_API_TOKEN || '';
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '25', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean) : [];
const TLS_REJECT_UNAUTHORIZED = String(process.env.TLS_REJECT_UNAUTHORIZED || '1') !== '0';
const ACCOUNTS_ENC_KEY = process.env.ACCOUNTS_ENC_KEY || '';

/* ---------- Google OAuth (Sign in with Gmail) ----------
   Requiere un cliente OAuth 2.0 en Google Cloud Console (tipo "Web") con
   GOOGLE_REDIRECT_URI como URI de redirección autorizada. Los tokens
   (refresh + access) se guardan cifrados en la cuenta (campo googleTokens). */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_STATE_SECRET = process.env.GOOGLE_STATE_SECRET || ACCOUNTS_ENC_KEY || 'fiat-google-oauth';
const INTRANET_ORIGINS = (process.env.INTRANET_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_SCOPE = 'openid email profile https://mail.google.com/';

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
      const imap = await imapClient(acc);
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
app.use(cors(CORS_ORIGIN.length ? { origin: CORS_ORIGIN } : { origin: true }));
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
function sanitize(a) { const { pass, googleTokens, ...rest } = a; return rest; }

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

/* ---------- Helpers de Google OAuth ---------- */
function oauthIsConfigured() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}
function oauthStateSign(owner, ret) {
  const payload = Buffer.from(JSON.stringify({ owner, ret, n: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  const sig = crypto.createHmac('sha256', GOOGLE_STATE_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function oauthStateVerify(state) {
  if (!state || typeof state !== 'string') return null;
  const dot = state.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = state.slice(0, dot);
  const expect = crypto.createHmac('sha256', GOOGLE_STATE_SECRET).update(payload).digest('base64url');
  const got = Buffer.from(state.slice(dot + 1), 'base64url');
  const want = Buffer.from(expect, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch (e) { return null; }
}
function oauthEmailFromIdToken(idToken) {
  if (!idToken) return '';
  try {
    const payload = idToken.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return String(JSON.parse(json).email || '').trim().toLowerCase();
  } catch (e) { return ''; }
}
function oauthTokensSave(acc, tokens) {
  const list = loadAccounts();
  const i = list.findIndex(x => String(x.id) === String(acc.id));
  if (i === -1) return;
  list[i].googleTokens = encryptPass(JSON.stringify(tokens));
  saveAccounts(list);
}
function oauthTokensRead(acc) {
  const raw = decryptPass(acc.googleTokens);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
async function oauthExchangeCode(code) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI, grant_type: 'authorization_code'
    }).toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error('Google token exchange: HTTP ' + res.status + ' ' + (data.error_description || data.error || 'error'));
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    expires_at: Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000,
    email: oauthEmailFromIdToken(data.id_token)
  };
}
async function oauthRefreshTokens(acc) {
  const tokens = oauthTokensRead(acc);
  if (!tokens || !tokens.refresh_token) throw new Error('Cuenta OAuth sin refresh_token de Google');
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: tokens.refresh_token, client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token'
    }).toString()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error('Google refresh: HTTP ' + res.status + ' ' + (data.error_description || data.error || 'error'));
  }
  const next = Object.assign({}, tokens, {
    access_token: data.access_token,
    expires_at: Date.now() + (parseInt(data.expires_in, 10) || 3600) * 1000
  });
  oauthTokensSave(acc, next);
  return next;
}
async function oauthAccessToken(acc) {
  const tokens = oauthTokensRead(acc);
  if (!tokens || !tokens.access_token) throw new Error('Cuenta OAuth sin tokens de Google');
  if (Date.now() < tokens.expires_at - 60000) return tokens;
  return oauthRefreshTokens(acc);
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

/* ---------- Rate limiting (M-5) ----------
   Límites en memoria por ventana deslizante:
   - Llave: token de ops, correo autenticado o IP.
   - /api/send y /api/push/test: estricto (máx. por minuto y por día).
   - Resto de /api: límite general por minuto.
   Previene fuerza bruta y abuso de envío (spam). */
const RL_WINDOW_MS = 60 * 1000;
const RL_DAY_MS = 24 * 60 * 60 * 1000;
const rlBuckets = new Map();
const rlDaily = new Map();
function rlCleanup() {
  const now = Date.now();
  rlBuckets.forEach((v, k) => { if (now - v.reset >= RL_WINDOW_MS) rlBuckets.delete(k); });
  rlDaily.forEach((v, k) => { if (now - v.reset >= RL_DAY_MS) rlDaily.delete(k); });
}
function rlKey(req) {
  if (req.trusted) return 'ops:' + TOKEN;
  if (req.verifiedEmail) return 'user:' + req.verifiedEmail;
  return 'ip:' + (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown');
}
function rateLimit(opts) {
  const max = opts.max || 60;
  const dailyMax = opts.dailyMax || 0;
  return function (req, res, next) {
    const now = Date.now();
    rlCleanup();
    const key = rlKey(req);
    let b = rlBuckets.get(key);
    if (!b || now >= b.reset) { b = { count: 0, reset: now + RL_WINDOW_MS }; rlBuckets.set(key, b); }
    b.count++;
    if (b.count > max) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
    }
    if (dailyMax > 0) {
      let d = rlDaily.get(key);
      if (!d || now >= d.reset) { d = { count: 0, reset: now + RL_DAY_MS }; rlDaily.set(key, d); }
      d.count++;
      if (d.count > dailyMax) {
        return res.status(429).json({ error: 'Límite diario alcanzado. Intenta de nuevo mañana.' });
      }
    }
    next();
  };
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
app.use('/api', rateLimit({ max: 120 }));

/* ---------- Utilidades IMAP/SMTP ---------- */
async function imapClient(acc) {
  const auth = { user: acc.user };
  if (acc.authType === 'oauth') {
    const tokens = await oauthAccessToken(acc);
    auth.accessToken = tokens.access_token;
  } else {
    auth.pass = decryptPass(acc.pass);
  }
  return new ImapFlow({
    host: acc.imapHost,
    port: parseInt(acc.imapPort, 10) || 993,
    secure: acc.imapSecure !== false,
    auth,
    logger: false,
    tls: { rejectUnauthorized: TLS_REJECT_UNAUTHORIZED }
  });
}
async function smtpTransport(acc) {
  const auth = { user: acc.user };
  if (acc.authType === 'oauth') {
    const tokens = await oauthAccessToken(acc);
    Object.assign(auth, {
      type: 'OAuth2',
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      refreshToken: tokens.refresh_token || '',
      accessToken: tokens.access_token
    });
  } else {
    auth.pass = decryptPass(acc.pass);
  }
  return nodemailer.createTransport({
    host: acc.smtpHost || acc.imapHost,
    port: parseInt(acc.smtpPort, 10) || 465,
    secure: acc.smtpSecure !== false,
    auth,
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
  res.json({ ok: true, accounts: loadAccounts().length, oauth: oauthIsConfigured(), time: new Date().toISOString() });
});

/* Cuentas. Todas son privadas: tienen `owner` (correo del trabajador) y solo su
   dueño la ve/edita/elimina. El dueño se identifica con la cabecera
   x-owner-email enviada por el frontend. */
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
    owner: ownerEmailOf(req)
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
    owner: old.owner || ownerEmail,
    authType: old.authType,
    googleTokens: old.googleTokens
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

/* Desvincular cuenta OAuth: revoca el token de Google (deja de tener acceso)
   y elimina la cuenta. En cuentas con contraseña equivale a eliminarlas. */
app.post('/api/accounts/:id/disconnect', asyncHandler(async (req, res) => {
  const list = loadAccounts();
  const i = list.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const acc = list[i];
  if (!canManage(acc, ownerEmailOf(req))) return res.status(403).json({ error: 'Solo el dueño de la cuenta puede modificarla' });
  if (acc.authType === 'oauth') {
    const tokens = oauthTokensRead(acc);
    if (tokens && tokens.refresh_token) {
      try {
        await fetch(GOOGLE_REVOKE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: tokens.refresh_token }).toString()
        });
      } catch (e) {
        console.error('[oauth] revoke: ' + (e && e.message ? e.message : e));
      }
    }
  }
  list.splice(i, 1);
  saveAccounts(list);
  res.json({ ok: true });
}));

/* ---------- Google OAuth ----------
   El flujo inicia con una navegación del navegador (no lleva Authorization),
   por eso estas rutas están fuera de /api. El dueño viaja firmado en `state`,
   de modo que al volver Google no se puede manipular a qué cuenta se asigna. */
app.get('/oauth/google/start', rateLimit({ max: 30 }), (req, res) => {
  if (!oauthIsConfigured()) {
    return res.status(400).json({ error: 'OAuth de Google no configurado. Revisa GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI en el email-server/.env' });
  }
  const owner = String(req.query.owner || '').trim().toLowerCase().slice(0, 200);
  const ret = String(req.query.return || '').trim().slice(0, 500);
  const returnOk = INTRANET_ORIGINS.some(o => ret === o || ret.startsWith(o + '/'));
  if (!returnOk) return res.status(400).json({ error: 'Origen de retorno no permitido' });
  const state = oauthStateSign(owner, returnOk ? ret : '');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  res.redirect(GOOGLE_AUTH_URL + '?' + params.toString());
});

app.get('/oauth/google/callback', rateLimit({ max: 30 }), asyncHandler(async (req, res) => {
  const st = oauthStateVerify(req.query.state);
  const ret = (st && st.ret) || INTRANET_ORIGINS[0] || 'http://localhost:3000';
  const finish = (ok, msg) => {
    const u = new URL(ret);
    u.searchParams.set('oauth', ok ? 'ok' : 'err');
    if (msg) u.searchParams.set('msg', msg);
    res.redirect(u.toString());
  };
  try {
    const code = req.query.code;
    if (!code) return finish(false, 'Google no devolvió un código de autorización');
    const tokens = await oauthExchangeCode(code);
    const email = tokens.email || (st ? st.owner : '');
    if (!email) return finish(false, 'Google no devolvió el correo de la cuenta');
    const list = loadAccounts();
    const stOwner = st ? st.owner : '';
    let acc = list.find(a => String(a.user).toLowerCase() === email &&
      (!stOwner || !a.owner || String(a.owner).toLowerCase() === stOwner));
    if (!acc) {
      acc = {
        id: newId(),
        name: email.split('@')[0] || email,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        user: email,
        pass: '',
        fromName: '',
        signature: '',
        owner: stOwner || email,
        authType: 'oauth'
      };
      list.push(acc);
    } else {
      acc.authType = 'oauth';
      acc.owner = stOwner || acc.owner || email;
    }
    acc.googleTokens = encryptPass(JSON.stringify(tokens));
    saveAccounts(list);
    console.log('[oauth] cuenta conectada: ' + email);
    finish(true);
  } catch (e) {
    console.error('[oauth]', e && e.message ? e.message : e);
    finish(false, 'Error al conectar con Google');
  }
}));

app.post('/api/accounts/:id/test', asyncHandler(async (req, res) => {
  const acc = findAccount(req.params.id);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const imap = await imapClient(acc);
  await imap.connect();
  const info = await imap.list();
  await imap.logout();
  res.json({ ok: true, mailboxes: info.map(m => m.path) });
}));

/* Bandejas */
app.get('/api/mailboxes', asyncHandler(async (req, res) => {
  const acc = findAccount(req.query.account);
  if (!acc) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const imap = await imapClient(acc);
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

  const imap = await imapClient(acc);
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
            seen: !(msg.flags && (msg.flags.has ? msg.flags.has('\\Seen') : msg.flags.includes('\\Seen'))),
            flagged: !!(msg.flags && (msg.flags.has ? msg.flags.has('\\Flagged') : msg.flags.includes('\\Flagged'))),
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

  const imap = await imapClient(acc);
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

  const imap = await imapClient(acc);
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
app.post('/api/send', rateLimit({ max: 10, dailyMax: 200 }), upload.array('attachments', 10), asyncHandler(async (req, res) => {
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

  const transport = await smtpTransport(acc);
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

  const imap = await imapClient(acc);
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

  const imap = await imapClient(acc);
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

  const imap = await imapClient(acc);
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
app.post('/api/push/test', rateLimit({ max: 10, dailyMax: 50 }), asyncHandler(async (req, res) => {
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

// M-4: por defecto SOLO loopback (el webmail siempre consulta localhost).
// Para servir detrás de un reverse proxy en el mismo host, usar HOST=127.0.0.1
// (default); si se quiere exponer en red explícitamente, configurar HOST.
const HOST = process.env.HOST || '127.0.0.1';

/* Todas las cuentas son privadas: las que quedaron sin dueño (compartidas)
   se asignan al correo IMAP de la cuenta para que nadie más pueda verlas. */
function migratePrivateOnly() {
  const list = loadAccounts();
  let changed = false;
  list.forEach(a => {
    if (!a.owner && a.user) { a.owner = String(a.user).trim().toLowerCase(); changed = true; }
  });
  if (changed) {
    saveAccounts(list);
    console.log('Migración: cuentas compartidas convertidas a privadas.');
  }
}
migratePrivateOnly();

app.listen(PORT, HOST, () => {
  console.log('Email server escuchando en http://' + HOST + ':' + PORT);
});
