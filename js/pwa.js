/* ============================================
   PWA: service worker + notificaciones push
   - Registra el service worker (sw.js).
   - Gestiona la suscripción de Web Push del
     usuario y la guarda en Supabase
     (tabla push_subscriptions) con su correo.
   - window.fiatPush.test() envía una notificación
     de prueba vía el servidor de correo.
   ============================================ */
(function () {
  'use strict';

  /* Clave pública VAPID (no es secreta). Debe coincidir con la
     VAPID_PRIVATE_KEY del email-server/.env */
  var VAPID_PUBLIC_KEY = 'BFiQv0ZJjrPrGwsebHyarxvgmhhaakIvSIan-hxFe1yRAMuY-DjPJVnZ6SymEZPhnQ3wfXV5V14pA-z83Btr588';
  var TABLE = 'push_subscriptions';
  var MAIL_API_REAL = 'http://localhost:4000/api';

  var pwa = { state: { registered: false, subscribed: false, sub: null } };

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function mailApiBase() {
    return MAIL_API_REAL;
  }

  function sessionEmail() {
    if (typeof supabaseClient === 'undefined') return Promise.resolve('');
    return supabaseClient.auth.getSession().then(function (res) {
      var s = res.data && res.data.session;
      return (s && s.user && s.user.email) || '';
    }).catch(function () { return ''; });
  }

  function register() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(false);
    if (pwa.state.registered) return Promise.resolve(true);
    return navigator.serviceWorker.register('/sw.js').then(function () {
      pwa.state.registered = true;
      return true;
    }).catch(function () { return false; });
  }

  function subscribe() {
    return register().then(function (ok) {
      if (!ok) return null;
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (existing) {
          if (existing) {
            pwa.state.sub = existing;
            pwa.state.subscribed = true;
            return existing;
          }
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          }).then(function (sub) {
            pwa.state.sub = sub;
            pwa.state.subscribed = true;
            return sub;
          });
        });
      });
    });
  }

  function saveSubscription(email) {
    if (!pwa.state.sub || !email) return Promise.resolve();
    var j = pwa.state.sub.toJSON();
    var payload = {
      trabajador_email: email,
      endpoint: j.endpoint,
      keys_auth: (j.keys && j.keys.auth) || '',
      keys_p256dh: (j.keys && j.keys.p256dh) || '',
      user_agent: navigator.userAgent || ''
    };
    if (typeof supabaseClient === 'undefined') return Promise.resolve();
    return supabaseClient.from(TABLE).upsert(payload, { onConflict: 'endpoint' });
  }

  function sendTest(sub) {
    var payload = {
      title: 'Intranet FIAT',
      body: 'Notificación de prueba. Si la ves, las notificaciones están funcionando.',
      url: '/dashboard.html'
    };
    return sessionEmail().then(function (email) {
      return fetch(mailApiBase() + '/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, subscription: { endpoint: sub.endpoint, keys: sub.toJSON().keys }, payload: payload })
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.error || 'Error al enviar la notificación'); });
        return res.json();
      });
    });
  }

  function test() {
    var doSub = pwa.state.sub ? Promise.resolve(pwa.state.sub) : subscribe();
    return doSub.then(function (sub) {
      if (!sub) throw new Error('Tu navegador no soporta notificaciones o no diste permiso. Revisa los ajustes del sitio.');
      pwa.state.sub = sub;
      pwa.state.subscribed = true;
      return sessionEmail().then(function (email) {
        return saveSubscription(email);
      }).then(function () { return sendTest(sub); });
    });
  }

  function init() {
    if (pwa.state.registered) return;
    if (typeof demoPreviewMode === 'function' && demoPreviewMode()) return;
    register().then(function () {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription();
      }).then(function (sub) {
        if (sub) { pwa.state.sub = sub; pwa.state.subscribed = true; }
      }).catch(function () {});
    });
  }

  pwa.init = init;
  pwa.test = test;
  pwa.subscribe = subscribe;
  window.fiatPush = pwa;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
