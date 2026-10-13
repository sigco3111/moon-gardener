// 달의 정원사 - 정적 데이터 (식물, 건물, 스킬 등)
export const SAVE_KEY = 'moon-gardener-save-v1';
export const DAY_LEN = 180;           // 하루(낮+석양+밤) 길이(초)
export const MOON_CYCLE = 6;          // 달 주기(일)
export const MOON_NAMES = ['그믐달', '초승달', '상현달', '보름달', '하현달', '그믐달(잔월)'];
export const MAX_PLOTS = 36;
export const OFFLINE_CAP = 12 * 3600;
export const OFFLINE_EFF = 0.5;

export const RARITY = {
  C: { name: '일반', color: '#c9d6e8', pay: 40 },
  U: { name: '희귀', color: '#7fe3a8', pay: 60 },
  R: { name: '고급 희귀', color: '#7fb8ff', pay: 90 },
  E: { name: '영험', color: '#c98bff', pay: 140 },
  L: { name: '전설', color: '#ffd36b', pay: 220 },
};

export const COND_TEXT = {
  any: '언제나 개화', day: '낮에만 개화', dusk: '석양에만 개화', night: '밤에만 개화',
  full: '보름달 밤에만 개화', new: '그믐 밤에만 개화', meteor: '유성우의 밤에만 개화',
};

