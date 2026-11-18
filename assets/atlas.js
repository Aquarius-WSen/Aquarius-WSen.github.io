/* ==========================================================================
   劳动争议知识星云 — hand-written behaviours for the atlas page.

   What the original ships is a client-side app: three bundles were read
   structurally (a spatial-graph class exporting resetView + raycast and
   listening on window blur, a three.js build, a React build wiring onClick /
   onSelect), and this page's own hint text says 拖拽星点 · 滚轮缩放 ·
   点击查看关系. What that code DOES while running was never observed: no
   browser session was ever recorded against the original.

   So everything below is derived from (a) the markup of this page, which was
   read in full, and (b) the shape of those bundles. It is plain DOM API,
   written by hand; no vendor code is copied. Every item that is our invention
   rather than a reconstruction is marked "ADDED:" in a comment.
   ========================================================================== */

(function () {
  'use strict';

  var body = document.body;

  /* ------------------------------------------------------------ 0. styles ---
     ADDED: the shipped stylesheet was never read in this project, so the few
     rules these behaviours need live here instead of in a second edit pass.
     This tag is appended last, so it wins ties with the linked CSS. Colours
     reuse the ones the page's own mini graph already draws with. */

  var RUNTIME_CSS = [
    '.stage__map{cursor:grab}',
    '.stage__map.is-grabbing{cursor:grabbing}',
    '.kid.is-hit{background:rgba(255,195,106,.14);border-radius:4px;' +
      'box-shadow:inset 0 0 0 1px rgba(255,195,106,.5)}',
    '.kid.is-out{opacity:.3}',
    '.node.is-muted{opacity:.35}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('atlas-runtime-style')) return;
    var tag = document.createElement('style');
    tag.id = 'atlas-runtime-style';
    tag.textContent = RUNTIME_CSS;
    (document.head || document.documentElement).appendChild(tag);
  }

  /* ---------------------------------------------------------- 1. starfield ---
     A deterministic scatter, so the same sky appears on every load. The dot
     counts, radii and positions are OUR approximation: the original draws its
     field in compiled code we can only read structurally, and the capture that
     measured a sky never recorded the individual dots. The four fills are the
     ones the capture did measure. */

  var SKY = 1600;
  var TALL = 900;
  var TINTS = ['#849eae', '#aac9d8', '#a49db7', '#dfddd5'];

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildSky() {
    var host = document.querySelector('.stage__sky');
    if (!host) return;
    var rand = rng(20240517);
    var parts = [];
    var i, x, y, r, o, tint, bright;

    for (i = 0; i < 620; i += 1) {
      x = (rand() * 1592 + 4).toFixed(1);
      y = (rand() * 880 + 6).toFixed(1);
      r = (0.42 + rand() * 0.68).toFixed(2);
      o = (0.18 + rand() * 0.36).toFixed(2);
      tint = TINTS[Math.floor(rand() * TINTS.length)];
      parts.push('<circle cx="' + x + '" cy="' + y + '" r="' + r +
        '" fill="' + tint + '" opacity="' + o + '"/>');
    }

    // A handful of hero stars, each with the faint halo the capture shows.
    for (i = 0; i < 26; i += 1) {
      x = (rand() * 1560 + 20).toFixed(1);
      y = (rand() * 850 + 25).toFixed(1);
      r = (1.15 + rand() * 0.5).toFixed(2);
      o = (0.6 + rand() * 0.14).toFixed(2);
      bright = r * 2.6;
      tint = TINTS[Math.floor(rand() * TINTS.length)];
      parts.push('<circle cx="' + x + '" cy="' + y + '" r="' + bright.toFixed(2) +
        '" fill="' + tint + '" opacity="0.05"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + r +
        '" fill="' + tint + '" opacity="' + o + '"/>');
    }

    host.innerHTML = '<svg viewBox="0 0 ' + SKY + ' ' + TALL +
      '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" ' +
      'style="width:100%;height:100%;display:block">' + parts.join('') + '</svg>';
  }

  /* ------------------------------------------------------------ 2. drawers ---
     Both drawers ship closed by CSS only (no hidden, no aria-hidden in the
     markup), so this class system is what actually keeps them shut at load.
     One drawer at a time; Escape, the scrim, the close buttons and a click on
     the map all close it, and focus goes back where it came from. */

  var left = document.querySelector('.drawer--left');
  var right = document.querySelector('.drawer--right');
  var scrim = document.querySelector('.scrim');
  var lastFocus = null;

  var lensKicker = right ? right.querySelector('.lens__kicker') : null;
  var DEFAULT_KICKER = lensKicker ? lensKicker.textContent : null;

  function anyOpen() {
    return body.classList.contains('is-drawer');
  }

  function closeDrawers(returnFocus) {
    var was = anyOpen();
    body.classList.remove('is-drawer');
    if (left) left.classList.remove('is-open');
    if (right) right.classList.remove('is-open');
    if (was && returnFocus && lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (e) { /* the element went away */ }
    }
  }

  function openDrawer(el, from) {
    if (!el) return;
    closeDrawers(false);
    lastFocus = from || document.activeElement;
    el.classList.add('is-open');
    body.classList.add('is-drawer');
  }

  function toggleDrawer(el, from) {
    if (el && el.classList.contains('is-open')) {
      closeDrawers(true);
    } else {
      openDrawer(el, from);
    }
  }

  /* The detail drawer keeps one general description for every node, because
     the original's per-group text was never captured. The only thing that
     changes is the kicker, and it changes to words already on this page: the
     label of the node that was clicked. */
  function fillLens(node) {
    if (!lensKicker || !node || !node.querySelector) return;
    var label = node.querySelector('.node__label');
    if (label && label.textContent) {
      lensKicker.textContent = label.textContent.trim();
    }
  }

  function resetLens() {
    if (lensKicker && DEFAULT_KICKER !== null) {
      lensKicker.textContent = DEFAULT_KICKER;
    }
  }

  /* --------------------------------------------------- 3. pan and zoom state ---
     The page promises 拖拽星点 · 滚轮缩放, and the bundle it replaces has a
     controller that emits start / change / end events and a resetView method,
     plus a window blur handler. So: drag to move, wheel over the map to zoom
     toward the pointer, and let go when the window loses focus. Reconstructed
     from that shape, never watched running. */

  var stage = document.querySelector('.stage');
  var map = document.querySelector('.stage__map');
  var MIN_ZOOM = 0.6;
  var MAX_ZOOM = 2.4;
  var zoom = 1;
  var panX = 0;
  var panY = 0;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  function baseScale() {
    var w = window.innerWidth;
    if (w <= 800) return 0.62;
    if (w <= 980) return 0.86;
    return 1;
  }

  function clamp(value, low, high) {
    return value < low ? low : value > high ? high : value;
  }

  function paint() {
    if (!map) return;
    var w = map.offsetWidth || SKY;
    var h = map.offsetHeight || TALL;
    var limitX = w * 0.45;
    var limitY = h * 0.45;
    panX = clamp(panX, -limitX, limitX);
    panY = clamp(panY, -limitY, limitY);
    map.style.transform =
      'translate(calc(-50% + ' + panX.toFixed(2) + 'px), calc(-50% + ' +
      panY.toFixed(2) + 'px)) scale(' + (baseScale() * zoom).toFixed(3) + ')';
  }

  function zoomTo(next, clientX, clientY) {
    next = clamp(next, MIN_ZOOM, MAX_ZOOM);
    if (map && clientX !== undefined && clientY !== undefined) {
      var box = map.getBoundingClientRect();
      var cx = box.left + box.width / 2;
      var cy = box.top + box.height / 2;
      // Keep the point under the pointer where it is: the visual centre of a
      // scaled box moves with the pan, so the shift is just the lever arm.
      var k = 1 - next / zoom;
      panX += (clientX - cx) * k;
      panY += (clientY - cy) * k;
    }
    zoom = next;
    paint();
  }

  /* Drag. A tap that barely moves is left alone so the star points still
     open the detail drawer; only a real drag swallows the click that follows
     it. */
  var dragging = false;
  var movedFar = false;
  var activeId = null;
  var lastX = 0;
  var lastY = 0;
  var swallowClick = false;

  function inField(node) {
    return !!(node && node.closest &&
      (node.closest('input') || node.closest('textarea') ||
       node.closest('select') || node.closest('.drawer')));
  }

  if (stage && map) {
    stage.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (inField(event.target)) return;
      dragging = true;
      movedFar = false;
      activeId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      // Best effort only: the browser reads touch-action when the touch
      // starts, so on a phone this may arrive one step too late.
      stage.style.touchAction = 'none';
    });

    window.addEventListener('pointermove', function (event) {
      if (!dragging || event.pointerId !== activeId) return;
      var dx = event.clientX - lastX;
      var dy = event.clientY - lastY;
      if (!movedFar && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!movedFar) {
        movedFar = true;
        try { map.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
        map.classList.add('is-grabbing');
      }
      lastX = event.clientX;
      lastY = event.clientY;
      panX += dx;
      panY += dy;
      paint();
    }, { passive: true });

    function endDrag(event) {
      if (!dragging || (event && event.pointerId !== activeId)) return;
      dragging = false;
      activeId = null;
      stage.style.touchAction = '';
      map.classList.remove('is-grabbing');
      if (movedFar) {
        movedFar = false;
        swallowClick = true;
      }
    }

    window.addEventListener('pointerup', endDrag, { passive: true });
    window.addEventListener('pointercancel', endDrag, { passive: true });

    document.addEventListener('click', function (event) {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    }, true);

    // Wheel over the map only, and it takes the gesture: the page has nothing
    // else to scroll there. Held-Ctrl is left to the browser's own page zoom.
    stage.addEventListener('wheel', function (event) {
      if (event.ctrlKey) return;
      event.preventDefault();
      var step = event.deltaY * (event.deltaMode === 1 ? 16 :
        event.deltaMode === 2 ? 400 : 1);
      zoomTo(zoom * Math.exp(-step * 0.0015), event.clientX, event.clientY);
    }, { passive: false });

    /* Losing focus lets go of the pointer, the way the original's blur
       handler appears to. Paused just stops the parallax niceties; the map
       stays where it was. */
    window.addEventListener('blur', function () {
      endDrag();
      if (map) map.classList.remove('is-grabbing');
    });
  }

  /* ---------------------------------------------------------------- 5. views ---
     Single-choice groups: only the pressed state moves, since there is no
     second page to go to. */

  function group(selector, attr) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(selector));
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        buttons.forEach(function (other) {
          other.setAttribute(attr, other === button ? 'true' : 'false');
          other.classList.toggle('is-on', other === button);
        });
      });
    });
    return buttons;
  }

  var viewButtons = group('.views__btn', 'aria-pressed');

  /* ADDED: view emphasis. The three view buttons and the seven node labels are on
     this page; how the original redraws when a view is picked was never
     captured. So picking a view only dims the nodes that plainly do not belong
     to it — nothing is hidden, moved or removed. */

  var NODES = Array.prototype.slice.call(document.querySelectorAll('.node'));

  function nodeLabel(node) {
    var label = node.querySelector('.node__label');
    return label ? label.textContent.trim() : '';
  }

  /* The key comes from the button's own text, not its position, so adding or
     removing a button can never silently shift what the others mean. */
  function viewKey(button) {
    var text = button.textContent || '';
    if (text.indexOf('主题') >= 0) return 'cluster';
    if (text.indexOf('程序') >= 0) return 'ring';
    if (text.indexOf('案由') >= 0) return 'lens';
    return 'universe';
  }

  function applyView(key) {
    if (!map) return;
    map.setAttribute('data-view', key);
    NODES.forEach(function (node) {
      var label = nodeLabel(node);
      var muted = false;
      if (key === 'ring') muted = label.indexOf('程序') < 0;
      else if (key === 'lens') muted = label.indexOf('案由') < 0;
      else if (key === 'cluster') muted = label.indexOf('程序') >= 0 || label.indexOf('案由') >= 0;
      node.classList.toggle('is-muted', muted);
    });
  }

  viewButtons.forEach(function (button) {
    var key = viewKey(button);
    if (button.getAttribute('aria-pressed') === 'true') applyView(key);
    button.addEventListener('click', function () {
      applyView(key);
    });
  });

  /* -------------------------------------------------------------- 6. index ---
     One group on this page has children (11 rows). The other six are single
     rows with no kids container at all, so there is nothing to expand and
     inventing rows would be making them up. */

  function setGroup(button, open) {
    var kids = document.getElementById(button.getAttribute('data-group'));
    if (!kids) return;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    kids.hidden = !open;
  }

  document.querySelectorAll('[data-group]').forEach(function (button) {
    button.addEventListener('click', function () {
      setGroup(button, button.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* ------------------------------------------------------------ 7. the search ---
     This highlights; it does NOT filter. It can only ever reach the 11 rows
     that exist in the document — the other 85 cards of the index are not in
     this page's markup at all, so no input can show or hide them. Nothing is
     removed and no row is ever hidden by a match, only emphasised. */

  var search = document.getElementById('atlasSearch');

  function foldText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, '');
  }

  function kidRows() {
    return Array.prototype.slice.call(
      document.querySelectorAll('#cluster-relation .kid')
    );
  }

  function runSearch() {
    if (!search) return;
    var rows = kidRows();
    var query = foldText(search.value.trim());
    var hits = 0;

    rows.forEach(function (row) {
      var match = !!query && foldText(row.textContent).indexOf(query) >= 0;
      row.classList.toggle('is-hit', match);
      row.classList.toggle('is-out', !!query && !match);
      if (match) hits += 1;
    });

    // Open the group if a hit is sitting inside a collapsed list.
    if (hits > 0) {
      var owner = document.querySelector('[data-group="cluster-relation"]');
      if (owner && owner.getAttribute('aria-expanded') !== 'true') setGroup(owner, true);
    }
  }

  /* ------------------------------------------------------------- 8. footer ---
     The footer button carries a label but no captured behaviour. The smallest
     thing that does what the label says: turn the candidate links up, and
     back down. The label itself stays fixed, exactly as captured. */

  function wireTools() {
    var footButton = document.querySelector('.foot__btn');
    if (footButton) {
      footButton.addEventListener('click', function () {
        var on = footButton.getAttribute('aria-pressed') === 'true';
        footButton.setAttribute('aria-pressed', on ? 'false' : 'true');
        if (stage) stage.classList.toggle('stage--links-all', !on);
      });
    }
  }

  /* --------------------------------------------------------------- 9. clicks ---
     Delegated: openers first, then the close buttons, then the map itself,
     which closes whatever is open and puts the detail drawer back to its
     general wording. */

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var opener = target.closest('[data-drawer]');
    if (opener) {
      var which = opener.getAttribute('data-drawer');
      if (which === 'right') fillLens(opener);
      toggleDrawer(which === 'left' ? left : right, opener);
      return;
    }
    if (target.closest('[data-drawer-close]')) {
      closeDrawers(true);
      return;
    }
    if (anyOpen() && target.closest('.stage')) {
      resetLens();
      closeDrawers(true);
    }
  });

  if (scrim) {
    scrim.addEventListener('click', function () {
      closeDrawers(true);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && anyOpen()) {
      closeDrawers(true);
    }
  });

  window.addEventListener('resize', function () {
    paint();
  });

  /* ------------------------------------------------------------------ boot ---
     The script tag is deferred, so the document is already parsed here. */

  try { injectStyles(); } catch (err) {}
  try { buildSky(); } catch (err) {}
  try { wireTools(); } catch (err) {}
  try { paint(); } catch (err) {}
  try {
    if (search) {
      search.addEventListener('input', runSearch);
      runSearch();
    }
  } catch (err) {}
})();
