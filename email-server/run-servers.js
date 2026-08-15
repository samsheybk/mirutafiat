/*
 * Fiat Email Server — arranca los DOS servidores a la vez:
 *   - Servidor real (API IMAP/SMTP) -> puerto 4000
 *   - Servidor demo (datos de ejemplo) -> puerto 4001
 * El webmail (interruptor Demo, solo admin) alterna entre ambos.
 *
 * Uso: npm run servers   (Ctrl+C detiene ambos)
 */
const { spawn } = require('child_process');
const path = require('path');

const servers = [
  { name: 'REAL (IMAP/SMTP)', file: 'server.js', port: 4000 },
  { name: 'DEMO (datos de ejemplo)', file: 'demo-server.js', port: 4001 }
];

const children = [];
function stopAll() {
  children.forEach((c) => { try { c.kill(); } catch (e) {} });
  process.exit(0);
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

for (const s of servers) {
  const env = Object.assign({}, process.env);
  env[s.port === 4000 ? 'PORT' : 'DEMO_PORT'] = String(s.port);
  const child = spawn(process.execPath, [path.join(__dirname, s.file)], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env
  });
  child.stdout.on('data', (d) => process.stdout.write('[' + s.name + '] ' + d));
  child.on('error', (e) => { console.error('Error iniciando ' + s.name + ': ' + e.message); stopAll(); });
  child.on('exit', (code) => { console.log(s.name + ' terminó (código ' + code + '). Deteniendo ambos.'); stopAll(); });
  children.push(child);
}
console.log('FIAT EMAIL — servidores iniciados (Ctrl+C detiene ambos).');
