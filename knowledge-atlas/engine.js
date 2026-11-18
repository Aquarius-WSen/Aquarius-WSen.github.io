/* 非诉讼法律业务知识星云 · 引擎 v1
 * 视觉目标：图1（紫蓝星系核+琥珀金丝缕+暗红尘埃）× 图2（橙白吸积盘黑洞）
 * 交互谱系：沿用金莉珊站星云页的交互模式（标签/索引/搜索/拖拽/缩放/抽屉）
 * 数据：./data.js（v1 架构骨架）
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UNIVERSE, NEBULAE, LINKS, CARDS } from './data.js';

/* ---------- 参数（调参台已删，按王律批复固化：云气最低档 / 星点满 / 辉光满 / 转速保持 / 漂移开） ---------- */
const params = { cloud: 1.0, bloom: 1.15, disk: 1.0, star: 2.4, drift: 1 };   // v16：开局播放状态（机位从 START_VIEW 起步，随后缓慢漂移）
const PRESETS = {
  'violet-gold': { paletteShift: null, bloom: 1.05, diskHot: [1.0, 0.96, 0.88], diskMid: [1.0, 0.62, 0.30], diskEdge: [0.45, 0.10, 0.04] },
  'cold-blue':   { paletteShift: 'cold', bloom: 0.9,  diskHot: [0.92, 0.97, 1.0],  diskMid: [0.55, 0.72, 1.0],  diskEdge: [0.10, 0.18, 0.42] },
  'amber-dawn':  { paletteShift: 'amber', bloom: 1.2, diskHot: [1.0, 0.98, 0.90], diskMid: [1.0, 0.72, 0.42], diskEdge: [0.55, 0.18, 0.06] },
};
const SHIFT = {
  cold:  { core: 0x9dc4ff, glow: 0x5aa0e8, dust: 0x12294e, filament: 0xa8d8ff },
  amber: { core: 0xffcf9e, glow: 0xff8f4d, dust: 0x4e2410, filament: 0xffe8c2 },
};

