# Fiat Email Server

API REST de correo electrónico (IMAP/SMTP) para el módulo **Mensajería → Correo** de la intranet.
Compatible con cuentas de **cPanel**, Gmail (IMAP/SMTP con contraseña de aplicación) y cualquier servidor IMAP/SMTP.

## Requisitos

- Node.js 18+.
- Cuentas de correo con acceso IMAP habilitado (en cPanel salen activadas por defecto).
- El despliegue se hace por **Setup Node.js App** de cPanel (ver más abajo) o un VPS con Node.

## Instalación y arranque

```bash
cd email-server
npm install
cp .env.example .env   # ajustar valores si hace falta
npm start              # escucha en http://localhost:4000
```

> **Seguridad (M-4):** tanto la API real como el modo demo escuchan por defecto
> **solo en `127.0.0.1`** (loopback), porque el webmail consulta siempre
> `localhost`. Si despliegas tras un reverse proxy, déjalo en `127.0.0.1` (el
> proxy conecta por loopback). Solo cambia `HOST`/`DEMO_HOST` si necesitas
> exponerlo en red de forma explícita (no recomendado; el demo **no** tiene
> autenticación).

Verificación rápida (la API exige autenticación):

```bash
curl -H "Authorization: Bearer $MAIL_API_TOKEN" http://localhost:4000/api/status
# {"ok":true,"accounts":0,"oauth":false,"time":"..."}
```

## Ver el webmail (cuentas reales)

El módulo **Mensajería → Correo** usa siempre el servidor real (puerto 4000) y no
incluye modo demo. Configura una cuenta real (Gmail o cPanel) desde
**Cuentas → Proveedor → Gmail / cPanel** en la interfaz.

> El servidor demo (`demo-server.js`, puerto 4001) quedó obsoleto: ya no hay
> interruptor en la interfaz y no es necesario para usar el correo real.

## Configuración de cuentas

Desde la interfaz: módulo **Mensajería → Correo → Cuentas**. Se pide:

| Campo | Ejemplo |
|---|---|
| Nombre de la cuenta | RRHH |
| Servidor IMAP | `mail.tudominio.com` (o el hostname del servidor) |
| Puerto IMAP | `993` (SSL) |
| Servidor SMTP | `mail.tudominio.com` |
| Puerto SMTP | `465` (SSL) |
| Usuario | `rrhh@tudominio.com` (correo completo) |
| Contraseña | la de la cuenta de correo |

Las cuentas se guardan en `email-server/data/accounts.json` (no versionado).

Opcionalmente se pueden precargar a mano en ese archivo:

```json
[
  {
    "id": "abc123",
    "name": "RRHH",
    "imapHost": "mail.tudominio.com",
    "imapPort": 993,
    "imapSecure": true,
    "smtpHost": "mail.tudominio.com",
    "smtpPort": 465,
    "smtpSecure": true,
    "user": "rrhh@tudominio.com",
    "pass": "LA-CONTRASEÑA",
    "fromName": "Recursos Humanos"
  }
]
```

## Conectar Gmail con Google OAuth (botón "Conectar con Gmail")

En el modal **Cuentas** hay un botón **Conectar con Gmail (Google)** que inicia el
flujo OAuth 2.0: el usuario autoriza en Google y la cuenta se crea sola
(authType `oauth`), sin contraseña de aplicación.

### 1. Crear el cliente OAuth en Google Cloud

1. Entra en <https://console.cloud.google.com/apis/credentials> (consola del proyecto).
2. **Crear credenciales → ID de cliente de OAuth → Aplicación web**.
3. En **URIs de redireccionamiento autorizados** agrega exactamente:
   `http://localhost:4000/oauth/google/callback` (o la URL pública de la API en producción).
4. Guarda el **ID de cliente** y el **secreto** en `email-server/.env`:

```env
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:4000/oauth/google/callback
```

5. Activa la API **Gmail API** en <https://console.cloud.google.com/apis/library/gmail.googleapis.com>
   (no es estrictamente necesaria para IMAP, pero evita errores de consentimiento).
6. El flujo usa el alcance sensible `https://mail.google.com/`. Mientras la app
   está en **modo pruebas**, Google mostrará el aviso *"app no verificada"* →
   **Acceso avanzado → Continuar**. Para quitar ese aviso hay que solicitar la
   verificación de la app (solo cuando se publique).

### 2. Variables adicionales

- `GOOGLE_STATE_SECRET`: firma el `state` de OAuth (CSRF). Vacío ⇒ usa `ACCOUNTS_ENC_KEY`.
- `INTRANET_ORIGINS`: orígenes permitidos para volver tras autorizar (por defecto
  `http://localhost:3000,http://127.0.0.1:3000`).

### 3. Comportamiento

- Los tokens (refresh + access) se guardan cifrados en el campo `googleTokens` de la cuenta.
- El access token se renueva solo (refresh token) al conectar IMAP o enviar SMTP.
- El dueño de la cuenta se fija en el correo del trabajador autenticado en la intranet.
- Si una cuenta Gmail ya existe (mismo `user` y dueño), solo se actualizan sus tokens.

