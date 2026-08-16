/*
 * Fiat Email Server — MODO DEMO
 * -----------------------------
 * Simula la API de correo con datos de ejemplo para poder ver el webmail
 * "ya configurado" SIN necesidad de un dominio ni credenciales IMAP/SMTP.
 *
 * Uso:  npm run demo   (o: node demo-server.js)
 * Abre: http://localhost:4001/modules/chatfiat.html?demo=1
 *
 * El puerto por defecto es 4001 para poder convivir con el servidor real
 * (4000) y que el webmail pueda alternar entre ambos con el interruptor
 * Demo (solo admin). Además de la API simulada, sirve la intranet
 * estática (carpeta padre). Todo es en memoria: al reiniciar el servidor
 * se restaura el estado inicial.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const PORT = process.env.DEMO_PORT || 4001;
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ---------- Web Push (notificaciones) ---------- */
const webpush = require('web-push');
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

/* ---------- Datos de demostración (en memoria) ---------- */

function att(filename, contentType, content, isB64) {
  const data = isB64 ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
  return { filename, contentType, size: data.length, _data: data };
}

const PDF_COMPROBANTE =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
  '4 0 obj<</Length 120>>stream\n' +
  'BT /F1 16 Tf 72 720 Td (Comprobante de pago - FIAT) Tj ET\n' +
  'BT /F1 11 Tf 72 690 Td (Periodo AGOSTO 2026 - Demostracion) Tj ET\n' +
  'endstream\nendobj\n' +
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF\n';

const PDF_POLITICAS =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
  '4 0 obj<</Length 90>>stream\n' +
  'BT /F1 16 Tf 72 720 Td (Politicas de Bienestar 2026) Tj ET\n' +
  'endstream\nendobj\n' +
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF\n';

const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const CSV_COTIZACION = 'articulo,cantidad,precio_usd\nCamisa manga corta,120,4.50\nPantalon azul,120,7.25\nBuso polar,80,9.90\nGorra,60,3.10\n';

const CSV_CARGOS = 'cargo,sueldo_base_usd\nAnalista RRHH,320.00\nSupervisor,480.00\nGerente,850.00\nOperador,210.00\n';

const MANUAL = 'Manual de la Intranet (demo)\n================================\n1) Ingresa con tu correo corporativo.\n2) Usa el panel izquierdo para cambiar de herramienta.\n3) Revisa el calendario y las alertas.\n\nFIAT - Recursos Humanos\n';

let uidSeq = 1000;
function msg(o) {
  uidSeq++;
  return Object.assign({
    uid: uidSeq,
    seen: false,
    flagged: false,
    from: '',
    fromEmail: '',
    to: 'rrhh@fiat-ve.com',
    cc: '',
    date: new Date().toISOString(),
    subject: '(sin asunto)',
    text: '',
    html: null,
    attachments: []
  }, o);
}

function ago(days, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour || 9, minute || 0, 0, 0);
  return d.toISOString();
}

function seedAccount() {
  return {
    id: 'demo-1',
    name: 'Recursos Humanos',
    imapHost: 'mail.fiat-ve.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'mail.fiat-ve.com',
    smtpPort: 465,
    smtpSecure: true,
    user: 'rrhh@fiat-ve.com',
    pass: 'demo',
    fromName: 'Recursos Humanos FIAT',
    signature: 'Recursos Humanos FIAT\nrrhh@fiat-ve.com'
  };
}