// P(id, 이름, 모양, 색1, 색2, 조건, 등급, 초당달빛, 성장(초), 해금(이번 회차 누적 달빛), 옵션)
const plants = [];
function P(id, name, shape, c1, c2, cond, rar, rate, grow, at, o = {}) {
  const cost = o.hybrid ? 0 : (o.starCost ? 0 : Math.max(8, Math.round(rate * RARITY[rar].pay * ({ any: 1, day: 0.5, night: 0.55, dusk: 0.25 }[cond] || 0.3))));
  plants.push({ id, name, shape, c1, c2, cond, rar, rate, grow, at, cost, near: o.near || null, req: o.req || null,
    terrain: o.terrain || null, starCost: o.starCost || 0, hybrid: !!o.hybrid, flavor: o.flavor || '', h: o.h || 1 });
}
// ---- 기본 24종 ----
P('moonprim', '달맞이꽃', 'daisy', '#fff2a0', '#ffd24a', 'night', 'C', 0.9, 14, 0, { flavor: '해가 지면 조용히 달을 올려다보는 노란 꽃.' });
P('cloudlion', '구름 민들레', 'puff', '#f6f9ff', '#cfe4ff', 'day', 'C', 1.0, 16, 0, { flavor: '바람이 불면 솜털에서 작은 구름이 흩어진다.' });
P('clover', '은빛 클로버', 'bush', '#c4f3d8', '#7fd6a4', 'any', 'C', 0.5, 20, 0, { flavor: '이슬이 맺히면 은빛으로 반짝이는 클로버.' });
P('violet', '이슬 제비꽃', 'tulip', '#b48cff', '#7f56d9', 'day', 'C', 1.6, 24, 120, { flavor: '아침 이슬을 머금고 보랏빛으로 피어난다.' });
P('sunsetaster', '석양 코스모스', 'daisy', '#ffa27a', '#ff6f4d', 'dusk', 'U', 9, 28, 350, { flavor: '노을이 질 때만 잠깐 얼굴을 내미는 코스모스.' });
P('lantern', '초롱꽃', 'bell', '#ffd98a', '#ffb347', 'night', 'U', 4, 32, 450, { req: 'lantern1', flavor: '작은 초롱처럼 은은한 불빛을 품은 꽃.' });
P('sakura', '벚꽃나무', 'tree', '#ffbad8', '#ff8fbf', 'day', 'U', 8, 45, 700, { flavor: '꽃잎이 비처럼 흩날려 정원을 분홍빛으로 물들인다.', h: 2 });
P('bamboo', '월죽', 'tall', '#a6efb0', '#5bbf7a', 'any', 'U', 3.2, 38, 800, { flavor: '달빛을 마디마디 모아 두는 푸른 대나무.', h: 2.5 });
P('lilymoon', '달빛 수련', 'lotus', '#eaf2ff', '#b7d3ff', 'night', 'U', 7, 40, 1100, { req: 'pond', flavor: '연못 위에 달이 내려앉은 듯한 수련.' });
P('sunpoppy', '노을 양귀비', 'tulip', '#ff7a66', '#d94a3a', 'dusk', 'U', 24, 44, 1500, { flavor: '붉은 노을을 그대로 옮겨 놓은 양귀비.' });
P('mossrose', '이끼 장미', 'bush', '#ffa8bb', '#e0627f', 'day', 'U', 10, 46, 2000, { flavor: '이끼 낀 돌담 곁에서 조용히 피는 장미.' });
P('stararch', '별빛 난초', 'star', '#ffeaff', '#e6a8ff', 'night', 'R', 28, 70, 3500, { req: 'lantern2', flavor: '꽃잎마다 작은 별이 박혀 있는 난초.' });
P('firelily', '반딧불 백합', 'tulip', '#dcff7a', '#9ae03a', 'night', 'R', 45, 75, 4500, { near: 'moonprim', flavor: '달맞이꽃 곁에서만 불빛을 밝히는 백합. (이웃에 개화한 달맞이꽃 필요)' });
P('pine', '탑솔 소나무', 'tree', '#6fd09a', '#2f8f62', 'any', 'R', 20, 80, 6000, { req: 'pagoda1', flavor: '탑 그늘 아래에서 천천히 자라는 소나무.', h: 2.4 });
P('fullotus', '보름 연꽃', 'lotus', '#fff6c8', '#ffe27a', 'full', 'R', 140, 85, 6500, { req: 'pond', flavor: '보름달이 뜬 밤에만 활짝 피는 황금빛 연꽃.' });
P('darkghost', '그믐 도깨비꽃', 'mushroom', '#9b6bff', '#5d2fd0', 'new', 'R', 130, 85, 7000, { flavor: '달이 사라진 밤에 푸르게 빛나는 도깨비불 버섯꽃.' });
P('dusklotus', '황혼 부용', 'lotus', '#ff93bd', '#ff5f95', 'dusk', 'R', 180, 90, 8000, { req: 'pond', flavor: '해가 물에 잠기는 순간 연못 위에 번지는 분홍빛.' });
P('bridgebell', '다리목 도라지', 'bell', '#8fa6ff', '#5a74ff', 'night', 'R', 60, 80, 9000, { req: 'bridge', flavor: '다리 난간 곁에 피는 푸른 도라지.' });
P('mosspixie', '이끼 요정 버섯', 'mushroom', '#a6ffb8', '#4dd67a', 'night', 'E', 190, 150, 15000, { terrain: 'moss', flavor: '이끼 언덕에서 요정들이 모여 사는 버섯.' });
P('crystalbell', '수정 종꽃', 'crystal', '#c4ecff', '#6fc4ff', 'night', 'E', 210, 150, 18000, { terrain: 'crystal', flavor: '수정 호수의 맑은 소리를 내며 피는 종꽃.' });
P('cloudpeony', '구름 모란', 'puff', '#fff0f7', '#ffc9e0', 'day', 'E', 250, 150, 22000, { terrain: 'cloud', flavor: '구름바다 위에서 느긋하게 피는 모란.' });
P('meteorbloom', '유성화', 'star', '#a6ecff', '#4cc9ff', 'meteor', 'E', 520, 160, 25000, { starCost: 5, flavor: '유성우가 지나간 밤에만 터지는 별 씨앗 꽃.' });
P('silvertree', '은하수 나무', 'tree', '#cbd9ff', '#8ea8ff', 'night', 'L', 900, 300, 60000, { req: 'pagoda3', starCost: 12, flavor: '가지마다 은하수가 흐르는 밤의 나무.', h: 3 });
P('moonbeauty', '월하미인', 'daisy', '#fffbe9', '#ffe9a6', 'full', 'L', 2600, 400, 100000, { req: 'pagoda2', starCost: 20, flavor: '보름달 아래 단 한 번, 향기로 밤을 채우는 전설의 꽃.' });
// ---- 하이브리드 12종 (연금술) ----
P('h_duskpuff', '황혼 솜꽃', 'puff', '#ffd1b0', '#ff9a6f', 'dusk', 'U', 36, 40, 0, { hybrid: true, flavor: '석양빛을 머금은 솜털 꽃.' });
P('h_amethyst', '네잎 자수정', 'bush', '#d9b8ff', '#9c6bff', 'any', 'U', 6, 36, 0, { hybrid: true, flavor: '행운의 잎 끝마다 자수정이 맺힌다.' });
P('h_sakuralily', '월하 벚수련', 'lotus', '#ffd6ea', '#ff9fc9', 'night', 'R', 90, 70, 0, { hybrid: true, flavor: '벚꽃잎이 수련 위로 내려앉아 피어난 꽃.' });
P('h_lanternfly', '등불 반딧꽃', 'bell', '#f7ffa0', '#ffd24a', 'night', 'R', 120, 75, 0, { hybrid: true, flavor: '초롱 속에 반딧불이 사는 꽃.' });
P('h_sunsetdbl', '노을 겹꽃', 'daisy', '#ff8f7a', '#ff4d6a', 'dusk', 'R', 360, 85, 0, { hybrid: true, flavor: '노을이 두 번 겹쳐 피는 신비한 꽃.' });
P('h_starprim', '별달맞이', 'star', '#fff5b0', '#ffc94d', 'night', 'R', 110, 80, 0, { hybrid: true, flavor: '별빛 난초와 달맞이꽃이 만든 조화.' });
P('h_eclipse', '일식꽃', 'crystal', '#ffe9a6', '#7a4cff', 'new', 'E', 420, 140, 0, { hybrid: true, flavor: '빛과 어둠이 한 송이에 공존하는 꽃.' });
P('h_bamboopine', '청풍 죽송', 'tall', '#8fe3b0', '#2f9f6a', 'any', 'R', 70, 90, 0, { hybrid: true, flavor: '바람 소리를 달빛으로 바꾸는 숲.', h: 2.8 });
P('h_fairyrose', '요정 장미', 'bush', '#ffc4f0', '#ff7acb', 'day', 'R', 80, 70, 0, { hybrid: true, flavor: '이끼 요정이 가꾼 분홍 장미.' });
P('h_galaxorchid', '은하 난초', 'star', '#d6e4ff', '#8f7aff', 'meteor', 'E', 900, 160, 0, { hybrid: true, flavor: '유성우 속에서 은하를 그리며 피는 난초.' });
P('h_worldtree', '월광 세계수', 'tree', '#fff6c8', '#ffd36b', 'full', 'L', 6500, 420, 0, { hybrid: true, flavor: '정원 전체를 달빛으로 감싸는 전설의 세계수.', h: 3.4 });
P('h_crystalmoss', '수정 이끼화', 'crystal', '#bfffe0', '#4dd6b0', 'night', 'E', 480, 150, 0, { hybrid: true, flavor: '수정과 이끼가 한 몸이 된 신비한 꽃.' });

