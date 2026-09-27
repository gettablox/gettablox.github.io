/* ==========================================================================
   Tablox — landing page behaviour

   Three things happen here:

   1. A working checkup. Drag the dial and the mock toolbar, badge and popup
      render exactly what the extension renders at that tab count. The state
      table below it is clickable and drives the same dial.
   2. The hero tab field fills up as you scroll, and the page's accent colour
      walks the five states green → red as it goes. It is the same walk the
      extension does, at 20× the speed.
   3. Reveals and the section spine.

   The STATES table below is transcribed from the extension's
   src/shared/state.js — same thresholds, same colours, same copy. If you
   change one there, change it here.
   ========================================================================== */

(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- the five states, from src/shared/state.js ------------------------- */

  const STATES = Object.freeze([
    {
      id: 'focused',
      label: 'Focused',
      color: '#19DF96',
      iconColor: '#109162',
      range: '1–3',
      min: 1,
      max: 3,
      explanation: 'Your browser context is light, with little to keep track of.',
      toast: 'Clean slate. Enjoy it',
    },
    {
      id: 'growing',
      label: 'Growing',
      color: '#639CFF',
      iconColor: '#2D79FF',
      range: '4–6',
      min: 4,
      max: 6,
      explanation: 'More information is building up in your browser context.',
      toast: 'The hoarding has begun',
    },
    {
      id: 'crowded',
      label: 'Crowded',
      color: '#FDCF06',
      iconColor: '#997D01',
      range: '7–9',
      min: 7,
      max: 9,
      explanation: 'More information is making it harder to quickly find what you need.',
      toast: 'Tab archaeology begins',
    },
    {
      id: 'fragmented',
      label: 'Fragmented',
      color: '#FF6F00',
      iconColor: '#D25C00',
      range: '10–12',
      min: 10,
      max: 12,
      explanation: 'Different pages and tasks are competing for your attention.',
      toast: 'Which one was I looking for again?',
    },
    {
      id: 'overloaded',
      label: 'Overloaded',
      color: '#FF343A',
      iconColor: '#FF0911',
      range: '13+',
      min: 13,
      max: null,
      explanation: 'There is a lot to organize, find, and return to.',
      toast: 'This is no longer a browser. It’s a database',
    },
  ]);

  const MAX_TABS = 20;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Resolve a tab count to its state, clamping below the first range. */
  function getState(count) {
    const n = Math.max(0, Math.floor(count) || 0);
    for (const state of STATES) {
      if (state.max === null || n <= state.max) return state;
    }
    return STATES[0];
  }

  /* ========================================================================
     Element lookups

     Every lookup happens here, before any logic runs. The three features
     below all read each other's elements, and a `const` read before its
     declaration is a ReferenceError rather than an undefined value — so the
     lookups are grouped to make that ordering impossible to get wrong.
     ======================================================================== */

  const root = document.documentElement;
  const hero = $('.hero');
  const crowd = $('#crowd');
  const strip = $('[data-tabstrip]');
  const tray = $('[data-tray]');
  const dial = $('#tabcount');
  const demo = $('.demo');
  const rows = $$('.state');
  const spineLinks = $$('.spine__list a');
  const revealTargets = $$('[data-reveal]');

  const readout = {
    count: $('[data-readout-count]'),
    state: $('[data-readout-state]'),
    bar: $('[data-readout-bar]'),
  };

  const demoEls = dial
    ? {
        count: $('[data-demo-count]'),
        state: $('[data-demo-state]'),
        swatch: $('[data-demo-swatch]'),
        explanation: $('[data-demo-explanation]'),
        toast: $('[data-demo-toast]'),
        icon: $('[data-mock-icon]'),
        badgeCount: $('[data-mock-count]'),
        tabs: $('[data-mock-tabs]'),
        popupCount: $('[data-mock-popup-count]'),
        popupState: $('[data-mock-popup-state]'),
        popupExplanation: $('[data-mock-popup-explanation]'),
        stateLine: $('.demo__state'),
      }
    : null;

  /* ========================================================================
     Accent

     Two scopes, on purpose:

     - `--accent` on :root is the page's mood. In the hero it walks the five
       states as you scroll; past the hero it follows the dial.
     - `--accent` on .demo is the dial's state and nothing else, so the mock
       toolbar and popup are always showing the state the dial is on rather
       than whatever the hero happens to be tinted.
     ======================================================================== */

  let dialState = getState(7);

  function setAccent(color) {
    root.style.setProperty('--accent', color);
  }

  function setDemoAccent(color) {
    demo?.style.setProperty('--accent', color);
  }

  /** True while the hero still owns the viewport. */
  function inHero() {
    if (!hero) return false;
    return window.scrollY < hero.offsetHeight * 0.85;
  }

  /* ========================================================================
     1 — The checkup
     ======================================================================== */

  // Each row carries its own colours. `--c` is the bright hue the extension
  // paints the badge with, `--c-icon` the darker sibling the toolbar shape
  // uses, so the chips in the table match the icon in the mock above.
  for (const row of rows) {
    const state = STATES.find((s) => s.id === row.dataset.state);
    if (!state) continue;
    row.style.setProperty('--c', state.color);
    row.style.setProperty('--c-icon', state.iconColor);
  }

  if (dial && demoEls) {
    const el = demoEls;

    el.stateLine?.setAttribute('aria-live', 'polite');

    // A small pool of fake tabs inside the mock browser, shown or hidden to
    // match the count.
    const mockTabs = [];
    for (let i = 0; i < MAX_TABS; i += 1) {
      const tab = document.createElement('i');
      tab.style.display = 'none';
      el.tabs.appendChild(tab);
      mockTabs.push(tab);
    }

    function paintRow(state) {
      for (const row of rows) {
        row.classList.toggle('is-active', row.dataset.state === state.id);
      }
    }

    function render(count) {
      const state = getState(count);
      dialState = state;

      el.count.textContent = String(count);
      el.state.innerHTML = `${state.range} &middot; <b>${state.label}</b>`;
      el.explanation.textContent = state.explanation;
      el.toast.textContent = state.toast;

      el.icon.setAttribute('fill', state.iconColor);
      el.badgeCount.textContent = String(count);

      el.popupCount.textContent = String(count);
      el.popupState.textContent = state.label;
      el.popupExplanation.textContent = state.explanation;

      mockTabs.forEach((tab, i) => {
        const on = i < count;
        tab.style.display = on ? '' : 'none';
        if (on) tab.style.animationDelay = `${(i % 9) * 26}ms`;
      });

      paintRow(state);
      setDemoAccent(state.color);
      if (!inHero()) setAccent(state.color);
    }

    dial.addEventListener('input', () => render(Number(dial.value)));

    // Clicking a row jumps the dial to the bottom of that state's range, so the
    // mock always shows a count that is genuinely inside the band that was
    // clicked.
    for (const row of rows) {
      const go = () => {
        const min = Number(row.dataset.min);
        dial.value = String(Math.min(min, Number(dial.max)));
        render(Number(dial.value));
        dial.focus({ preventScroll: true });
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          go();
        }
      });
    }

    render(Number(dial.value));
  }

  /* ========================================================================
     2 — The hero tab field
     ======================================================================== */

  const crowdNodes = [];

  if (strip && tray) {
    for (let i = 0; i < MAX_TABS; i += 1) {
      const node = document.createElement('i');
      (i < 9 ? strip : tray).appendChild(node);
      crowdNodes.push(node);
    }
  }

  let lastCount = -1;

  // The crowd's resting opacity is --crowd-opacity in the stylesheet. Read it
  // once, lazily, so the first scroll frame cannot race stylesheet parsing and
  // so the fade below stays in step with the rule it is scaling.
  let crowdRestOpacity = null;
  function crowdOpacity() {
    if (crowdRestOpacity === null) {
      const n = parseFloat(getComputedStyle(root).getPropertyValue('--crowd-opacity'));
      crowdRestOpacity = Number.isFinite(n) ? n : 0.8;
    }
    return crowdRestOpacity;
  }

  function paintCrowd(count) {
    if (count === lastCount) return;
    lastCount = count;
    crowdNodes.forEach((node, i) => {
      const on = i < count;
      node.style.display = on ? '' : 'none';
      if (on) node.style.animationDelay = `${(i % 9) * 45}ms`;
    });
    if (readout.count) readout.count.textContent = String(count);
    if (readout.state) readout.state.textContent = getState(count).label;
    if (readout.bar) readout.bar.style.setProperty('--fill', `${(count / MAX_TABS) * 100}%`);
  }

  function onScroll() {
    if (!hero) return;

    const height = hero.offsetHeight || 1;
    const p = Math.min(1, Math.max(0, window.scrollY / (height * 0.8)));

    // 1 tab at the top of the hero, 17 by the time you leave it.
    const count = 1 + Math.round(p * 16);
    paintCrowd(count);

    if (inHero()) {
      setAccent(getState(count).color);
      // Scrolling back up has to undo the fade, or the field stays invisible.
      if (crowd) {
        crowd.style.opacity = '';
        crowd.style.visibility = '';
      }
    } else {
      setAccent(dialState.color);
      if (crowd) {
        const fade = Math.max(0, 1 - (window.scrollY - height * 0.85) / (height * 0.5));
        crowd.style.opacity = String(crowdOpacity() * fade);
        if (fade === 0) crowd.style.visibility = 'hidden';
        else crowd.style.visibility = 'visible';
      }
    }
  }

  /* ========================================================================
     3 — Reveals and the spine
     ======================================================================== */

  if ('IntersectionObserver' in window && revealTargets.length) {    const revealer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );
    revealTargets.forEach((node, i) => {
      node.style.transitionDelay = `${Math.min(i % 6, 5) * 70}ms`;
      revealer.observe(node);
    });
  } else {
    revealTargets.forEach((node) => node.classList.add('is-in'));
  }

  if (spineLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(
      spineLinks
        .map((link) => {
          const id = link.getAttribute('href')?.slice(1);
          return id ? [link, document.getElementById(id)] : null;
        })
        .filter(Boolean)
    );

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          spineLinks.forEach((link) => link.removeAttribute('aria-current'));
          for (const [link, section] of byId) {
            if (section === entry.target) link.setAttribute('aria-current', 'true');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    // for..of yields real [link, section] pairs; Map.forEach passes
    // (value, key), which destructures into nonsense.
    for (const [, section] of byId) {
      if (section) spy.observe(section);
    }
  }

  /* ========================================================================
     Boot
     ======================================================================== */

  let ticking = false;

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  onScroll();

  // Without JS the hero would sit on an empty window; give it a plausible
  // starting state rather than nothing.
  if (!REDUCED) {
    document.documentElement.classList.add('js');
  }
})();
