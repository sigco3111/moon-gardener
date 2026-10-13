import * as G from './game.js';
import { GardenScene } from './scene.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { PLANT_MAP, PLOT_ORDER, ACTIVES, SAVE_KEY, DAY_LEN, TERRAINS, BUILDINGS, AUTOS, SKILL_MAP } from './data.js';

const st = G.mergeState(G.loadStateRaw());
const app = { st, sound: new Sound() };
window.moonGardener = { app, G };
app.sound.bgm = st.settings.bgm; app.sound.sfx = st.settings.sfx; app.sound.vol = st.settings.vol;
let offlineReport = null;
const hadSave = !!G.loadStateRaw();
if (hadSave) {
  const secs = (Date.now() - st.lastSave) / 1000;
  if (secs > 60) { const r = G.simulateOffline(st, secs); if (r.gain > 0) offlineReport = { ...r, raw: secs }; }
}

const qp = new URLSearchParams(location.search);
if (qp.has('demo')) {
  Object.assign(st, G.newState()); st.moon = 5e5; st.runTotal = 3e5; st.plotCount = +qp.get('plots') || 20; st.seenIntro = true; st.starSeeds = 20; st.sp = 30;
  st.buildings = { pond: 1, lantern: 3, bridge: 1, pagoda: 3 }; st.auto = { spirit: 3, water: 2, firefly: 4, guard: 4 };
  if (qp.has('skills')) for (const id of qp.get('skills').split(',')) st.skills[id] = true;
  const ids = ['moonprim','cloudlion','clover','violet','sunsetaster','lantern','sakura','bamboo','lilymoon','sunpoppy','mossrose','stararch','firelily','pine','fullotus','darkghost','dusklotus','bridgebell','moonprim','cloudlion'];
  ids.forEach((id, i) => { if (i < st.plotCount) st.plots[i] = { id, prog: i % 7 === 6 ? 0.3 : i % 5 === 4 ? 0.1 : 1, water: 100, nut: i % 3 ? 0 : 80, shiny: i === 3, bloom: false }; });
  st.gt = DAY_LEN * (+qp.get('t') || 0.2) + DAY_LEN * (+qp.get('day') || 0);
  for (let k = 0; k < 8; k++) G.tick(st, 0.5, []);
}
const canvas = document.getElementById('c');
const scene = new GardenScene(canvas, st);
const ui = new UI(app); app.ui = ui; app.scene = scene;
scene.syncBuildings(st);
let combo = 1, comboT = 0, lastClick = 0, lastTod = null;