## Despliegue en cPanel

1. Subir la carpeta `email-server/` (sin `node_modules`) al hosting.
2. En cPanel abrir **Setup Node.js App**:
   - **Application root**: `email-server`
   - **Application startup file**: `server.js`
   - **Application URL**: la URL pública deseada (ej. `https://intranet.tudominio.com/correo-api/`).
3. Guardar y luego abrir la terminal de la app para ejecutar `npm install` (o instalar en local y subir `node_modules`).
4. En el módulo Mensajería, ajustar la constante `MAIL_API` en `modules/chatfiat.html`:

```js
var MAIL_API = 'https://intranet.tudominio.com/correo-api/api';
```

> Si la intranet y la API están en dominios distintos, configura en `.env` la variable `CORS_ORIGIN` con la lista de orígenes permitidos (separados por coma). Si se deja vacía, la API solo acepta peticiones del mismo origen.

## Seguridad

- **Autenticación obligatoria**: todas las rutas `/api/*` exigen un token válido:
  1. `Authorization: Bearer <MAIL_API_TOKEN>` (token de operaciones definido en `.env`), o
  2. `Authorization: Bearer <access_token de la sesión Supabase>`, validado contra `{SUPABASE_URL}/auth/v1/user`. El webmail envía este token automáticamente, por lo que no es necesario (ni recomendado) guardar `MAIL_API_TOKEN` en el frontend.
  - El servidor aborta el arranque si no hay ningún método de autenticación configurado (`MAIL_API_TOKEN` vacío y sin `SUPABASE_URL`).
  - El dueño de una cuenta privada se deduce del token verificado, no de la cabecera `x-owner-email` (que deja de ser fiable).
- **CORS restringido**: por defecto sin cross-origin. Definir `CORS_ORIGIN` con los orígenes de la intranet.
- **TLS verificado**: `TLS_REJECT_UNAUTHORIZED=1` (por defecto) verifica el certificado de los servidores IMAP/SMTP. Poner `0` solo si el servidor de correo usa un certificado auto-firmado.
- **Contraseñas cifradas en reposo**: si defines `ACCOUNTS_ENC_KEY` en `.env`, las contraseñas de `data/accounts.json` se guardan cifradas con AES-256-GCM. Sin esa clave se guardan en texto plano (no recomendado).
  - Migración: las claves ya guardadas en texto plano se siguen leyendo; al editar la cuenta se cifran automáticamente.
- Proteger `data/` (permisos `600`) y rotar `ACCOUNTS_ENC_KEY`, `MAIL_API_TOKEN` y `SERVICE_ROLE_KEY` periódicamente.
- Usar siempre IMAP/SMTP por SSL (993/465).

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/status` | Estado del servidor |
| GET | `/api/accounts` | Lista cuentas (sin contraseñas) |
| POST | `/api/accounts` | Crear cuenta |
| PUT | `/api/accounts/:id` | Actualizar cuenta |
| DELETE | `/api/accounts/:id` | Eliminar cuenta |
| POST | `/api/accounts/:id/disconnect` | Desvincular cuenta OAuth (revoca el token de Google y elimina la cuenta) |
| POST | `/api/accounts/:id/test` | Probar conexión IMAP |
| GET | `/api/mailboxes?account=ID` | Lista bandejas + no leídos |
| GET | `/api/messages?account=ID&mailbox=INBOX&page=1&per=40&q=` | Lista mensajes (search opcional) |
| GET | `/api/messages/:uid?account=ID&mailbox=INBOX` | Abrir mensaje (texto/html/adjuntos) |
| GET | `/api/messages/:uid/attachment/:index?account=ID&mailbox=INBOX` | Descargar adjunto |
| POST | `/api/send` | Enviar correo (multipart, adjuntos) |
| POST | `/api/messages/:uid/flags` | Marcar/desmarcar (`\Seen`, `\Flagged`) |
| DELETE | `/api/messages/:uid?account=ID&mailbox=INBOX` | Eliminar mensaje |
| POST | `/api/messages/:uid/move` | Mover a otra bandeja |
| GET | `/oauth/google/start?owner=&return=` | Inicia OAuth de Google (redirige a Google; sin auth, solo navegación) |
| GET | `/oauth/google/callback?code=&state=` | Callback de Google (crea la cuenta y redirige a `return` con `?oauth=ok\|err`) |

### Parámetros comunes

- `account`: id de la cuenta (`/api/accounts`).
- `mailbox`: nombre de la bandeja (defecto `INBOX`).
- `page`/`per`: paginación de mensajes.
- `q`: búsqueda por texto (remitente, asunto, cuerpo).

## Límites conocidos

- Gmail gratis: máximo ~2500 envíos/día y límites de conexiones IMAP. Suficiente para intranet.
- `GET /api/messages` carga el listado completo de la bandeja (máx. 1000) antes de paginar; en bandejas gigantes conviene optimizar con búsqueda por fecha.
- El envío usa texto plano + HTML simple; no soporta firma digital ni cifrado S/MIME.
