(function () {
  'use strict';

  var PHRASES = [
    'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
    'No cuentes los días, haz que los días cuenten.',
    'El único modo de hacer un gran trabajo es amar lo que haces.',
    'Cree en ti y todo será posible.',
    'Cada día es una nueva oportunidad para mejorar.',
    'El trabajo en equipo divide la tarea y multiplica los resultados.',
    'La disciplina es el puente entre las metas y los logros.',
    'Tu actitud determina tu dirección.',
    'Pequeños pasos cada día te llevan a grandes logros.',
    'La excelencia no es un acto, sino un hábito.',
    'Juntos somos más fuertes.',
    'Haz de hoy un día que valga la pena recordar.'
  ];

  var idx = 0;
  var timer = null;

  function setPhrase(i, animate) {
    var total = PHRASES.length;
    idx = ((i % total) + total) % total;
    var el = document.getElementById('homePhrase');
    if (!el) return;
    el.classList.remove('show');
    setTimeout(function () {
      el.textContent = PHRASES[idx];
      el.classList.add('show');
    }, animate === false ? 0 : 300);
    var dots = document.querySelectorAll('.home-dot');
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('active', d === idx);
    }
  }

  function restart() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () { setPhrase(idx + 1); }, 6000);
  }

  function buildDots() {
    var container = document.getElementById('homeDots');
    if (!container) return;
    for (var i = 0; i < PHRASES.length; i++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'home-dot' + (n === 0 ? ' active' : '');
        b.setAttribute('aria-label', 'Frase ' + (n + 1));
        b.addEventListener('click', function () {
          setPhrase(n);
          restart();
        });
        container.appendChild(b);
      })(i);
    }
  }

  function loadName() {
    var el = document.getElementById('homeName');
    if (!el) return;
    getCurrentUser()
      .then(function (user) {
        var email = String((user && user.email) || '').trim().toLowerCase();
        if (!email) throw new Error('sin sesión');
        return supabaseClient
          .from('plantilla_trabajadores')
          .select('nombres, apellidos')
          .ilike('correo', email)
          .limit(1)
          .maybeSingle();
      })
      .then(function (res) {
        var w = res && res.data;
        var nombre = ((w && (w.nombres || '')) + ' ' + (w && (w.apellidos || ''))).trim();
        if (!nombre) throw new Error('sin nombre');
        el.textContent = nombre;
      })
      .catch(function () {
        getCurrentUser()
          .then(function (user) {
            var fallback = String((user && user.email) || '').split('@')[0];
            if (fallback) el.textContent = fallback;
          })
          .catch(function () {});
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildDots();
    setPhrase(0, false);
    restart();
    loadName();
  });
})();