app.activate = (k) => {
  const r = G.activate(st, k); if (!r.ok) { ui.toast(r.msg); app.sound.err(); return; }
  app.sound.active(); ui.banner(`${ACTIVES[k].icon} ${ACTIVES[k].name} 발동!`, 2500);
  if (k === 'accel') scene.ripple(0, 0, true, '#9fb8ff');
  if (k === 'meteor') { for (let i = 0; i < 6; i++) setTimeout(() => scene.spawnMeteor(), i * 400); }
};
app.plotAction = (act, i) => {
  const s = app.sound;
  if (act === 'water') { G.waterPlot(st, i); s.water(); scene.burst(PLOT_ORDER[i].x, 0.5, PLOT_ORDER[i].z, '#7ad0ff', 10, 1, 1.5); }
  else if (act === 'fert') { const r = G.fertPlot(st, i); if (!r.ok) { ui.toast(r.msg); s.err(); } else { s.buy(); scene.burst(PLOT_ORDER[i].x, 0.5, PLOT_ORDER[i].z, '#ffd36b', 12, 1, 2); } }
  else if (act === 'pull') { const r = G.removeAt(st, i); if (r.weed) ui.toast(`잡초를 뽑았어요 +${G.fmt(r.gain)}`); }
  else if (act === 'buyplot') { if (G.buyPlot(st)) { s.buy(); ui.toast('새 화단이 열렸어요!'); } else { ui.toast('달빛이 부족해요'); s.err(); } }
};
app.panelAction = (a, id, ui) => {
  const s = app.sound; const ok = (v, msg) => { if (v) { s.buy(); scene.syncBuildings(st); } else { s.err(); if (msg) ui.toast(msg); } return v; };
  switch (a) {
    case 'buyclick': ok(G.buyClick(st), '달빛이 부족해요'); break;
    case 'buyplot': ok(G.buyPlot(st), '달빛이 부족해요'); break;
    case 'waterall': { const r = G.waterAll(st); if (r.ok) { s.water(); ui.toast('모든 화단에 물을 줬어요'); } else ui.toast(`${r.wait}초 후 다시 사용`); break; }
    case 'buyb': if (ok(G.buyBuilding(st, id), '달빛이 부족하거나 조건이 맞지 않아요')) { ui.banner(`${BUILDINGS[id].icon} ${BUILDINGS[id].name} 건설!`, 2500); scene.ripple(0, 0, true); } break;
    case 'buya': if (ok(G.buyAuto(st, id), '달빛이 부족해요')) ui.toast(`${AUTOS[id].name} 강화!`); break;
    case 'buys': if (ok(G.buySkill(st, id), '스킬 포인트가 부족하거나 선행 스킬이 필요해요')) { ui.banner(`🎨 ${SKILL_MAP[id].name}: ${SKILL_MAP[id].vis}`, 4500); scene.ripple(0, 0, true, '#c59bff'); } break;
    case 'plant': { const idx = ui.pick; const r = G.plantAt(st, idx, id); if (!r.ok) { ui.toast(r.msg); s.err(); } else { s.buy(); scene.burst(PLOT_ORDER[idx].x, 0.4, PLOT_ORDER[idx].z, '#8fe3a0', 12, 1, 2); ui.openTab(null); ui.select(idx); } break; }
    case 'alch': {
      const r = G.alchemize(st, ui.alch.a, ui.alch.b, ui.alch.cat); if (!r.ok) { ui.toast(r.msg); s.err(); break; }
      scene.ripple(8.2, 2.6, true, r.success ? '#7fffb0' : '#9a6a3a'); scene.burst(8.2, 1.6, 2.6, r.success ? '#7fffb0' : '#8a7a4a', 24, 2, 3);
      if (r.success) { s.magic(); ui.modal(`<h2>⚗️ 교배 성공!</h2><p><b>${PLANT_MAP[r.id].name}</b> 씨앗 ${r.n}개를 얻었어요.<br>화단에 심어 개화시키면 도감에 등록됩니다.</p>`); }
      else { s.weed(); ui.modal(`<h2>🌿 교배 실패…</h2><p>${r.noRecipe ? '이 조합은 반응하지 않았어요.' : '반응이 어긋났어요.'} ${r.weedAt >= 0 ? `빈 화단 #${r.weedAt + 1}에 잡초가 자랐어요.` : '잡초가 자랄 빈 화단은 없었어요.'}${r.refund ? `<br>비용 일부(🌙${G.fmt(r.refund)})가 환급됐어요.` : ''}</p>`); }
      break;
    }
    case 'terrain': if (G.terrainSelect(st, id)) { scene.setTerrain(id); scene.syncBuildings(st); s.buy(); } break;
    case 'prestige': {
      if (G.prestigeGain(st) < 1) { s.err(); break; }
      ui.modal(`<h2>🌑 정원을 달에 바칠까요?</h2><p>달의 씨앗 +${G.prestigeGain(st)}을 받고 정원이 초기화됩니다.<br>도감·스킬·지형·하이브리드는 유지돼요.</p><p><button class="btn red" id="pgo">바친다</button></p>`);
      setTimeout(() => { const b = document.getElementById('pgo'); if (b) b.onclick = () => { document.getElementById('modal').classList.add('hidden'); const r = G.prestige(st); G.saveState(st); scene.setTerrain(st.terrain); scene.syncBuildings(st); ui.sel = null; ui.renderPlot(); ui.openTab('prestige'); ui.banner(`🌑 달의 씨앗 +${r.gain}${r.unlocked ? ' · 새 지형 해금: ' + TERRAINS[r.unlocked].name : ''}`, 6000); s.discover(); }; }, 0);
      break;
    }
    case 'bgm': st.settings.bgm = !st.settings.bgm; s.setBgm(st.settings.bgm); break;
    case 'sfx': st.settings.sfx = !st.settings.sfx; s.setSfx(st.settings.sfx); break;
    case 'export': { const t = document.getElementById('savebox'); const code = G.exportSave(st); setTimeout(() => { const b = document.getElementById('savebox'); if (b) { b.value = code; b.select(); } }, 0); ui.toast('저장 코드를 복사해 보관하세요'); break; }
    case 'import': { const v = document.getElementById('savebox').value; try { const n = G.importSave(v); localStorage.setItem(SAVE_KEY, JSON.stringify(n)); location.reload(); } catch (e) { ui.toast('저장 코드가 올바르지 않아요'); } break; }
    case 'reset': if (confirm('정말 모든 데이터를 삭제할까요?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } break;
  }
};
scene.onTap = ({ plot, point, x, y }) => {
  app.sound.init();
  const now = performance.now();
  const f = G.fx(st);
  if (f.combo > 1) { combo = now - lastClick < 600 ? Math.min(f.combo, combo + 0.08) : 1; }
  lastClick = now;
  // 유성우 액티브: 탭당 별 씨앗
  if (st.act.meteor > 0) { const g = G.meteorTap(st); ui.floater(x, y - 30, `⭐+${g}`, 'star'); app.sound.star(); }
  const r = G.doClick(st, combo);
  app.sound.click(combo);
  ui.floater(x, y, '+' + G.fmt(r.gain), r.crit || r.burst ? 'crit' : '');
  if (point) { scene.ripple(point.x, point.z, !!st.skills.m2 || r.burst, r.crit ? '#ffd0ff' : '#fff0b0'); scene.burst(point.x, 0.8, point.z, r.crit ? '#ffd0ff' : '#ffe8a0', st.skills.m3 ? 22 : 12, 2.2, 3); }
  if (r.burst) { ui.banner('✨ 월광 폭발!', 1500); scene.burst(point ? point.x : 0, 1, point ? point.z : 0, '#ffffff', 40, 4, 5); }
  if (plot != null) ui.select(plot);
  else if (ui.sel != null) { ui.sel = null; ui.renderPlot(); }
};
scene.onSpecial = (kind, obj, x, y) => {
  app.sound.init();
  if (kind === 'meteor') { const g = 1 + Math.floor(Math.random() * 3); st.starSeeds += g; ui.floater(x, y, `⭐+${g}`, 'star'); app.sound.star(); scene.burst(obj.position.x, obj.position.y, obj.position.z, '#bfe8ff', 24, 3, 2); scene.scene.remove(obj); scene.meteors.splice(scene.meteors.indexOf(obj), 1); }
  else { const g = Math.max(10, G.totalRate(st) * 30); G.addMoon(st, g); ui.floater(x, y, '+' + G.fmt(g), 'crit'); app.sound.coin(); scene.burst(obj.position.x, obj.position.y, obj.position.z, '#f4ff8a', 24, 3, 2); scene.swarmGroup.remove(obj); scene.swarm.splice(scene.swarm.indexOf(obj), 1); }
};
function handleEvents(evs) {
  for (const ev of evs) {
    if (ev.type === 'bloom') { app.sound.bloom(); const p = PLOT_ORDER[ev.idx]; const pd = PLANT_MAP[ev.id]; scene.burst(p.x, 1.2, p.z, ev.shiny ? '#ff9ae8' : pd.c1, 18, 2, 3); }
    else if (ev.type === 'discover') { app.sound.discover(); ui.banner(`📖 새 식물 발견: ${PLANT_MAP[ev.id].name}! (+🌙${G.fmt(ev.burst)}, 스킬 포인트 +1)`, 5000); scene.ripple(PLOT_ORDER[ev.idx].x, PLOT_ORDER[ev.idx].z, true, '#ffe48a'); }
    else if (ev.type === 'shiny') ui.toast(`✨ 변이 개화! ${PLANT_MAP[ev.id].name} (생산 ×5)`);
    else if (ev.type === 'mature') { /* 성장 완료 */ }
    else if (ev.type === 'tod') { if (ev.tod === 'dusk') ui.banner('🌇 석양이 번집니다 — 석양 식물이 깨어나요', 3500); else if (ev.tod === 'night') { ui.banner(`🌙 밤이 왔어요 — ${ev.env.moonName}${ev.env.meteorNight ? ' · 오늘은 유성우의 밤!' : ''}`, 3500); } else if (ev.tod === 'day') ui.toast('☀️ 아침이 밝았어요'); }
    else if (ev.type === 'fullmoon') { ui.banner('🌕 보름달 밤! 생산 ×1.5 · 큰 반딧불을 눌러보세요', 5000); for (let i = 0; i < 8; i++) scene.spawnSwarm(); app.sound.active(); }
    else if (ev.type === 'newmoon') ui.banner('🌑 그믐 밤 — 그믐 도깨비꽃이 깨어납니다', 4000);
    else if (ev.type === 'meteor') { ui.banner('☄️ 유성우! 떨어지는 별을 눌러 별 씨앗을 모으세요', 6000); meteorUntil = performance.now() + 25000; }
    else if (ev.type === 'spirit') { if (Math.random() < 0.3) { const a = Math.random() * 6.28, r = Math.random() * 6; scene.burst(Math.cos(a) * r, 1, Math.sin(a) * r, '#cfe8ff', 6, 1, 2); } }
    else if (ev.type === 'autowater') { }
  }
}
let meteorUntil = 0, nextMeteor = 0, nextSave = 0, nextUi = 0, last = performance.now(), nightTick = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 3) { const r = G.simulateOffline(st, dt); dt = 0.016; if (r.gain > 1) ui.toast(`자리를 비운 동안 🌙${G.fmt(r.gain)} 모였어요`); }
  dt = Math.min(dt, 0.5);
  const evs = []; G.tick(st, dt, evs); handleEvents(evs);
  comboT += dt; if (performance.now() - lastClick > 800) combo = Math.max(1, combo - dt * 1.5);
  const e = G.env(st);
  if ((e.meteorWin || st.act.meteor > 0) && now > nextMeteor) { scene.spawnMeteor(); nextMeteor = now + (st.act.meteor > 0 ? 500 : 1800); }
  if (e.full && scene.swarm.length < 4 && Math.random() < dt * 0.15) scene.spawnSwarm();
  scene.update(dt, st, e, { selected: ui.sel, combo });
  if (now > nextUi) { nextUi = now + 200; ui.updateHud(e, G.totalRate(st, e)); if (Math.floor(now / 1000) % 2 === 0) ui.refresh(); }
  if (now > nightTick) { nightTick = now + 2500; app.sound.night(e.night); }
  if (now > nextSave) { nextSave = now + 10000; G.saveState(st); scene.syncBuildings(st); }
}
let synced = 0; setInterval(() => scene.syncBuildings(st), 1500);
window.addEventListener('beforeunload', () => G.saveState(st));
document.addEventListener('visibilitychange', () => { if (document.hidden) G.saveState(st); else last = performance.now(); });
function begin() {
  document.getElementById('intro').remove(); app.sound.init();
  if (offlineReport) ui.modal(`<h2>🌙 돌아오셨군요</h2><p>${G.fmtTime(offlineReport.raw)} 동안 정원이 달빛을 모아 두었어요.<br><b style="font-size:22px;color:#fff4b8">+🌙 ${G.fmt(offlineReport.gain)}</b><br><small>(오프라인 효율 50%${offlineReport.raw > 43200 ? ' · 최대 12시간' : ''})</small></p>`);
  else if (!st.seenIntro) { st.seenIntro = true; ui.modal('<h2>🌙 달의 정원사</h2><p>정원을 <b>탭</b>해 달빛을 모으고, 화단을 눌러 <b>씨앗</b>을 심으세요.<br>밤에 피는 꽃, 석양에만 피는 꽃, 보름달에만 피는 꽃… 도감을 채워 보세요.<br>자리를 비워도 정원은 계속 달빛을 모읍니다.</p>'); }
}
document.getElementById('start').addEventListener('click', begin);
if (new URLSearchParams(location.search).has('skipintro')) begin();
requestAnimationFrame(frame);
if (qp.has('tab')) ui.openTab(qp.get('tab'));
if (qp.has('sel')) ui.select(+qp.get('sel'));