/* ---------- 基础场景 ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
scene.fog = new THREE.FogExp2(0x020208, 0.00028);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 12000);
camera.position.set(-1001.2, 740.7, -594.3);   // v15：开局即王律定版机位（视距 1380，与 START_VIEW 一致）

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 120;
controls.maxDistance = 8000;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.35;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), params.bloom, 0.55, 0.22);   // v8b：阈值 0.22 收敛中亮度晕染（星点亮核 1.0 仍起晕）
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ---------- 画布纹理工厂 ---------- */
function makeCanvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const TEX = {};
function buildTextures() {
  // 柔光球（云气/辉光专用，不用于星点）
  TEX.glow = makeCanvas(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  // 星点贴图 v2：小硬核+极窄光晕——修"手电筒"（之前 glow 贴图被放大后成整团光斑）
  TEX.star = makeCanvas(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.08, 'rgba(255,255,255,.95)');
    g.addColorStop(0.16, 'rgba(255,255,255,.28)');
    g.addColorStop(0.32, 'rgba(255,255,255,.05)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  TEX.cloud = makeCanvas(256, (ctx, s) => {
    for (let i = 0; i < 26; i++) {
      const cx = s/2 + (Math.random()-.5)*s*.5, cy = s/2 + (Math.random()-.5)*s*.5;
      const r = s*(0.09 + Math.random()*0.20);
      const a = 0.05 + Math.random()*0.10;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.55, `rgba(255,255,255,${a*0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    }
  });
  TEX.flare = makeCanvas(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.14, 'rgba(255,255,255,.8)');
    g.addColorStop(0.34, 'rgba(255,255,255,.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
}
buildTextures();

function hexColor(c) { return '#' + c.toString(16).padStart(6, '0'); }

/* ---------- 远景星野 + 银河带 + 尘埃暗云（修"太空荡"） ---------- */
{
  // 1) 全天星野（v8d：10000 颗；幂律大小对比拉大 1.2-6.0；8 色彩杂：白/蓝/橙/紫/青/红橙/绿松/暖白）
  // v17：每星独立闪烁档案（随机相位/周期 4-12s/活跃窗口 15-33%/幅度 0.35-0.85，60% 可闪 40% 恒亮）
  const n = 10000, pos = new Float32Array(n*3), col = new Float32Array(n*3), sz = new Float32Array(n);
  const phase = new Float32Array(n), dur = new Float32Array(n), spd = new Float32Array(n), tw = new Float32Array(n);
  const tints = [[1,1,1],[0.72,0.8,1],[1,0.85,0.72],[0.85,0.72,1],[0.6,1,0.95],[1,0.62,0.5],[0.55,1,0.85],[1,0.95,0.75]];
  for (let i = 0; i < n; i++) {
    const r = 2600 + Math.random()*3800, th = Math.random()*Math.PI*2, ph = Math.acos(Math.random()*2-1);
    pos[i*3] = r*Math.sin(ph)*Math.cos(th); pos[i*3+1] = r*Math.cos(ph)*0.6; pos[i*3+2] = r*Math.sin(ph)*Math.sin(th);
    const t = tints[(Math.random()*tints.length)|0], b = 0.5 + Math.random()*0.5;
    col[i*3] = t[0]*b; col[i*3+1] = t[1]*b; col[i*3+2] = t[2]*b;
    sz[i] = 1.2 + Math.pow(Math.random(), 2.2)*4.8;   // 幂律：小星为主，少量大亮星（对比拉大）
    phase[i] = Math.random();
    dur[i] = 0.30 + Math.random()*0.15;
    spd[i] = 1 / (3.0 + Math.random()*0.8);
    tw[i] = Math.random() < 0.6 ? 0.8 + Math.random()*0.2 : 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  g.setAttribute('aDur', new THREE.BufferAttribute(dur, 1));
  g.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
  g.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6500);
  const m = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: TEX.star }, uStar: { value: params.star }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSz; attribute float aPhase; attribute float aDur; attribute float aSpd; attribute float aTw;
      uniform float uStar; uniform float uTime;
      varying vec3 vC; varying float vTw;
      void main(){
        vC = color;
        float t = fract(uTime * aSpd + aPhase);            // 周期内时间 0..1（各星错相）
        float inWin = step(t, aDur);                        // 只在活跃窗口内闪
        float local = t / max(aDur, 0.001);
        float flash = 0.5 - 0.5 * cos(local * 6.2832);     // v18：窗口内一次完整呼吸
        vTw = 1.0 + aTw * inWin * (flash * 1.45 - 1.0);   // v23：峰值过驱动 45%
        vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = clamp(aSz * vTw * uStar * (1900.0/-mv.z), 0.5, 9.0);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `uniform sampler2D uTex; varying vec3 vC; varying float vTw;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC * vTw, t.a * vTw); }`,
    vertexColors: true,
  });
  scene.userData.starMat = m;
  scene.userData.twinkleMats = [m];
  scene.add(new THREE.Points(g, m));

  // 2) 银河带（斜跨天空的密集星流+雾带，v8 同步加亮加密；v17 加闪烁档案 45% 可闪）
  const gn = 4200, gpos = new Float32Array(gn*3), gcol = new Float32Array(gn*3), gsz = new Float32Array(gn);
  const gphase = new Float32Array(gn), gdur = new Float32Array(gn), gspd = new Float32Array(gn), gtw = new Float32Array(gn);
  for (let i = 0; i < gn; i++) {
    const t = Math.random()*Math.PI*2;
    const R = 2900 + Math.random()*2400;
    const band = (Math.random()+Math.random()+Math.random()-1.5)/1.5; // 中央密两侧疏
    const y = band*620;
    gpos[i*3] = Math.cos(t)*R; gpos[i*3+1] = y; gpos[i*3+2] = Math.sin(t)*R;
    const warm = Math.random() < 0.5;
    const b = 0.42 + Math.random()*0.58;
    gcol[i*3] = (warm?1:0.75)*b; gcol[i*3+1] = (warm?0.9:0.82)*b; gcol[i*3+2] = (warm?0.76:1)*b;
    gsz[i] = 1.3 + Math.pow(Math.random(), 1.8)*2.8;
    gphase[i] = Math.random();
    gdur[i] = 0.30 + Math.random()*0.15;
    gspd[i] = 1 / (3.0 + Math.random()*0.8);
    gtw[i] = Math.random() < 0.45 ? 0.8 + Math.random()*0.2 : 0;
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  gg.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  gg.setAttribute('aSz', new THREE.BufferAttribute(gsz, 1));
  gg.setAttribute('aPhase', new THREE.BufferAttribute(gphase, 1));
  gg.setAttribute('aDur', new THREE.BufferAttribute(gdur, 1));
  gg.setAttribute('aSpd', new THREE.BufferAttribute(gspd, 1));
  gg.setAttribute('aTw', new THREE.BufferAttribute(gtw, 1));
  gg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6500);
  const gm = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: TEX.star }, uStar: { value: params.star }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSz; attribute float aPhase; attribute float aDur; attribute float aSpd; attribute float aTw;
      uniform float uStar; uniform float uTime;
      varying vec3 vC; varying float vTw;
      void main(){
        vC = color;
        float t = fract(uTime * aSpd + aPhase);
        float inWin = step(t, aDur);
        float local = t / max(aDur, 0.001);
        float flash = 0.5 - 0.5 * cos(local * 6.2832);
        vTw = 1.0 + aTw * inWin * (flash * 1.45 - 1.0);   // v23：峰值过驱动 45%
        vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = clamp(aSz * vTw * uStar * (1900.0/-mv.z), 0.5, 6.5);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `uniform sampler2D uTex; varying vec3 vC; varying float vTw;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC * vTw, t.a * vTw); }`,
    vertexColors: true,
  });
  scene.userData.milkyMat = gm;
  scene.userData.twinkleMats.push(gm);
  const milky = new THREE.Points(gg, gm);
  milky.rotation.z = 0.5; milky.rotation.x = 0.32;
  scene.add(milky);

  // 3) 银河雾带（大尺度柔光云，斜向）
  for (let i = 0; i < 60; i++) {
    const t = (i/60)*Math.PI*2 + Math.random()*0.3;
    const R = 3100 + Math.random()*1800;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: new THREE.Color().setHSL(0.08+Math.random()*0.5, 0.4, 0.12+Math.random()*0.1),
      transparent: true, opacity: 0.045 + Math.random()*0.05, blending: THREE.AdditiveBlending, depthWrite: false, rotation: Math.random()*Math.PI*2 }));
    sp.position.set(Math.cos(t)*R, (Math.random()-.5)*700, Math.sin(t)*R);
    const s = 700 + Math.random()*900; sp.scale.set(s, s*0.55, 1);
    scene.add(sp);
  }
  // 4) 近景尘埃暗云（前景遮挡感，压暗底色）
  for (let i = 0; i < 26; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: 0x06060e,
      transparent: true, opacity: 0.24 + Math.random()*0.2, depthWrite: false, rotation: Math.random()*Math.PI*2 }));
    const th = Math.random()*Math.PI*2, R = 900 + Math.random()*1500;
    sp.position.set(Math.cos(th)*R, (Math.random()-.5)*800, Math.sin(th)*R);
    const s = 500 + Math.random()*800; sp.scale.set(s, s*0.7, 1);
    scene.add(sp);
  }
}

/* ---------- 黑洞 v7：全 shader billboard（复刻 gravity-reference：黑剪影+光子环+椭圆吸积流+上下透镜拱） ---------- */
const blackhole = new THREE.Group();
scene.add(blackhole);   // 保留为锚点（labelDefs 等引用）
const bhUniforms = { uTime: { value: 0 }, uSpeed: { value: 1 } };
const bhShaderMat = new THREE.ShaderMaterial({
  uniforms: bhUniforms,
  transparent: true, depthWrite: false, premultipliedAlpha: true,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uTime, uSpeed; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.07; a *= 0.55; } return v; }
    void main(){
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);

      /* 视界剪影与光子环（v9e：黑球 58、吸积盘外缘 235（0.839×280）、拱带视觉外缘 ≈180、亮度 ×0.90；
       * 约束校验：球 58 < 盘竖向半径 0.30×235=70.5 ✓ */
      float insideH = 1.0 - smoothstep(0.20, 0.215, r);
      float photon  = exp(-pow((r - 0.232)/0.011, 2.0));

      /* 吸积盘：椭圆压扁（v10：纵横比 0.30→0.42，盘有竖向厚度不再薄片）+ 开普勒流噪声 + 多普勒增亮（0.45→0.30 收敛） */
      vec2 pd = vec2(p.x, p.y/0.42);
      float rd = length(pd);
      float ad = atan(pd.y, pd.x);
      float discMask = smoothstep(0.235, 0.27, rd) * (1.0 - smoothstep(0.743, 0.839, rd));
      float rot = uTime * uSpeed * 0.5;
      vec2 circ = vec2(cos(ad - rot), sin(ad - rot)) * 2.2;   // v19：角度周期化，消除 ±180° 剪刀缝
      float flow = fbm(circ + vec2(0.0, rd*20.0 - uTime*uSpeed*0.42) + 7.3);
      float dop = 1.0 + 0.30*sin(ad + 0.9);
      vec3 discCol = mix(vec3(1.00, 0.97, 0.90), vec3(1.00, 0.62, 0.30), smoothstep(0.235, 0.70, rd));
      discCol = mix(discCol, vec3(0.40, 0.17, 0.08), smoothstep(0.60, 0.82, rd));
      /* v10：亮度分布与拱光带同式（0.16+0.50×flow^1.3：均值 0.26≈拱 0.32、峰值 0.62≈拱 0.50）——盘有连续亮度体，非稀疏薄片 */
      float discA = discMask * (0.16 + 0.50*pow(flow, 1.3)) * dop * 0.72 * (1.0 - smoothstep(0.743, 0.875, rd)*0.55);

      /* 上下透镜拱：环带 + 竖直权重 + 流噪声（v9g：厚度降 30% 从外侧收窄——内缘恢复 0.245-0.275 原位，
       * 外缘 0.55→0.459×280≈128、渐隐窗 0.40-0.55 等比缩至 0.354-0.459 保软边），v8 整体 ×0.72 收敛 */
      float arcMask = smoothstep(0.245, 0.275, r) * (1.0 - smoothstep(0.354, 0.459, r));
      float vertW = 1.0 - smoothstep(0.38, 0.85, abs(p.x));
      float arcRot = uTime * uSpeed * 0.18;
      vec2 arcCirc = vec2(cos(atan(p.y, p.x) - arcRot), sin(atan(p.y, p.x) - arcRot)) * 2.6;   // v19：周期化
      float arcNoise = fbm(arcCirc + vec2(0.0, r*20.0));
      vec3 arcCol = mix(vec3(1.0, 0.90, 0.72), vec3(1.0, 0.55, 0.25), smoothstep(0.24, 0.52, r));
      float arcA = arcMask * vertW * (0.18 + 0.52*arcNoise) * (p.y > 0.0 ? 1.0 : 0.72) * 0.72;

      /* 预乘合成：亮部加色叠亮，视界内纯黑遮挡（photon 收窄到 0.55，参考图是柔光细环非爆闪）
       * v9d：白壳亮度整体 ×0.90（原亮度降 10%；黑球剪影不受 DIM 影响，保持纯黑不透明） */
      float DIM = 0.90;
      vec3 col = (discCol * discA + arcCol * arcA + vec3(1.0, 0.94, 0.82) * photon * 0.55) * DIM;
      float a = clamp((discA + arcA*0.55 + photon*0.55) * DIM, 0.0, 1.0);
      a = max(a, insideH);
      col = mix(col, vec3(0.0), insideH);
      gl_FragColor = vec4(col, a);
    }`
});
const bhMesh = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), bhShaderMat);   // 已回退：第一轮尺寸
bhMesh.renderOrder = 5;
scene.add(bhMesh);

