// 달의 정원사 - 게임 로직 (DOM/Three 비의존)
import { DAY_LEN, MOON_CYCLE, MOON_NAMES, MAX_PLOTS, OFFLINE_CAP, OFFLINE_EFF, PLANT_MAP, PLANTS, RECIPES, findRecipe,
  BUILDINGS, AUTOS, TERRAINS, SKILLS, SKILL_MAP, ACTIVES, PLOT_ORDER, NEIGHBORS, SAVE_KEY } from './data.js';

export function newState() {
  return {
    v: 1, moon: 0, runTotal: 0, lifeTotal: 0, starSeeds: 0, lunarSeeds: 0, prestiges: 0, sp: 0,
    skills: {}, gt: DAY_LEN * 0.08, plots: Array.from({ length: MAX_PLOTS }, () => null), plotCount: 4,
    clickLevel: 0, buildings: { pond: 0, lantern: 0, bridge: 0, pagoda: 0 }, auto: { spirit: 0, water: 0, firefly: 0, guard: 0 },
    hybridSeeds: {}, known: {}, dex: {}, terrains: { basic: true }, terrain: 'basic',
    cd: { moon: 0, accel: 0, meteor: 0 }, act: { moon: 0, accel: 0, meteor: 0 },
    stats: { clicks: 0, blooms: 0, weeds: 0, alchemy: 0, alchemyOk: 0, shiny: 0, crits: 0 },
    lastSave: Date.now(), settings: { bgm: true, sfx: true, vol: 0.6 }, seenIntro: false, wateredAt: -999, autoAcc: { spirit: 0, water: 0 },
    clickCount30: 0,
  };
}
export function mergeState(raw) {
  const d = newState();
  if (!raw || typeof raw !== 'object') return d;
  const s = { ...d, ...raw };
  for (const k of ['buildings', 'auto', 'cd', 'act', 'stats', 'settings', 'autoAcc']) s[k] = { ...d[k], ...(raw[k] || {}) };
  s.terrains = { basic: true, ...(raw.terrains || {}) };
  s.plots = Array.from({ length: MAX_PLOTS }, (_, i) => (raw.plots && raw.plots[i]) || null);
  s.plots = s.plots.map((p) => (p && PLANT_MAP[p.id] || (p && p.id === 'weed') ? p : null));
  return s;
}
export function saveState(st) {
  st.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); return true; } catch (e) { return false; }
}
export function loadStateRaw() {
  try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
export function exportSave(st) { return btoa(unescape(encodeURIComponent(JSON.stringify(st)))); }
export function importSave(text) { return mergeState(JSON.parse(decodeURIComponent(escape(atob(text.trim()))))); }

// ---------- 시간 / 환경 ----------
function hash(n) { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function env(st) {
  const dayIndex = Math.floor(st.gt / DAY_LEN);
  const phase = (st.gt % DAY_LEN) / DAY_LEN;
  const tod = phase < 0.4 || phase >= 0.96 ? 'day' : phase < 0.52 ? 'dusk' : 'night';
  const moonIdx = (dayIndex + 2) % MOON_CYCLE;
  const meteorNight = moonIdx === 0 ? hash(dayIndex) < 0.7 : hash(dayIndex + 99) < 0.25;
  const night = tod === 'night';
  const full = night && moonIdx === 3;
  const newm = night && (moonIdx === 0 || moonIdx === 5);
  const meteorWin = night && meteorNight && phase >= 0.68 && phase < 0.68 + 25 / DAY_LEN;
  return { dayIndex, phase, tod, night, moonIdx, moonName: MOON_NAMES[moonIdx], full, newm, meteorNight: night && meteorNight,
    meteorWin, nextFullIn: ((3 - moonIdx + MOON_CYCLE) % MOON_CYCLE) };
}
export function todName(tod) { return tod === 'day' ? '낮' : tod === 'dusk' ? '석양' : '밤'; }
export function condOK(plant, e) {
  switch (plant.cond) {
    case 'any': return true;
    case 'day': return e.tod === 'day';
    case 'dusk': return e.tod === 'dusk';
    case 'night': return e.night;
    case 'full': return e.full;
    case 'new': return e.newm;
    case 'meteor': return e.meteorNight;
    default: return false;
  }
}

// ---------- 스킬 효과 ----------
export function fx(st) {
  const o = { clickMult: 1, clickRatePct: 0, crit: 0, critMult: 1, nightClick: 1, combo: 1, burst: 0, grow: 1, water: 1, nutDecay: 1, nutMult: 0.5,
    bloom: 1, synergy: 0, shiny: 0.03, alchSuccess: 0, refund: 0, dbl: 0, hybridShiny: 0, weedYield: 0, master: 0 };
  for (const s of SKILLS) {
    if (!st.skills[s.id] || !s.eff) continue;
    for (const [k, v] of Object.entries(s.eff)) {
      if (['clickMult', 'nightClick', 'bloom', 'grow', 'water', 'nutDecay', 'combo'].includes(k)) o[k] *= v;
      else if (k === 'critMult') o.critMult = v;
      else o[k] += v;
    }
  }
  return o;
}
export function hasSkill(st, id) { return !!st.skills[id]; }

// ---------- 해금 / 가용성 ----------
export function reqMet(st, req) {
  if (!req) return true;
  if (req === 'pond') return st.buildings.pond >= 1;
  if (req === 'bridge') return st.buildings.bridge >= 1;
  const m = /^(lantern|pagoda)(\d)$/.exec(req);
  if (m) return st.buildings[m[1]] >= +m[2];
  return true;
}
export function reqText(req) {
  if (!req) return '';
  const m = /^(lantern|pagoda)(\d)$/.exec(req);
  if (m) return `${BUILDINGS[m[1]].name} Lv.${m[2]} 필요`;
  return `${BUILDINGS[req].name} 필요`;
}
export function plantAvail(st, p) {
  // 반환: {ok, why}
  if (p.hybrid) {
    const n = st.hybridSeeds[p.id] || 0;
    return n > 0 ? { ok: true } : { ok: false, why: '연금술로 씨앗을 만드세요' };
  }
  if (st.runTotal < p.at) return { ok: false, why: `이번 회차 달빛 ${fmt(p.at)} 모으면 해금`, locked: true };
  if (p.terrain && !st.terrains[p.terrain]) return { ok: false, why: `${TERRAINS[p.terrain].name} 해금 필요`, locked: true };
  if (!reqMet(st, p.req)) return { ok: false, why: reqText(p.req), locked: true };
  return { ok: true };
}

// ---------- 생산량 ----------
export function globalMult(st, e) {
  const f = fx(st);
  const dexN = Object.keys(st.dex).length;
  let m = 1;
  m *= 1 + 0.25 * st.auto.guard;
  m *= 1 + 0.1 * st.lunarSeeds;
  m *= 1 + 0.02 * dexN;
  m *= 1 + 0.15 * st.auto.firefly;
  m *= 1 + 0.06 * st.buildings.pagoda;
  if (st.buildings.bridge) m *= 1.1;
  if (e.night) m *= 1 + 0.05 * st.buildings.lantern;
  m *= 1 + 0.1 * (Object.keys(st.terrains).length - 1);
  if (e.full) m *= 1.5;
  if (st.act.moon > 0) m *= 10;
  return m;
}
export function plotRate(st, idx, e, f) {
  const pl = st.plots[idx]; if (!pl) return 0;
  const pd = pl.id === 'weed' ? null : PLANT_MAP[pl.id];
  if (pl.id === 'weed') return f.weedYield ? 0.3 * Math.max(1, st.plotCount / 4) : 0;
  if (!pd || pl.prog < 1 || !pl.bloom) return 0;
  let r = pd.rate * f.bloom;
  r *= pl.water > 0 ? 1 : 0.3;
  if (pl.nut > 0) r *= 1 + f.nutMult;
  if (pl.shiny) r *= 5;
  if (f.synergy) {
    let n = 0; for (const q of NEIGHBORS[idx]) { const o = st.plots[q]; if (o && o.bloom && o.prog >= 1) n++; }
    r *= 1 + f.synergy * n;
  }
  if (pd.hybrid && f.master) r *= 2;
  return r;
}
export function totalRate(st, e = env(st)) {
  const f = fx(st); let s = 0;
  for (let i = 0; i < st.plotCount; i++) s += plotRate(st, i, e, f);
  return s * globalMult(st, e);
}
export function clickGain(st, e = env(st), opts = {}) {
  const f = fx(st);
  let g = (1 + st.clickLevel) * Math.pow(1.12, st.clickLevel);
  g *= f.clickMult;
  if (e.night) g *= f.nightClick;
  g += totalRate(st, e) * f.clickRatePct;
  g *= 1 + 0.1 * st.lunarSeeds;
  if (opts.combo) g *= opts.combo;
  return g;
}
export function clickCost(st) { return Math.round(30 * Math.pow(1.55, st.clickLevel)); }
export function plotCost(st) { return Math.round(40 * Math.pow(1.3, st.plotCount - 4)); }
export function buildingCost(st, id) { const b = BUILDINGS[id]; return Math.round(b.base * Math.pow(b.mult, st.buildings[id])); }
export function autoCost(st, id) { const a = AUTOS[id]; return Math.round(a.base * Math.pow(a.mult, st.auto[id])); }
export function fertCost(st, pl) { const pd = PLANT_MAP[pl.id]; return Math.round(20 + (pd ? pd.rate * 6 : 5)); }
export function alchemyCost(st) { return Math.round(300 * Math.pow(1.35, Object.keys(st.known).length)); }
export function prestigeGain(st) { return Math.floor(Math.sqrt(Math.max(0, st.runTotal) / 100000)); }

// ---------- 이벤트 ----------
function emit(ev, e) { if (ev) ev.push(e); }
export function addMoon(st, v) { st.moon += v; st.runTotal += v; st.lifeTotal += v; }

// ---------- 틱 ----------
export function tick(st, dt, ev, offline = false) {
  const f = fx(st);
  let timeMul = st.act.accel > 0 ? 6 : 1;
  const gdt = dt * timeMul;
  const prevE = env(st);
  st.gt += gdt;
  const e = env(st);
  // 액티브 타이머
  for (const k of Object.keys(ACTIVES)) {
    if (st.act[k] > 0) { st.act[k] = Math.max(0, st.act[k] - dt); if (st.act[k] === 0) emit(ev, { type: 'activeEnd', id: k }); }
    if (st.cd[k] > 0) st.cd[k] = Math.max(0, st.cd[k] - dt);
  }
  // 환경 이벤트 알림
  if (!offline) {
    if (e.dayIndex !== prevE.dayIndex || e.tod !== prevE.tod) emit(ev, { type: 'tod', tod: e.tod, env: e });
    if (e.full && !prevE.full) emit(ev, { type: 'fullmoon' });
    if (e.meteorWin && !prevE.meteorWin) emit(ev, { type: 'meteor' });
    if (e.newm && !prevE.newm) emit(ev, { type: 'newmoon' });
  }
  const drainBase = 100 / 90 * f.water * (st.buildings.pond ? 0.8 : 1);
  const nutDecay = 100 / 120 * f.nutDecay;
  const rateG = globalMult(st, e);
  let produced = 0;
  for (let i = 0; i < st.plotCount; i++) {
    const pl = st.plots[i]; if (!pl) continue;
    if (pl.id === 'weed') {
      if (pl.prog < 1) pl.prog = Math.min(1, pl.prog + gdt / 8);
      pl.water = 100; // 잡초는 알아서 자란다
      if (f.weedYield) produced += 0.3 * Math.max(1, st.plotCount / 4) * rateG * dt;
      continue;
    }
    const pd = PLANT_MAP[pl.id];
    // 물
    if (pl.water > 0) pl.water = Math.max(0, pl.water - drainBase * gdt);
    if (pl.nut > 0) pl.nut = Math.max(0, pl.nut - nutDecay * gdt);
    if (pl.prog < 1) {
      if (pl.water > 0) {
        const sp = f.grow * (pl.nut > 0 ? 1.5 : 1);
        pl.prog = Math.min(1, pl.prog + (gdt * sp) / pd.grow);
        if (pl.prog >= 1) emit(ev, { type: 'mature', idx: i, id: pl.id });
      }
    }
    if (pl.prog >= 1) {
      let nearOK = true;
      if (pd.near) nearOK = NEIGHBORS[i].some((q) => { const o = st.plots[q]; return o && o.id === pd.near && o.prog >= 1 && o.bloom; });
      const b = condOK(pd, e) && nearOK;
      if (b && !pl.bloom) {
        pl.bloom = true;
        st.stats.blooms++;
        emit(ev, { type: 'bloom', idx: i, id: pl.id, shiny: pl.shiny });
        if (!st.dex[pl.id]) {
          st.dex[pl.id] = { bloom: 0, shiny: 0 };
          st.sp += 1;
          const burst = pd.rate * 60 * rateG;
          addMoon(st, burst);
          emit(ev, { type: 'discover', id: pl.id, burst, idx: i });
        }
        st.dex[pl.id].bloom++;
        if (pl.shiny) { st.dex[pl.id].shiny++; st.stats.shiny++; emit(ev, { type: 'shiny', id: pl.id, idx: i }); }
      } else if (!b && pl.bloom) { pl.bloom = false; emit(ev, { type: 'wilt', idx: i }); }
    }
    produced += plotRate(st, i, e, f) * rateG * dt;
  }
  addMoon(st, produced);
  // 자동화
  if (st.auto.spirit > 0) {
    st.autoAcc.spirit += st.auto.spirit * 0.5 * dt;
    if (st.autoAcc.spirit >= 1) {
      const n = Math.floor(st.autoAcc.spirit); st.autoAcc.spirit -= n;
      const g = clickGain(st, e) * n; addMoon(st, g);
      if (!offline) emit(ev, { type: 'spirit', gain: g });
    }
  }
  if (st.auto.water > 0) {
    st.autoAcc.water += dt;
    if (st.autoAcc.water >= 2) {
      st.autoAcc.water = 0;
      const dry = []; for (let i = 0; i < st.plotCount; i++) { const pl = st.plots[i]; if (pl && pl.id !== 'weed' && pl.water < 70) dry.push(i); }
      dry.sort((a, b) => st.plots[a].water - st.plots[b].water);
      for (const i of dry.slice(0, st.auto.water * 2)) { st.plots[i].water = 100; if (!offline) emit(ev, { type: 'autowater', idx: i }); }
    }
  }
}

// 오프라인 시뮬레이션
export function simulateOffline(st, seconds) {
  const cap = Math.min(seconds, OFFLINE_CAP);
  const startMoon = st.moon;
  // 오프라인에는 액티브 효과 없음, 효율 적용
  const before = { moon: st.moon, run: st.runTotal, life: st.lifeTotal };
  const savedAct = { ...st.act }; st.act = { moon: 0, accel: 0, meteor: 0 };
  const step = 10; let left = cap;
  const evs = [];
  while (left > 0) { const d = Math.min(step, left); tick(st, d, evs, true); left -= d; }
  st.act = savedAct;
  const raw = st.moon - before.moon;
  const gain = raw * OFFLINE_EFF;
  st.moon = before.moon + gain; st.runTotal = before.run + gain; st.lifeTotal = before.life + gain;
  const disc = evs.filter((x) => x.type === 'discover').length;
  return { seconds: cap, gain, discovered: disc };
}

// ---------- 행동 ----------
export function doClick(st, combo = 1, ev) {
  const e = env(st); const f = fx(st);
  let g = clickGain(st, e, { combo });
  let crit = false;
  if (f.crit && Math.random() < f.crit) { g *= f.critMult; crit = true; st.stats.crits++; }
  st.clickCount30++; st.stats.clicks++;
  let burst = false;
  if (f.burst && st.clickCount30 >= 30) { st.clickCount30 = 0; g += clickGain(st, e) * f.burst; burst = true; }
  addMoon(st, g);
  return { gain: g, crit, burst };
}
export function waterPlot(st, idx) {
  const pl = st.plots[idx]; if (!pl || pl.id === 'weed') return false;
  pl.water = 100; return true;
}
export function waterAll(st) {
  if (st.gt - st.wateredAt < 20 && st.wateredAt > -900) return { ok: false, wait: Math.ceil(20 - (st.gt - st.wateredAt)) };
  let n = 0; for (let i = 0; i < st.plotCount; i++) { const pl = st.plots[i]; if (pl && pl.id !== 'weed') { pl.water = 100; n++; } }
  st.wateredAt = st.gt; return { ok: true, n };
}
export function fertPlot(st, idx) {
  const pl = st.plots[idx]; if (!pl || pl.id === 'weed') return { ok: false, msg: '여기엔 줄 수 없어요' };
  const c = fertCost(st, pl);
  if (st.moon < c) return { ok: false, msg: '달빛이 부족해요' };
  st.moon -= c; pl.nut = 100; return { ok: true, cost: c };
}
export function plantAt(st, idx, id) {
  if (idx >= st.plotCount) return { ok: false, msg: '아직 열리지 않은 화단이에요' };
  if (st.plots[idx]) return { ok: false, msg: '이미 식물이 있어요' };
  const p = PLANT_MAP[id]; if (!p) return { ok: false, msg: '알 수 없는 식물' };
  const av = plantAvail(st, p); if (!av.ok) return { ok: false, msg: av.why };
  if (p.hybrid) st.hybridSeeds[id]--;
  else if (p.starCost) { if (st.starSeeds < p.starCost) return { ok: false, msg: `별 씨앗이 ${p.starCost}개 필요해요` }; st.starSeeds -= p.starCost; }
  else { if (st.moon < p.cost) return { ok: false, msg: '달빛이 부족해요' }; st.moon -= p.cost; }
  const f = fx(st);
  const sh = f.shiny + (p.hybrid ? f.hybridShiny : 0);
  st.plots[idx] = { id, prog: 0, water: 100, nut: 0, shiny: Math.random() < sh, bloom: false };
  return { ok: true };
}
export function removeAt(st, idx) {
  const pl = st.plots[idx]; if (!pl) return { ok: false };
  let gain = 0;
  if (pl.id === 'weed') { gain = (fx(st).weedYield ? 50 : 10) * Math.max(1, st.plotCount / 2); addMoon(st, gain); }
  st.plots[idx] = null;
  return { ok: true, gain, weed: pl.id === 'weed' };
}
export function buyClick(st) { const c = clickCost(st); if (st.moon < c) return false; st.moon -= c; st.clickLevel++; return true; }
export function buyPlot(st) { if (st.plotCount >= MAX_PLOTS) return false; const c = plotCost(st); if (st.moon < c) return false; st.moon -= c; st.plotCount++; return true; }
export function buyBuilding(st, id) {
  const b = BUILDINGS[id]; if (st.buildings[id] >= b.max) return false;
  if (b.req && !reqMet(st, b.req)) return false;
  const c = buildingCost(st, id); if (st.moon < c) return false; st.moon -= c; st.buildings[id]++; return true;
}
export function buyAuto(st, id) {
  const a = AUTOS[id]; if (st.auto[id] >= a.max) return false;
  const c = autoCost(st, id); if (st.moon < c) return false; st.moon -= c; st.auto[id]++; return true;
}
export function skillAvail(st, s) {
  if (st.skills[s.id]) return { ok: false, why: '습득함' };
  if (s.req && !st.skills[s.req]) return { ok: false, why: `${SKILL_MAP[s.req].name} 먼저` };
  if (st.sp < s.cost) return { ok: false, why: `스킬 포인트 ${s.cost} 필요` };
  return { ok: true };
}
export function buySkill(st, id) { const s = SKILL_MAP[id]; const a = skillAvail(st, s); if (!a.ok) return false; st.sp -= s.cost; st.skills[id] = true; return true; }
export function activate(st, key) {
  const a = ACTIVES[key]; if (!st.skills[a.skill]) return { ok: false, msg: '스킬을 먼저 습득하세요' };
  if (st.cd[key] > 0) return { ok: false, msg: `재사용 대기 ${Math.ceil(st.cd[key])}초` };
  st.act[key] = a.dur; st.cd[key] = a.cd; return { ok: true };
}
export function meteorTap(st) {
  const g = 1 + (Math.random() < 0.15 ? 1 : 0); st.starSeeds += g; return g;
}
export function alchemyChance(st, a, b, catalyst = 0) {
  const f = fx(st); const r = findRecipe(a, b);
  if (!r) return { recipe: null, chance: 0 };
  let c = 0.55 + f.alchSuccess + catalyst * 0.2;
  if (f.master && st.known[r[2]]) c = 1;
  return { recipe: r, chance: Math.min(1, c) };
}
export function alchemize(st, a, b, catalyst = 0) {
  if (a === b) return { ok: false, msg: '서로 다른 두 식물을 고르세요' };
  if (!st.dex[a] || !st.dex[b]) return { ok: false, msg: '도감에 등록된 식물만 교배할 수 있어요' };
  const cost = alchemyCost(st); if (st.moon < cost) return { ok: false, msg: '달빛이 부족해요' };
  if (catalyst > st.starSeeds) return { ok: false, msg: '별 씨앗이 부족해요' };
  const f = fx(st);
  st.moon -= cost; st.starSeeds -= catalyst; st.stats.alchemy++;
  const { recipe, chance } = alchemyChance(st, a, b, catalyst);
  if (recipe && Math.random() < chance) {
    const id = recipe[2]; let n = 1; if (f.dbl && Math.random() < f.dbl) n = 2;
    st.hybridSeeds[id] = (st.hybridSeeds[id] || 0) + n; st.known[id] = true; st.stats.alchemyOk++;
    return { ok: true, success: true, id, n, cost };
  }
  // 실패 -> 잡초
  if (f.refund) addMoonRefund(st, cost * f.refund);
  let spot = -1; for (let i = 0; i < st.plotCount; i++) if (!st.plots[i]) { spot = i; break; }
  if (spot >= 0) { st.plots[spot] = { id: 'weed', prog: 0, water: 100, nut: 0, shiny: false, bloom: false }; st.stats.weeds++; }
  return { ok: true, success: false, weedAt: spot, cost, refund: f.refund ? cost * f.refund : 0, noRecipe: !recipe };
}
function addMoonRefund(st, v) { st.moon += v; }
export function terrainSelect(st, id) { if (!st.terrains[id]) return false; st.terrain = id; return true; }
export function prestige(st) {
  const gain = prestigeGain(st); if (gain < 1) return null;
  const keep = { dex: st.dex, skills: st.skills, known: st.known, terrains: st.terrains, terrain: st.terrain, lunarSeeds: st.lunarSeeds + gain,
    prestiges: st.prestiges + 1, sp: st.sp + 2, lifeTotal: st.lifeTotal, stats: st.stats, settings: st.settings, seenIntro: true, hybridSeeds: st.hybridSeeds };
  const n = newState(); Object.assign(n, keep);
  n.moon = 20 + keep.lunarSeeds * 30;
  const nextTerr = { 1: 'moss', 2: 'crystal', 3: 'cloud' }[n.prestiges];
  let unlocked = null;
  if (nextTerr && !n.terrains[nextTerr]) { n.terrains[nextTerr] = true; unlocked = nextTerr; }
  n.gt = DAY_LEN * 0.08;
  for (const k of Object.keys(st)) if (!(k in n)) n[k] = st[k];
  Object.keys(st).forEach((k) => delete st[k]); Object.assign(st, n);
  return { gain, unlocked };
}

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a < 1000) return a < 10 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n));
  if (a < 10000) return Math.floor(n).toLocaleString('ko-KR');
  const units = [['경', 1e16], ['조', 1e12], ['억', 1e8], ['만', 1e4]];
  for (const [u, v] of units) if (a >= v) { const x = n / v; return (x >= 100 ? Math.floor(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).toString().replace(/\.0+$/, '') + u; }
  return String(Math.floor(n));
}
export function fmtTime(s) {
  s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}시간 ${m}분` : m ? `${m}분 ${x}초` : `${x}초`;
}
