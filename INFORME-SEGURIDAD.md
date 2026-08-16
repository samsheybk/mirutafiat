# Auditoría de Seguridad — Intranet FIAT

**Alcance:** `fiat-intranet/` (frontend HTML/JS + Supabase) y `supabase-schema.sql`
**Tipo:** Revisión estática DevSecOps (no se ejecutó la app)
**Fecha:** 2026-08-16
**Metodología:** OWASP Top 10 / SANS Top 25 adaptada al stack (client-side + Supabase RLS + Express/IMAP/SMTP)

---

## 1. Resumen ejecutivo

La intranet presenta **riesgos críticos de autorización y XSS**. El modelo de control de acceso **no está respaldado por la base de datos**: las políticas RLS de la mayoría de las 78 tablas usan `USING (true)` para usuarios autenticados, y en particular `usuario_accesos` permite a cualquier empleado cambiarse el rol a **Administrador**. Como toda la autorización vive en el cliente (`js/access.js`), cualquier empleado autenticado puede alcanzar datos de nómina, salarios, liquidaciones e historial médico con un simple `fetch` a la REST de Supabase.

En el backend de correo (`email-server`), la API no exige token (`MAIL_API_TOKEN` vacío), usa CORS `*`, desactiva la validación TLS (`rejectUnauthorized: false`) y guarda contraseñas IMAP/SMTP en texto plano. El `npm audit` reporta **2 vulnerabilidades altas** (multer y nodemailer).

**Recomendación:** el sistema no debe publicarse a producción hasta corregir los hallazgos CRÍTICOS (RLS + escalamiento de rol) y ALTO (auth del email-server, TLS, sanitización de correo).

---

## 2. Hallazgos por severidad

### CRÍTICO

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| C-1 | **Escalamiento de rol:** cualquier `authenticated` puede INSERT/UPDATE/DELETE sobre `usuario_accesos` → se auto-asigna `rol='Administrador'`, habilita gestión de usuarios y acceso total. | `supabase-schema.sql:4717-4729` |
| C-2 | **RLS abiertas:** políticas `SELECT/INSERT/UPDATE/DELETE ... USING (true)` para `authenticated` en casi todas las tablas (nómina, salarios, liquidaciones, incidentes de salud, encuestas de bienestar, etc.). La autorización por módulo/rol **no existe en la base de datos**; `js/access.js` solo la aplica en la UI. | `supabase-schema.sql` (78 tablas, p. ej. `ats_candidatos:3523-3536`) |
| C-3 | **XSS almacenado en Captación:** `foto_url` es un dato controlable por **anon** (política `INSERT TO anon WITH CHECK (true)`) y se inserta sin escapar en `innerHTML`: `<img src="' + c.foto_url + '">`. Payload: `x" onerror="alert(document.cookie)` → robo de sesión / XSS a RRHH. | `modules/captacion.html:1345-1347` |

### ALTO

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| A-1 | **API de correo sin autenticación:** `MAIL_API_TOKEN=''` hace que `requireToken()` nunca rechace (paso directo) y CORS es `*`. Quien alcance el puerto 4000 puede listar cuentas, leer buzones y **enviar correos como la organización**. Además `x-owner-email` es forjable → leer buzones de terceros. | `email-server/server.js:17, 129, 170-174, 226-232` |
| A-2 | **TLS sin verificación:** `tls: { rejectUnauthorized: false }` en IMAP y SMTP → un MITM puede interceptar correo y credenciales. | `email-server/server.js:184, 193` |
| A-3 | **Contraseñas de correo en claro:** persistidas en `data/accounts.json` (usuario + clave IMAP/SMTP completas). Compromiso de disco/vm = credenciales corporativas expuestas. | `email-server/server.js:140, 258` |
| A-4 | **Dependencias vulnerables (npm audit — high):** `multer` (DoS: recursión, campos anidados, uploads abortados) y `nodemailer` (SMTP command injection, CRLF/header injection, bypass de `disableFileAccess/disableUrlAccess` → lectura de archivos y SSRF, TLS OAuth2). El fix de nodemailer es rompedor (v9). | `email-server/package.json` |
| A-5 | **XSS en webmail:** `mailSanitizeHtml` es un blocklist que solo remueve `<script>`/`<iframe>`; el cuerpo del correo se inserta con `innerHTML`. Un correo HTML malicioso (ej. `onmouseover=`, `<svg onload=`, `<img src=x onerror=`) ejecuta JS en el contexto de la intranet. | `modules/chatfiat.html:606, 617-620` |

### MEDIO