/* ---------- 黑洞引力吸积流 v8：金色数据旋入（还原 PPT 封面动态） ----------
 * 26 条螺线流 × 34 粒 = 884 粒子：每条流共享相位基准，粒子沿流散布成股；
 * 角速度开普勒式 ω∝r^-1.15（内快外慢→持续旋转感），径向缓慢内坠，内缘 240→150 溶解进吸积盘；
 * 拖尾用解析回推 0.12s 轨迹画短线段（速度越快拖尾越长，天然成"被吸入"的流线）；
 * 旋向与盘面 shader 一致（屏幕顺时针）；renderOrder 0 先于黑洞渲染，视界剪影正确遮挡背侧粒子 */
const INFLOW = { STREAMS: 26, PER: 34, R0: 150, R1: 880 };   // 已回退：第一轮参数
{
  const N = INFLOW.STREAMS * INFLOW.PER;
  const ang = new Float32Array(N), rad = new Float32Array(N), y0 = new Float32Array(N);
  const szA = new Float32Array(N), colA = new Float32Array(N*3), alA = new Float32Array(N);
  for (let s = 0; s < INFLOW.STREAMS; s++) {
    const base = (s / INFLOW.STREAMS) * Math.PI * 2;
    for (let k = 0; k < INFLOW.PER; k++) {
      const i = s * INFLOW.PER + k;
      const r = INFLOW.R0 + 60 + Math.random() * (INFLOW.R1 - INFLOW.R0 - 60);
      rad[i] = r;
      ang[i] = base + (1 - r / INFLOW.R1) * 5.2 + (Math.random()-.5)*0.10;   // 螺线相位：越靠内拧得越紧
      y0[i] = (Math.random()-.5) * 2 * 240;
      szA[i] = 1.3 + Math.pow(Math.random(), 2.0) * 3.6;
      alA[i] = 0;
      const pick = Math.random();
      const c = pick < 0.08 ? [0.72, 0.82, 1.0] : (pick < 0.30 ? [1.0, 0.88, 0.66] : [1.0, 0.79, 0.48]);
      const b = 0.5 + Math.random()*0.5;
      colA[i*3] = c[0]*b; colA[i*3+1] = c[1]*b; colA[i*3+2] = c[2]*b;
    }
  }
  // 粒子头（flare 贴图 + 按距衰减的点尺寸）
  const pg = new THREE.BufferGeometry();
  const pPos = new Float32Array(N*3);
  pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  pg.setAttribute('aSz', new THREE.BufferAttribute(szA, 1));
  pg.setAttribute('aA', new THREE.BufferAttribute(alA, 1));
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1100);
  const pm = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: TEX.flare } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: `attribute float aSz; attribute float aA; varying vec3 vC;
      void main(){ vC = color*aA; vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = clamp(aSz*(900.0/-mv.z), 1.0, 7.5); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D uTex; varying vec3 vC;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, t.a); }`,
  });
  const inflowPoints = new THREE.Points(pg, pm);
  scene.add(inflowPoints);
  // 拖尾线段
  const tg = new THREE.BufferGeometry();
  const tPos = new Float32Array(N*2*3), tCol = new Float32Array(N*2*3);
  tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tg.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  tg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1100);
  const trails = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ vertexColors: true,
    transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(trails);

  // 微倾吸积面（与黑洞盘面呼应，加纵深）
  const inflowGroup = new THREE.Group();
  inflowGroup.rotation.set(0.14, 0, -0.08);
  scene.remove(inflowPoints); scene.remove(trails);
  inflowGroup.add(inflowPoints); inflowGroup.add(trails);
  scene.add(inflowGroup);

  INFLOW.update = (dt) => {
    for (let i = 0; i < N; i++) {
      const r = rad[i];
      const w = Math.min(3.2, 1.6*Math.pow(260/r, 1.15) + 0.15);
      ang[i] += w*dt;
      rad[i] = r - (10 + 2200/r)*dt;
      if (rad[i] < INFLOW.R0) {          // 落入内缘：回外缘重生，保持所属螺线流的相位结构
        const s = (i / INFLOW.PER) | 0;
        const nr = INFLOW.R0 + 320 + Math.random()*(INFLOW.R1 - INFLOW.R0 - 320);
        rad[i] = nr;
        ang[i] = (s / INFLOW.STREAMS)*Math.PI*2 + (1 - nr/INFLOW.R1)*5.2 + (Math.random()-.5)*0.10;
      }
      const rr = rad[i];
      const x = Math.cos(ang[i])*rr, z = Math.sin(ang[i])*rr;
      const y = y0[i]*Math.pow(rr/INFLOW.R1, 1.2);          // 外散内聚：漏斗状汇入赤道面
      pPos[i*3] = x; pPos[i*3+1] = y; pPos[i*3+2] = z;
      // 溶解系数（第一轮原样回退：当时两因子方向相消、粒子流实际不可见，即"这一版不错"的观感）
      const aIn = 1.0 - THREE.MathUtils.smoothstep(rr, 150, 240);
      const aOut = THREE.MathUtils.smoothstep(rr, 800, 880);
      alA[i] = aIn * aOut;
      // 拖尾：回推 0.12s 轨迹（角后退 ω·δ + 径向后退 |dr/dt|·δ）
      const dR = (10 + 2200/rr)*0.12;
      const rPrev = Math.min(rr + dR, INFLOW.R1 + 80);
      const aPrev = ang[i] - w*0.12;
      const yPrev = y0[i]*Math.pow(rPrev/INFLOW.R1, 1.2);
      tPos[i*6]   = Math.cos(aPrev)*rPrev; tPos[i*6+1] = yPrev; tPos[i*6+2] = Math.sin(aPrev)*rPrev;
      tPos[i*6+3] = x; tPos[i*6+4] = y; tPos[i*6+5] = z;
      const tc = alA[i]*0.5;
      tCol[i*6]   = colA[i*3]*tc;     tCol[i*6+1] = colA[i*3+1]*tc;     tCol[i*6+2] = colA[i*3+2]*tc;
      tCol[i*6+3] = colA[i*3]*tc*0.6; tCol[i*6+4] = colA[i*3+1]*tc*0.6; tCol[i*6+5] = colA[i*3+2]*tc*0.6;
    }
    pg.attributes.position.needsUpdate = true;
    pg.attributes.aA.needsUpdate = true;
    tg.attributes.position.needsUpdate = true;
    tg.attributes.color.needsUpdate = true;
  };
}


