// Minimal drawer controller: five panels share one overlay.
// Native <details> handles the FAQ accordions, so nothing is needed for those.

const overlay = document.getElementById("drawerOverlay");
const drawer = document.getElementById("drawer");
const closeBtn = document.getElementById("drawerClose");
const panels = Array.from(document.querySelectorAll("[data-panel-content]"));
const triggers = Array.from(document.querySelectorAll("[data-panel]"));

let lastFocus = null;

function setTriggersExpanded(openPanel) {
  triggers.forEach((btn) => {
    btn.setAttribute("aria-expanded", String(btn.dataset.panel === openPanel));
    btn.classList.toggle("is-open", btn.dataset.panel === openPanel);
  });
}

function open(panelName) {
  const target = panels.find((p) => p.dataset.panelContent === panelName);
  if (!target) return;

  panels.forEach((p) => p.classList.toggle("is-active", p === target));

  lastFocus = document.activeElement;
  overlay.hidden = false;
  // one frame later so the transition runs from the off-screen position
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  setTriggersExpanded(panelName);

  document.body.style.overflow = "hidden";
  drawer.focus({ preventScroll: true });
}

function close() {
  overlay.classList.remove("is-open");
  setTriggersExpanded(null);
  document.body.style.overflow = "";
  window.setTimeout(() => {
    overlay.hidden = true;
  }, 450);
  if (lastFocus && typeof lastFocus.focus === "function") {
    lastFocus.focus({ preventScroll: true });
  }
  lastFocus = null;
}

triggers.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.getAttribute("aria-expanded") === "true") {
      close();
      return;
    }
    open(btn.dataset.panel);
  });
});

if (closeBtn) closeBtn.addEventListener("click", close);

if (overlay) {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlay.hidden) close();
});

// Hero identity accordions: one item open at a time WITHIN each accordion, "+" becomes "−".
// v78：单开作用域按各 .acc 分组——B 区「执业律师」常开不再受其他板块折叠影响（王律 2026-11-15）。
const accGroups = Array.from(document.querySelectorAll(".acc"));
accGroups.forEach((acc) => {
  const items = Array.from(acc.querySelectorAll(".acc__item"));
  items.forEach((item) => {
    const head = item.querySelector(".acc__head");
    if (!head) return;
    head.addEventListener("click", () => {
      const wasOpen = item.classList.contains("is-open");
      items.forEach((other) => {
        other.classList.remove("is-open");
        const otherHead = other.querySelector(".acc__head");
        if (otherHead) otherHead.setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });
});

// Splash parallax: 封面画比页面滚得慢，SCROLL 提示随滚动淡出
const splashArt = document.querySelector(".splash__art");
const splashScroll = document.querySelector(".splash__scroll");
if (splashArt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      splashArt.style.transform = `translate3d(0, ${(y * 0.32).toFixed(1)}px, 0)`;
      if (splashScroll) {
        splashScroll.style.opacity = String(Math.max(0, 1 - y / 200));
      }
    },
    { passive: true }
  );
}

// 封面双图轮播：每 5.2s 交叉淡化切换（reduced-motion 时停在第一张）
const splashImgs = document.querySelectorAll(".splash__art img");
if (splashImgs.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let splashCur = 0;
  setInterval(() => {
    splashImgs[splashCur].classList.remove("is-active");
    splashCur = (splashCur + 1) % splashImgs.length;
    splashImgs[splashCur].classList.add("is-active");
  }, 5200);
}

// Keep tab focus inside the drawer while it is open.
if (overlay) {
  overlay.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusables = overlay.querySelectorAll(
      'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
