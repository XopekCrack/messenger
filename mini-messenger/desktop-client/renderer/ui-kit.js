// Общий модуль клиента: подключается на каждой странице после theme.css.
// 1) Иконки — inline SVG вместо эмодзи. В собранном .exe у пользователей часто нет цветного
//    эмодзи-шрифта (особенно на урезанных/старых системах), из-за чего эмодзи не рисуются вовсе —
//    SVG с currentColor рендерится всегда одинаково, независимо от шрифтов, установленных в системе.
// 2) Тема — читает настройки и выставляет data-theme на <html>, обновляется вживую.
// 3) uiAlert/uiConfirm — модальные окна в стиле клиента вместо системных alert/confirm.

(function () {
  // Пользователь, ЕДИНСТВЕННОЕ активное подключение которого — веб-панель администратора (host из
  // connectPresenceWs() в public/index.html), физически не может получить ни сообщение, ни файл —
  // у веб-панели нет интерфейса чата, она только для управления организацией. Писать/отправлять файл
  // такому человеку бессмысленно, поэтому это запрещено — и в ростере, и в уже открытом окне чата —
  // пока у него не появится ещё один хост (запущен десктоп-клиент на реальном ПК) вдобавок к веб-панели.
  window.ADMIN_WEB_HOSTNAME = 'Веб-панель администратора';
  window.canReceiveMessages = (hosts) => {
    if (!hosts || !hosts.length) return true; // офлайн — обычный случай, не блокируем: сообщение дождётся его
    return hosts.some((h) => h !== window.ADMIN_WEB_HOSTNAME);
  };

  // Строка "с какого момента действует текущий статус" для тултипа — server.js присылает since
  // в presence (момент последней смены агрегированного статуса пользователя). Используется и в
  // ростере (buildTooltip), и в шапке окна чата (статус собеседника).
  window.formatStatusSince = (state, since) => {
    if (!since) return '';
    const d = new Date(since);
    const date = d.toLocaleDateString('ru-RU');
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const label = state === 'active' ? 'В сети с' : state === 'idle' ? 'Отошёл с' : 'Не в сети с';
    return `${label} ${date} ${time}`;
  };

  const ICONS = {
    minimize: '<svg viewBox="0 0 16 16" width="14" height="14"><rect x="3" y="7.25" width="10" height="1.5" rx="0.75" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 3.5l9 9m0-9l-9 9"/></svg>',
    attach: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.2l-8.4 8.4a4.9 4.9 0 01-7-7l8.9-8.9a3.4 3.4 0 014.9 4.9l-8.4 8.4a1.9 1.9 0 01-2.7-2.7l7.8-7.8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h11M19 6h1M4 12h6M14 12h6M4 18h13M21 18h0"/><circle cx="17" cy="6" r="2.1" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="17" cy="18" r="2.1" fill="currentColor" stroke="none"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4a1 1 0 001 1h2l7 4V5l-7 4H4a1 1 0 00-1 1z"/><path d="M16 9.5a4 4 0 010 5"/><path d="M19 7a8 8 0 010 10"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 11l17-8-6 17-3.3-6.4L3 11z"/></svg>',
    history: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 108.5-8.5"/><path d="M3.5 4.5v5h5"/><path d="M12 8v4l3 2"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.3" cy="10.3" r="6.3"/><path d="M20 20l-4.3-4.3"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.4M19.6 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M20.2 14.9A8.5 8.5 0 019.6 4.3a8.5 8.5 0 1010.6 10.6z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L2.6 18a1.5 1.5 0 001.3 2.3h16.2a1.5 1.5 0 001.3-2.3L13.7 3.9a1.5 1.5 0 00-2.6 0z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m3 0l-1 13a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    file: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2.5H7a2 2 0 00-2 2v15a2 2 0 002 2h10a2 2 0 002-2V8.5z"/><path d="M14 2.5V8.5h5.5"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19.5h16"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.5 5.5L20 6.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    admin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l7.5 3.2v5c0 5-3.2 8.6-7.5 10.3-4.3-1.7-7.5-5.3-7.5-10.3v-5L12 2.5z"/><path d="M9 12l2 2 4-4.5"/></svg>',
    maximize: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>',
    restore: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="5.5" width="8" height="8" rx="1"/><path d="M5.5 5.5V3.5a1 1 0 011-1h7a1 1 0 011 1v7a1 1 0 01-1 1h-2"/></svg>',
    folder: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5a1.5 1.5 0 011.5-1.5h4l2 2.5h8.5A1.5 1.5 0 0120.5 9v9a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 18V6.5z"/></svg>',
    emoji: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.3"/><path d="M8.3 10.2h.01M15.7 10.2h.01"/><path d="M8 14.3c1 1.4 2.4 2.1 4 2.1s3-.7 4-2.1"/></svg>',
  };
  window.uiIcon = (name) => ICONS[name] || '';

  // ---------- Кнопки окна (свернуть/развернуть/закрыть) ----------
  // Общая логика для всех окон: разметка одинаковая везде —
  // <button id="wcMin">, <button id="wcMax"> (необязательна), <button id="wcClose">.
  function wireWindowControls() {
    if (!window.desktop) return;
    const min = document.getElementById('wcMin');
    const max = document.getElementById('wcMax');
    const close = document.getElementById('wcClose');
    if (min) { min.innerHTML = uiIcon('minimize'); min.title = 'Свернуть'; min.onclick = () => desktop.windowAction('minimize'); }
    if (close) { close.innerHTML = uiIcon('close'); close.title = 'Закрыть'; close.onclick = () => desktop.windowAction('close'); }
    if (max) {
      const paint = (maximized) => { max.innerHTML = uiIcon(maximized ? 'restore' : 'maximize'); max.title = maximized ? 'Восстановить' : 'Развернуть'; };
      paint(false);
      max.onclick = () => desktop.windowAction('maximize');
      if (desktop.onWindowState) desktop.onWindowState((state) => paint(state.maximized));
    }
  }
  window.uiWireWindowControls = wireWindowControls;
  wireWindowControls(); // ui-kit.js подключается в конце <body>, разметка кнопок уже в DOM

  // ---------- Тема ----------
  async function applyTheme() {
    if (!window.desktop) return;
    try {
      const s = await window.desktop.getSettings();
      document.documentElement.dataset.theme = s.theme === 'light' ? 'light' : 'dark';
    } catch { /* игнор */ }
  }
  if (window.desktop) {
    applyTheme();
    if (window.desktop.onSettingsChanged) window.desktop.onSettingsChanged(applyTheme);
  }
  window.uiApplyTheme = applyTheme;

  // ---------- Модальные окна ----------
  function modal({ title, message, buttons }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'ui-modal-overlay';
      const box = document.createElement('div');
      box.className = 'ui-modal-box';
      const titleEl = document.createElement('div');
      titleEl.className = 'ui-modal-title';
      titleEl.innerHTML = title;
      const msgEl = document.createElement('div');
      msgEl.className = 'ui-modal-msg';
      msgEl.textContent = message;
      const actions = document.createElement('div');
      actions.className = 'ui-modal-actions';
      buttons.forEach((b) => {
        const btn = document.createElement('button');
        btn.className = b.className || 'ui-btn-ghost';
        btn.textContent = b.label;
        btn.onclick = () => { overlay.remove(); resolve(b.value); };
        actions.appendChild(btn);
      });
      box.appendChild(titleEl); box.appendChild(msgEl); box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      buttons.length && actions.lastChild.focus();
    });
  }

  window.uiAlert = (message, title = 'Сообщение') =>
    modal({ title: `${uiIcon('warn')} ${title}`, message, buttons: [{ label: 'ОК', value: true, className: 'ui-btn-primary' }] });

  // Короткое ненавязчивое уведомление ("Файл скачан", "Скопировано в буфер обмена") — в отличие
  // от uiAlert, ничего не блокирует и само пропадает через пару секунд.
  window.uiToast = (message, opts = {}) => {
    const { icon = 'check', error = false, duration = 2200, bottomOffset } = opts;
    let container = document.getElementById('uiToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'uiToastContainer';
      document.body.appendChild(container);
    }
    // Если на странице есть строка ввода снизу (composer в чате) — тост должен появляться НАД
    // ней, а не поверх/внутри неё. Страница сама подсказывает отступ через bottomOffset (обычно —
    // реальная высота composer на этот момент, он может расти с многострочным текстом).
    if (bottomOffset != null) container.style.bottom = bottomOffset + 'px';
    const toast = document.createElement('div');
    toast.className = 'ui-toast' + (error ? ' ui-toast-error' : '');
    toast.innerHTML = `${uiIcon(error ? 'warn' : icon)}<span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  };

  window.uiConfirm = (message, opts = {}) => {
    const { title = 'Подтверждение', okText = 'Да', cancelText = 'Отмена', danger = false } = opts;
    return modal({
      title, message,
      buttons: [
        { label: cancelText, value: false, className: 'ui-btn-ghost' },
        { label: okText, value: true, className: danger ? 'ui-btn-danger' : 'ui-btn-primary' },
      ],
    });
  };

  // Диалог с текстовым полем (замена window.prompt) — используется, например, для переименования
  // отдела прямо в теме клиента, а не системным всплывающим окном браузера.
  window.uiPrompt = (message, defaultValue = '', opts = {}) => {
    const { title = 'Введите значение', okText = 'ОК', cancelText = 'Отмена' } = opts;
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'ui-modal-overlay';
      const box = document.createElement('div');
      box.className = 'ui-modal-box';
      box.innerHTML = `
        <div class="ui-modal-title">${title}</div>
        <div class="ui-modal-msg">${message}</div>
        <input id="uiPromptInput" style="width:100%; padding:9px 11px; margin-bottom:14px; background:var(--panel-2); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:13px;">
        <div class="ui-modal-actions">
          <button class="ui-btn-ghost" id="uiPromptCancel">${cancelText}</button>
          <button class="ui-btn-primary" id="uiPromptOk">${okText}</button>
        </div>
      `;
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      const input = box.querySelector('#uiPromptInput');
      input.value = defaultValue;
      input.focus();
      input.select();
      const close = (val) => { overlay.remove(); resolve(val); };
      box.querySelector('#uiPromptCancel').onclick = () => close(null);
      box.querySelector('#uiPromptOk').onclick = () => close(input.value.trim() || null);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(input.value.trim() || null); if (e.key === 'Escape') close(null); });
    });
  };

  // Системный alert() перекрываем на themed-версию — не блокирует поток выполнения (это ок,
  // все текущие вызовы alert(...) в проекте — последняя строка в catch-блоках).
  window.alert = (msg) => { window.uiAlert(String(msg)); };

  // ---------- Эмодзи в тексте сообщений — картинками, а не системным шрифтом ----------
  // На разных Windows один и тот же emoji выглядит по-разному, а на Windows 7 (нет системного
  // цветного эмодзи-шрифта — Segoe UI Emoji появился только в 8.1) большинство эмодзи вообще
  // рисуются чёрно-белыми "текстовыми" глифами. Подключаем свой набор картинок (twemoji, тот же,
  // что раньше использовал Twitter — см. twemoji.min.js + emoji/*.png) — тогда эмодзи выглядят
  // одинаково у всех, независимо от версии Windows и установленных шрифтов. Используется в
  // chat.html/broadcast.html через window.emojiHtml(text) — оборачивает найденные emoji-последова-
  // тельности в <img class="twemoji" src="emoji/<codepoint>.png">, остальной текст не трогает.
  window.emojiHtml = (html) => {
    if (!window.twemoji) return html; // twemoji.min.js не подключён на этой странице — не трогаем текст
    return window.twemoji.parse(html, { base: 'emoji/', ext: '.png', className: 'twemoji' });
  };
  // У двух-трёх редких emoji (напр. ❤️, ✌️) twemoji.js версии 14 определяет имя файла чуть иначе,
  // чем формат самого набора картинок (лишняя/недостающая приставка "-fe0f") — вместо того чтобы
  // подгонять их вручную (список может со временем меняться), просто подстраховываемся: если
  // картинка не загрузилась, показываем как обычный текстовый символ вместо сломанной иконки.
  // 'error' у <img> не всплывает — слушаем на фазе перехвата (capture), одним обработчиком на всё окно.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img && img.tagName === 'IMG' && img.classList && img.classList.contains('twemoji')) {
      img.outerHTML = img.alt;
    }
  }, true);
})();