const store = {
  accounts: [seedAccount()],
  messages: {
    'INBOX': [
      msg({
        from: 'Banco Mercantil <notificaciones@bancomercantil.com>',
        fromEmail: 'notificaciones@bancomercantil.com',
        subject: 'Estado de cuenta · Nómina AGOSTO 2026',
        date: ago(0, 8, 15),
        text: 'Estimado cliente, adjuntamos el estado de cuenta correspondiente al mes de agosto de 2026. Cualquier discrepancia favor reportarla a través de nuestro centro de contacto.',
        attachments: [
          att('Estado-Cuenta-2026-08.pdf', 'application/pdf', PDF_COMPROBANTE),
          att('Logo-Mercantil.png', 'image/png', PNG_1x1, true)
        ]
      }),
      msg({
        from: 'Gerencia General <gerencia@fiat-ve.com>',
        fromEmail: 'gerencia@fiat-ve.com',
        subject: 'Reunión de seguimiento semanal',
        date: ago(0, 7, 45),
        seen: false,
        flagged: true,
        text: 'Buen día, recordamos la reunión de seguimiento semanal hoy a las 2:00 pm en la sala de juntas. Por favor confirmen asistencia y preparar el avance de sus áreas.',
        html: '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">' +
          '<p>Buen día,</p><p>Recordamos la <strong>reunión de seguimiento semanal</strong> hoy a las <strong>2:00 pm</strong> en la sala de juntas.</p>' +
          '<p>Por favor confirmen asistencia y preparen el avance de sus áreas.</p><p>Saludos,<br>Gerencia General</p></div>'
      }),
      msg({
        from: 'María Pérez <maria.perez@fiat-ve.com>',
        fromEmail: 'maria.perez@fiat-ve.com',
        subject: 'Cena de integración de fin de mes',
        date: ago(1, 16, 30),
        text: 'Hola equipo, el plan para la cena de integración de este viernes es a las 7:00 pm en "La Casa del Italiano". Dejen en este correo cuántos asistentes serán para reservar.'
      }),
      msg({
        from: 'noreply@sistema.com <noreply@sistema.com>',
        fromEmail: 'noreply@sistema.com',
        subject: 'Notificación del sistema · Tu contraseña expirará pronto',
        date: ago(1, 11, 5),
        seen: true,
        text: 'Estimado usuario, tu contraseña expirará en 7 días. Ingresa a Mi perfil para cambiarla y mantener la seguridad de tu cuenta.'
      }),
      msg({
        from: 'Compras FIAT <compras@fiat-ve.com>',
        fromEmail: 'compras@fiat-ve.com',
        subject: 'Cotización de uniformes para nuevo personal',
        date: ago(2, 10, 20),
        flagged: true,
        text: 'Buenos días, recibimos la cotización de los uniformes para el nuevo personal. Adjunto el detalle con precios y cantidades. Necesitamos la aprobación de RRHH esta semana.',
        attachments: [
          att('Cotizacion-Uniformes.csv', 'text/csv', CSV_COTIZACION)
        ]
      }),
      msg({
        from: 'Banco Mercantil <notificaciones@bancomercantil.com>',
        fromEmail: 'notificaciones@bancomercantil.com',
        subject: 'Cambio de clave en Banca en Línea',
        date: ago(2, 9, 12),
        seen: true,
        text: 'Le informamos que el día de hoy se registró un cambio de clave en su banca en línea. Si usted no realizó esta operación, contacte de inmediato nuestro centro de atención.'
      }),
      msg({
        from: 'Desarrollo Organizacional <desarrollo@fiat-ve.com>',
        fromEmail: 'desarrollo@fiat-ve.com',
        subject: 'Taller: Liderazgo y trabajo en equipo',
        date: ago(3, 15, 40),
        text: 'Se abre el periodo de inscripción para el taller "Liderazgo y trabajo en equipo" del próximo mes. Adjuntamos el manual de la intranet y las políticas para consulta previa.',
        attachments: [
          att('Manual-Intranet.txt', 'text/plain', MANUAL),
          att('Politicas-Bienestar-2026.pdf', 'application/pdf', PDF_POLITICAS)
        ]
      }),
      msg({
        from: 'noreply@sistema.com <noreply@sistema.com>',
        fromEmail: 'noreply@sistema.com',
        subject: 'Bienvenido a la Intranet FIAT',
        date: ago(4, 8, 0),
        seen: true,
        text: 'Hola, bienvenido a la Intranet FIAT. Explora los módulos de Recursos Humanos, Finanzas, Compensación y más. Revisa el manual adjunto para comenzar.',
        attachments: [
          att('Manual-Intranet.txt', 'text/plain', MANUAL)
        ]
      }),
      msg({
        from: 'Carlos Rodríguez <carlos.rodriguez@fiat-ve.com>',
        fromEmail: 'carlos.rodriguez@fiat-ve.com',
        subject: 'Solicitud de vacaciones — quincena de septiembre',
        date: ago(4, 13, 25),
        text: 'Buenas tardes, solicitando aprobación de mis vacaciones para la segunda quincena de septiembre (del 14 al 25). Quedo atento a la confirmación. Gracias.'
      }),
      msg({
        from: 'Capacitación <capacitacion@fiat-ve.com>',
        fromEmail: 'capacitacion@fiat-ve.com',
        subject: 'Curso de seguridad y salud en el trabajo — nuevo grupo',
        date: ago(5, 9, 50),
        text: 'Se abrió un nuevo grupo del curso de Seguridad y Salud en el Trabajo. El cupo es limitado (20 personas). Quienes estén interesados deben inscribirse a través del módulo de Capacitación.'
      }),
      msg({
        from: 'Banco Mercantil <notificaciones@bancomercantil.com>',
        fromEmail: 'notificaciones@bancomercantil.com',
        subject: 'Estado de cuenta · Julio 2026',
        date: ago(6, 8, 15),
        seen: true,
        text: 'Adjuntamos el estado de cuenta correspondiente al mes de julio de 2026. El archivo contiene el detalle de movimientos y el saldo al cierre.',
        attachments: [
          att('Estado-Cuenta-2026-07.pdf', 'application/pdf', PDF_COMPROBANTE)
        ]
      }),
      msg({
        from: 'Finanzas <finanzas@fiat-ve.com>',
        fromEmail: 'finanzas@fiat-ve.com',
        subject: 'Presupuesto 2026 — actualización',
        date: ago(6, 11, 10),
        text: 'Se actualizó la plantilla de presupuesto por unidad para el segundo semestre. Adjunto el archivo con los cargos y sueldos base para validación.',
        attachments: [
          att('Planilla-Cargos-2026.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', CSV_CARGOS)
        ]
      }),
      msg({
        from: 'Servicios Médicos <servicio.medico@fiat-ve.com>',
        fromEmail: 'servicio.medico@fiat-ve.com',
        subject: 'Jornada de vacunación contra la gripe',
        date: ago(7, 10, 30),
        text: 'El próximo jueves se realizará la jornada de vacunación contra la gripe en el área de Servicio Médico de 8:00 am a 12:00 pm. Se recomienda asistir con la cédula.'
      }),
      msg({
        from: 'Bienestar Social <bienestar@fiat-ve.com>',
        fromEmail: 'bienestar@fiat-ve.com',
        subject: 'Programa de préstamos — condiciones 2026',
        date: ago(8, 9, 20),
        text: 'Les compartimos las condiciones actualizadas del programa de préstamos a trabajadores: montos, plazos y tasas. Para más información ingresen al módulo de Bienestar Social.'
      }),
      msg({
        from: 'Proveedores <ventas@proveedores-example.com>',
        fromEmail: 'ventas@proveedores-example.com',
        subject: 'Oferta especial en equipos de oficina',
        date: ago(9, 14, 45),
        seen: true,
        text: 'Estimado equipo de compras, esta semana ofrecemos un descuento del 15% en sillas ergonómicas y escritorios. Si les interesa una cotización formal, avísenme.'
      }),
      msg({
        from: 'noreply@sistema.com <noreply@sistema.com>',
        fromEmail: 'noreply@sistema.com',
        subject: 'Tu solicitud de acceso fue aprobada',
        date: ago(10, 8, 5),
        seen: true,
        text: 'Estimado usuario, tu solicitud de acceso al módulo Finanzas fue aprobada por el administrador. Ya puedes ingresar desde el selector de módulos.'
      }),
      msg({
        from: 'Gerencia General <gerencia@fiat-ve.com>',
        fromEmail: 'gerencia@fiat-ve.com',
        subject: 'Feriado bancario — plan de contingencia',
        date: ago(11, 16, 0),
        text: 'El próximo lunes es feriado bancario. El horario de atención se mantendrá normal; los pagos a proveedores se procesarán el día siguiente.'
      }),
      msg({
        from: 'Luis Gómez <luis.gomez@fiat-ve.com>',
        fromEmail: 'luis.gomez@fiat-ve.com',
        subject: 'Reporte de incidente — piso húmedo en almacén',
        date: ago(12, 12, 30),
        flagged: true,
        text: 'Buenos días, se detectó piso húmedo en el área de almacén, posible derrame. Ya se reportó en el módulo de Seguridad; solicitando colocar señalización temporal.'
      }),
      msg({
        from: 'Capacitación <capacitacion@fiat-ve.com>',
        fromEmail: 'capacitacion@fiat-ve.com',
        subject: 'Recordatorio: evaluación de competencias',
        date: ago(13, 9, 0),
        seen: true,
        text: 'Recuerden que la evaluación de competencias del trimestre vence este viernes. Las evaluaciones pendientes pueden completarse desde el módulo de Capacitación.'
      }),
      msg({
        from: 'Finanzas <finanzas@fiat-ve.com>',
        fromEmail: 'finanzas@fiat-ve.com',
        subject: 'Reporte mensual de gastos — aprobación',
        date: ago(14, 10, 15),
        text: 'Adjuntamos el reporte mensual de gastos para la aprobación de gerencia. Se detallan los movimientos por categoría y el total consolidado.',
        attachments: [
          att('Reporte-Gastos-2026-07.csv', 'text/csv', 'categoria,tipo,monto_usd\nPapeleria,Gasto,120.00\nMantenimiento,Gasto,850.00\nServicios,Gasto,2300.00\n')
        ]
      }),
      msg({
        from: 'noreply@sistema.com <noreply@sistema.com>',
        fromEmail: 'noreply@sistema.com',
        subject: 'Actualización de datos — revisa tu ficha',
        date: ago(15, 8, 30),
        seen: true,
        text: 'Se te solicita revisar y confirmar tus datos personales en la ficha del trabajador antes del cierre de mes.'
      }),
      msg({
        from: 'Bienestar Social <bienestar@fiat-ve.com>',
        fromEmail: 'bienestar@fiat-ve.com',
        subject: 'Encuesta de clima laboral — segunda quincena',
        date: ago(16, 11, 40),
        seen: true,
        text: 'Ya está disponible la encuesta de clima laboral de esta quincena. Es anónima y toma menos de 5 minutos. Tu participación es muy valiosa.'
      })
    ],
    'Enviados': [
      msg({
        from: 'Recursos Humanos FIAT <rrhh@fiat-ve.com>',
        fromEmail: 'rrhh@fiat-ve.com',
        to: 'todo@fiat-ve.com',
        subject: 'Circular: horario especial por mantenimiento eléctrico',
        date: ago(3, 17, 20),
        text: 'Se informa a todo el personal que el día sábado habrá mantenimiento eléctrico de 7:00 am a 11:00 am. La planta no contará con servicio de internet durante ese lapso.'
      }),
      msg({
        from: 'Recursos Humanos FIAT <rrhh@fiat-ve.com>',
        fromEmail: 'rrhh@fiat-ve.com',
        to: 'gerencia@fiat-ve.com',
        subject: 'Reporte de asistencia — julio 2026',
        date: ago(5, 15, 0),
        text: 'Buenas tardes, adjunto el reporte de asistencia del mes de julio con el detalle de marcajes por trabajador y las novedades registradas.',
        attachments: [
          att('Asistencia-Julio-2026.csv', 'text/csv', 'cedula,nombres,dias_laborados,retardos\nV-12345678,Juan Perez,21,2\nV-23456789,Maria Lopez,20,1\n')
        ]
      }),
      msg({
        from: 'Recursos Humanos FIAT <rrhh@fiat-ve.com>',
        fromEmail: 'rrhh@fiat-ve.com',
        to: 'proveedores@fiat-ve.com',
        subject: 'Solicitud de cotización — suministro de agua',
        date: ago(7, 9, 0),
        text: 'Estimados proveedores, solicitamos cotización para el suministro de agua potable para las oficinas durante el segundo semestre. Agradecemos enviar precios y condiciones.'
      })
    ],
    'Borradores': [
      msg({
        from: 'Recursos Humanos FIAT <rrhh@fiat-ve.com>',
        fromEmail: 'rrhh@fiat-ve.com',
        to: 'gerencia@fiat-ve.com',
        subject: 'Borrador: Propuesta de nuevo beneficio',
        date: ago(2, 14, 0),
        text: 'Aún sin enviar. Idea de propuesta: seguro de salud ampliado para los trabajadores con mayor antigüedad...'
      }),
      msg({
        from: 'Recursos Humanos FIAT <rrhh@fiat-ve.com>',
        fromEmail: 'rrhh@fiat-ve.com',
        to: 'todo@fiat-ve.com',
        subject: 'Borrador: Felicitaciones por aniversario',
        date: ago(1, 18, 30),
        text: 'Borrador sin enviar.'
      })
    ],
    'spam': [
      msg({
        from: 'Publicidad <ofertas@correos-spam.com>',
        fromEmail: 'ofertas@correos-spam.com',
        subject: '¡Gana un auto esta semana!',
        date: ago(2, 6, 0),
        seen: true,
        text: 'Has sido seleccionado para participar en el sorteo de un auto. Haz clic aquí para reclamar tu premio.'
      }),
      msg({
        from: 'Préstamos exprés <info@prestamos-express.com>',
        fromEmail: 'info@prestamos-express.com',
        subject: 'Crédito inmediato sin aval',
        date: ago(4, 7, 10),
        seen: true,
        text: 'Obtén crédito inmediato sin aval ni papeleo. Intereses desde 1%. Ofrecido en 24 horas.'
      })
    ],
    'Papelera': []
  },
  boxes: [
    { path: 'INBOX', name: 'INBOX', unseen: 4 },
    { path: 'Enviados', name: 'Enviados', unseen: 0 },
    { path: 'Borradores', name: 'Borradores', unseen: 0 },
    { path: 'spam', name: 'spam', unseen: 0 },
    { path: 'Papelera', name: 'Papelera', unseen: 0 }
  ]
};

