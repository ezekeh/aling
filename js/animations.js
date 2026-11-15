// Page behaviour and motion. Everything stays readable if GSAP fails to load
// or the visitor prefers reduced motion (no `anim` class on <html>).
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- Works without GSAP ----------

  var nav = $('[data-nav]');
  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile join bar: on once the hero is gone, off again at the final call.
  var sticky = $('[data-sticky]');
  var heroGone = false, finalSeen = false;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.target.classList.contains('hero')) heroGone = !e.isIntersecting;
        else finalSeen = e.isIntersecting;
      });
      sticky.classList.toggle('is-on', heroGone && !finalSeen);
    });
    io.observe($('.hero'));
    io.observe($('[data-final]'));
  }

  // "See original" opens the real screenshot full size.
  var box = $('[data-lightbox]');
  if (box && box.showModal) {
    var boxImg = $('img', box);
    $$('[data-zoom]').forEach(function (shot) {
      shot.addEventListener('click', function () {
        boxImg.src = shot.getAttribute('data-zoom');
        boxImg.alt = shot.getAttribute('data-alt') || '';
        box.showModal();
      });
    });
    box.addEventListener('click', function (e) {
      if (e.target !== boxImg) box.close();
    });
  }

  initDeck();

  // The story cards sit in a pile; the top one slides off and tucks in at the back.
  function initDeck() {
    var deck = $('[data-deck]');
    var cards = deck ? $$('.tcard', deck) : [];
    if (cards.length < 2) return;

    var motion = root.classList.contains('anim');
    var order = cards.slice(); // order[0] is the card on top
    var navEl = $('[data-deck-nav]');
    var nowEl = $('[data-deck-now]');
    var busy = false, auto = null, visible = false, held = false;

    function layout() {
      order.forEach(function (card, pos) {
        card.setAttribute('data-pos', Math.min(pos, 3));
        card.inert = pos !== 0;
      });
      nowEl.textContent = cards.indexOf(order[0]) + 1;
    }

    function settle(card) {
      setTimeout(function () { card.classList.remove('is-under'); busy = false; }, motion ? 460 : 0);
    }

    // Top card flies off to one side, then slides back in underneath the pile.
    function next(side) {
      if (busy) return;
      busy = true;
      var card = order[0];
      card.classList.add(side < 0 ? 'is-out-left' : 'is-out');
      setTimeout(function () {
        order.push(order.shift());
        card.classList.add('is-under');
        card.classList.remove('is-out', 'is-out-left');
        layout();
        settle(card);
      }, motion ? 320 : 0);
    }

    // Bottom card slips out from under the pile and lands on top.
    function prev() {
      if (busy) return;
      busy = true;
      var card = order[order.length - 1];
      card.classList.add('is-under', 'is-out-left');
      setTimeout(function () {
        order.unshift(order.pop());
        card.classList.remove('is-under', 'is-out-left');
        layout();
        settle(card);
      }, motion ? 320 : 0);
    }

    function stopAuto() { clearInterval(auto); auto = false; }

    $('[data-deck-total]').textContent = cards.length;
    $('[data-deck-next]').addEventListener('click', function () { stopAuto(); next(1); });
    $('[data-deck-prev]').addEventListener('click', function () { stopAuto(); prev(); });

    // Swipe the pile left or right.
    var startX = null;
    deck.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    deck.addEventListener('pointercancel', function () { startX = null; });
    deck.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { stopAuto(); next(dx < 0 ? -1 : 1); }
    });

    deck.classList.add('is-ready');
    navEl.hidden = false;
    layout();

    // Shuffles by itself while on screen, until the visitor takes over.
    if (!motion || !('IntersectionObserver' in window)) return;
    deck.addEventListener('pointerenter', function () { held = true; });
    deck.addEventListener('pointerleave', function () { held = false; });
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: .6 }).observe(deck);
    auto = setInterval(function () {
      if (visible && !held && !document.hidden && !(box && box.open)) next(1);
    }, 5200);
  }

  if (!root.classList.contains('anim')) return;
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('anim'); return; }

  // ---------- Motion ----------

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis && finePointer) {
    try {
      var lenis = new window.Lenis({ anchors: { offset: -80 } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (e) { /* native scrolling is fine */ }
  }

  // Hero headline: split into words that rise one by one.
  function splitWords(el) {
    var out = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      var cls = node.nodeType === 1 ? node.className : '';
      node.textContent.split(/\s+/).filter(Boolean).forEach(function (word) {
        var w = document.createElement('span');
        w.className = 'w';
        var i = document.createElement('span');
        i.className = ('w__i ' + cls).trim();
        i.textContent = word;
        w.appendChild(i);
        out.push(w);
      });
    });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.textContent = '';
    out.forEach(function (w, n) {
      if (n) el.appendChild(document.createTextNode(' '));
      w.setAttribute('aria-hidden', 'true');
      el.appendChild(w);
    });
    return $$('.w__i', el);
  }

  // Hero: the photo eases in and settles while the words rise.
  var heroImg = $('[data-hero-bg] img');
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from(heroImg, { autoAlpha: 0, scale: 1.12, duration: 2, ease: 'power2.out' }, 0)
    .from(splitWords($('[data-split]')), { yPercent: 115, duration: 1, stagger: .09 }, .15)
    .from('[data-hero-fade]', { autoAlpha: 0, y: 22, duration: .8, stagger: .1 }, .45);

  gsap.to(heroImg, {
    yPercent: 7, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // Sections rise into view.
  $$('[data-reveal]').forEach(function (el) {
    gsap.from(el, {
      autoAlpha: 0, y: 36, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
  $$('[data-reveal-group]').forEach(function (group) {
    gsap.from(group.children, {
      autoAlpha: 0, y: 40, duration: .8, ease: 'power3.out', stagger: .12,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true }
    });
  });

  // Hand-drawn underlines draw themselves.
  $$('.squiggle path').forEach(function (path) {
    // The stroke doesn't scale with the stretched SVG, so measure the line on screen.
    var len = path.getBoundingClientRect().width * 1.2 + 20;
    gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, {
      strokeDashoffset: 0, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: path, start: 'top 80%', once: true }
    });
  });

  // Join buttons lean toward the pointer.
  if (finePointer) {
    $$('.btn--magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .3 });
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, .4)' });
      });
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