/* ---------- 星云 v5：7 星云按北斗七星排布（黑洞居斗勺之内） ----------
 * 布局由北斗七星真实星表（赤经×cosδ 归算 + 赤纬）投影归一，平移使黑洞位于斗勺四星内心后缩放 ×2100：
 * 斗勺：天枢=债券 / 天璇=重组 / 天玑=私募 / 天权=ABS；斗柄：玉衡=并购、开阳/摇光=未探索占位；
 * 半径 400-1800 参差（不再正五边形）。未探索：仅 3D 云气+标注，无节点、无目录项、无标签页 */
const CLUSTERS = [
  { id: 'A1', name: '公开发行公司债券',   parent: '证券及资本市场', star: '天枢', color: 0x8ea2ff, adj: 0x7fb8e8, position: [ -378,  90,  397] },
  { id: 'A2', name: '重大资产重组',       parent: '证券及资本市场', star: '天璇', color: 0x7fb8e8, adj: 0xffcf8a, position: [ -401, -50,  -74] },
  { id: 'B1', name: '私募投资基金',       parent: '银行与金融',     star: '天玑', color: 0xffcf8a, adj: 0xe8a87f, position: [  252,  70, -309] },
  { id: 'B2', name: '债券与资产证券化',   parent: '银行与金融',     star: '天权', color: 0xe8a87f, adj: 0xff9bb0, position: [  525, -70,  -17] },
  { id: 'C1', name: '兼并收购',           parent: '公司与并购',     star: '玉衡', color: 0xff9bb0, adj: 0x8ea2ff, position: [ 1006,  60,  174] },
  { id: 'U1', name: '未探索',             parent: '北斗七星',       star: '开阳', color: 0x8b93b8, adj: 0x6a5f96, position: [ 1382, -60,   86], unexplored: true },
  { id: 'U2', name: '未探索',             parent: '北斗七星',       star: '摇光', color: 0x7f86ad, adj: 0x5f587f, position: [ 1676, 100, -691], unexplored: true },
];
for (const c of CLUSTERS) {
  const neb = NEBULAE.find(n => n.subNebulae.some(s => s.id === c.id));
  if (!neb) { c.nodes = []; c.anchor = ''; continue; }   // 未探索星云：仅 3D 占位
  const sub = neb.subNebulae.find(s => s.id === c.id);
  c.nodes = sub.nodes; c.anchor = sub.anchor;
}

