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

Verificación rápida:

```bash
curl http://localhost:4000/api/status
# {"ok":true,"accounts":0,"time":"..."}
```

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

> Si la intranet y la API están en dominios distintos, el servidor ya envía cabeceras CORS abiertas. Para producción conviene restringirlas en `server.js`.

## Seguridad

- Las contraseñas quedan en texto plano en `email-server/data/accounts.json`. En producción:
  - Proteger ese archivo (permisos `600`) y la carpeta `data/`.
  - Opcional: definir `MAIL_API_TOKEN` en `.env`; si se define, todas las peticiones deben incluir `Authorization: Bearer <token>` y el frontend debe enviarlo.
  - Cifrar las contraseñas (p. ej. `crypto` con clave en `.env`) en una mejora posterior.
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
