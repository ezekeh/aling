// Weekly rhythm logic: what today is, the next Call and Forum dates,
// the Monday countdown, and the interactive week wheel.
(function () {
  'use strict';

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // ---------- Pure date helpers (month is 1-12) ----------

  // Calendar parts of `date` as seen in `timeZone` (visitor's local time if empty).
  function zoneParts(date, timeZone) {
    if (!timeZone) {
      return {
        y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate(), dow: date.getDay(),
        h: date.getHours(), min: date.getMinutes(), s: date.getSeconds()
      };
    }
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: 'numeric',
      day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    }).formatToParts(date);
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return {
      y: +o.year, m: +o.month, d: +o.day, dow: DOW[o.weekday],
      h: +o.hour % 24, min: +o.minute, s: +o.second
    };
  }

  function nthSaturday(y, m, n) {
    var firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    return 1 + ((6 - firstDow + 7) % 7) + 7 * (n - 1);
  }

  function lastSaturday(y, m) {
    var lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var dow = new Date(Date.UTC(y, m - 1, lastDay)).getUTCDay();
    return lastDay - ((dow + 1) % 7);
  }

  // Next date (today included) given by `pick(y, m)`, rolling into next month if it has passed.
  function nextOccurrence(parts, pick) {
    var y = parts.y, m = parts.m, d = pick(y, m);
    if (d < parts.d) {
      m += 1;
      if (m > 12) { m = 1; y += 1; }
      d = pick(y, m);
    }
    return { y: y, m: m, d: d, isToday: y === parts.y && m === parts.m && d === parts.d };
  }

  // Monday: seconds left in the day (the Pledge is live). Otherwise: seconds until Monday 00:00.
  function countdown(parts) {
    var secOfDay = parts.h * 3600 + parts.min * 60 + parts.s;
    if (parts.dow === 1) return { live: true, seconds: 86400 - secOfDay };
    var days = (8 - parts.dow) % 7;
    return { live: false, seconds: days * 86400 - secOfDay };
  }

  function formatDate(o) {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(Date.UTC(o.y, o.m - 1, o.d)));
  }

  var api = {
    zoneParts: zoneParts, nthSaturday: nthSaturday, lastSaturday: lastSaturday,
    nextOccurrence: nextOccurrence, countdown: countdown, formatDate: formatDate
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined') return;
  window.ALINGRhythm = api;

  // ---------- Page wiring ----------

  var cfg = window.ALING_CONFIG || {};
  var now = function () { return zoneParts(new Date(), cfg.TIMEZONE); };
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  function init() {
    var today = now();

    // Every join button points at the WhatsApp invite.
    $$('.js-wa').forEach(function (a) {
      a.href = cfg.WHATSAPP_LINK || '#';
      a.target = '_blank';
      a.rel = 'noopener';
    });

    initWheel(today.dow);
    initSessions(today);
    initCountdown();
  }

  function initSessions(today) {
    var time = [cfg.CALL_TIME, cfg.TIMEZONE_LABEL].filter(Boolean).join(' ');
    var call = nextOccurrence(today, function (y, m) { return nthSaturday(y, m, 2); });
    var forum = nextOccurrence(today, lastSaturday);
    var callEl = $('[data-next-call]');
    var forumEl = $('[data-next-forum]');
    if (callEl) callEl.textContent = 'Next: ' + (call.isToday ? 'Today' : formatDate(call)) + (time ? ' · ' + time : '');
    if (forumEl) forumEl.textContent = 'Next: ' + (forum.isToday ? 'Today' : formatDate(forum));
  }

  function initCountdown() {
    var box = $('[data-countdown]');
    if (!box) return;
    var label = $('[data-cd-label]');
    var cells = { d: $('[data-cd="d"]', box), h: $('[data-cd="h"]', box), m: $('[data-cd="m"]', box), s: $('[data-cd="s"]', box) };

    function set(el, value) {
      var text = value < 10 ? '0' + value : String(value);
      if (el.textContent === text) return;
      el.textContent = text;
      el.classList.remove('is-tick');
      void el.offsetWidth; // restart the flip animation
      el.classList.add('is-tick');
    }

    function tick() {
      var c = countdown(now());
      var s = Math.max(0, c.seconds);
      set(cells.d, Math.floor(s / 86400));
      set(cells.h, Math.floor((s % 86400) / 3600));
      set(cells.m, Math.floor((s % 3600) / 60));
      set(cells.s, s % 60);
      if (label) {
        label.textContent = c.live
          ? 'The Monday Pledge is live right now. Today ends in'
          : 'The next Monday Pledge starts in';
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // Turns the plain list of days into the rotating wheel with a detail panel.
  function initWheel(todayDow) {
    var week = $('[data-week]');
    var items = $$('.week-list li');
    if (!week || !items.length) return;

    var wheel = $('.wheel', week);
    var ring = $('.wheel__ring', week);
    var step = 360 / items.length;
    var active = -1;
    var rot = 0;

    var hub = {
      icon: $('[data-hub-icon]', week), day: $('[data-hub-day]', week), today: $('[data-hub-today]', week)
    };
    var detail = {
      box: $('.week__detail', week), day: $('[data-d-day]', week), title: $('[data-d-title]', week),
      hook: $('[data-d-hook]', week), text: $('[data-d-text]', week)
    };

    var buttons = items.map(function (li, i) {
      var node = document.createElement('div');
      node.className = 'wheel__node';
      node.style.setProperty('--a', i * step + 'deg');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wheel__btn';
      btn.textContent = li.getAttribute('data-short');
      btn.setAttribute('aria-label', DAY_NAMES[+li.getAttribute('data-day')] + ': ' + $('h3', li).textContent);
      if (+li.getAttribute('data-day') === todayDow) btn.classList.add('is-today');
      btn.addEventListener('click', function () { select(i); });
      node.appendChild(btn);
      ring.appendChild(node);
      return btn;
    });

    function select(i) {
      var n = items.length;
      i = ((i % n) + n) % n;
      if (i === active) return;
      // Rotate the short way round so the chosen day lands at the top.
      var from = active < 0 ? 0 : active;
      var diff = ((i - from + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
      rot -= diff * step;
      active = i;
      wheel.style.setProperty('--rot', rot + 'deg');

      var li = items[i];
      var dow = +li.getAttribute('data-day');
      buttons.forEach(function (b, j) {
        b.classList.toggle('is-active', j === i);
        b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
      });
      hub.icon.innerHTML = '<svg aria-hidden="true"><use href="#' + li.getAttribute('data-icon') + '"/></svg>';
      hub.day.textContent = DAY_NAMES[dow];
      hub.today.hidden = dow !== todayDow;
      detail.day.textContent = DAY_NAMES[dow] + (dow === todayDow ? ' · Today' : '');
      detail.title.textContent = $('h3', li).textContent;
      detail.hook.textContent = $('.hook', li).textContent;
      detail.text.textContent = $('.text', li).textContent;
      detail.box.classList.remove('is-swap');
      void detail.box.offsetWidth; // restart the swap animation
      detail.box.classList.add('is-swap');
    }

    $('[data-week-prev]', week).addEventListener('click', function () { select(active - 1); });
    $('[data-week-next]', week).addEventListener('click', function () { select(active + 1); });

    week.classList.add('is-ready');
    var start = 0;
    items.forEach(function (li, i) { if (+li.getAttribute('data-day') === todayDow) start = i; });
    select(start);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