| # | Hallazgo | Ubicación |
|---|----------|-----------|
| M-1 | **Default abierto sin fila en `usuario_accesos`:** el trabajador "ve todo" (comentado como "config. inicial") y el superadmin está hardcodeado. Combinado con C-1, la autorización es nominal. | `js/access.js:8-16, 129, 136` |
| M-2 | **Fuga de detalles internos:** `asyncHandler` devuelve `err.message` al cliente (hosts IMAP, rutas, cadenas de librerías). | `email-server/server.js:204-208` |
| M-3 | **Datos personales de candidatos accesibles:** `ats_candidatos` permite SELECT a cualquier autenticado (cédula, foto, teléfono, aspiraciones) y las encuestas de bienestar son legibles por todos los autenticados. | `supabase-schema.sql:3523-3536` |
| M-4 | **demo-server sin autenticación:** el puerto 4001 sirve la intranet estática completa y una cuenta demo (`pass: 'demo'`). Seguro solo si nunca sale de localhost. | `email-server/demo-server.js:437, 677-688` |
| M-5 | **Sin rate-limiting:** ni en login (Supabase Auth) ni en la postulación anónima ni en `/api/send` → fuerza bruta y abuso de envío (spam) posibles. | `postulacion/index.html`, `email-server/server.js:454` |
| M-6 | **Schema duplicado:** el archivo contiene el schema dos veces (se re-aplica la 2.ª copia) → riesgo de drift y de políticas duplicadas en conflicto. | `supabase-schema.sql` |
| M-7 | **Fotos como base64 en la tabla** sin límite de tamaño validado en cliente y sin aviso de privacidad para candidatos (LOPDP). | `modules/captacion.html` |

### BAJO / INFORMATIVO

- `js/supabase-config.js` expone la **anon key** (esperado en client-side; correcto). El `service_role` vive solo en `email-server/.env`, que **no está en git** (verificado con `git ls-files`). Correcto.
- Cambio de contraseña verifica la contraseña actual antes de `updateUser` — patrón correcto. (`perfil.html:371-376`)
- `demoPreviewMode` está restringido a localhost. Correcto.
- Sin `child_process`/`exec`, sin `fs` con input del usuario, sin command injection ni path traversal en `email-server`.

---

## 3. C�digo corregido (hallazgos principales)

### C-1 / C-2 � Pol�ticas RLS restrictivas

```sql
-- 1) Impedir que el usuario cambie su propio rol/accesos (usuario_accesos)
drop policy if exists "accesos_public_all" on public.usuario_accesos;

-- Solo el propio usuario puede LEER su fila
create policy "accesos_read_own"
  on public.usuario_accesos for select
  using (trabajador_id = (select id from public.plantilla_trabajadores
          where correo = auth.jwt() ->> 'email' limit 1));

-- Solo el SUPERADMIN (lista expl�cita en una tabla de confianza) modifica
create table if not exists public.app_administradores (
  email text primary key
);
insert into public.app_administradores(email) values ('developer@prueba.dev');

create policy "accesos_admin_all"
  on public.usuario_accesos for all
  using (auth.jwt() ->> 'email' in (select email from public.app_administradores))
  with check (auth.jwt() ->> 'email' in (select email from public.app_administradores));
```

```sql
-- 2) Auditar y cerrar las pol�ticas USING(true) de las tablas sensibles
--    Ejemplo (plantilla_trabajadores): lectura solo para autenticados,
--    escritura SOLO para administradores.
drop policy if exists "plantilla_auth_all" on public.plantilla_trabajadores;

create policy "plantilla_auth_select"
  on public.plantilla_trabajadores for select
  using (auth.role() = 'authenticated');

create policy "plantilla_admin_insert"
  on public.plantilla_trabajadores for insert
  with check (auth.jwt() ->> 'email' in (select email from public.app_administradores));

create policy "plantilla_admin_update"
  on public.plantilla_trabajadores for update
  using (auth.jwt() ->> 'email' in (select email from public.app_administradores))
  with check (auth.jwt() ->> 'email' in (select email from public.app_administradores));

create policy "plantilla_admin_delete"
  on public.plantilla_trabajadores for delete
  using (auth.jwt() ->> 'email' in (select email from public.app_administradores));
```