function sanitizeAccount(a) { const { pass, ...rest } = a; return rest; }
function accountOr404(id, res) {
  const acc = store.accounts.find(a => String(a.id) === String(id));
  if (!acc) { res.status(404).json({ error: 'Cuenta no encontrada' }); return null; }
  return acc;
}
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
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
function mailboxList(accountId) {
  return store.boxes.map(b => {
    const unseen = (store.messages[b.path] || []).filter(m => !m.seen).length;
    return { path: b.path, name: b.name, delim: '/', flags: [], unseen };
  });
}
function recomputeBoxes() {
  store.boxes.forEach(b => {
    b.unseen = (store.messages[b.path] || []).filter(m => !m.seen).length;
  });
}

/* ---------- Archivos adjuntos (descarga) ---------- */
function attachmentBytes(att) {
  return att._data || Buffer.from(String(att.filename), 'utf8');
}

/* ---------- Multer ---------- */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/* ---------- Endpoints (misma forma que el servidor real) ---------- */

app.get('/api/status', (req, res) => {
  res.json({ ok: true, accounts: store.accounts.length, demo: true, time: new Date().toISOString() });
});

function ownerEmailOf(req) {
  return String(req.get('x-owner-email') || '').trim().toLowerCase();
}
function canManage(account, ownerEmail) {
  const o = String(account.owner || '').toLowerCase();
  return !o || (ownerEmail && o === ownerEmail);
}

