/* ============================================================
 * ALERTAS DE COMPROMISOS DE ACTAS (campana global)
 * - Inyecta una campana con contador en la barra superior.
 * - Dispara los recordatorios por fecha tope (RPC generar_alertas_actas).
 * - Muestra las alertas del trabajador autenticado (RLS por correo).
 * Cargado automáticamente por js/module-help.js en todas las páginas.
 * ============================================================ */
(function () {
  'use strict';

  var inModules = location.pathname.indexOf('/modules/') !== -1;
  var panel = null;
  var panelAbierto = false;

  function urlRelaciones() {
    return (inModules ? '../' : '') + 'relaciones-laborales.html#actas';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tipoLabel(t) {
    if (t === 'acuerdo_vencido') return 'Vencido';
    if (t === 'acuerdo_por_vencer') return 'Por vencer';
    return 'Nuevo';
  }

  function fmtFechaHora(s) {
    if (!s) return '';
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    var fecha = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    var hora = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    return fecha + ' · ' + hora;
  }

  function inyectarCampana() {
    if (document.getElementById('navAlertaBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'navAlertaBtn';
    btn.type = 'button';
    btn.className = 'nav-alerta-btn';
    btn.title = 'Alertas de compromisos';
    btn.style.display = 'none';
    btn.innerHTML = '<i class="fi fi-sr-bell-ring"></i><span id="navAlertaBadge" class="nav-alerta-badge" style="display:none;">0</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });

    var navUser = document.querySelector('.nav-user');
    var ref = navUser || document.getElementById('navSelect');
    if (ref) {
      ref.parentNode.insertBefore(btn, ref);
    } else {
      document.body.appendChild(btn);
    }

    panel = document.createElement('div');
    panel.id = 'navAlertaPanel';
    panel.className = 'nav-alerta-panel';
    panel.style.display = 'none';
    document.body.appendChild(panel);

    document.addEventListener('click', function (e) {
      if (panelAbierto && !btn.contains(e.target) && !panel.contains(e.target)) cerrarPanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarPanel();
    });
    window.addEventListener('scroll', function () {
      if (panelAbierto) posicionarPanel();
    }, true);
    window.addEventListener('resize', function () {
      if (panelAbierto) posicionarPanel();
    });
  }

  function posicionarPanel() {
    if (!panel) return;
    var btn = document.getElementById('navAlertaBtn');
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  }

  function togglePanel() {
    if (panelAbierto) {
      cerrarPanel();
      return;
    }
    cargarAlertas();
    panel.style.display = 'flex';
    panelAbierto = true;
    posicionarPanel();
  }

  function cerrarPanel() {
    if (!panel) return;
    panel.style.display = 'none';
    panelAbierto = false;
  }

  function cargarAlertas() {
    if (typeof supabaseClient === 'undefined') return;
    supabaseClient.from('rl_acta_alertas')
      .select('id, acta_id, tipo, mensaje, fecha_tope, leido, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(function (res) {
        if (res.error) return;
        var items = res.data || [];
        var noLeidas = items.filter(function (a) { return !a.leido; }).length;
        var badge = document.getElementById('navAlertaBadge');
        if (badge) {
          badge.textContent = noLeidas > 99 ? '99+' : String(noLeidas);
          badge.style.display = noLeidas ? '' : 'none';
        }
        var btn = document.getElementById('navAlertaBtn');
        if (btn) btn.style.display = (noLeidas > 0 || panelAbierto) ? '' : 'none';
        pintarPanel(items);
      });
  }

  function pintarPanel(items) {
    if (!panel) return;
    var noLeidas = items.filter(function (a) { return !a.leido; }).length;

    var html = '<div class="nav-alerta-head"><strong>Compromisos asignados</strong>'
      + '<button type="button" class="nav-alerta-readall" id="navAlertaReadAll"' + (noLeidas ? '' : ' style="display:none;"') + '>Marcar todas leídas</button></div>';

    if (!items.length) {
      html += '<div class="nav-alerta-empty">No tienes alertas pendientes</div>';
    } else {
      html += '<div class="nav-alerta-list">';
      items.forEach(function (a) {
        html += '<div class="nav-alerta-item' + (a.leido ? ' leido' : '') + '" data-id="' + a.id + '">'
          + '<span class="nav-alerta-tipo ' + esc(a.tipo) + '">' + esc(tipoLabel(a.tipo)) + '</span>'
          + '<div class="nav-alerta-msg">' + esc(a.mensaje) + '</div>'
          + (a.fecha_tope ? '<div class="nav-alerta-fecha">Fecha tope: ' + esc(String(a.fecha_tope).slice(0, 10)) + '</div>' : '')
          + '<div class="nav-alerta-hora">' + esc(fmtFechaHora(a.created_at)) + '</div>'
          + '</div>';
      });
      html += '</div>';
    }
    panel.innerHTML = html;

    var itemsEls = panel.querySelectorAll('.nav-alerta-item');
    for (var i = 0; i < itemsEls.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          marcarLeida(el.getAttribute('data-id'));
          cerrarPanel();
          window.location.href = urlRelaciones();
        });
      })(itemsEls[i]);
    }

    var readAll = document.getElementById('navAlertaReadAll');
    if (readAll) {
      readAll.addEventListener('click', function (e) {
        e.stopPropagation();
        marcarTodasLeidas();
      });
    }
  }

  function marcarLeida(id) {
    if (typeof supabaseClient === 'undefined') return;
    supabaseClient.from('rl_acta_alertas').update({ leido: true }).eq('id', id).then(function (res) {
      if (!res.error) cargarAlertas();
    });
  }

  function marcarTodasLeidas() {
    if (typeof supabaseClient === 'undefined') return;
    supabaseClient.from('rl_acta_alertas').update({ leido: true }).eq('leido', false).then(function (res) {
      if (!res.error) cargarAlertas();
    });
  }

  function init() {
    inyectarCampana();
    if (typeof supabaseClient !== 'undefined') {
      supabaseClient.rpc('generar_alertas_actas').then(function () {
        cargarAlertas();
      }).catch(function () {
        cargarAlertas();
      });
      setInterval(function () {
        supabaseClient.rpc('generar_alertas_actas').then(function () {
          cargarAlertas();
        });
      }, 90000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