> Regla de oro: `using (true)` solo para columnas p�blicas. Para el resto, definir por rol/owner. Revisar las 78 tablas con esta query:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and (qual ilike '%true%' or with_check ilike '%true%')
order by tablename;
```

### C-3 � XSS en Captaci�n (escapado + validaci�n de URL)

```js
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Solo permitir URLs http(s) o data:image (foto subida a Storage)
function safeImgUrl(raw) {
  var u = String(raw || '').trim();
  if (/^https?:\/\//i.test(u) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(u)) return u;
  return '';
}

var fotoUrl = safeImgUrl(c.foto_url);
var fotoHtml = fotoUrl
  ? '<div><img src="' + escapeHtml(fotoUrl) + '" style="width:80px;height:80px;object-fit:cover;border:1px solid var(--color-border);"></div>'
  : '<div style="width:80px;height:80px;border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;background:var(--color-bg);"></div>';
```

> Adem�s: quitar la pol�tica `INSERT TO anon` de `ats_candidatos` o limitar los campos que el anon puede escribir; subir la foto a Supabase Storage (`fotos-perfil`) y guardar solo la ruta del bucket, no base64 en la tabla.

### A-5 � Sanitizador allow-list para el webmail

```js
function sanitizeHtml(input) {
  if (!input) return '';
  var doc = new DOMParser().parseFromString(String(input), 'text/html');
  var allow = {
    A: ['href', 'target', 'rel'],
    P: [], BR: [], B: [], STRONG: [], I: [], EM: [], U: [],
    UL: [], OL: [], LI: [], DIV: [], BLOCKQUOTE: [],
    IMG: ['src', 'alt', 'width', 'height']
  };
  function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      if (ch.nodeType === 1) {
        var tag = ch.tagName.toUpperCase();
        if (!allow[tag]) {
          while (ch.firstChild) ch.parentNode.insertBefore(ch.firstChild, ch);
          ch.remove();
          return;
        }
        Array.prototype.slice.call(ch.attributes).forEach(function (a) {
          var name = a.name.toLowerCase();
          if (name === 'href') {
            ch.setAttribute('href', /^https?:/i.test(a.value) ? a.value : '#');
            ch.setAttribute('rel', 'noopener noreferrer');
            ch.setAttribute('target', '_blank');
          } else if (name === 'src' && tag === 'IMG') {
            if (!/^https?:/i.test(a.value)) ch.removeAttribute('src');
          } else if (allow[tag].indexOf(name) === -1) {
            ch.removeAttribute(a.name);
          }
        });
      } else if (ch.nodeType === 8) {
        ch.remove();
      }
      walk(ch);
    });
  }
  walk(doc.body);
  return doc.body ? doc.body.innerHTML : '';
}
// Uso: mailView.innerHTML = sanitizeHtml(mail.html);
```

> Complemento: a�adir CSP en las p�ginas de la intranet para mitigar XSS residual:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; img-src 'self' data: https:;">
```

### A-1 � email-server: token obligatorio + CORS restringido + TLS verificado

```js
const TOKEN = process.env.MAIL_API_TOKEN;
if (!TOKEN) {
  console.error('FATAL: MAIL_API_TOKEN es obligatorio. Aborta.');
  process.exit(1);
}

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false }));

function requireToken(req, res, next) {
  if (req.headers.authorization === 'Bearer ' + TOKEN) return next();
  return res.status(401).json({ error: 'No autorizado' });
}
app.use('/api', requireToken);
```

```js
// imapClient / smtpTransport: eliminar la desactivaci�n de validaci�n TLS
tls: { rejectUnauthorized: true }
// (o al menos a true; si el certificado del dominio tiene CA v�lida, no hace falta "tls")
```

### A-3 � Contrase�as de correo cifradas en reposo

```js
const key = crypto.scryptSync(process.env.ACCOUNTS_ENC_KEY || '', 'fiat', 32);
const iv = crypto.randomBytes(12);

function encryptPass(p) {
  if (!p) return p;
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(String(p), 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') };
}
function decryptPass(e) {
  if (!e) return '';
  if (typeof e === 'string') return e; // migraci�n: plano viejo
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(e.iv, 'base64'));
  d.setAuthTag(Buffer.from(e.tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(e.data, 'base64')), d.final()]).toString('utf8');
}
// usar encryptPass() al guardar (server.js:258) y decryptPass() en imapClient/smtpTransport.
```

### A-2 � Manejo de errores sin fuga de informaci�n

```js
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(err => {
    if (res.headersSent) return next(err);
    console.error('[api]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
```

---

## 4. Plan de remediaci�n (prioridad)

1. **(Inmediato)** Cerrar C-1: pol�ticas de `usuario_accesos` (solo lectura propia + escritura superadmin). Rotar cualquier cuenta creada con rol Administrador.
2. **(Inmediato)** C-2: auditar las 78 tablas con la query de `pg_policies`; reemplazar `USING(true)` por policies de rol/owner. Prioridad a n�mina/salarios/liquidaciones/salud.
3. **(Inmediato)** C-3 y A-5: aplicar sanitizaci�n allow-list y CSP; bloquear `INSERT anon` a `ats_candidatos` o restringir columnas.
4. **(Corto plazo)** A-1/A-2/A-3: token obligatorio, CORS `false`/allowlist, `rejectUnauthorized: true`, cifrar credenciales, no loguear `err.message` al cliente.
5. **(Corto plazo)** A-4: `npm audit fix` (multer) y planificar migraci�n a nodemailer v9 en una rama (cambios de API).
6. **(Mediano plazo)** M-1: migrar el "ve todo" por defecto a un onboarding que cree la fila de accesos al contratar; reemplazar superadmin hardcodeado por `app_administradores`.
7. **(Mediano plazo)** M-4/M-5/M-6: no exponer demo-server fuera de localhost; rate-limit en `/api/send` y postulaci�n; unificar el schema en un solo bloque.
8. **Proceso DevSecOps:** ejecutar `npm audit` en CI, revisar rotaci�n de `SERVICE_ROLE_KEY`/`VAPID_PRIVATE_KEY`, pruebas de seguridad (RLS, XSS), y backup cifrado de `email-server/data`.