app.get('/api/accounts', (req, res) => {
  // En modo demo, si no queda ninguna cuenta (p. ej. se borró desde la interfaz),
  // se re-siembra la cuenta de ejemplo para que el webmail nunca quede "vacío".
  if (!store.accounts.length) store.accounts.push(seedAccount());
  const ownerEmail = ownerEmailOf(req);
  const list = store.accounts.filter(a =>
    ownerEmail
      ? (!a.owner || String(a.owner).toLowerCase() === ownerEmail)
      : !a.owner
  );
  res.json(list.map(sanitizeAccount));
});

app.post('/api/accounts', (req, res) => {
  const a = req.body || {};
  if (!a.user || !a.pass || !a.imapHost) return res.status(400).json({ error: 'user, pass e imapHost son obligatorios' });
  const acc = {
    id: 'acc-' + Math.random().toString(36).slice(2, 8),
    name: a.name || a.user,
    imapHost: a.imapHost,
    imapPort: parseInt(a.imapPort, 10) || 993,
    imapSecure: a.imapSecure !== false,
    smtpHost: a.smtpHost || a.imapHost,
    smtpPort: parseInt(a.smtpPort, 10) || 465,
    smtpSecure: a.smtpSecure !== false,
    user: a.user,
    pass: a.pass,
    fromName: a.fromName || '',
    signature: a.signature || '',
    owner: a.shared ? '' : ownerEmailOf(req)
  };
  store.accounts.push(acc);
  res.json(sanitizeAccount(acc));
});