export const PLANTS = plants;
export const PLANT_MAP = Object.fromEntries(plants.map((p) => [p.id, p]));
export const BASE_PLANTS = plants.filter((p) => !p.hybrid);
export const HYBRIDS = plants.filter((p) => p.hybrid);

// 교배 레시피: [A, B, 결과]
export const RECIPES = [
  ['moonprim', 'cloudlion', 'h_duskpuff'],
  ['clover', 'violet', 'h_amethyst'],
  ['sakura', 'lilymoon', 'h_sakuralily'],
  ['lantern', 'firelily', 'h_lanternfly'],
  ['sunsetaster', 'sunpoppy', 'h_sunsetdbl'],
  ['moonprim', 'stararch', 'h_starprim'],
  ['fullotus', 'darkghost', 'h_eclipse'],
  ['bamboo', 'pine', 'h_bamboopine'],
  ['mossrose', 'violet', 'h_fairyrose'],
  ['meteorbloom', 'stararch', 'h_galaxorchid'],
  ['silvertree', 'moonbeauty', 'h_worldtree'],
  ['crystalbell', 'mosspixie', 'h_crystalmoss'],
];
export function findRecipe(a, b) {
  return RECIPES.find((r) => (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a)) || null;
}

export const WEED = { id: 'weed', name: '잡초', rate: 0, grow: 8 };

// 경관 건물
export const BUILDINGS = {
  pond: { name: '연못', max: 1, base: 800, mult: 3, at: 400, desc: '수생 식물 해금 · 물 소모 -20%', icon: '💧' },
  lantern: { name: '석등', max: 4, base: 600, mult: 2.3, at: 300, desc: '레벨당 밤 생산 +5% · 초롱/난초 해금', icon: '🏮' },
  bridge: { name: '다리', max: 1, base: 5000, mult: 3, at: 2500, req: 'pond', desc: '전체 생산 +10% · 다리목 도라지 해금', icon: '🌉' },
  pagoda: { name: '탑', max: 5, base: 3000, mult: 3, at: 1500, desc: '레벨당 전체 생산 +6% · 신비한 식물 해금', icon: '🏯' },
};

