/* 主页编辑模式（v1）· 仅供站长使用
 * 流程：右下 ✏️ 开启 → 文字就地改 / 点元素调样式 → 自动暂存 localStorage → 导出 JSON 给 AI 落码
 * 原则：编辑模式不改任何源文件；暂存只在站长浏览器；"清空暂存"=回到代码版原样
 */
(function () {
  'use strict';

  const LS_KEY = 'home-edits-v1';
  const STORE = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch (e) { return {}; }
  })();
  STORE.text = STORE.text || {};    // sel -> { old: innerHTMLBefore, new: innerHTMLAfter }
  STORE.style = STORE.style || {};  // sel -> { prop: value }
  const save = () => localStorage.setItem(LS_KEY, JSON.stringify(STORE));

  let mode = 'off';                 // off | text | style
  let styleTarget = null;

  /* ---------- CSS 注入 ---------- */
  const css = `
  #em-fab { position: fixed; right: 20px; bottom: 64px; z-index: 9990; width: 46px; height: 46px;
    border-radius: 50%; border: 1px solid rgba(158,51,45,.35); background: #9e332d; color: #fff;
    font-size: 20px; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.28); }
  #em-fab:hover { transform: scale(1.06); }
  #em-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 9991; display: none;
    align-items: center; gap: 10px; padding: 9px 16px; background: #9e332d; color: #fff;
    font: 13px/1 "Noto Sans SC", sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  #em-bar b { letter-spacing: 1px; }
  #em-bar button { border: 1px solid rgba(255,255,255,.4); background: rgba(255,255,255,.12);
    color: #fff; padding: 6px 12px; border-radius: 7px; cursor: pointer; font-size: 12px; }
  #em-bar button:hover { background: rgba(255,255,255,.25); }
  #em-bar button.on { background: #fff; color: #9e332d; font-weight: 600; }
  body.em-text [data-emt], body.em-style [data-emt] { outline: 1.5px dashed rgba(158,51,45,.45); outline-offset: 2px; cursor: text; }
  body.em-text [data-emt]:hover, body.em-style [data-emt]:hover { outline-color: #9e332d; background: rgba(158,51,45,.06); }
  body.em-text [data-emt].em-active, body.em-style [data-emt].em-active { outline: 2px solid #9e332d; background: rgba(158,51,45,.08); }
  body.em-editing a { pointer-events: auto; }
  #em-panel { position: fixed; right: 20px; top: 80px; z-index: 9992; width: 240px; display: none;
    background: #fff; border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 14px;
    box-shadow: 0 10px 30px rgba(0,0,0,.22); font: 13px/1.4 "Noto Sans SC", sans-serif; }
  #em-panel h4 { margin: 0 0 10px; font-size: 13px; color: #9e332d; }
  #em-panel label { display: block; margin: 9px 0 3px; color: #555; font-size: 12px; }
  #em-panel input[type=text], #em-panel input[type=number] { width: 100%; padding: 6px 8px;
    border: 1px solid #ccc; border-radius: 6px; font-size: 13px; }
  #em-panel .em-row2 { display: flex; gap: 8px; }
  #em-panel .em-note { margin-top: 10px; font-size: 11px; color: #999; }
  #em-panel .em-clear { margin-top: 10px; width: 100%; padding: 7px; border: 1px solid #d33;
    background: #fff; color: #d33; border-radius: 7px; cursor: pointer; font-size: 12px; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- selector 生成（落码定位用） ---------- */
  function genSelector(el) {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node !== document.body && depth < 6) {
      let seg = node.tagName.toLowerCase();
      if (node.id) { seg += '#' + node.id; parts.unshift(seg); break; }
      if (node.classList.length) seg += '.' + node.classList[0];
      const parent = node.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter(c => c.tagName === node.tagName);
        if (same.length > 1) seg += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      parts.unshift(seg);
      node = parent;
      depth++;
    }
    return parts.join(' > ');
  }

  /* ---------- 可编辑元素扫描（运行时打标） ---------- */
  const EDIT_TAGS = { H1:1, H2:1, H3:1, P:1, SPAN:1, STRONG:1, SMALL:1, B:1, LI:1, TIME:1, SUMMARY:1 };
  function markEditable() {
    let n = 0;
    document.querySelectorAll('main *, .site-header *, .splash *, nav.pill-nav *, .drawer *').forEach(el => {
      if (el.closest('#em-bar, #em-panel, #em-fab, script, style, svg')) return;
      const tag = el.tagName;
      const hasOwnText = Array.from(el.childNodes).some(nd => nd.nodeType === 3 && nd.textContent.trim());
      if (EDIT_TAGS[tag] && hasOwnText) {
        el.setAttribute('data-emt', '');
        el.dataset.emSel = genSelector(el);
        n++;
      }
    });
    return n;
  }

  /* ---------- overrides 应用 / 撤销 ---------- */
  function applyOverrides() {
    for (const [sel, rec] of Object.entries(STORE.text)) {
      const el = document.querySelector(sel);
      if (el && el.innerHTML !== rec.new) el.innerHTML = rec.new;
    }
    for (const [sel, props] of Object.entries(STORE.style)) {
      const el = document.querySelector(sel);
      if (el) for (const [k, v] of Object.entries(props)) el.style[k] = v;
    }
  }
  function clearOverrides() {
    for (const sel of Object.keys(STORE.text)) {
      const el = document.querySelector(sel);
      const rec = STORE.text[sel];
      if (el) el.innerHTML = rec.old;
    }
    for (const sel of Object.keys(STORE.style)) {
      const el = document.querySelector(sel);
      if (el) for (const k of Object.keys(STORE.style[sel])) el.style[k] = '';
    }
  }

  /* ---------- UI 构建 ---------- */
  const fab = document.createElement('button');
  fab.id = 'em-fab'; fab.type = 'button'; fab.title = '编辑模式'; fab.textContent = '✏️';
  document.body.appendChild(fab);

  const bar = document.createElement('div');
  bar.id = 'em-bar';
  bar.innerHTML = `
    <b>编辑模式</b>
    <button id="em-text" class="on">文字</button>
    <button id="em-style">样式</button>
    <span style="flex:1"></span>
    <button id="em-export">导出变更</button>
    <button id="em-reset">清空暂存</button>
    <button id="em-exit">退出</button>`;
  document.body.appendChild(bar);

  const panel = document.createElement('div');
  panel.id = 'em-panel';
  panel.innerHTML = `
    <h4>样式微调</h4>
    <label>文字颜色</label><input type="text" id="em-color" placeholder="#9e332d 或 red">
    <label>字号 px</label><input type="number" id="em-size" min="8" max="80" step="0.5">
    <label>行高</label><input type="number" id="em-lh" min="1" max="3" step="0.05">
    <label>字间距 px</label><input type="number" id="em-ls" min="-4" max="16" step="0.5">
    <label>背景色</label><input type="text" id="em-bg" placeholder="#fff 或 rgba(...)">
    <div class="em-row2"><label style="flex:1">透明度</label><input type="number" id="em-op" min="0" max="1" step="0.05"></div>
    <button class="em-clear" id="em-clearone">清除该元素样式</button>
    <div class="em-note">调整即时生效并暂存；导出后由 AI 落码到源文件。</div>`;
  document.body.appendChild(panel);

  /* ---------- 文字编辑 ---------- */
  function editText(el) {
    if (mode !== 'text') return;
    document.querySelectorAll('.em-active').forEach(e => e.classList.remove('em-active'));
    el.classList.add('em-active');
    el.contentEditable = 'true';
    el.focus();
    const sel = el.dataset.emSel;
    const commit = () => {
      el.contentEditable = 'false';
      el.classList.remove('em-active');
      const rec = STORE.text[sel] || { old: el.innerHTML };
      rec.new = el.innerHTML;
      STORE.text[sel] = rec;
      save();
      el.removeEventListener('blur', commit);
      el.removeEventListener('keydown', key);
    };
    const key = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } };
    el.addEventListener('blur', commit);
    el.addEventListener('keydown', key);
  }

  /* ---------- 样式面板 ---------- */
  const STYLE_PROPS = [
    ['em-color', 'color'], ['em-size', 'fontSize'], ['em-lh', 'lineHeight'],
    ['em-ls', 'letterSpacing'], ['em-bg', 'backgroundColor'], ['em-op', 'opacity'],
  ];
  function openStylePanel(el) {
    styleTarget = el;
    const sel = el.dataset.emSel;
    const props = STORE.style[sel] || {};
    document.querySelectorAll('.em-active').forEach(e => e.classList.remove('em-active'));
    el.classList.add('em-active');
    for (const [id, prop] of STYLE_PROPS) {
      const input = document.getElementById(id);
      input.value = props[prop] || (prop === 'opacity' ? '1' : el.style[prop] || '');
    }
    panel.style.display = 'block';
  }
  for (const [id, prop] of STYLE_PROPS) {
    document.getElementById(id).addEventListener('input', e => {
      if (!styleTarget) return;
      const sel = styleTarget.dataset.emSel;
      const v = e.target.value.trim();
      const props = STORE.style[sel] = STORE.style[sel] || {};
      if (v === '') { delete props[prop]; styleTarget.style[prop] = ''; }
      else { props[prop] = v; styleTarget.style[prop] = v; }
      save();
    });
  }
  document.getElementById('em-clearone').addEventListener('click', () => {
    if (!styleTarget) return;
    const sel = styleTarget.dataset.emSel;
    delete STORE.style[sel];
    styleTarget.style.cssText = '';
    panel.style.display = 'none';
    save();
  });

  /* ---------- 模式切换 ---------- */
  function setMode(next) {
    mode = next;
    document.body.classList.toggle('em-text', mode === 'text');
    document.body.classList.toggle('em-style', mode === 'style');
    bar.style.display = mode === 'off' ? 'none' : 'flex';
    panel.style.display = 'none';
    document.getElementById('em-text').classList.toggle('on', mode === 'text');
    document.getElementById('em-style').classList.toggle('on', mode === 'style');
    if (mode === 'off') {
      document.querySelectorAll('[data-emt]').forEach(el => { el.contentEditable = 'false'; el.classList.remove('em-active'); });
      styleTarget = null;
    }
  }
  fab.addEventListener('click', () => {
    if (mode === 'off') {
      applyOverrides();
      markEditable();
      setMode('text');
    } else setMode('off');
  });
  document.getElementById('em-text').addEventListener('click', () => setMode('text'));
  document.getElementById('em-style').addEventListener('click', () => setMode('style'));
  document.getElementById('em-exit').addEventListener('click', () => setMode('off'));

  /* ---------- 导出 ---------- */
  document.getElementById('em-export').addEventListener('click', () => {
    const payload = {
      version: 'home-edits-v1',
      exportedAt: new Date().toISOString(),
      textCount: Object.keys(STORE.text).length,
      styleCount: Object.keys(STORE.style).length,
      edits: STORE,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date(), pad = x => String(x).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = `homepage-edits-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- 清空暂存 ---------- */
  document.getElementById('em-reset').addEventListener('click', () => {
    if (!confirm('清空所有未落码的暂存修改？页面将恢复为代码版原样。')) return;
    clearOverrides();
    localStorage.removeItem(LS_KEY);
    location.reload();
  });

  /* ---------- 拦截：编辑模式下点击可编辑元素不再触发跳转/手风琴 ---------- */
  document.addEventListener('click', e => {
    if (mode === 'off') return;
    const t = e.target;
    const emt = t.closest('[data-emt]');
    if (emt) { e.preventDefault(); e.stopPropagation(); }
    if (mode === 'text' && emt) editText(emt);
    if (mode === 'style' && emt) openStylePanel(emt);
  }, true);

  /* ---------- 启动：应用站长暂存（若与代码版不同则呈现暂存效果） ---------- */
  if (Object.keys(STORE.text).length || Object.keys(STORE.style).length) {
    applyOverrides();
    fab.style.outline = '2px solid #f2a95e';   // 提示：存在未落码暂存
    fab.title = '编辑模式（存在未落码暂存）';
  }
})();