app.put('/api/accounts/:id', (req, res) => {
  const i = store.accounts.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Cuenta no encontrada' });
  const a = req.body || {};
  const old = store.accounts[i];
  const ownerEmail = ownerEmailOf(req);
  if (!canManage(old, ownerEmail)) return res.status(403).json({ error: 'Solo el dueño de la cuenta puede modificarla' });
  store.accounts[i] = Object.assign({}, old, {
    name: a.name || old.name,
    imapHost: a.imapHost || old.imapHost,
    imapPort: parseInt(a.imapPort, 10) || old.imapPort || 993,
    smtpHost: a.smtpHost || old.smtpHost || old.imapHost,
    smtpPort: parseInt(a.smtpPort, 10) || old.smtpPort || 465,
    user: a.user || old.user,
    pass: a.pass ? a.pass : old.pass,
    fromName: a.fromName !== undefined ? a.fromName : old.fromName,
    signature: a.signature !== undefined ? a.signature : old.signature,
    owner: a.shared !== undefined ? (a.shared ? '' : ownerEmail) : old.owner
  });
  res.json(sanitizeAccount(store.accounts[i]));
});

app.delete('/api/accounts/:id', (req, res) => {
  const i = store.accounts.findIndex(x => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (!canManage(store.accounts[i], ownerEmailOf(req))) return res.status(403).json({ error: 'Solo el dueño de la cuenta puede eliminarla' });
  store.accounts.splice(i, 1);
  res.json({ ok: true });
});

app.post('/api/accounts/:id/test', (req, res) => {
  if (!accountOr404(req.params.id, res)) return;
  res.json({ ok: true, mailboxes: store.boxes.map(b => b.path) });
});

app.get('/api/mailboxes', (req, res) => {
  if (!accountOr404(req.query.account, res)) return;
  res.json(mailboxList(req.query.account));
});

function normalizeText(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function searchable(m) {
  return normalizeText(m.subject) + ' ' + normalizeText(m.from) + ' ' + normalizeText(m.text);
}

app.get('/api/messages', (req, res) => {
  if (!accountOr404(req.query.account, res)) return;
  const mailbox = req.query.mailbox || 'INBOX';
  const q = normalizeText(req.query.q);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const per = Math.min(Math.max(parseInt(req.query.per, 10) || 50, 1), 200);

  let items = (store.messages[mailbox] || []).slice();
  if (q) items = items.filter(m => searchable(m).includes(q));
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = items.length;
  const start = (page - 1) * per;
  const slice = items.slice(start, start + per).map(m => ({
    uid: m.uid,
    subject: m.subject,
    from: m.from,
    date: m.date,
    seen: m.seen,
    flagged: m.flagged,
    hasAttach: !!(m.attachments && m.attachments.length)
  }));
  res.json({ total, page, per, items: slice });
});

app.get('/api/messages/:uid', (req, res) => {
  if (!accountOr404(req.query.account, res)) return;
  const mailbox = req.query.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const m = (store.messages[mailbox] || []).find(x => x.uid === uid);
  if (!m) return res.status(404).json({ error: 'Mensaje no encontrado' });
  res.json({
    uid: m.uid,
    subject: m.subject,
    from: m.from,
    fromEmail: m.fromEmail,
    to: m.to,
    cc: m.cc,
    date: m.date,
    text: m.text,
    html: m.html || '',
    attachments: (m.attachments || []).map((a, i) => ({
      index: i,
      filename: a.filename,
      contentType: a.contentType || 'application/octet-stream',
      size: a.size || 0
    }))
  });
});

app.get('/api/messages/:uid/attachment/:index', (req, res) => {
  if (!accountOr404(req.query.account, res)) return;
  const mailbox = req.query.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const index = parseInt(req.params.index, 10);
  const m = (store.messages[mailbox] || []).find(x => x.uid === uid);
  const a = m && m.attachments ? m.attachments[index] : null;
  if (!a) return res.status(404).json({ error: 'Adjunto no encontrado' });
  const buf = attachmentBytes(a);
  const filename = encodeURIComponent(a.filename || ('adjunto-' + index));
  res.setHeader('Content-Type', a.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  res.send(buf);
});

app.post('/api/send', upload.array('attachments', 10), (req, res) => {
  if (!accountOr404(req.body.account, res)) return;
  const acc = store.accounts.find(a => String(a.id) === String(req.body.account));
  const to = String(req.body.to || '');
  if (!to) return res.status(400).json({ error: 'El destinatario es obligatorio' });
  const attachments = (req.files || []).map((f, i) => att(f.originalname, f.mimetype || 'application/octet-stream', f.buffer));
  const signed = applySignature(acc, String(req.body.text || ''), String(req.body.html || ''));
  store.messages['Enviados'].push(msg({
    from: (acc.fromName || acc.name || acc.user) + ' <' + acc.user + '>',
    fromEmail: acc.user,
    to: to,
    cc: String(req.body.cc || ''),
    subject: String(req.body.subject || '(sin asunto)'),
    text: signed.text,
    html: signed.html,
    date: new Date().toISOString(),
    attachments: attachments
  }));
  recomputeBoxes();
  res.json({ ok: true, messageId: 'demo-' + Date.now() });
});

app.post('/api/messages/:uid/flags', (req, res) => {
  if (!accountOr404(req.body.account, res)) return;
  const mailbox = req.body.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const flags = req.body.flags || [];
  const remove = !!req.body.remove;
  const m = (store.messages[mailbox] || []).find(x => x.uid === uid);
  if (!m) return res.status(404).json({ error: 'Mensaje no encontrado' });
  if (flags.includes('\\Flagged')) m.flagged = !remove;
  if (flags.includes('\\Seen')) m.seen = !remove;
  recomputeBoxes();
  res.json({ ok: true });
});

app.delete('/api/messages/:uid', (req, res) => {
  if (!accountOr404(req.query.account, res)) return;
  const mailbox = req.query.mailbox || 'INBOX';
  const uid = parseInt(req.params.uid, 10);
  const list = store.messages[mailbox] || [];
  const i = list.findIndex(x => x.uid === uid);
  if (i === -1) return res.status(404).json({ error: 'Mensaje no encontrado' });
  list.splice(i, 1);
  recomputeBoxes();
  res.json({ ok: true });
});

app.post('/api/messages/:uid/move', (req, res) => {
  if (!accountOr404(req.body.account, res)) return;
  const mailbox = req.body.mailbox || 'INBOX';
  const dest = req.body.dest;
  const uid = parseInt(req.params.uid, 10);
  if (!dest) return res.status(400).json({ error: 'dest es obligatorio' });
  const list = store.messages[mailbox] || [];
  const i = list.findIndex(x => x.uid === uid);
  if (i === -1) return res.status(404).json({ error: 'Mensaje no encontrado' });
  const m = list.splice(i, 1)[0];
  (store.messages[dest] = store.messages[dest] || []).push(m);
  recomputeBoxes();
  res.json({ ok: true });
});

/* Notificaciones push: prueba enviada por el propio navegador */
app.post('/api/push/test', (req, res) => {
  const sub = req.body && req.body.subscription;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Falta la suscripción push' });
  const payload = (req.body && req.body.payload) || {
    title: 'Intranet FIAT',
    body: 'Notificación de prueba'
  };
  sendPush({ endpoint: sub.endpoint, keys: sub.keys }, payload)
    .then(() => res.json({ ok: true }))
    .catch(e => res.status(500).json({ error: e.message }));
});

/* ---------- Servir la intranet estática (carpeta padre) ---------- */
const STATIC_ROOT = process.env.MAIL_STATIC_ROOT || path.join(__dirname, '..');
app.use(express.static(STATIC_ROOT, { dotfiles: 'deny', index: false }));

// M-4: SOLO loopback. El modo demo no tiene autenticación y sirve la intranet
// estática; nunca debe exponerse a la red. Para un reverse proxy en el mismo
// host se mantiene 127.0.0.1 (el proxy conecta por loopback).
const HOST = process.env.DEMO_HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log('----------------------------------------------');
  console.log('  FIAT EMAIL — MODO DEMO');
  console.log('  API simulada:  http://' + HOST + ':' + PORT + '/api');
  console.log('  Intranet:      http://' + HOST + ':' + PORT + '/modules/chatfiat.html?demo=1');
  console.log('  Cuenta demo:   rrhh@fiat-ve.com (RRHH)');
  console.log('  En el webmail, el admin puede alternar con el interruptor Demo.');
  console.log('  Servidor real: http://' + HOST + ':4000 (npm start)');
  console.log('----------------------------------------------');
});