const nebulaGroups = [];
let cloudSprites = [], starMats = [];
function buildNebulae() {
  for (const g of nebulaGroups) scene.remove(g);
  nebulaGroups.length = 0; cloudSprites = []; starMats = [];

  const CORE_GOLD = new THREE.Color(0xffd9a0);   // 黑洞环境金色（渐变桥接色）
  const BH = new THREE.Vector3(0, 0, 0);

  for (const c of CLUSTERS) {
    const UX = !!c.unexplored;                       // 未探索占位星云：整体降档（更少更暗）
    const group = new THREE.Group();
    group.userData.nebulaId = c.id;
    group.position.set(...c.position);
    const cMain = new THREE.Color(c.color), cAdj = new THREE.Color(c.adj);
    const center = new THREE.Vector3(0, 0, 0);       // 星云局部中心
    const dirToBH = BH.clone().sub(new THREE.Vector3(...c.position)).normalize();   // 朝黑洞方向（局部）

    // 核心辉光：仅 1 个淡中核（辅斑删除——叠加饱和元凶）
    const core1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: cMain, transparent: true,
      opacity: UX ? 0.038 : 0.055, blending: THREE.AdditiveBlending, depthWrite: false }));
    core1.scale.set(UX ? 210 : 260, UX ? 150 : 190, 1);
    group.add(core1);

    // 主云气：多色揉杂（主色占主导+色板随机混色），靠黑洞侧渐入金色、外侧渐入邻色
    const PALETTE = [0x8ea2ff, 0x7fd4c8, 0xffcf8a, 0xff9d6b, 0xff9bb0, 0x5c5ae0];
    for (let i = 0; i < (UX ? 40 : 70); i++) {
      const nearCore = Math.random() < 0.3;
      const R = nearCore ? 50 + Math.random()*110 : 120 + Math.random()*230;
      const th = Math.random()*Math.PI*2, ph = Math.acos(Math.random()*2-1);
      const lp = new THREE.Vector3(R*Math.sin(ph)*Math.cos(th)*1.35, R*Math.cos(ph)*0.5, R*Math.sin(ph)*Math.sin(th));
      const col = cMain.clone();
      // 多色揉杂：55% 概率从色板随机挑一色揉入（宇宙星云的多气体色感；未探索星云保持素净）
      if (!UX && Math.random() < 0.55) {
        const pick = PALETTE[(Math.random()*PALETTE.length)|0];
        col.lerp(new THREE.Color(pick), 0.22 + Math.random()*0.33);
      }
      // 渐变1：朝黑洞方向混入金色
      const d1 = Math.max(0, lp.clone().normalize().dot(dirToBH));
      col.lerp(CORE_GOLD, d1*0.42);
      // 渐变2：外侧混入邻星云色
      const d2 = Math.max(0, lp.x*0.5 + lp.z*0.5) / (R*0.75);
      col.lerp(cAdj, Math.min(0.5, d2*0.35));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: col, transparent: true,
        opacity: (nearCore ? 0.035 + Math.random()*0.025 : 0.02 + Math.random()*0.02) * (UX ? 0.72 : 1),
        blending: THREE.AdditiveBlending, depthWrite: false, rotation: Math.random()*Math.PI*2 }));
      sp.position.copy(lp);
      const s = 130 + Math.random()*230; sp.scale.set(s, s*(0.6+Math.random()*0.5), 1);
      sp.userData.baseOpacity = sp.material.opacity;
      group.add(sp); cloudSprites.push(sp);
    }

    // 朝心尾迹：从星云中心向黑洞方向拖出、渐远渐淡——化解"蓝色光球与金色背景的断层"
    for (let i = 0; i < (UX ? 12 : 36); i++) {
      const t = Math.random();                     // 0 星云侧 → 1 黑洞侧
      const dist = 260 + t*430;
      const wob = (Math.random()-.5)*150;
      const wp = new THREE.Vector3(...c.position).addScaledVector(dirToBH, dist);
      wp.x += wob*(1-t); wp.y += wob*0.4*(1-t); wp.z += wob*(1-t);
      const col = cMain.clone().lerp(CORE_GOLD, t*0.85);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: col, transparent: true,
        opacity: (0.028 - t*0.02) * (0.7 + Math.random()*0.6) * (UX ? 0.7 : 1), blending: THREE.AdditiveBlending, depthWrite: false, rotation: Math.random()*Math.PI*2 }));
      sp.position.copy(wp);   // 世界系：直接挂 scene
      const s = (300 - t*160) * (0.7 + Math.random()*0.5);
      sp.scale.set(s, s*(0.55+Math.random()*0.3), 1);
      sp.userData.baseOpacity = sp.material.opacity;
      scene.add(sp); cloudSprites.push(sp);       // 不入 group（随 group 旋转会摆尾，故独立）
      sp.userData.tailOf = c.id;
    }


    // 星点：60% 主色 + 25% 邻色 + 15% 白；朝黑洞方向混金；分布向心拖尾（未探索减半）
    // v17：55% 可闪（幅度 0.4-0.9，周期 3-9 秒稍快于背景），窗口机制同背景
    {
      const n = UX ? 1600 : 3200, pos = new Float32Array(n*3), col = new Float32Array(n*3), sz = new Float32Array(n);
      const phase = new Float32Array(n), dur = new Float32Array(n), spd = new Float32Array(n), tw = new Float32Array(n);
      const cW = new THREE.Color(0xffffff);
      for (let i = 0; i < n; i++) {
        const th = Math.random()*Math.PI*2, ph = Math.acos(Math.random()*2-1);
        const R = 30 + Math.pow(Math.random(), 1.5)*380;
        const toCore = Math.random() < 0.3;
        let px = R*Math.sin(ph)*Math.cos(th)*1.3, py = R*Math.cos(ph)*0.5, pz = R*Math.sin(ph)*Math.sin(th);
        if (toCore) { px = -dirToBH.x*R*(0.6+Math.random()*0.8) + px*0.25; py = py*0.3; pz = -dirToBH.z*R*(0.6+Math.random()*0.8) + pz*0.25; }
        pos[i*3] = px; pos[i*3+1] = py; pos[i*3+2] = pz;
        const r0 = Math.random();
        let c = r0 < 0.15 ? cW.clone() : (r0 < 0.4 ? cAdj.clone() : cMain.clone());
        if (toCore) c.lerp(CORE_GOLD, 0.55);
        const b = 0.35 + Math.random()*0.65;
        col[i*3] = c.r*b; col[i*3+1] = c.g*b; col[i*3+2] = c.b*b;
        sz[i] = 1.0 + Math.pow(Math.random(), 2.2)*3.2;
        phase[i] = Math.random();
        dur[i] = 0.32 + Math.random()*0.16;
        spd[i] = 1 / (3.0 + Math.random()*0.8);
        tw[i] = Math.random() < 0.55 ? 0.85 + Math.random()*0.15 : 0;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
      g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
      g.setAttribute('aDur', new THREE.BufferAttribute(dur, 1));
      g.setAttribute('aSpd', new THREE.BufferAttribute(spd, 1));
      g.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(...c.position), 900);
      const m = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: TEX.star }, uStar: { value: params.star }, uTime: { value: 0 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
        vertexShader: `attribute float aSz; attribute float aPhase; attribute float aDur; attribute float aSpd; attribute float aTw;
          uniform float uStar; uniform float uTime;
          varying vec3 vC; varying float vTw;
          void main(){
            vC = color;
            float t = fract(uTime * aSpd + aPhase);
            float inWin = step(t, aDur);
            float local = t / max(aDur, 0.001);
            float flash = 0.5 - 0.5 * cos(local * 6.2832);
            vTw = 1.0 + aTw * inWin * (flash * 1.45 - 1.0);   // v23：峰值过驱动 45%
            vec4 mv = modelViewMatrix*vec4(position,1.0);
            gl_PointSize = clamp(aSz * vTw * uStar * (700.0/-mv.z), 0.4, 9.0);
            gl_Position = projectionMatrix*mv;
          }`,
        fragmentShader: `uniform sampler2D uTex; varying vec3 vC; varying float vTw;
          void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC * vTw, t.a * vTw * 0.9); }`,
      });
      group.add(new THREE.Points(g, m)); starMats.push(m);
    }
    nebulaGroups.push(group); scene.add(group);
  }
  applyParams();
}

/* ---------- 知识节点 ---------- */
const nodeRegistry = [];
const nodeSprites = [];
const edgeIndex = new Map(); // nodeId -> [{from,to,type,note}]

function seededRand(seed) { let a = seed >>> 0; return () => { a = (a*1664525 + 1013904223) >>> 0; return a/4294967296; }; }

