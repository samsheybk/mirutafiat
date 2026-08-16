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

Verificación rápida (la API exige autenticación):

```bash
curl -H "Authorization: Bearer $MAIL_API_TOKEN" http://localhost:4000/api/status
# {"ok":true,"accounts":0,"time":"..."}
```

## Ver el webmail SIN dominio real (modo demo)

Para ver el módulo de Mensajería **ya configurado con datos de ejemplo** (sin cuentas de correo, sin dominio y sin credenciales):

```bash
cd email-server
npm run demo
```

Luego abre en el navegador:

```
http://localhost:4001/modules/chatfiat.html?demo=1
```

Qué incluye la demo (todo en memoria, se reinicia al detener el servidor):

- Cuenta precargada **Recursos Humanos** (`rrhh@fiat-ve.com`) con bandejas INBOX (13 no leídos), Enviados, Borradores, spam y Papelera.
- ~22 correos de ejemplo (banco, gerencia, compañeros, proveedores, notificaciones del sistema) con HTML, adjuntos descargables y búsqueda.
- Envío de correos (se guardan en Enviados), responder, marcar importante, eliminar y gestionar cuentas desde **Cuentas → Probar conexión**.

### Interruptor Demo (forma recomendada)

Para alternar **entre el servidor real y los datos demo sin cambiar nada**, levanta **ambos** servidores a la vez:

```bash
cd email-server
npm run servers     # real en 4000 + demo en 4001
```

Luego entra a la intranet como **administrador** (con tu sesión real, ej. `npm run dev` en la raíz) y, dentro del módulo **Mensajería → Correo**, activa el interruptor **Demo** que aparece en la barra de herramientas (solo visible para administradores y en localhost). El webmail carga las cuentas del demo (`rrhh@fiat-ve.com`) y lo puedes apagar para volver a tu servidor real.

El interruptor recuerda la elección en el navegador y, si el servidor seleccionado no está corriendo, se muestra el aviso de "servidor no disponible" en lugar de un error confuso.

El `?demo=1` solo funciona en `localhost`/`127.0.0.1` y solo sirve para previsualizar la interfaz sin sesión; en cualquier otro host no tiene efecto y el acceso normal no cambia.

> Nota: también puedes verlo con tu sesión real de la intranet levantando `npm run dev` (puerto 3000) y el servidor demo en el 4001.

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
| POST | `/api/accounts/:id/test` | Probar conexión IMAP |
| GET | `/api/mailboxes?account=ID` | Lista bandejas + no leídos |
| GET | `/api/messages?account=ID&mailbox=INBOX&page=1&per=40&q=` | Lista mensajes (search opcional) |
| GET | `/api/messages/:uid?account=ID&mailbox=INBOX` | Abrir mensaje (texto/html/adjuntos) |
| GET | `/api/messages/:uid/attachment/:index?account=ID&mailbox=INBOX` | Descargar adjunto |
| POST | `/api/send` | Enviar correo (multipart, adjuntos) |
| POST | `/api/messages/:uid/flags` | Marcar/desmarcar (`\Seen`, `\Flagged`) |
| DELETE | `/api/messages/:uid?account=ID&mailbox=INBOX` | Eliminar mensaje |
| POST | `/api/messages/:uid/move` | Mover a otra bandeja |

### Parámetros comunes

- `account`: id de la cuenta (`/api/accounts`).
- `mailbox`: nombre de la bandeja (defecto `INBOX`).
- `page`/`per`: paginación de mensajes.
- `q`: búsqueda por texto (remitente, asunto, cuerpo).

## Límites conocidos

- Gmail gratis: máximo ~2500 envíos/día y límites de conexiones IMAP. Suficiente para intranet.
- `GET /api/messages` carga el listado completo de la bandeja (máx. 1000) antes de paginar; en bandejas gigantes conviene optimizar con búsqueda por fecha.
- El envío usa texto plano + HTML simple; no soporta firma digital ni cifrado S/MIME.