export const AUTOS = {
  spirit: { name: '달빛 정령', max: 20, base: 150, mult: 1.7, at: 100, desc: '초당 0.5회 자동 채집 (레벨당)', icon: '✨' },
  water: { name: '자동 급수 장치', max: 8, base: 300, mult: 2.0, at: 250, desc: '메마른 화단에 자동으로 물 공급', icon: '🚿' },
  firefly: { name: '반딧불 무리', max: 15, base: 1200, mult: 1.9, at: 1000, desc: '레벨당 전체 생산 +15% · 무리가 늘어남', icon: '🪲' },
  guard: { name: '수호수', max: 10, base: 5000, mult: 2.3, at: 4000, desc: '레벨당 전체 생산 +25% · 나무가 자람', icon: '🌳' },
};

export const TERRAINS = {
  basic: { name: '달빛 초원', need: 0, desc: '기본 지형', ground: ['#6cc46a', '#5db35c', '#7ad176'], side: '#8a6a48', deep: '#6b5a52' },
  moss: { name: '이끼 언덕', need: 1, desc: '환생 1회 · 이끼 요정 버섯 해금 · 생산 +10%', ground: ['#4fa05e', '#3f8f52', '#62b872'], side: '#5a6a48', deep: '#4a5a46' },
  crystal: { name: '수정 호수', need: 2, desc: '환생 2회 · 수정 종꽃 해금 · 생산 +10%', ground: ['#7fb8d8', '#6aa6c8', '#9acbe6'], side: '#4a6a8a', deep: '#3d5472' },
  cloud: { name: '구름바다', need: 3, desc: '환생 3회 · 구름 모란 해금 · 생산 +10%', ground: ['#f2f4ff', '#e3e8fb', '#ffffff'], side: '#c7cfee', deep: '#aab4dc' },
};

