/*
 * ElektroLearn admin <-> mobile platforma almashtirgich.
 * Navigator (navigator/server/index.js switcherMain) dan ko'chirilgan.
 * admin-panel/server/index.js /__switcher.js sifatida beradi va HTML ga qo'shadi.
 */
(function () {
  var SWITCHER_HIDE_DELAY = 3000;
  var ROLES = ['SUPERADMIN', 'MODERATOR', 'APPROVER', 'ACCOUNTING'];
  var script = document.currentScript;
  var current = (script && script.getAttribute('data-app')) || null;
  if (current !== 'admin' && current !== 'mobile') current = null;

  function isBlockedEnv() {
    if (/elektrolearn-mobile/i.test(window.location.hostname)) return true;
    var cap = window.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  }

  function hasAdminAccess() {
    try {
      var token = localStorage.getItem('accessToken');
      var user = JSON.parse(localStorage.getItem('user') || 'null');
      if (!token || !user) return false;
      if (user.adminAccess === true) return true;
      if (user.adminAccess === false) return false;
      return ROLES.indexOf(String(user.role)) >= 0;
    } catch (e) {
      return false;
    }
  }

  function switcherMain(current) {
    if (window.top !== window || document.getElementById('__switcher')) {
      return;
    }

    const items = [
      {
        label: 'Mobile',
        href: '/mobile/learn',
        key: 'mobile',
        icon:
          '<rect x="7" y="2.5" width="10" height="19" rx="2"/>' +
          '<path d="M10 5h4M11 18.5h2"/>'
      },
      {
        label: 'Admin panel',
        href: '/admin/dashboard/home',
        key: 'admin',
        icon:
          '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
          '<path d="M3 9h18M8 9v11"/>' +
          '<path d="M12 13h5m-5 3h5"/>'
      }
    ];

    let visible = false;
    let expanded = false;
    let pointerInside = false;
    let timer = null;

    const host = document.createElement('div');
    host.id = '__switcher';

    host.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:2147483647',
      'width:48px',
      'height:48px',
      'font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
      'color:#eef3f8',
      'opacity:0',
      'visibility:hidden',
      'transform:translateY(8px)',
      'transition:opacity 220ms ease,transform 220ms ease',
      'pointer-events:none'
    ].join(';');

    const root = host.attachShadow({ mode: 'open' });

    root.innerHTML = `
      <style>
        :host {
          color-scheme: dark;
        }

        * {
          box-sizing: border-box;
        }

        .dock {
          position: absolute;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 7px;
          border: 1px solid #303b49;
          border-radius: 15px;
          background: #111720;
          box-shadow: 0 12px 36px rgba(0,0,0,.36);
          opacity: 0;
          visibility: hidden;
          transform: translateY(6px) scale(.96);
          transform-origin: bottom center;
          transition:
            opacity 180ms ease,
            transform 180ms ease,
            visibility 180ms;
        }

        .dock.expanded .menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        button, a {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          place-items: center;
          padding: 0;
          border: 1px solid transparent;
          border-radius: 10px;
          color: #aab7c7;
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
          transition:
            color 160ms ease,
            background 160ms ease,
            border-color 160ms ease;
        }

        button:hover, a:hover {
          color: #f4f7fb;
          border-color: #394859;
          background: #202b38;
        }

        button:focus-visible, a:focus-visible {
          outline: 2px solid #b9cee3;
          outline-offset: 2px;
        }

        a.active {
          color: #e3edf8;
          border-color: #43566c;
          background: #202d3b;
        }

        svg {
          width: 19px;
          height: 19px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
          pointer-events: none;
        }

        .trigger {
          display: grid;
          width: 46px;
          height: 46px;
          place-items: center;
          border: 1px solid #46576a;
          border-radius: 14px;
          color: #e5edf6;
          background: #151d27;
          box-shadow: 0 5px 22px rgba(0,0,0,.24);
        }

        .trigger:hover,
        .trigger[aria-expanded="true"] {
          color: #f7faff;
          border-color: #8299b2;
          background: #202c3a;
        }

        .trigger svg {
          width: 21px;
          height: 21px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            transition-duration: .01ms !important;
          }
        }
      </style>

      <div class="dock">
        <div class="menu" role="group" aria-label="Platformani tanlash"></div>

        <button
          class="trigger"
          type="button"
          aria-label="Platformalarni ochish"
          aria-expanded="false"
          aria-controls="platform-menu"
          title="Platformalar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
          </svg>
        </button>
      </div>
    `;

    const dock = root.querySelector('.dock');
    const menu = root.querySelector('.menu');
    const trigger = root.querySelector('.trigger');

    menu.id = 'platform-menu';

    items.forEach((item) => {
      const link = document.createElement('a');

      link.href = item.href;
      link.title = item.label;
      link.setAttribute('aria-label', item.label);

      if (item.key === current) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }

      link.innerHTML =
        `<svg viewBox="0 0 24 24" aria-hidden="true">` + `${item.icon}</svg>`;

      menu.appendChild(link);
    });

    function clearHideTimer() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function show() {
      clearHideTimer();
      visible = true;

      host.style.visibility = 'visible';
      host.style.opacity = '1';
      host.style.transform = 'translateY(0)';
      host.style.pointerEvents = 'auto';
    }

    function hide() {
      if (pointerInside || root.activeElement) return;

      visible = false;
      expanded = false;

      dock.classList.remove('expanded');
      trigger.setAttribute('aria-expanded', 'false');

      host.style.opacity = '0';
      host.style.transform = 'translateY(8px)';
      host.style.pointerEvents = 'none';

      clearHideTimer();

      timer = setTimeout(() => {
        timer = null;

        if (!pointerInside && !root.activeElement && !visible) {
          host.style.visibility = 'hidden';
        }
      }, 240);
    }

    function scheduleHide() {
      clearHideTimer();

      timer = setTimeout(() => {
        timer = null;
        hide();
      }, SWITCHER_HIDE_DELAY);
    }

    function openMenu() {
      show();

      expanded = !expanded;

      dock.classList.toggle('expanded', expanded);
      trigger.setAttribute('aria-expanded', String(expanded));

      if (expanded) {
        clearHideTimer();
      } else {
        scheduleHide();
      }
    }

    trigger.addEventListener('click', openMenu);

    /* Cursor dock ustida bo'lsa, yashirmaymiz. */
    host.addEventListener('pointerenter', () => {
      pointerInside = true;
      show();
    });

    host.addEventListener('pointerleave', () => {
      pointerInside = false;
      scheduleHide();
    });

    /*
     * Ko'rinmas trigger zonasi.
     * Kursor burchakka kirsa dock ko'rinadi.
     * Kursor zonada tursa, dock yashirilmaydi.
     */
    const sensor = document.createElement('div');

    sensor.id = '__switcher_sensor';
    sensor.setAttribute('aria-hidden', 'true');

    sensor.style.cssText = [
      'position:fixed',
      'right:0',
      'bottom:0',
      'width:88px',
      'height:88px',
      'z-index:2147483646',
      'background:transparent',
      'pointer-events:auto'
    ].join(';');

    sensor.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;

      show();
    });

    sensor.addEventListener('pointerleave', () => {
      scheduleHide();
    });

    /*
     * Klaviatura orqali foydalanish.
     */
    host.addEventListener('focusin', () => {
      show();
    });

    host.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!root.activeElement) {
          scheduleHide();
        }
      }, 0);
    });

    /*
     * Touch qurilmada ko'rinmas sensorni bosish
     * switcherni ko'rsatadi.
     */
    sensor.addEventListener('click', (event) => {
      if (event.pointerType !== 'touch') return;

      show();
      expanded = !expanded;

      dock.classList.toggle('expanded', expanded);
      trigger.setAttribute('aria-expanded', String(expanded));

      if (expanded) {
        clearHideTimer();
      } else {
        scheduleHide();
      }
    });

    document.body.appendChild(sensor);
    document.body.appendChild(host);
  }

  if (isBlockedEnv()) return;

  function tryMount() {
    if (!document.body) return false;
    var existing = document.getElementById('__switcher');
    var allowed = hasAdminAccess();
    if (allowed && !existing) switcherMain(current);
    if (!allowed && existing) {
      existing.remove();
      var sensor = document.getElementById('__switcher_sensor');
      if (sensor) sensor.remove();
    }
    return true;
  }

  // Login SPA ichida bo'lgani uchun localStorage o'zgarishini kuzatamiz.
  tryMount();
  window.setInterval(tryMount, 1500);
  window.addEventListener('storage', tryMount);
})();
