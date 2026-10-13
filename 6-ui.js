import * as G from './game.js';
import { PLANTS, PLANT_MAP, RARITY, COND_TEXT, BUILDINGS, AUTOS, TERRAINS, BRANCHES, SKILLS, SKILL_MAP, ACTIVES, RECIPES, MAX_PLOTS, MOON_NAMES, MOON_CYCLE, HYBRIDS, BASE_PLANTS, DAY_LEN } from './data.js';

const $ = (s) => document.querySelector(s);
const fmt = G.fmt;
export class UI {
  constructor(app) {
    this.app = app; this.tab = null; this.sel = null; this.pick = null; this.alch = { a: '', b: '', cat: 0 }; this.dexSel = null; this.lastFull = 0;
    document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => { app.sound.init(); this.openTab(b.dataset.tab === this.tab ? null : b.dataset.tab); }));
    $('#panelclose').addEventListener('click', () => this.openTab(null));
    $('#panelbody').addEventListener('click', (e) => this.onPanelClick(e));
    $('#plotpanel').addEventListener('click', (e) => this.onPlotClick(e));
    $('#panelbody').addEventListener('change', (e) => this.onPanelChange(e));
    $('#panelbody').addEventListener('input', (e) => this.onPanelChange(e));
    this.buildActives();
  }
  get st() { return this.app.st; }
  toast(msg) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 3300); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove(); }
  banner(msg, ms = 4000) { const b = $('#banner'); b.textContent = msg; b.classList.add('show'); clearTimeout(this.bt); this.bt = setTimeout(() => b.classList.remove('show'), ms); }
  floater(x, y, text, cls = '') { const d = document.createElement('div'); d.className = 'floater ' + cls; d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; $('#floaters').appendChild(d); setTimeout(() => d.remove(), 1100); }
  modal(html, onClose) { const m = $('#modal'); $('#modalbox').innerHTML = html + '<p><button class="btn" id="modalok">확인</button></p>'; m.classList.remove('hidden'); $('#modalok').onclick = () => { m.classList.add('hidden'); onClose && onClose(); }; }
  openTab(t) {
    this.tab = t; this.pick = null;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    $('#panel').classList.toggle('hidden', !t); if (t) this.renderPanel(true);
  }
  buildActives() {
    const el = $('#actives'); el.innerHTML = '';
    for (const [k, a] of Object.entries(ACTIVES)) {
      const b = document.createElement('button'); b.className = 'act'; b.id = 'act-' + k; b.innerHTML = `${a.icon}<small>${a.name}</small><div class="cdfill" style="height:0"></div>`;
      b.addEventListener('click', () => { this.app.sound.init(); this.app.activate(k); }); el.appendChild(b);
    }
  }
  updateActives() {
    const st = this.st;
    for (const [k, a] of Object.entries(ACTIVES)) {
      const b = $('#act-' + k); b.style.display = st.skills[a.skill] ? '' : 'none';
      b.classList.toggle('on', st.act[k] > 0);
      b.querySelector('.cdfill').style.height = (st.cd[k] > 0 ? (st.cd[k] / a.cd) * 100 : 0) + '%';
    }
  }
  updateHud(e, rate) {
    const st = this.st;
    $('#moon').textContent = fmt(st.moon); $('#rate').textContent = '+' + fmt(rate) + '/초';
    $('#stars').textContent = fmt(st.starSeeds); $('#lunar').textContent = fmt(st.lunarSeeds);
    $('#tod').textContent = G.todName(e.tod) + ' · ' + (e.dayIndex + 1) + '일차';
    $('#phase').textContent = '🌙 ' + e.moonName + (e.meteorNight ? ' · ☄️' : '');
    $('#todfill').style.width = (e.phase * 100) + '%';
    $('#spbadge').textContent = st.sp > 0 ? st.sp : '';
    this.updateActives(); this.updatePlotPanel();
  }
  // ---- 화단 패널 ----
  select(i) { this.sel = i; this.pick = null; this.renderPlot(); }
  updatePlotPanel() { if (this.sel == null) return; const k = this.plotKey(); if (k !== this.pk) this.renderPlot(); else this.updateBars(); }
  plotKey() { const pl = this.st.plots[this.sel]; const af = pl && pl.id !== 'weed' ? this.st.moon >= G.fertCost(this.st, pl) : 0; return [this.sel, this.st.plotCount, pl ? pl.id + (pl.bloom ? 'b' : '') + (pl.prog >= 1 ? 'm' : '') + (pl.nut > 0 ? 'n' : '') + (pl.water > 0 ? 'w' : 'd') + (pl.shiny ? 's' : '') : 'x', af, this.st.moon >= G.plotCost(this.st)].join('|'); }
  updateBars() {
    const pl = this.st.plots[this.sel]; if (!pl) return;
    const a = $('#pp-prog'), b = $('#pp-water'), c = $('#pp-nut');
    if (a) a.style.width = pl.prog * 100 + '%'; if (b) b.style.width = pl.water + '%'; if (c) c.style.width = pl.nut + '%';
  }
  renderPlot() {
    const st = this.st, i = this.sel, el = $('#plotpanel'); this.pk = this.plotKey();
    if (i == null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (i >= st.plotCount) {
      const next = i === st.plotCount;
      el.innerHTML = `<b>🔒 잠긴 화단</b><p style="margin:4px 0;font-size:12px;color:#b9c6ee">${next ? '다음으로 열 수 있는 화단이에요.' : '앞쪽 화단부터 차례로 열립니다.'}</p><div class="row">${next ? `<button class="btn ${st.moon >= G.plotCost(st) ? '' : 'dis'}" data-a="buyplot">화단 열기 🌙${fmt(G.plotCost(st))}</button>` : ''}<button class="btn alt" data-a="close">닫기</button></div>`; return;
    }
    const pl = st.plots[i];
    if (!pl) { el.innerHTML = `<b>빈 화단 #${i + 1}</b><p style="margin:4px 0;font-size:12px;color:#b9c6ee">씨앗을 심어 달빛 식물을 키워보세요.</p><div class="row"><button class="btn" data-a="seeds">🌱 씨앗 심기</button><button class="btn alt" data-a="close">닫기</button></div>`; return; }
    if (pl.id === 'weed') { el.innerHTML = `<b>🌿 잡초</b><p style="margin:4px 0;font-size:12px;color:#b9c6ee">연금술 실패로 자란 잡초예요. 뽑으면 달빛 약간을 돌려줍니다.${st.skills.a5 ? ' (정수 추출: 달빛 생산 중)' : ''}</p><div class="row"><button class="btn green" data-a="pull">뽑기</button><button class="btn alt" data-a="close">닫기</button></div>`; return; }
    const pd = PLANT_MAP[pl.id]; const stage = pl.prog < 0.2 ? '씨앗' : pl.prog < 0.5 ? '새싹' : pl.prog < 1 ? '꽃봉오리' : (pl.bloom ? '개화 🌸' : '봉오리(조건 대기)');
    const e = G.env(st); const fc = G.fertCost(st, pl);
    el.innerHTML = `<b>${pd.name}</b>${pl.shiny ? '<span class="tag" style="background:#ff9ae8;color:#400">변이 ✨</span>' : ''}<span class="tag">${stage}</span><span class="tag" style="color:${RARITY[pd.rar].color}">${RARITY[pd.rar].name}</span>
    <p style="margin:4px 0;font-size:12px;color:#b9c6ee">${COND_TEXT[pd.cond]}${pd.near ? ' · 이웃에 ' + PLANT_MAP[pd.near].name + ' 필요' : ''} · 개화 시 +${fmt(pd.rate)}/초</p>
    <div style="font-size:11px">성장<div class="bar"><i id="pp-prog" style="background:#8fe3a0;width:${pl.prog * 100}%"></i></div>물<div class="bar"><i id="pp-water" style="background:#7ad0ff;width:${pl.water}%"></i></div>영양<div class="bar"><i id="pp-nut" style="background:#ffd36b;width:${pl.nut}%"></i></div></div>
    <div class="row"><button class="btn alt" data-a="water">💧 물주기</button><button class="btn ${st.moon >= fc ? '' : 'dis'}" data-a="fert">🧪 영양제 🌙${fmt(fc)}</button><button class="btn red" data-a="pull">뽑기</button><button class="btn alt" data-a="close">닫기</button></div>`;
  }
  onPlotClick(e) {
    const a = e.target.closest('[data-a]'); if (!a) return; const act = a.dataset.a; const app = this.app, i = this.sel;
    if (act === 'close') { this.sel = null; this.renderPlot(); return; }
    if (act === 'seeds') { this.pick = i; this.openTab('seeds'); return; }
    app.plotAction(act, i); this.renderPlot();
  }
  // ---- 패널 ----
  refresh() { if (!this.tab) return; if (['shop', 'auto', 'prestige', 'seeds', 'garden'].includes(this.tab)) this.renderPanel(false); }
  renderPanel(force) {
    const t = this.tab, body = $('#panelbody'); const sc = body.scrollTop;
    const titles = { garden: '🌱 정원 관리', shop: '🏯 경관 확장', auto: '✨ 자동화', skills: '🌿 스킬 트리', dex: '📖 달빛 식물 도감', alch: '⚗️ 조합 연금술', prestige: '🌑 환생 · 달의 제단', settings: '⚙️ 설정', seeds: '🌱 씨앗 고르기' };
    $('#paneltitle').textContent = titles[t] || ''; const h = this['r_' + t](); if (h === null) return;
    if (!force && body.dataset.h === h) return; body.innerHTML = h; body.dataset.h = h; body.scrollTop = sc;
    if (t === 'dex' && this.dexSel) { /* detail inline */ }
  }
  btn(ok, a, id, text, cls = '') { return `<button class="btn ${cls} ${ok ? '' : 'dis'}" data-a="${a}" data-id="${id}">${text}</button>`; }
  r_garden() {
    const st = this.st, e = G.env(st);
    const left = (DAY_LEN * (1 - e.phase));
    const nextFull = e.moonIdx === 3 && e.night ? '지금 보름달!' : `보름달까지 약 ${(((3 - e.moonIdx + MOON_CYCLE) % MOON_CYCLE) || MOON_CYCLE)}일`;
    return `<div class="card"><div class="meta"><h4>🌙 달 주기: ${e.moonName}</h4><p>${nextFull} · 보름달 밤: 생산 ×1.5 + 큰 반딧불 · 그믐달 밤: 유성우 확률↑</p></div></div>
    <div class="card"><div class="meta"><h4>🥣 달빛 그릇 Lv.${st.clickLevel}</h4><p>클릭 한 번에 🌙${fmt(G.clickGain(st, e))} 채집</p></div>${this.btn(st.moon >= G.clickCost(st), 'buyclick', '', '🌙' + fmt(G.clickCost(st)))}</div>
    <div class="card"><div class="meta"><h4>🌷 화단 ${st.plotCount}/${MAX_PLOTS}</h4><p>${st.plotCount < MAX_PLOTS ? '정원 속 잠긴 화단을 눌러도 열 수 있어요.' : '모든 화단이 열렸어요!'}</p></div>${st.plotCount < MAX_PLOTS ? this.btn(st.moon >= G.plotCost(st), 'buyplot', '', '🌙' + fmt(G.plotCost(st))) : ''}</div>
    <div class="card"><div class="meta"><h4>💧 전체 물주기</h4><p>모든 화단에 물을 줍니다 (20초 대기)</p></div>${this.btn(true, 'waterall', '', '물주기', 'alt')}</div>
    <div class="card"><div class="meta"><h4>📊 기록</h4><p>클릭 ${fmt(st.stats.clicks)} · 개화 ${fmt(st.stats.blooms)} · 변이 ${st.stats.shiny} · 교배 ${st.stats.alchemyOk}/${st.stats.alchemy} · 누적 🌙${fmt(st.lifeTotal)}</p></div></div>
    <div class="card"><div class="meta"><h4>💡 조작법</h4><p>정원을 탭하면 달빛 채집 · 화단 탭: 심기/물/영양 · 드래그: 시점 회전 · 휠/핀치: 확대</p></div></div>`;
  }
  r_seeds() {
    const st = this.st, idx = this.pick; if (idx == null) return '<p>화단을 먼저 선택하세요.</p>';
    const list = PLANTS.filter((p) => !p.hybrid).concat(PLANTS.filter((p) => p.hybrid && (st.hybridSeeds[p.id] || 0) > 0));
    return `<p style="margin:0;font-size:12px;color:#b9c6ee">화단 #${idx + 1}에 심을 씨앗 · 🌙 ${fmt(st.moon)} · ⭐ ${st.starSeeds}</p>` + list.map((p) => {
      const av = G.plantAvail(st, p); const afford = p.hybrid ? true : p.starCost ? st.starSeeds >= p.starCost : st.moon >= p.cost;
      const cost = p.hybrid ? `씨앗 ×${st.hybridSeeds[p.id]}` : p.starCost ? `⭐${p.starCost}` : '🌙' + fmt(p.cost);
      return `<div class="card"><div class="dexc" style="width:46px;padding:4px"><div class="sw" style="background:linear-gradient(135deg,${p.c1},${p.c2});margin:0"></div></div><div class="meta"><h4>${p.name}<span class="tag" style="color:${RARITY[p.rar].color}">${RARITY[p.rar].name}</span></h4><p>${COND_TEXT[p.cond]} · +${fmt(p.rate)}/초 · 성장 ${p.grow}초${p.near ? ' · 이웃 ' + PLANT_MAP[p.near].name : ''}</p>${av.ok ? '' : `<p style="color:#ff9aae">🔒 ${av.why}</p>`}</div>${av.ok ? this.btn(afford, 'plant', p.id, cost) : ''}</div>`;
    }).join('');
  }
  r_shop() {
    const st = this.st, bl = Object.entries(BUILDINGS).map(([id, b]) => {
      const lv = st.buildings[id], max = lv >= b.max; const reqOk = !b.req || G.reqMet(st, b.req); const seen = st.runTotal >= b.at || lv > 0;
      if (!seen) return `<div class="card"><div class="meta"><h4>❓ ??? </h4><p>이번 회차 달빛 ${fmt(b.at)} 모으면 공개</p></div></div>`;
      const cost = G.buildingCost(st, id);
      return `<div class="card"><div style="font-size:28px">${b.icon}</div><div class="meta"><h4>${b.name} <span class="tag">Lv.${lv}/${b.max}</span></h4><p>${b.desc}</p>${reqOk ? '' : `<p style="color:#ff9aae">🔒 ${BUILDINGS[b.req].name} 먼저 건설</p>`}</div>${max ? '<span class="tag">완료</span>' : this.btn(reqOk && st.moon >= cost, 'buyb', id, '🌙' + fmt(cost))}</div>`;
    }).join('');
    return bl + `<p style="margin:0;font-size:11px;color:#8d9ac8">건설하면 정원에 실제로 나타납니다. 새 식물도 해금돼요.</p>`;
  }
  r_auto() {
    const st = this.st;
    return Object.entries(AUTOS).map(([id, a]) => {
      const lv = st.auto[id]; if (st.runTotal < a.at && lv === 0) return `<div class="card"><div class="meta"><h4>❓ ???</h4><p>이번 회차 달빛 ${fmt(a.at)} 모으면 공개</p></div></div>`;
      const cost = G.autoCost(st, id); const max = lv >= a.max;
      return `<div class="card"><div style="font-size:28px">${a.icon}</div><div class="meta"><h4>${a.name} <span class="tag">Lv.${lv}/${a.max}</span></h4><p>${a.desc}</p></div>${max ? '<span class="tag">최대</span>' : this.btn(st.moon >= cost, 'buya', id, '🌙' + fmt(cost))}</div>`;
    }).join('');
  }
  r_skills() {
    const st = this.st; let h = `<div class="card"><div class="meta"><h4>스킬 포인트 ${st.sp}</h4><p>새 식물을 처음 개화시킬 때마다 +1, 환생할 때마다 +2. 스킬은 환생해도 유지돼요.</p></div></div>`;
    for (const [bid, br] of Object.entries(BRANCHES)) {
      h += `<h4 style="margin:6px 0 0;color:${br.color}">${br.icon} ${br.name} <small>(${br.sub})</small></h4>`;
      for (const s of SKILLS.filter((x) => x.br === bid)) {
        const av = G.skillAvail(st, s); const have = st.skills[s.id];
        h += `<div class="card skill ${have ? 'have' : ''}"><div class="meta"><h4>${s.name}${s.active ? '<span class="tag">액티브</span>' : ''}</h4><p>${s.desc}</p><p style="color:${br.color}">🎨 ${s.vis}</p>${!have && !av.ok ? `<p style="color:#ff9aae">${av.why}</p>` : ''}</div>${have ? '<span class="tag">습득</span>' : this.btn(av.ok, 'buys', s.id, `${s.cost}P`)}</div>`;
      }
    }
    return h;
  }
  r_dex() {
    const st = this.st, n = Object.keys(st.dex).length;
    const cell = (p) => { const d = st.dex[p.id]; return `<div class="dexc ${d ? '' : 'un'}" data-a="dex" data-id="${p.id}"><div class="sw" style="background:linear-gradient(135deg,${p.c1},${p.c2})"></div>${d ? p.name : '???'}<br><span style="color:${RARITY[p.rar].color}">${RARITY[p.rar].name}</span>${d && d.shiny ? ' ✨' : ''}</div>`; };
    let h = `<div class="card"><div class="meta"><h4>수집 ${n}/${PLANTS.length}</h4><p>도감 1종당 전체 생산 +2% (현재 +${n * 2}%) · 하이브리드 ${HYBRIDS.filter((x) => st.dex[x.id]).length}/${HYBRIDS.length}</p></div></div>`;
    if (this.dexSel) { const p = PLANT_MAP[this.dexSel], d = st.dex[p.id]; h += `<div class="card" style="flex-direction:column;align-items:flex-start;border-color:${RARITY[p.rar].color}"><h4>${d ? p.name : '???'} <span class="tag" style="color:${RARITY[p.rar].color}">${RARITY[p.rar].name}</span></h4>${d ? `<p>${p.flavor}</p><p>🌸 ${COND_TEXT[p.cond]} · +${fmt(p.rate)}/초 · 성장 ${p.grow}초${p.near ? ' · 이웃 ' + PLANT_MAP[p.near].name : ''}</p><p>개화 ${d.bloom}회 · 변이 ${d.shiny}회${p.hybrid ? ' · ' + (RECIPES.find((r) => r[2] === p.id).slice(0, 2).map((x) => PLANT_MAP[x].name).join(' + ')) : ''}</p>` : `<p>아직 발견하지 못했어요.</p><p>${p.hybrid ? '연금술 교배로 얻을 수 있어요.' : (p.at ? `힌트: ${COND_TEXT[p.cond]}` : COND_TEXT[p.cond])}</p>`}</div>`; }
    h += `<h4 style="margin:4px 0">기본 식물</h4><div class="grid">${BASE_PLANTS.map(cell).join('')}</div><h4 style="margin:8px 0 4px">하이브리드</h4><div class="grid">${HYBRIDS.map(cell).join('')}</div>`;
    return h;
  }
  r_alch() {
    const st = this.st, known = PLANTS.filter((p) => st.dex[p.id]); const cost = G.alchemyCost(st);
    const a = this.alch; const opt = (v) => `<option value="">식물 선택</option>` + known.map((p) => `<option value="${p.id}" ${v === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
    const ch = a.a && a.b ? G.alchemyChance(st, a.a, a.b, a.cat) : null;
    let info = '두 식물을 고르세요.'; if (ch) info = a.a === a.b ? '서로 다른 두 식물을 고르세요.' : ch.recipe ? `성공 확률 ${Math.round(ch.chance * 100)}%${st.known[ch.recipe[2]] ? ' · 결과: ' + PLANT_MAP[ch.recipe[2]].name : ' · 결과: ???'}` : '이 조합은 반응이 없을 것 같아요 (실패 시 잡초)';
    const inv = Object.entries(st.hybridSeeds).filter(([, n]) => n > 0).map(([id, n]) => `${PLANT_MAP[id].name}×${n}`).join(', ') || '없음';
    const rec = RECIPES.map((r) => st.known[r[2]] ? `<p>✔ ${PLANT_MAP[r[0]].name} + ${PLANT_MAP[r[1]].name} → <b>${PLANT_MAP[r[2]].name}</b></p>` : `<p style="opacity:.6">? ${st.dex[r[0]] ? PLANT_MAP[r[0]].name : '???'} + ${st.dex[r[1]] ? PLANT_MAP[r[1]].name : '???'} → ???</p>`).join('');
    return `<div class="card" style="flex-direction:column;align-items:stretch"><div class="row2"><select class="sel" data-s="a">${opt(a.a)}</select><select class="sel" data-s="b">${opt(a.b)}</select></div><p style="margin:8px 0 4px">${info}</p><p>비용 🌙${fmt(cost)} · 별 씨앗 촉매 ⭐<input type="number" min="0" max="2" value="${a.cat}" data-s="cat" style="width:46px;background:#1c2358;color:#fff;border:1px solid #556;border-radius:6px"> (1개당 성공 +20%)</p><button class="btn ${st.moon >= cost && a.a && a.b ? '' : 'dis'}" data-a="alch">⚗️ 교배하기</button></div>
    <div class="card"><div class="meta"><h4>보유 하이브리드 씨앗</h4><p>${inv}</p></div></div><div class="card" style="flex-direction:column;align-items:flex-start"><h4>레시피 노트</h4>${rec}<p style="color:#8d9ac8">성공한 레시피만 기록됩니다. 실패하면 빈 화단에 잡초가 자라요.</p></div>`;
  }
  r_prestige() {
    const st = this.st, g = G.prestigeGain(st);
    const t = Object.entries(TERRAINS).map(([id, x]) => `<div class="card"><div class="meta"><h4>${x.name}${st.terrain === id ? ' <span class="tag">적용 중</span>' : ''}</h4><p>${x.desc}</p></div>${st.terrains[id] ? (st.terrain === id ? '' : this.btn(true, 'terrain', id, '바꾸기', 'alt')) : '<span class="tag">🔒</span>'}</div>`).join('');
    return `<div class="card" style="flex-direction:column;align-items:stretch"><h4>정원을 달에 바치기</h4><p>정원·건물·자동화·달빛을 모두 바치고 <b>달의 씨앗</b>을 받아요. 달의 씨앗 1개당 전체 생산 +10%, 클릭 +10%. 도감·스킬·하이브리드·지형은 유지됩니다. 환생 시 스킬 포인트 +2, 새 지형 해금(1·2·3회).</p><p>이번 회차 누적 달빛 🌙${fmt(st.runTotal)} · 환생 ${st.prestiges}회 · 달의 씨앗 ${st.lunarSeeds}</p><p style="color:#ffe48a">지금 환생하면 달의 씨앗 +${g} ${g < 1 ? '(누적 달빛 10만 이상 필요)' : ''}</p><button class="btn ${g >= 1 ? 'red' : 'dis'}" data-a="prestige">🌑 환생하기</button></div><h4 style="margin:4px 0">지형</h4>${t}`;
  }
  r_settings() {
    const s = this.st.settings;
    return `<div class="card"><div class="meta"><h4>배경음</h4></div><button class="btn ${s.bgm ? 'green' : 'dis'}" data-a="bgm">${s.bgm ? 'ON' : 'OFF'}</button></div><div class="card"><div class="meta"><h4>효과음</h4></div><button class="btn ${s.sfx ? 'green' : 'dis'}" data-a="sfx">${s.sfx ? 'ON' : 'OFF'}</button></div><div class="card" style="flex-direction:column;align-items:stretch"><h4>볼륨</h4><input type="range" min="0" max="1" step="0.05" value="${s.vol}" data-s="vol"></div>
    <div class="card" style="flex-direction:column;align-items:stretch"><h4>저장 데이터</h4><p>자동 저장(10초마다, localStorage). 접속하지 않는 동안 최대 12시간, 효율 50%로 달빛이 쌓여요.</p><div class="row2"><button class="btn alt" data-a="export">내보내기</button><button class="btn alt" data-a="import">불러오기</button></div><textarea id="savebox" placeholder="저장 코드"></textarea><button class="btn red" data-a="reset">전체 초기화</button></div>`;
  }
  onPanelClick(e) {
    const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, id = el.dataset.id; const app = this.app;
    if (a === 'dex') { this.dexSel = id; this.renderPanel(true); return; }
    if (el.classList.contains('dis') && !['reset'].includes(a)) { app.sound.err(); }
    app.panelAction(a, id, this); this.renderPanel(true); this.renderPlot();
  }
  onPanelChange(e) {
    const el = e.target.closest('[data-s]'); if (!el) return; const s = el.dataset.s;
    if (['a', 'b'].includes(s)) { this.alch[s] = el.value; this.renderPanel(true); } else if (s === 'cat') { this.alch.cat = Math.max(0, Math.min(2, +el.value || 0)); this.renderPanel(true); }
    else if (s === 'vol') { this.st.settings.vol = +el.value; this.app.sound.setVol(+el.value); }
  }
}