function buildNodes() {
  for (const c of CLUSTERS) {
    if (c.unexplored) continue;          // 未探索星云：无节点（仅 3D 云气与标注）
    const rand = seededRand(c.id.charCodeAt(1)*97);
    const n = c.nodes.length;
    c.nodes.forEach((node, ni) => {
      const t = n > 1 ? ni/(n-1) : 0;
      const a = t*Math.PI*2.2;
      const rr = 40 + t*90;
      const pos = new THREE.Vector3(
        c.position[0] + Math.cos(a)*rr*1.3 + (rand()-.5)*24,
        c.position[1] + (t-0.5)*54 + (rand()-.5)*28,
        c.position[2] + Math.sin(a)*rr*1.1 + (rand()-.5)*24
      );
      const isNav = node.type === 'nav';
      const color = isNav ? 0xf2f5ff : c.color;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flare, color, transparent: true,
        opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.copy(pos);
      const s = isNav ? 36 : 24 + (node.leaves?.length || 0)*0.55;
      sp.scale.set(s, s, 1);
      sp.userData.baseScale = s;
      sp.userData.nodeRef = node.id;
      const rec = { ...node, nebula: c.id, nebulaName: c.name, parentName: c.parent,
        anchor: c.anchor, pos, sprite: sp,
        hasCard: Object.values(CARDS).some(card => card.node === node.id) };
      nodeRegistry.push(rec);
        nodeSprites.push(sp);
        scene.add(sp);
        // 要点微星
        const lc = Math.min(90, (node.leaves?.length || 2)*16);
        const lp = new Float32Array(lc*3);
        for (let k = 0; k < lc; k++) {
          lp[k*3] = pos.x + (rand()-.5)*46; lp[k*3+1] = pos.y + (rand()-.5)*34; lp[k*3+2] = pos.z + (rand()-.5)*46;
        }
        const lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
        const lm = new THREE.PointsMaterial({ size: 1.7, color: c.color, map: TEX.glow, transparent: true,
          opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
        scene.add(new THREE.Points(lg, lm));
      });
  }
}

/* ---------- 关联连线 ---------- */
const edgeMeta = [];
function buildEdges() {
  const positions = [], colors = [];
  const TYPE_COLOR = { '流程衔接': null, '交叉引用': 0xffc46b, '风险提示': 0xff6b7a, '依据关系': 0x9db8ff };
  const byId = Object.fromEntries(nodeRegistry.map(r => [r.id, r]));

  function resolve(id) {
    return byId[id]?.pos || null;   // 未探索已删：指向未探索的关联自动跳过
  }
  function addEdge(aId, bId, type, note, colorOverride) {
    const a = byId[aId]?.pos, b = resolve(bId);
    if (!a || !b) return;
    const col = new THREE.Color(colorOverride || TYPE_COLOR[type] || 0x6c7bd0);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(dir, up).normalize();
    mid.addScaledVector(side, Math.min(60, dir.length()*0.16)).addScaledVector(up, dir.length()*0.10);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const SEG = 18;
    for (let i = 0; i < SEG; i++) {
      const p0 = curve.getPoint(i/SEG), p1 = curve.getPoint((i+1)/SEG);
      positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      const f0 = i/SEG, f1 = (i+1)/SEG;
      colors.push(col.r*(0.45+f0*0.3), col.g*(0.45+f0*0.3), col.b*(0.45+f0*0.3),
                  col.r*(0.45+f1*0.3), col.g*(0.45+f1*0.3), col.b*(0.45+f1*0.3));
    }
    edgeMeta.push({ aId, bId, a, b, type, note });
  }
  // 自动流程衔接（同子星云按序）
  for (const neb of NEBULAE) for (const sub of neb.subNebulae) {
    for (let i = 0; i < sub.nodes.length - 1; i++) {
      const A = byId[sub.nodes[i].id], B = byId[sub.nodes[i+1].id];
      if (A && B) addEdge(A.id, B.id, '流程衔接', null, neb.colors.glow);
    }
  }
  // 显式关联
  for (const L of LINKS) {
    addEdge(L.from, L.to, L.type, L.note);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const edgeLines = new THREE.LineSegments(g, m);
  scene.add(edgeLines);
}

/* 高亮：选中节点相关边 */
let highlightLines = null;
function showHighlight(nodeId) {
  if (highlightLines) { scene.remove(highlightLines); highlightLines.geometry.dispose(); highlightLines = null; }
  if (!nodeId) return;
  const byId = Object.fromEntries(nodeRegistry.map(r => [r.id, r]));
  const rel = edgeMeta.filter(e => e.aId === nodeId || e.bId === nodeId);
  if (!rel.length) return;
  const positions = [];
  for (const e of rel) {
    const curvePts = 14, a = e.a, b = e.b;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a), up = new THREE.Vector3(0,1,0);
    const side = new THREE.Vector3().crossVectors(dir, up).normalize();
    mid.addScaledVector(side, Math.min(60, dir.length()*0.16)).addScaledVector(up, dir.length()*0.10);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    for (let i = 0; i < curvePts; i++) {
      const p0 = curve.getPoint(i/curvePts), p1 = curve.getPoint((i+1)/curvePts);
      positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  highlightLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(highlightLines);
}
/* ---------- 3D 标注（v8d：只留第一级星云名，去小字副行；未探索标注"未探索"） ---------- */
const labelDefs = CLUSTERS.map(c => ({
  pos: new THREE.Vector3(...c.position),
  html: c.name,
}));
const labelEls = labelDefs.map(d => {
  const el = document.createElement('div');
  el.className = 'nebula-label'; el.innerHTML = d.html;
  document.body.appendChild(el);
  return { el, pos: d.pos };
});
function updateLabels() {
  const v = new THREE.Vector3();
  for (const L of labelEls) {
    v.copy(L.pos).project(camera);
    const behind = v.z > 1;
    const x = (v.x*0.5+0.5)*innerWidth, y = (-v.y*0.5+0.5)*innerHeight;
    const dist = camera.position.distanceTo(L.pos);
    const vis = !behind && dist > 260 && dist < 4200;   // 已回退：第一轮可见距离
    L.el.style.display = vis ? 'block' : 'none';
    if (vis) { L.el.style.left = x+'px'; L.el.style.top = (y-16)+'px'; }   // v10：星云中心偏上（学金莉珊站簇名位）
  }
}

/* ---------- 交互：悬停 / 点击 / 抽屉 ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-10, -10);
let hovered = null, selected = null, downXY = null;

renderer.domElement.addEventListener('pointermove', e => {
  pointer.x = (e.clientX/innerWidth)*2 - 1;
  pointer.y = -(e.clientY/innerHeight)*2 + 1;
  moveTooltip(e.clientX, e.clientY);
});
renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX-downXY[0], e.clientY-downXY[1]);
  downXY = null;
  if (moved > 5) return;           // 拖拽不算点击
  if (hovered) selectNode(hovered);
});

const tooltip = document.getElementById('tooltip');
function moveTooltip(x, y) {
  if (!hovered) { tooltip.style.display = 'none'; return; }
  tooltip.style.display = 'block';
  tooltip.style.left = Math.min(x+16, innerWidth-280)+'px';
  tooltip.style.top = (y+14)+'px';
}
function findRecord(ref) {
  if (typeof ref !== 'string') return null;
  return nodeRegistry.find(r => r.id === ref) || null;
}

const drawer = document.getElementById('drawer');
const drawerBody = document.getElementById('drawer-body');
document.getElementById('drawer-close').addEventListener('click', () => { drawer.classList.remove('open'); selected = null; showHighlight(null); });

function selectNode(ref) {
  const rec = findRecord(ref);
  if (!rec) return;
  selected = rec;
  drawer.classList.add('open');
  document.getElementById('drawer-tag').textContent = `NODE LENS · ${rec.id}`;
  document.getElementById('drawer-title').textContent = rec.name;
  document.getElementById('drawer-path').textContent = `${rec.parentName} ▸ ${rec.nebulaName} ▸ ${rec.name}`;
  document.getElementById('drawer-anchor').textContent = rec.anchor ? `锚点：${rec.anchor}` : '';

  let html = '';
  {
    if (rec.leaves?.length) {
      html += `<div class="drawer-section"><h3>要点（${rec.leaves.length}）</h3>` +
        rec.leaves.map(l => `<div class="leaf-item">${l}</div>`).join('') + `</div>`;
    }
    const cards = Object.values(CARDS).filter(c => c.node === rec.id);
    if (cards.length) {
      for (const card of cards) {
        html += `<div class="drawer-section"><h3>知识卡 · ${card.title}</h3>`;
        for (const f of UNIVERSE.cardFields) {
          const v = card.fields[f]; if (!v) continue;
          html += `<div class="card-field"><div class="fname">${f}</div><div class="fval">${v}</div></div>`;
        }
        html += `</div>`;
      }
    } else {
      html += `<div class="no-card">知识卡待铺设（11 字段模板已定版，内容陆续补充）。</div>`;
    }
    const relLinks = edgeMeta.filter(e => e.aId === rec.id || e.bId === rec.id).filter(e => e.note);
    if (relLinks.length) {
      html += `<div class="drawer-section"><h3>关联</h3><div class="drawer-links">` +
        relLinks.map(l => `<b>${l.type}</b>${l.note ? '：'+l.note : ''}`).join('<br>') + `</div></div>`;
    }
  }
  drawerBody.innerHTML = html;
  drawerBody.scrollTop = 0;
  flyTo(rec.pos, 300, rec.pos);   // v11：注视点=节点本身（原默认 (0,0,0) 黑洞，导致"视角跳进黑洞"）
}

/* ---------- 索引面板 / 搜索（v10：按王律架构树三层展开——星图 → A/B/C 三类 → 星云 → 节点链；未探索仅挂名） ---------- */
/* v12：起始视角（v15 定版=王律摆位方向不变、视距 1526→1380），点目录内"星图框"回到此视角 */
const START_VIEW = { pos: new THREE.Vector3(-1001.2, 740.7, -594.3), target: new THREE.Vector3(0, 0, 0) };
function buildIndex() {
  const list = document.getElementById('index-list');
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  let html = `<div class="idx-universe" id="idx-universe-home" title="点击回到起始视角">
    <div class="uni-tag">UNIVERSE-Nebula</div>
    <div class="name">${UNIVERSE.name}</div>
  </div>`;
  for (const neb of NEBULAE) {
    const total = neb.subNebulae.reduce((s, sub) => s + sub.nodes.length, 0);
    html += `<div class="idx-group" data-grp="${neb.id}">
      <span class="dot" style="background:${hex(neb.colors.core)};color:${hex(neb.colors.core)}"></span>
      <span class="name">${neb.id} ${neb.name}</span><span class="count">${total}</span><span class="arrow">▶</span>
    </div><div class="idx-children" data-grp="${neb.id}">`;
    for (const sub of neb.subNebulae) {
      html += `<div class="idx-neb" data-neb="${sub.id}">
        <span class="code">${sub.id}</span><span class="name">${sub.name}</span>
        <span class="count">${sub.nodes.length}</span><span class="arrow">▶</span>
      </div><div class="idx-nodes" data-neb="${sub.id}">`;
      for (const node of sub.nodes) {
        const has = Object.values(CARDS).some(card => card.node === node.id);
        html += `<div class="idx-child${has ? ' has-card' : ''}" data-node="${node.id}">
          <span class="code">${node.id}</span><span class="name">${node.name}</span><span class="arrow">›</span>
        </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }
  html += `<div class="idx-unexplored">
    <div class="name">未探索星云 · 北斗七星挂名（开阳 / 摇光）</div>
    <div class="note">IPO / REITs / 可转债 / 信贷ABS / 混改 / 反垄断 等 · 仅挂名待铺设</div>
  </div>`;
  list.innerHTML = html;

  // v12：点星图框 → 回起始视角（相机与注视点一并复位）
  list.querySelector('#idx-universe-home').addEventListener('click', () => {
    flyTo(START_VIEW.pos, 0, START_VIEW.target);
  });

  // 三层折叠：组 → 星云 → 节点
  // v30：行点击=折叠+运镜（保持）；三角点击=仅折叠不运镜——跳转触发区不含三角（王律 2026-11-16）
  list.querySelectorAll('.idx-group').forEach(el => {
    const toggle = () => {
      el.classList.toggle('open');
      list.querySelector(`.idx-children[data-grp="${el.dataset.grp}"]`)?.classList.toggle('open');
    };
    el.querySelector('.arrow').addEventListener('click', ev => {
      ev.stopPropagation();
      toggle();
    });
    el.addEventListener('click', () => {
      const c = CLUSTERS.find(cc => cc.id === el.dataset.grp);
      if (c) flyTo(new THREE.Vector3(...c.position).add(new THREE.Vector3(150, 80, 330)), 0, new THREE.Vector3(...c.position));
    });
  });
  list.querySelectorAll('.idx-neb').forEach(el => {
    const toggle = () => {
      el.classList.toggle('open');
      list.querySelector(`.idx-nodes[data-neb="${el.dataset.neb}"]`)?.classList.toggle('open');
    };
    el.querySelector('.arrow').addEventListener('click', ev => {
      ev.stopPropagation();
      toggle();
    });
    el.addEventListener('click', () => {
      const c = CLUSTERS.find(cc => cc.id === el.dataset.neb);   // 点星云行同时飞过去
      if (c) flyTo(new THREE.Vector3(...c.position).add(new THREE.Vector3(150, 80, 330)), 0, new THREE.Vector3(...c.position));
    });
  });
  list.querySelectorAll('.idx-child').forEach(el => {
    el.addEventListener('click', ev => {
      ev.stopPropagation();
      selectNode(el.dataset.node);
    });
  });
}
document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  /* v11 修复：搜索清空时清除全部内联 display——此前残留的内联 style 永远压过 .open 类切换，
   * 导致清空搜索后目录"点了不展开也不收起" */
  document.querySelectorAll('#index-list .idx-child').forEach(el => {
    el.style.display = q ? (el.textContent.toLowerCase().includes(q) ? 'flex' : 'none') : '';
  });
  document.querySelectorAll('#index-list .idx-nodes').forEach(c => {
    const hit = q && Array.from(c.querySelectorAll('.idx-child')).some(ch =>
      ch.textContent.toLowerCase().includes(q));
    c.classList.toggle('open', hit);
    c.style.display = q ? (hit ? 'block' : 'none') : '';
  });
  document.querySelectorAll('#index-list .idx-neb').forEach(el => {
    el.style.display = q ? (el.textContent.toLowerCase().includes(q) ? 'flex' : 'none') : '';
  });
  document.querySelectorAll('#index-list .idx-children[data-grp]').forEach(c => {
    const hit = q && Array.from(c.querySelectorAll('.idx-child')).some(ch =>
      ch.textContent.toLowerCase().includes(q));
    c.classList.toggle('open', hit);
    c.style.display = q ? (hit ? 'block' : 'none') : '';
  });
  document.querySelectorAll('#index-list .idx-group').forEach(el => {
    el.style.display = q ? (el.textContent.toLowerCase().includes(q) ? 'flex' : 'none') : '';
  });
  document.querySelectorAll('#index-list .idx-universe, #index-list .idx-unexplored').forEach(el => {
    el.style.display = q ? 'none' : '';
  });
});

/* 底部栏"目录"开关（v11：从顶栏移至左下角） / 暂停漂移 / 全屏 */
document.getElementById('btn-index-open').addEventListener('click', function () {
  const hidden = document.getElementById('index-panel').classList.toggle('hidden');
  this.style.display = hidden ? 'block' : 'none';   // 目录打开时隐藏入口钮，避免与面板重叠
});
document.getElementById('index-close').addEventListener('click', () => {
  document.getElementById('index-panel').classList.add('hidden');
  document.getElementById('btn-index-open').style.display = 'block';
});
document.getElementById('btn-drift').addEventListener('click', function () {
  params.drift = params.drift ? 0 : 1;
  this.textContent = params.drift ? '暂停' : '播放';
  this.classList.toggle('active', !params.drift);
  applyParams();
});
document.getElementById('btn-fs').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});

/* ---------- 标签页 ---------- */
document.querySelectorAll('#tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'all') { flyTo(START_VIEW.pos, 0, START_VIEW.target); return; }   // v21：全图=回到与进入页面一致的起始视角
    const c = CLUSTERS.find(cc => cc.id === tab);
    const pos = new THREE.Vector3(...c.position);
    flyTo(pos.clone().add(new THREE.Vector3(150, 80, 330)), 0, pos);
  });
});

/* ---------- 相机飞行 ---------- */
let fly = null;
function flyTo(pos, dist, target) {
  const end = dist > 0 ? pos.clone().addScaledVector(new THREE.Vector3(0.32, 0.28, 1).normalize(), dist) : pos.clone();
  fly = { t: 0, dur: 1.15, p0: camera.position.clone(), p1: end, t0: controls.target.clone(), t1: target ? target.clone() : new THREE.Vector3(0,0,0) };
}

/* ---------- 参数应用（调参台已删） ---------- */
function applyParams() {
  bloomPass.strength = params.bloom;
  for (const sp of cloudSprites) sp.material.opacity = sp.userData.baseOpacity * params.cloud;
  if (scene.userData.starMat) scene.userData.starMat.uniforms.uStar.value = params.star;
  if (scene.userData.milkyMat) scene.userData.milkyMat.uniforms.uStar.value = params.star;
  for (const m of starMats) if (m.uniforms?.uStar) m.uniforms.uStar.value = params.star;
  controls.autoRotate = !!params.drift;
}

/* ---------- 主循环 ---------- */
const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, fpsT = 0;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  blackhole.rotation.y += dt*0.02*params.drift;
  if (params.drift && INFLOW.update) INFLOW.update(dt);   // 金色数据吸积流（漂移关闭时同步冻结）
  if (params.drift) for (const g of nebulaGroups) if (g.userData.nebulaId !== 'U') g.rotation.y += dt*0.006;

  // 相机飞行
  if (fly) {
    fly.t += dt/fly.dur;
    const k = fly.t >= 1 ? 1 : 1 - Math.pow(1-fly.t, 3);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= 1) fly = null;
  }
  controls.update();

  // 悬停检测（节流）
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nodeSprites, false);
  const hit = hits.length ? hits[0].object : null;
  const ref = hit ? hit.userData.nodeRef : null;
  if (ref !== hovered) {
    hovered = ref;
    const rec = findRecord(hovered);
    tooltip.querySelector('.tt-name').textContent = rec ? rec.name : '';
    tooltip.querySelector('.tt-sub').textContent = rec ? `${rec.parentName} ▸ ${rec.nebulaName}` : '';
    document.body.style.cursor = hovered ? 'pointer' : 'default';
    showHighlight(hovered);
    moveTooltip(lastMouse[0], lastMouse[1]);
  }
  // 选中节点呼吸
  if (selected && selected.sprite) {
    const base = selected.sprite.userData.baseScale || 24;
    const s = base*(1 + 0.14*Math.sin(t*3.4));
    selected.sprite.scale.set(s, s, 1);
  }

  updateLabels();
  bhMesh.quaternion.copy(camera.quaternion);
  bhUniforms.uTime.value = t;

  // v17：闪烁时钟（背景+银河 + 各星云星点）
  for (const m of (scene.userData.twinkleMats || [])) m.uniforms.uTime.value = t;
  for (const m of starMats) if (m.uniforms?.uTime) m.uniforms.uTime.value = t;

  fpsAcc += dt; fpsN++;
  if ((fpsT += dt) > 0.5) {
    document.getElementById('st-fps').textContent = Math.round(fpsN/fpsAcc);
    fpsAcc = 0; fpsN = 0; fpsT = 0;
  }
  composer.render();
}
const lastMouse = [innerWidth/2, innerHeight/2];
addEventListener('pointermove', e => { lastMouse[0] = e.clientX; lastMouse[1] = e.clientY; });

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ---------- 启动 ---------- */
buildNebulae();
buildNodes();
buildEdges();
buildIndex();
applyParams();
tick();

/* v13 视角探针（只读）：暂停摆位后在控制台或外部调用 window.__atlasLens() 读取当前机位 */
window.__atlasLens = () => ({
  cameraPos: camera.position.toArray().map(n => +n.toFixed(1)),
  target: controls.target.toArray().map(n => +n.toFixed(1)),
  fov: camera.fov,
  drift: params.drift
});