// 스킬 트리
export const BRANCHES = {
  moon: { name: '달빛 강화', sub: '클릭', color: '#ffe48a', icon: '🌙' },
  garden: { name: '정원술', sub: '생산', color: '#8fe3a0', icon: '🌿' },
  alch: { name: '연금술', sub: '조합', color: '#c59bff', icon: '⚗️' },
};
export const SKILLS = [
  { id: 'm1', br: 'moon', name: '은빛 손길', cost: 1, req: null, desc: '클릭 달빛 ×2', vis: '정원 위에 은빛 달무리 고리가 떠오른다', eff: { clickMult: 2 } },
  { id: 'm2', br: 'moon', name: '달빛 파동', cost: 1, req: 'm1', desc: '클릭 시 초당 생산량의 8% 추가', vis: '클릭마다 커다란 파동이 퍼진다', eff: { clickRatePct: 0.08 } },
  { id: 'm3', br: 'moon', name: '별빛 집중', cost: 2, req: 'm2', desc: '10% 확률로 5배 치명 채집', vis: '정원 위로 별빛 입자가 흐른다', eff: { crit: 0.1, critMult: 5 } },
  { id: 'm4', br: 'moon', name: '달무리', cost: 2, req: 'm3', desc: '밤에 클릭 달빛 ×3', vis: '하늘의 달에 커다란 후광이 생긴다', eff: { nightClick: 3 } },
  { id: 'm5', br: 'moon', name: '연속 터치', cost: 2, req: 'm4', desc: '빠른 연타 콤보로 최대 ×2.5', vis: '정원 중앙에 빛기둥이 솟는다', eff: { combo: 2.5 } },
  { id: 'm6', br: 'moon', name: '월광 폭발', cost: 3, req: 'm5', desc: '30번째 클릭마다 클릭 달빛 ×30 폭발', vis: '정원 위에 달빛 구슬이 공전한다', eff: { burst: 30 } },
  { id: 'ma', br: 'moon', name: '보름달 소환', cost: 3, req: 'm3', desc: '[액티브] 10초간 생산 ×10 (재사용 120초)', vis: '버튼 해금 · 하늘에 거대한 보름달이 뜬다', active: 'moon' },
  { id: 'g1', br: 'garden', name: '부드러운 흙', cost: 1, req: null, desc: '성장 속도 +25%', vis: '화단 가장자리에 이끼가 돋아난다', eff: { grow: 1.25 } },
  { id: 'g2', br: 'garden', name: '이슬 저장', cost: 1, req: 'g1', desc: '물 소모 -40%', vis: '정원에 이슬 반짝임이 맺힌다', eff: { water: 0.6 } },
  { id: 'g3', br: 'garden', name: '영양 순환', cost: 2, req: 'g2', desc: '영양 지속 2배 · 영양 효과 +25%', vis: '잎사귀가 은은하게 빛난다', eff: { nutDecay: 0.5, nutMult: 0.25 } },
  { id: 'g4', br: 'garden', name: '만개 축복', cost: 2, req: 'g3', desc: '개화 생산 ×1.5', vis: '꽃잎이 정원 위를 더 많이 떠다닌다', eff: { bloom: 1.5 } },
  { id: 'g5', br: 'garden', name: '뿌리 네트워크', cost: 2, req: 'g4', desc: '이웃에 개화한 식물 하나당 +4%', vis: '땅속에 빛나는 뿌리 줄기가 연결된다', eff: { synergy: 0.04 } },
  { id: 'g6', br: 'garden', name: '정원의 대가', cost: 3, req: 'g5', desc: '변이(별꽃) 확률 +5%', vis: '돌길과 작은 등불이 정원을 장식한다', eff: { shiny: 0.05 } },
  { id: 'ga', br: 'garden', name: '시간 가속', cost: 3, req: 'g3', desc: '[액티브] 15초간 시간 ×6 (재사용 180초)', vis: '버튼 해금 · 정원에 시간 파문이 번진다', active: 'accel' },
  { id: 'a1', br: 'alch', name: '숙련된 손길', cost: 1, req: null, desc: '교배 성공 확률 +15%', vis: '정원 한켠에 연금술 솥이 놓인다', eff: { alchSuccess: 0.15 } },
  { id: 'a2', br: 'alch', name: '안정화', cost: 1, req: 'a1', desc: '실패해도 비용 50% 환급', vis: '솥 옆에 물약 선반이 생긴다', eff: { refund: 0.5 } },
  { id: 'a3', br: 'alch', name: '이중 교배', cost: 2, req: 'a2', desc: '성공 시 30% 확률로 씨앗 2개', vis: '솥 주위에 쌍둥이 나선빛이 돈다', eff: { dbl: 0.3 } },
  { id: 'a4', br: 'alch', name: '변이 촉진', cost: 2, req: 'a3', desc: '하이브리드 변이 확률 +10%', vis: '솥 위로 룬 조각이 공전한다', eff: { hybridShiny: 0.1 } },
  { id: 'a5', br: 'alch', name: '정수 추출', cost: 2, req: 'a4', desc: '잡초도 달빛 생산 · 뽑으면 보상 증가', vis: '퇴비 더미가 쌓인다', eff: { weedYield: 1 } },
  { id: 'a6', br: 'alch', name: '대연금술', cost: 3, req: 'a5', desc: '알려진 레시피 100% 성공 · 하이브리드 생산 ×2', vis: '땅에 거대한 마법진이 그려진다', eff: { master: 1 } },
  { id: 'aa', br: 'alch', name: '유성우', cost: 3, req: 'a3', desc: '[액티브] 12초간 탭당 별 씨앗 (재사용 150초)', vis: '버튼 해금 · 하늘에 유성이 쏟아진다', active: 'meteor' },
];
export const SKILL_MAP = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const ACTIVES = {
  moon: { name: '보름달 소환', dur: 10, cd: 120, icon: '🌕', skill: 'ma' },
  accel: { name: '시간 가속', dur: 15, cd: 180, icon: '⏩', skill: 'ga' },
  meteor: { name: '유성우', dur: 12, cd: 150, icon: '☄️', skill: 'aa' },
};

// 화단 배치: 6x6 격자를 중심에서 가까운 순으로 해금
export const PLOT_ORDER = (() => {
  const arr = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const fx = i - 2.5, fz = j - 2.5;
    arr.push({ i, j, x: fx * 2, z: fz * 2, d: Math.hypot(fx, fz), a: Math.atan2(fz, fx) });
  }
  arr.sort((p, q) => (p.d - q.d) || (p.a - q.a));
  arr.forEach((p, idx) => { p.idx = idx; });
  return arr;
})();
export const NEIGHBORS = PLOT_ORDER.map((p) => PLOT_ORDER.filter((q) => q !== p && Math.abs(q.i - p.i) <= 1 && Math.abs(q.j - p.j) <= 1).map((q) => q.idx));
