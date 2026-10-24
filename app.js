/**
 * 貓咪補完計劃 App — 核心資料層與 Step 2 (Tab 1 圖鑑檢索 & Tab 4 資料備份)
 */

const STORAGE_KEY = 'battlecats_tracker_v1';
const STORAGE_META_KEY = 'battlecats_tracker_meta_v1';

// 稀有度順序與色票設定
const RARITY_ORDER = ['基本', 'EX', '稀有', '激稀有', '超激稀有', '傳說稀有'];
const RARITY_STYLE = {
  '基本': {
    badge: 'bg-slate-700 text-slate-200 border border-slate-600',
    pillActive: 'bg-slate-200 text-slate-950 border-white shadow-sm',
    pillInactive: 'bg-slate-900 text-slate-400 border-slate-800',
    rank: 1
  },
  'EX': {
    badge: 'bg-purple-950/90 text-purple-300 border border-purple-700/60',
    pillActive: 'bg-purple-500 text-white border-purple-400 shadow-sm shadow-purple-500/30',
    pillInactive: 'bg-slate-900 text-purple-300/70 border-slate-800',
    rank: 2
  },
  '稀有': {
    badge: 'bg-sky-950/90 text-sky-300 border border-sky-700/60',
    pillActive: 'bg-sky-500 text-slate-950 border-sky-300 shadow-sm shadow-sky-500/30',
    pillInactive: 'bg-slate-900 text-sky-300/70 border-slate-800',
    rank: 3
  },
  '激稀有': {
    badge: 'bg-amber-950/90 text-amber-300 border border-amber-700/60',
    pillActive: 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-500/30',
    pillInactive: 'bg-slate-900 text-amber-300/70 border-slate-800',
    rank: 4
  },
  '超激稀有': {
    badge: 'bg-rose-950/90 text-rose-300 border border-rose-700/60',
    pillActive: 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-500/30',
    pillInactive: 'bg-slate-900 text-rose-300/70 border-slate-800',
    rank: 5
  },
  '傳說稀有': {
    badge: 'badge-legend border border-fuchsia-400/50',
    pillActive: 'badge-legend border-white shadow-md shadow-fuchsia-500/30',
    pillInactive: 'bg-slate-900 text-fuchsia-300/80 border-slate-800',
    rank: 6
  }
};

// 58 個進化素材欄位定義 (三階 29 項 + 四階 29 項，另含三階XP / 四階XP)
const TF_MATERIAL_KEYS = [
  '三紅薄', '三綠薄', '三藍薄', '三紫薄', '三黃薄', '三彩薄',
  '三紅種', '三綠種', '三藍種', '三紫種', '三黃種', '三彩種',
  '三古薄', '三古種', '三惡薄', '三惡種', '三金薄', '三金種',
  '三紅石', '三紫石', '三翠石', '三蒼石', '三黃石', '三彩石',
  '三紅晶', '三紫晶', '三翠晶', '三蒼晶', '三黃晶'
];

const UF_MATERIAL_KEYS = [
  '四紅薄', '四綠薄', '四藍薄', '四紫薄', '四黃薄', '四彩薄',
  '四紅種', '四綠種', '四藍種', '四紫種', '四黃種', '四彩種',
  '四古薄', '四古種', '四惡薄', '四惡種', '四金薄', '四金種',
  '四紅石', '四紫石', '四翠石', '四蒼石', '四黃石', '四彩石',
  '四紅晶', '四紫晶', '四翠晶', '四蒼晶', '四黃晶'
];

// Tab 2 視覺化四大分組定義（合併對應三階 `三...` 與四階 `四...` 欄位）
const MATERIAL_CATEGORIES = [
  {
    id: 'catfruit_normal',
    title: '🌺 一般貓薄荷（紅 / 綠 / 藍 / 紫 / 黃 / 彩）',
    desc: '雙週一至週五常駐進化關卡、貓薄荷挑戰',
    items: [
      { baseKey: '紅薄', name: '紅色貓薄荷', short: '紅薄', colorCls: 'bg-rose-950/90 border-rose-600/60 text-rose-200', dot: '🔴' },
      { baseKey: '綠薄', name: '綠色貓薄荷', short: '綠薄', colorCls: 'bg-emerald-950/90 border-emerald-600/60 text-emerald-200', dot: '🟢' },
      { baseKey: '藍薄', name: '藍色貓薄荷', short: '藍薄', colorCls: 'bg-sky-950/90 border-sky-600/60 text-sky-200', dot: '🔵' },
      { baseKey: '紫薄', name: '紫色貓薄荷', short: '紫薄', colorCls: 'bg-purple-950/90 border-purple-600/60 text-purple-200', dot: '🟣' },
      { baseKey: '黃薄', name: '黃色貓薄荷', short: '黃薄', colorCls: 'bg-amber-950/90 border-amber-500/60 text-amber-200', dot: '🟡' },
      { baseKey: '彩薄', name: '彩虹貓薄荷', short: '彩薄', colorCls: 'bg-fuchsia-950/90 border-fuchsia-500/70 text-fuchsia-100', dot: '🌈' }
    ]
  },
  {
    id: 'catfruit_seed',
    title: '🌱 一般貓薄荷種子（紅 / 綠 / 藍 / 紫 / 黃 / 彩）',
    desc: '初級／中級進化關卡或彩虹薄荷關卡掉落',
    items: [
      { baseKey: '紅種', name: '紅貓薄荷種子', short: '紅種', colorCls: 'bg-rose-950/60 border-rose-800/60 text-rose-300', dot: '🌰' },
      { baseKey: '綠種', name: '綠貓薄荷種子', short: '綠種', colorCls: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300', dot: '🌿' },
      { baseKey: '藍種', name: '藍貓薄荷種子', short: '藍種', colorCls: 'bg-sky-950/60 border-sky-800/60 text-sky-300', dot: '💧' },
      { baseKey: '紫種', name: '紫貓薄荷種子', short: '紫種', colorCls: 'bg-purple-950/60 border-purple-800/60 text-purple-300', dot: '🍇' },
      { baseKey: '黃種', name: '黃貓薄荷種子', short: '黃種', colorCls: 'bg-amber-950/60 border-amber-800/60 text-amber-300', dot: '🌾' },
      { baseKey: '彩種', name: '彩虹貓薄荷種子', short: '彩種', colorCls: 'bg-fuchsia-950/70 border-fuchsia-700/60 text-fuchsia-200', dot: '✨' }
    ]
  },
  {
    id: 'catfruit_special',
    title: '🔮 特殊薄荷與種子（古代 / 惡魔 / 黃金）',
    desc: '成長的古代、成長的惡魔、黃金薄荷挑戰與貓咪神社',
    items: [
      { baseKey: '古薄', name: '古代貓薄荷', short: '古薄', colorCls: 'bg-teal-950/90 border-teal-500/70 text-teal-200', dot: '🦖' },
      { baseKey: '古種', name: '古代貓薄荷種子', short: '古種', colorCls: 'bg-teal-950/60 border-teal-700/60 text-teal-300', dot: '🦕' },
      { baseKey: '惡薄', name: '惡魔貓薄荷', short: '惡薄', colorCls: 'bg-indigo-950/90 border-indigo-500/70 text-indigo-200', dot: '😈' },
      { baseKey: '惡種', name: '惡魔貓薄荷種子', short: '惡種', colorCls: 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300', dot: '👿' },
      { baseKey: '金薄', name: '黃金貓薄荷', short: '金薄', colorCls: 'bg-yellow-950/90 border-yellow-500/80 text-yellow-200', dot: '🪙' },
      { baseKey: '金種', name: '黃金貓薄荷種子', short: '金種', colorCls: 'bg-yellow-950/60 border-yellow-700/70 text-yellow-300', dot: '⚜️' }
    ]
  },
  {
    id: 'behemoth_stones',
    title: '💎 獸石與獸結晶（紅 / 紫 / 翠 / 蒼 / 黃 / 彩）',
    desc: '發掘地圖、狩獵地圖（森林／沙漠／火山）與超獸討伐',
    items: [
      { baseKey: '紅石', name: '紅獸石', short: '紅石', colorCls: 'bg-red-950/80 border-red-600/60 text-red-200', dot: '♦️' },
      { baseKey: '紫石', name: '紫獸石', short: '紫石', colorCls: 'bg-violet-950/80 border-violet-600/60 text-violet-200', dot: '🟣' },
      { baseKey: '翠石', name: '翠獸石', short: '翠石', colorCls: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-200', dot: '🟢' },
      { baseKey: '蒼石', name: '蒼獸石', short: '蒼石', colorCls: 'bg-blue-950/80 border-blue-600/60 text-blue-200', dot: '🔵' },
      { baseKey: '黃石', name: '黃獸石', short: '黃石', colorCls: 'bg-amber-950/80 border-amber-500/60 text-amber-200', dot: '🟡' },
      { baseKey: '彩石', name: '虹獸石', short: '彩石', colorCls: 'bg-pink-950/90 border-pink-500/80 text-pink-100', dot: '🌈' },
      { baseKey: '紅晶', name: '紅獸結晶', short: '紅晶', colorCls: 'bg-red-900/80 border-red-400/80 text-red-100', dot: '💎' },
      { baseKey: '紫晶', name: '紫獸結晶', short: '紫晶', colorCls: 'bg-violet-900/80 border-violet-400/80 text-violet-100', dot: '💎' },
      { baseKey: '翠晶', name: '翠獸結晶', short: '翠晶', colorCls: 'bg-emerald-900/80 border-emerald-400/80 text-emerald-100', dot: '💎' },
      { baseKey: '蒼晶', name: '蒼獸結晶', short: '蒼晶', colorCls: 'bg-blue-900/80 border-blue-400/80 text-blue-100', dot: '💎' },
      { baseKey: '黃晶', name: '黃獸結晶', short: '黃晶', colorCls: 'bg-amber-900/80 border-amber-400/80 text-amber-100', dot: '💎' }
    ]
  }
];

// 轉蛋池 5 大群組分類規則
const POOL_GROUPS = [
  {
    key: 'regular',
    label: '🛡️ 1. 常駐系列池 (11池)',
    pools: [
      '超激烈爆彈',
      '戰國武神巴薩拉斯',
      '電腦學園銀河美少女',
      '超破壞大帝龍皇因佩拉斯',
      '超古代勇者超級靈魂勇者',
      '逆襲的戰士黑暗英雄',
      '究極降臨巨神宙斯',
      '革命軍隊鋼鐵戰團',
      '古靈精怪元素小精靈',
      '絕命美少女怪物萌娘隊',
      '傳說中的不明貓一族'
    ]
  },
  {
    key: 'fest',
    label: '👑 2. 祭典與破壞者 (10池)',
    pools: [
      '超級貓咪祭',
      '特級貓咪祭',
      '超國王祭',
      '女王祭',
      '下載紀念選拔',
      '紅色破壞者',
      '飄浮破壞者',
      '鋼鐵破壞者',
      '波動破壞者',
      '超生命體破壞者'
    ]
  },
  {
    key: 'seasonal',
    label: '🏖️ 3. 季節限定池 (9池)',
    pools: [
      '夏日美少女團 悠然海洋',
      '夏日美少女團 絢爛陽光',
      '萬聖節轉蛋',
      '聖誕美少女',
      '情人節淑女們',
      '白色情人節轉蛋',
      '復活節嘉年華',
      '完美新娘',
      '熱血！大運動會 紅隊'
    ]
  },
  {
    key: 'collab',
    label: '🤝 4. 合作限定池 Collab (22池)',
    pools: [
      '福音戰士合作轉蛋',
      '福音戰士合作轉蛋2nd',
      'Fate/stay night [HF]',
      '魔法少女小圓',
      '初音未來',
      '快打旋風V CE合作轉蛋 BLUE TEAM',
      '快打旋風V CE合作轉蛋 RED TEAM',
      '鬼滅之刃',
      '範馬刃牙',
      '音速小子',
      '神劍闖江湖－明治劍客浪漫譚－',
      '梅露可物語',
      '實況野球',
      '亂馬1/2',
      '消滅都市',
      '公主踢騎士Sweets',
      '聖魔大戰',
      '越南大戰',
      '蛋黃哥',
      '活下去！曼波魚！',
      'Crash Fever',
      '神魔之塔'
    ]
  },
  {
    key: 'other',
    label: '🎁 5. 非轉蛋 / 其他',
    pools: ['無']
  }
];

// 全域狀態
const state = {
  cats: [],               // 770 筆正規化後的貓咪物件陣列
  activeTab: 'pokedex',   // 'pokedex' | 'materials' | 'gacha' | 'backup'
  filters: {
    search: '',
    status: 'all',        // 'all' | 'unobtained' | 'pending_tf' | 'pending_uf'
    rarities: new Set(),  // 多選稀有度
    pool: 'ALL',          // 'ALL' | 'GROUP:regular' ... | 單一轉蛋池名稱
    sort: 'id_asc'        // 'id_asc' | 'id_desc' | 'rarity_desc' | 'evo_deficit'
  },
  matDashboard: {
    includeUnobtained: false, // 是否連同未獲得貓咪的進化素材一起預先統計
    stageScope: 'all',        // 'all' (三+四階合計) | 'tf' (僅三階) | 'uf' (僅四階)
    showZero: false,          // 是否顯示 0 顆的素材卡
    activeModalBaseKey: null  // 目前開啟反查 Modal 的素材 baseKey (如 '彩薄')
  },
  gachaAnalyzer: {
    groupKey: 'ALL',          // 'ALL' | 'regular' | 'fest' | 'seasonal' | 'collab' | 'other'
    sortBy: 'missing_count_desc', // 'missing_count_desc' | 'new_rate_desc' | 'uber_missing_desc' | 'completion_desc'
    onlyMissing: false        // 是否僅顯示未 100% 集滿的轉蛋池
  },
  renderLimit: 60,        // 每次渲染筆數，滑動到底自動增加
  lastSavedAt: null
};

// ============================================================================
// 1. RFC-4180 標準 CSV 解析器與序列化器 (支援雙引號內的半形逗號)
// ============================================================================
function parseCSV(csvText) {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(h => h.trim());
  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    if (line.length === 1 && line[0].trim() === '') continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = line[c] !== undefined ? line[c].trim() : '';
    }
    records.push(obj);
  }
  return { headers, records };
}

/**
 * 將原始 CSV Row 清洗並轉為結構化 Cat 物件
 * - 處理 604.1 浮點數排序與字串顯示保留
 * - 自動補齊 604.1 鯊魚VS白兔 稀有度為 '超激稀有'
 * - 拆分複數轉蛋池分類為獨立陣列 pools
 */
function normalizeCatRecord(raw) {
  const idStr = String(raw['圖鑑'] || '').trim();
  const sortId = parseFloat(idStr);
  const name = String(raw['名稱'] || '').trim();

  // 例外處理：圖鑑 604.1「鯊魚VS白兔」或任何空稀有度自動補齊為「超激稀有」
  let rarity = String(raw['稀有度'] || '').trim();
  if (!rarity || rarity === 'NaN' || idStr === '604.1') {
    rarity = '超激稀有';
  }

  // 多標籤拆分處理：依半形逗號拆分為獨立標籤陣列
  const rawPoolStr = String(raw['所屬轉蛋池分類'] || '無').trim() || '無';
  const pools = rawPoolStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (pools.length === 0) pools.push('無');

  const maxEvo = String(raw['開放進化狀態'] || '二階').trim() || '二階';
  const obtained = String(raw['獲得'] || 'No').trim() === 'Yes';
  const tfDone = String(raw['三階'] || 'No').trim() === 'Yes';
  const ufDone = String(raw['四階'] || 'No').trim() === 'Yes';
  const instinct = String(raw['本能'] || 'No').trim() === 'Yes';
  const superInstinct = String(raw['超本能'] || 'No').trim() === 'Yes';

  // 解析 56 項素材與 XP
  const matsTF = {};
  const matsUF = {};
  for (const k of TF_MATERIAL_KEYS) {
    const val = parseInt(raw[k], 10);
    if (!isNaN(val) && val > 0) matsTF[k] = val;
  }
  for (const k of UF_MATERIAL_KEYS) {
    const val = parseInt(raw[k], 10);
    if (!isNaN(val) && val > 0) matsUF[k] = val;
  }
  const tfXP = parseInt(raw['三階XP'], 10) || 0;
  const ufXP = parseInt(raw['四階XP'], 10) || 0;

  return {
    id: idStr,
    sortId: isNaN(sortId) ? 999999 : sortId,
    name,
    rarity,
    rawPoolStr,
    pools,
    maxEvo, // '二階' | '三階' | '四階'
    obtained,
    tfDone,
    ufDone,
    instinct,
    superInstinct,
    matsTF,
    matsUF,
    tfXP,
    ufXP,
    _raw: { ...raw, '稀有度': rarity }
  };
}

/**
 * 將 Cat 物件轉回 70 欄標準 CSV 行陣列
 */
function serializeCatsToCSV(cats) {
  const headers = window.CSV_HEADERS || [
    '名稱','三古種','三古薄','三彩石','三彩種','三彩薄','三惡種','三惡薄','三紅晶','三紅石','三紅種','三紅薄','三紫晶','三紫石','三紫種','三紫薄','三綠種','三綠薄','三翠晶','三翠石','三蒼晶','三蒼石','三藍種','三藍薄','三金種','三金薄','三階','三階XP','三黃晶','三黃石','三黃種','三黃薄','四古種','四古薄','四彩石','四彩種','四彩薄','四惡種','四惡薄','四紅晶','四紅石','四紅種','四紅薄','四紫晶','四紫石','四紫種','四紫薄','四綠種','四綠薄','四翠晶','四翠石','四蒼晶','四蒼石','四藍種','四藍薄','四金種','四金薄','四階','四階XP','四黃晶','四黃石','四黃種','四黃薄','圖鑑','所屬轉蛋池分類','本能','獲得','稀有度','超本能','開放進化狀態'
  ];

  const escapeCSVField = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escapeCSVField).join(',')];

  for (const cat of cats) {
    const rowObj = { ...(cat._raw || {}) };
    rowObj['圖鑑'] = cat.id;
    rowObj['名稱'] = cat.name;
    rowObj['稀有度'] = cat.rarity;
    rowObj['所屬轉蛋池分類'] = cat.rawPoolStr;
    rowObj['開放進化狀態'] = cat.maxEvo;
    rowObj['獲得'] = cat.obtained ? 'Yes' : 'No';
    rowObj['三階'] = cat.tfDone ? 'Yes' : 'No';
    rowObj['四階'] = cat.ufDone ? 'Yes' : 'No';
    rowObj['本能'] = cat.instinct ? 'Yes' : 'No';
    rowObj['超本能'] = cat.superInstinct ? 'Yes' : 'No';

    for (const k of TF_MATERIAL_KEYS) {
      rowObj[k] = cat.matsTF[k] !== undefined ? String(cat.matsTF[k]) : (rowObj[k] || '0');
    }
    for (const k of UF_MATERIAL_KEYS) {
      rowObj[k] = cat.matsUF[k] !== undefined ? String(cat.matsUF[k]) : (rowObj[k] || '0');
    }

    const line = headers.map(h => escapeCSVField(rowObj[h] ?? '')).join(',');
    lines.push(line);
  }

  return '\uFEFF' + lines.join('\r\n');
}

// ============================================================================
// 2. 資料初始化與 LocalStorage 同步機制
// ============================================================================
function initDatabase() {
  const { records } = parseCSV(window.RAW_CSV_TEXT || '');
  const baseCats = records.map(normalizeCatRecord);

  // 讀取 LocalStorage 的使用者覆寫狀態
  try {
    const savedJson = localStorage.getItem(STORAGE_KEY);
    const metaJson = localStorage.getItem(STORAGE_META_KEY);
    if (metaJson) {
      const meta = JSON.parse(metaJson);
      state.lastSavedAt = meta.lastSavedAt || null;
    }

    if (savedJson) {
      const savedData = JSON.parse(savedJson);
      // 若儲存的是完整陣列或狀態字典
      if (Array.isArray(savedData) && savedData.length > 0) {
        state.cats = savedData.map(item => {
          // 相容直接存 raw 或已經 normalize 的結構
          if (item.id && item.pools) return item;
          return normalizeCatRecord(item);
        });
      } else if (savedData && typeof savedData === 'object') {
        // 合併狀態字典
        for (const cat of baseCats) {
          const userState = savedData[cat.id];
          if (userState) {
            cat.obtained = Boolean(userState.obtained);
            cat.tfDone = Boolean(userState.tfDone);
            cat.ufDone = Boolean(userState.ufDone);
            cat.instinct = Boolean(userState.instinct);
            cat.superInstinct = Boolean(userState.superInstinct);
          }
        }
        state.cats = baseCats;
      }
      document.getElementById('dirty-indicator')?.classList.remove('hidden');
    } else {
      state.cats = baseCats;
    }
  } catch (err) {
    console.error('讀取 LocalStorage 失敗，使用預設 CSV 資料:', err);
    state.cats = baseCats;
  }

  // 預設依圖鑑數值大小排序 (保留 604.1 小數點且正確排在 604 與 605 之間)
  state.cats.sort((a, b) => a.sortId - b.sortId);
}

function saveToLocalStorage(toastMsg) {
  try {
    // 儲存完整貓咪清單（包含可能透過匯入新增的貓咪與所有最新勾選狀態）
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cats));
    const nowStr = new Date().toLocaleString('zh-TW', { hour12: false });
    state.lastSavedAt = nowStr;
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ lastSavedAt: nowStr }));
    document.getElementById('dirty-indicator')?.classList.remove('hidden');
    if (toastMsg) showToast(toastMsg);
  } catch (err) {
    console.error('寫入 LocalStorage 失敗:', err);
    showToast('⚠️ 儲存失敗：瀏覽器私密模式或空間不足');
  }
}

// ============================================================================
// 3. 條件判定輔助函式 (待升三階 / 待升四階)
// ============================================================================
function hasTFOpen(cat) {
  return cat.maxEvo === '三階' || cat.maxEvo === '四階';
}

function hasUFOpen(cat) {
  return cat.maxEvo === '四階';
}

function isPendingTF(cat) {
  return cat.obtained && hasTFOpen(cat) && !cat.tfDone;
}

function isPendingUF(cat) {
  return cat.obtained && hasUFOpen(cat) && !cat.ufDone;
}

// ============================================================================
// 4. 一鍵狀態切換與自動連動邏輯 (核心需求)
// ============================================================================
function toggleCatStatus(catId, field) {
  const cat = state.cats.find(c => c.id === catId);
  if (!cat) return;

  let actionSummary = '';

  if (field === 'obtained') {
    cat.obtained = !cat.obtained;
    actionSummary = `${cat.name}：${cat.obtained ? '已獲得 ✓' : '標記為未獲得'}`;
  } else if (field === 'tfDone') {
    if (!hasTFOpen(cat)) return;
    cat.tfDone = !cat.tfDone;
    if (cat.tfDone) {
      // 勾選 [三階] 時自動把 [已獲得] 設為 Yes
      cat.obtained = true;
      actionSummary = `${cat.name}：已升三階 ✓（自動連動已獲得）`;
    } else {
      // 取消 [三階] 時，若原本有勾 [四階] 也一併取消，避免邏輯矛盾
      if (cat.ufDone) cat.ufDone = false;
      actionSummary = `${cat.name}：取消三階狀態`;
    }
  } else if (field === 'ufDone') {
    if (!hasUFOpen(cat)) return;
    cat.ufDone = !cat.ufDone;
    if (cat.ufDone) {
      // 使用者指定需求：勾選 [四階] 時自動把 [已獲得] 與 [三階] 設為 Yes
      cat.obtained = true;
      cat.tfDone = true;
      actionSummary = `${cat.name}：已升四階 ✓（自動連動已獲得＋三階）`;
    } else {
      actionSummary = `${cat.name}：取消四階狀態`;
    }
  } else if (field === 'instinct') {
    cat.instinct = !cat.instinct;
    if (cat.instinct) {
      cat.obtained = true;
    } else {
      cat.superInstinct = false;
    }
    actionSummary = `${cat.name}：本能${cat.instinct ? '解放 ✓' : '取消'}`;
  } else if (field === 'superInstinct') {
    cat.superInstinct = !cat.superInstinct;
    if (cat.superInstinct) {
      cat.obtained = true;
      cat.instinct = true;
    }
    actionSummary = `${cat.name}：超本能${cat.superInstinct ? '解放 ✓' : '取消'}`;
  }

  saveToLocalStorage(actionSummary);
  updateGlobalCounters();
  renderMaterialDashboard();
  renderGachaDashboard();
  if (state.matDashboard.activeModalBaseKey) {
    openMaterialReverseModal(state.matDashboard.activeModalBaseKey);
  }
  // 只重繪該張卡片或目前列表，保持捲動位置不跳動
  const cardEl = document.querySelector(`[data-cat-card="${CSS.escape(catId)}"]`);
  if (cardEl && state.filters.status === 'all') {
    cardEl.outerHTML = renderCatCardHTML(cat);
  } else {
    renderCatList(false);
  }
}

// ============================================================================
// 5. UI 渲染：篩選器、計數器與貓咪卡片列表
// ============================================================================
function buildFilterControls() {
  // 1. 建立稀有度多選膠囊
  const rarityContainer = document.getElementById('rarity-pills-container');
  const rarityCounts = {};
  for (const r of RARITY_ORDER) rarityCounts[r] = 0;
  for (const c of state.cats) {
    rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
  }

  rarityContainer.innerHTML = RARITY_ORDER.map(rarity => {
    const isActive = state.filters.rarities.has(rarity);
    const st = RARITY_STYLE[rarity] || RARITY_STYLE['基本'];
    const cls = isActive ? st.pillActive : st.pillInactive;
    return `
      <button
        type="button"
        data-rarity="${rarity}"
        class="rarity-pill shrink-0 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition flex items-center gap-1.5 ${cls}"
      >
        <span>${rarity}</span>
        <span class="text-[10px] opacity-80 font-mono">${rarityCounts[rarity] || 0}</span>
      </button>
    `;
  }).join('');

  document.getElementById('clear-rarity-btn').classList.toggle('hidden', state.filters.rarities.size === 0);

  // 2. 建立轉蛋池二階層分類選單
  const poolSelect = document.getElementById('pool-select');
  const currentVal = state.filters.pool;

  // 統計各池貓咪數量 (使用 includes 比對獨立標籤陣列)
  const poolCounts = {};
  for (const c of state.cats) {
    for (const p of c.pools) {
      poolCounts[p] = (poolCounts[p] || 0) + 1;
    }
  }

  let optionsHTML = `<option value="ALL">🎰 全部轉蛋池分類 (${state.cats.length})</option>`;
  for (const group of POOL_GROUPS) {
    // 計算該群組涵蓋的不重複貓咪數
    const groupCatCount = state.cats.filter(c => c.pools.some(p => group.pools.includes(p))).length;
    optionsHTML += `<optgroup label="${group.label}">`;
    optionsHTML += `<option value="GROUP:${group.key}">📂 篩選整個【${group.label.replace(/^[^\s]+\s\d+\.\s/, '')}】群組 (${groupCatCount})</option>`;
    for (const poolName of group.pools) {
      const cnt = poolCounts[poolName] || 0;
      optionsHTML += `<option value="${poolName}">　├ ${poolName} (${cnt})</option>`;
    }
    optionsHTML += `</optgroup>`;
  }

  poolSelect.innerHTML = optionsHTML;
  poolSelect.value = currentVal;
}

function updateGlobalCounters() {
  const total = state.cats.length;
  let obtainedCount = 0;
  let unobtainedCount = 0;
  let pendingTFCount = 0;
  let pendingUFCount = 0;
  let totalTFOpen = 0;
  let totalTFDone = 0;
  let totalUFOpen = 0;
  let totalUFDone = 0;

  for (const c of state.cats) {
    if (c.obtained) obtainedCount++;
    else unobtainedCount++;

    if (hasTFOpen(c)) {
      totalTFOpen++;
      if (c.tfDone) totalTFDone++;
      else if (c.obtained) pendingTFCount++;
    }
    if (hasUFOpen(c)) {
      totalUFOpen++;
      if (c.ufDone) totalUFDone++;
      else if (c.obtained) pendingUFCount++;
    }
  }

  const rate = total > 0 ? ((obtainedCount / total) * 100).toFixed(1) : '0.0';
  document.getElementById('header-obtain-rate').textContent = `${rate}%`;
  document.getElementById('global-summary-text').textContent =
    `已獲 ${obtainedCount}/${total} ‧ 待三階 ${pendingTFCount} ‧ 待四階 ${pendingUFCount}`;

  // 更新快篩按鈕上的即時數字
  document.getElementById('count-status-all').textContent = total;
  document.getElementById('count-status-unobtained').textContent = unobtainedCount;
  document.getElementById('count-status-tf').textContent = pendingTFCount;
  document.getElementById('count-status-uf').textContent = pendingUFCount;

  // 更新快篩按鈕高亮樣式
  document.querySelectorAll('#status-filter-group .status-pill').forEach(btn => {
    const st = btn.getAttribute('data-status');
    const active = st === state.filters.status;
    btn.className = `status-pill btn-touch rounded-xl text-xs font-bold px-2 py-2 border transition flex flex-col items-center justify-center ${
      active
        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
    }`;
  });

  // 更新底部導覽尚缺素材徽章 (待升三階 + 待升四階總隻數)
  const navBadge = document.getElementById('nav-badge-materials');
  const totalPendingEvo = pendingTFCount + pendingUFCount;
  if (navBadge) {
    navBadge.textContent = totalPendingEvo;
    navBadge.classList.toggle('hidden', totalPendingEvo === 0);
  }

  // 更新 Tab 4 備份頁統計
  document.getElementById('backup-stat-total').textContent = total;
  document.getElementById('backup-stat-obtained').textContent = `${obtainedCount} / ${unobtainedCount}`;
  document.getElementById('backup-stat-tf').textContent = `${totalTFDone} / ${totalTFOpen}`;
  document.getElementById('backup-stat-uf').textContent = `${totalUFDone} / ${totalUFOpen}`;
  const lastSavedEl = document.getElementById('last-saved-time');
  if (lastSavedEl) {
    lastSavedEl.textContent = state.lastSavedAt
      ? `最後儲存於手機：${state.lastSavedAt}`
      : '最後修改時間：尚未修改（使用內建初始資料）';
  }
}

function getFilteredCats() {
  const q = state.filters.search.trim().toLowerCase();
  const status = state.filters.status;
  const rarities = state.filters.rarities;
  const poolFilter = state.filters.pool;

  let groupPoolsSet = null;
  if (poolFilter.startsWith('GROUP:')) {
    const groupKey = poolFilter.replace('GROUP:', '');
    const grp = POOL_GROUPS.find(g => g.key === groupKey);
    if (grp) groupPoolsSet = new Set(grp.pools);
  }

  const filtered = state.cats.filter(cat => {
    // 1. 關鍵字搜尋 (名稱或圖鑑編號，支援 604.1)
    if (q) {
      const matchId = cat.id.toLowerCase().includes(q);
      const matchName = cat.name.toLowerCase().includes(q);
      if (!matchId && !matchName) return false;
    }

    // 2. 補完狀態快篩
    if (status === 'unobtained' && cat.obtained) return false;
    if (status === 'pending_tf' && !isPendingTF(cat)) return false;
    if (status === 'pending_uf' && !isPendingUF(cat)) return false;

    // 3. 稀有度多選交集
    if (rarities.size > 0 && !rarities.has(cat.rarity)) return false;

    // 4. 轉蛋池分類 (使用 includes 比對拆分後的獨立標籤陣列)
    if (poolFilter !== 'ALL') {
      if (groupPoolsSet) {
        if (!cat.pools.some(p => groupPoolsSet.has(p))) return false;
      } else {
        if (!cat.pools.includes(poolFilter)) return false;
      }
    }

    return true;
  });

  // 排序邏輯
  const sortMode = state.filters.sort;
  filtered.sort((a, b) => {
    if (sortMode === 'id_desc') return b.sortId - a.sortId;
    if (sortMode === 'rarity_desc') {
      const rDiff = (RARITY_STYLE[b.rarity]?.rank || 0) - (RARITY_STYLE[a.rarity]?.rank || 0);
      return rDiff !== 0 ? rDiff : a.sortId - b.sortId;
    }
    if (sortMode === 'evo_deficit') {
      const score = (c) => (isPendingUF(c) ? 3 : isPendingTF(c) ? 2 : !c.obtained ? 1 : 0);
      const sDiff = score(b) - score(a);
      return sDiff !== 0 ? sDiff : a.sortId - b.sortId;
    }
    return a.sortId - b.sortId;
  });

  return filtered;
}

function formatMaterialPreview(cat) {
  const pills = [];
  if (hasTFOpen(cat) && !cat.tfDone) {
    for (const [k, v] of Object.entries(cat.matsTF)) {
      pills.push(`<span class="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-700/50 text-emerald-300 text-[11px] font-mono">${k.slice(1)}×${v}</span>`);
    }
  }
  if (hasUFOpen(cat) && !cat.ufDone) {
    for (const [k, v] of Object.entries(cat.matsUF)) {
      pills.push(`<span class="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-700/50 text-sky-300 text-[11px] font-mono">${k.slice(1)}×${v}</span>`);
    }
  }
  if (pills.length === 0) return '';
  return `
    <div class="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
      <span class="text-[11px] text-amber-400 font-bold">🧪 尚缺進化素材：</span>
      ${pills.join('')}
    </div>
  `;
}

function renderCatCardHTML(cat) {
  const rarityStyle = RARITY_STYLE[cat.rarity]?.badge || RARITY_STYLE['基本'].badge;
  const tfOpen = hasTFOpen(cat);
  const ufOpen = hasUFOpen(cat);

  // 開放進化階段標籤色
  const maxEvoBadge =
    cat.maxEvo === '四階'
      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40'
      : cat.maxEvo === '三階'
      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
      : 'bg-slate-800 text-slate-400 border border-slate-700';

  // 轉蛋池多標籤渲染
  const poolBadges = cat.pools
    .map(p => `<span class="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300">🏷️ ${p}</span>`)
    .join('');

  // 四大狀態切換按鈕樣式
  const btnObtainedCls = cat.obtained
    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold shadow-inner'
    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700';

  const btnTFCls = !tfOpen
    ? 'bg-slate-950/40 border-slate-900 text-slate-700 cursor-not-allowed opacity-50'
    : cat.tfDone
    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-extrabold shadow-inner'
    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-emerald-700';

  const btnUFCls = !ufOpen
    ? 'bg-slate-950/40 border-slate-900 text-slate-700 cursor-not-allowed opacity-50'
    : cat.ufDone
    ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-extrabold shadow-inner'
    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-sky-700';

  const btnInstinctCls = cat.instinct
    ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-extrabold shadow-inner'
    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-fuchsia-800';

  return `
    <article
      data-cat-card="${cat.id}"
      class="bg-slate-900/95 border ${!cat.obtained ? 'border-rose-900/50' : 'border-slate-800'} rounded-2xl p-3 shadow-md transition"
    >
      <!-- 卡片頂部：編號、名稱、稀有度、最高開放階數 -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs font-extrabold text-amber-400">
            #${cat.id}
          </span>
          <h3 class="text-base font-extrabold text-white tracking-tight">${cat.name}</h3>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold ${rarityStyle}">${cat.rarity}</span>
          <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold ${maxEvoBadge}">最高${cat.maxEvo}</span>
        </div>
      </div>

      <!-- 轉蛋池標籤列 -->
      <div class="flex flex-wrap gap-1.5 mt-2">
        ${poolBadges}
      </div>

      <!-- 一鍵打卡按鈕列 (最小高度 44px 符合 iOS 觸控規範) -->
      <div class="grid grid-cols-4 gap-1.5 mt-2.5">
        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="obtained"
          class="btn-touch rounded-xl border text-xs flex items-center justify-center gap-1 transition ${btnObtainedCls}"
        >
          <span>${cat.obtained ? '✓' : '○'}</span>
          <span>已獲得</span>
        </button>

        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="tfDone"
          ${!tfOpen ? 'disabled' : ''}
          class="btn-touch rounded-xl border text-xs flex items-center justify-center gap-1 transition ${btnTFCls}"
        >
          <span>${!tfOpen ? '—' : cat.tfDone ? '✓' : '⏳'}</span>
          <span>三階</span>
        </button>

        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="ufDone"
          ${!ufOpen ? 'disabled' : ''}
          class="btn-touch rounded-xl border text-xs flex items-center justify-center gap-1 transition ${btnUFCls}"
        >
          <span>${!ufOpen ? '—' : cat.ufDone ? '✓' : '⏳'}</span>
          <span>四階</span>
        </button>

        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="instinct"
          class="btn-touch rounded-xl border text-xs flex items-center justify-center gap-1 transition ${btnInstinctCls}"
        >
          <span>${cat.instinct ? '✓' : '○'}</span>
          <span>本能</span>
        </button>
      </div>

      <!-- 若該貓處於未完成三階/四階，直接顯示所需素材微預覽 -->
      ${formatMaterialPreview(cat)}
    </article>
  `;
}

function renderCatList(resetLimit = true) {
  if (resetLimit) state.renderLimit = 60;

  const filtered = getFilteredCats();
  document.getElementById('filtered-count').textContent = filtered.length;

  const listEl = document.getElementById('cat-list-container');
  const sentinelEl = document.getElementById('load-more-sentinel');

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
        <div class="text-3xl">😿</div>
        <div class="text-sm font-bold text-slate-300">找不到符合篩選條件的貓咪</div>
        <p class="text-xs text-slate-500">試著清除搜尋字詞或切換上方的稀有度／轉蛋池篩選器。</p>
      </div>
    `;
    sentinelEl.classList.add('hidden');
    return;
  }

  const visibleCats = filtered.slice(0, state.renderLimit);
  listEl.innerHTML = visibleCats.map(renderCatCardHTML).join('');

  if (filtered.length > state.renderLimit) {
    sentinelEl.classList.remove('hidden');
    const remain = filtered.length - state.renderLimit;
    document.getElementById('load-more-btn').textContent = `載入更多貓咪（還有 ${remain} 隻）...`;
  } else {
    sentinelEl.classList.add('hidden');
  }
}

// ============================================================================
// 5B. TAB 2: 尚缺進化素材結算儀表板 & 反向查詢 Modal
// ============================================================================
function computeMaterialDeficits() {
  const includeUnobtained = state.matDashboard.includeUnobtained;
  const scope = state.matDashboard.stageScope; // 'all' | 'tf' | 'uf'

  // 統計每種 baseKey ('紅薄', '彩石'...) 的 { tfCount, ufCount, total, cats: [{cat, stage, amount}] }
  const statsMap = {};
  for (const catGroup of MATERIAL_CATEGORIES) {
    for (const item of catGroup.items) {
      statsMap[item.baseKey] = {
        ...item,
        tfTotal: 0,
        ufTotal: 0,
        total: 0,
        usages: [] // { cat, stage: '三階'|'四階', amount }
      };
    }
  }

  let targetTFCount = 0;
  let targetUFCount = 0;
  let unobtainedEvoCatsCount = 0;

  for (const cat of state.cats) {
    const needTF = hasTFOpen(cat) && !cat.tfDone;
    const needUF = hasUFOpen(cat) && !cat.ufDone;

    if (!cat.obtained && (needTF || needUF)) {
      unobtainedEvoCatsCount++;
    }

    if (!cat.obtained && !includeUnobtained) continue;

    // 結算三階素材 (嚴格依開放進化狀態為三階/四階且三階==='No')
    if (needTF && (scope === 'all' || scope === 'tf')) {
      targetTFCount++;
      for (const [k, qty] of Object.entries(cat.matsTF)) {
        const baseKey = k.slice(1); // '三紅薄' -> '紅薄'
        if (statsMap[baseKey] && qty > 0) {
          statsMap[baseKey].tfTotal += qty;
          statsMap[baseKey].total += qty;
          statsMap[baseKey].usages.push({ cat, stage: '三階', amount: qty });
        }
      }
    }

    // 結算四階素材 (嚴格依開放進化狀態為四階且四階==='No')
    if (needUF && (scope === 'all' || scope === 'uf')) {
      targetUFCount++;
      for (const [k, qty] of Object.entries(cat.matsUF)) {
        const baseKey = k.slice(1); // '四蒼晶' -> '蒼晶'
        if (statsMap[baseKey] && qty > 0) {
          statsMap[baseKey].ufTotal += qty;
          statsMap[baseKey].total += qty;
          statsMap[baseKey].usages.push({ cat, stage: '四階', amount: qty });
        }
      }
    }
  }

  return { statsMap, targetTFCount, targetUFCount, unobtainedEvoCatsCount };
}

function renderMaterialDashboard() {
  const container = document.getElementById('material-groups-container');
  if (!container) return;

  const { statsMap, targetTFCount, targetUFCount, unobtainedEvoCatsCount } = computeMaterialDeficits();
  const showZero = state.matDashboard.showZero;

  // 更新頂部提示與總顆數
  const grandTotal = Object.values(statsMap).reduce((acc, s) => acc + s.total, 0);
  document.getElementById('mat-total-pieces').textContent = grandTotal;
  document.getElementById('unobtained-evo-count-hint').textContent = `(未獲得待進化 +${unobtainedEvoCatsCount}隻)`;
  document.getElementById('mat-dashboard-subtitle').textContent =
    `目前納入結算：待升三階 ${targetTFCount} 隻 ‧ 待升四階 ${targetUFCount} 隻`;

  // 更新階段範圍按鈕高亮
  document.querySelectorAll('#mat-stage-scope-group .mat-scope-btn').forEach(btn => {
    const sc = btn.getAttribute('data-scope');
    const active = sc === state.matDashboard.stageScope;
    btn.className = `mat-scope-btn px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
      active ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
    }`;
  });

  // 渲染四大分類卡片群組
  const groupsHTML = MATERIAL_CATEGORIES.map(group => {
    const visibleItems = group.items
      .map(item => statsMap[item.baseKey])
      .filter(st => showZero || st.total > 0);

    const groupSum = group.items.reduce((s, it) => s + statsMap[it.baseKey].total, 0);

    if (visibleItems.length === 0) {
      return `
        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-300">${group.title}</h3>
            <p class="text-[11px] text-slate-500">${group.desc}</p>
          </div>
          <span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            ✓ 全數不缺 (0)
          </span>
        </div>
      `;
    }

    const cardsHTML = visibleItems.map(st => {
      const isZero = st.total === 0;
      const stageBreakdown = [];
      if (st.tfTotal > 0) stageBreakdown.push(`三階:${st.tfTotal}`);
      if (st.ufTotal > 0) stageBreakdown.push(`四階:${st.ufTotal}`);

      return `
        <button
          type="button"
          data-mat-key="${st.baseKey}"
          class="mat-card-btn text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
            isZero
              ? 'bg-slate-950/50 border-slate-800/60 text-slate-600 opacity-60'
              : `${st.colorCls} hover:scale-[1.01] active:scale-[0.99] shadow-md`
          }"
        >
          <div class="flex items-center justify-between gap-1 w-full">
            <span class="text-xs font-extrabold flex items-center gap-1 truncate">
              <span>${st.dot}</span>
              <span>${st.name}</span>
            </span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono shrink-0">
              ${st.usages.length}隻需用
            </span>
          </div>

          <div class="mt-2 flex items-baseline justify-between w-full">
            <div class="text-2xl font-black font-mono tracking-tight">
              ×${st.total}
            </div>
            <div class="text-[10px] opacity-85 font-mono">
              ${stageBreakdown.join(' / ') || '不缺'}
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-extrabold text-white">${group.title}</h3>
            <p class="text-[11px] text-slate-400">${group.desc}</p>
          </div>
          <span class="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 text-xs font-mono font-bold shrink-0">
            小計 ${groupSum} 顆
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${cardsHTML}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = groupsHTML;
}

function openMaterialReverseModal(baseKey) {
  const { statsMap } = computeMaterialDeficits();
  const st = statsMap[baseKey];
  if (!st) return;

  state.matDashboard.activeModalBaseKey = baseKey;
  const backdrop = document.getElementById('material-modal-backdrop');
  const titleEl = document.getElementById('modal-mat-title');
  const subEl = document.getElementById('modal-mat-subtitle');
  const badgeEl = document.getElementById('modal-mat-badge');
  const listEl = document.getElementById('modal-mat-cat-list');

  badgeEl.textContent = st.dot;
  titleEl.textContent = `${st.name}（尚缺 ×${st.total}）`;
  subEl.textContent = `共 ${st.usages.length} 筆進化需求（點擊右側按鈕可直接打卡完成進化並扣除素材）`;

  if (st.usages.length === 0) {
    listEl.innerHTML = `
      <div class="p-6 text-center text-slate-400 text-xs">
        🎉 太棒了！目前沒有任何待進化的貓咪需要【${st.name}】。
      </div>
    `;
  } else {
    listEl.innerHTML = st.usages.map(({ cat, stage, amount }) => {
      const rarityBadge = RARITY_STYLE[cat.rarity]?.badge || '';
      const field = stage === '四階' ? 'ufDone' : 'tfDone';
      return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-mono text-xs font-bold text-amber-400">#${cat.id}</span>
              <span class="text-sm font-extrabold text-white truncate">${cat.name}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${rarityBadge}">${cat.rarity}</span>
              ${!cat.obtained ? '<span class="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50 text-[10px] font-bold">未獲得</span>' : ''}
            </div>
            <div class="text-xs text-slate-400 flex items-center gap-2">
              <span>升${stage}需求：<strong class="text-amber-300 font-mono">${st.name} ×${amount}</strong></span>
            </div>
          </div>

          <button
            type="button"
            data-modal-toggle-id="${cat.id}"
            data-modal-toggle-field="${field}"
            class="btn-touch px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-extrabold shrink-0 transition"
          >
            ✓ 完成${stage}
          </button>
        </div>
      `;
    }).join('');
  }

  backdrop.classList.remove('hidden');
}

function closeMaterialReverseModal() {
  state.matDashboard.activeModalBaseKey = null;
  document.getElementById('material-modal-backdrop')?.classList.add('hidden');
}

// ============================================================================
// 5C. TAB 3: 轉蛋池補完率與抽卡建議 (Gacha Pool Analyzer)
// ============================================================================
function renderGachaDashboard() {
  const container = document.getElementById('gacha-pools-container');
  if (!container) return;

  // 建立 53 個轉蛋池的詳細分析數據
  const poolStats = [];
  for (const group of POOL_GROUPS) {
    for (const poolName of group.pools) {
      const catsInPool = state.cats.filter(c => c.pools.includes(poolName));
      const total = catsInPool.length;
      if (total === 0) continue;

      const obtainedCats = catsInPool.filter(c => c.obtained);
      const missingCats = catsInPool.filter(c => !c.obtained);
      const missingUberOrLegend = missingCats.filter(c => c.rarity === '超激稀有' || c.rarity === '傳說稀有');

      const obtainedCount = obtainedCats.length;
      const missingCount = missingCats.length;
      const completionRate = (obtainedCount / total) * 100;
      const newRate = (missingCount / total) * 100;

      poolStats.push({
        poolName,
        groupKey: group.key,
        groupLabel: group.label.replace(/^[^\s]+\s\d+\.\s/, ''),
        total,
        obtainedCount,
        missingCount,
        missingUberCount: missingUberOrLegend.length,
        completionRate,
        newRate,
        missingCats
      });
    }
  }

  // 統計未集滿的轉蛋池數量 (扣除 '無')
  const gachaOnlyPools = poolStats.filter(p => p.poolName !== '無');
  const incompleteGachaPools = gachaOnlyPools.filter(p => p.missingCount > 0);
  const incEl = document.getElementById('gacha-incomplete-pools-count');
  if (incEl) {
    incEl.textContent = `${incompleteGachaPools.length} / ${gachaOnlyPools.length}`;
  }

  // 更新群組膠囊高亮
  document.querySelectorAll('#gacha-group-pills .gacha-grp-pill').forEach(btn => {
    const gk = btn.getAttribute('data-gacha-group');
    const active = gk === state.gachaAnalyzer.groupKey;
    btn.className = `gacha-grp-pill px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 transition ${
      active
        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
    }`;
  });

  // 篩選與排序
  let filteredPools = poolStats.filter(p => {
    if (state.gachaAnalyzer.groupKey !== 'ALL' && p.groupKey !== state.gachaAnalyzer.groupKey) return false;
    if (state.gachaAnalyzer.onlyMissing && p.missingCount === 0) return false;
    return true;
  });

  const sortBy = state.gachaAnalyzer.sortBy;
  filteredPools.sort((a, b) => {
    if (sortBy === 'missing_count_desc') {
      return b.missingCount - a.missingCount || b.newRate - a.newRate;
    }
    if (sortBy === 'new_rate_desc') {
      return b.newRate - a.newRate || b.missingCount - a.missingCount;
    }
    if (sortBy === 'uber_missing_desc') {
      return b.missingUberCount - a.missingUberCount || b.missingCount - a.missingCount;
    }
    if (sortBy === 'completion_desc') {
      return b.completionRate - a.completionRate || b.total - a.total;
    }
    return 0;
  });

  if (filteredPools.length === 0) {
    container.innerHTML = `
      <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
        <div class="text-3xl">🎉</div>
        <div class="text-sm font-bold text-slate-200">此分類下的轉蛋池已 100% 全部集滿！</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredPools.map(p => {
    const isComplete = p.missingCount === 0;
    const barColor = isComplete
      ? 'bg-emerald-500'
      : p.newRate >= 35
      ? 'bg-rose-500'
      : p.newRate >= 15
      ? 'bg-amber-500'
      : 'bg-sky-500';

    // 抽卡建議標籤
    let adviceBadge = '';
    if (isComplete) {
      adviceBadge = `<span class="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">🏆 已全齊制霸</span>`;
    } else if (p.newRate >= 40 || p.missingCount >= 4) {
      adviceBadge = `<span class="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[11px] font-extrabold">🔥 必中11連極推 (New ${p.newRate.toFixed(1)}%)</span>`;
    } else {
      adviceBadge = `<span class="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold">🎯 缺 ${p.missingCount} 隻 (New ${p.newRate.toFixed(1)}%)</span>`;
    }

    // 缺漏貓咪名單膠囊（點擊可直接跳轉圖鑑或直接打卡獲得）
    const missingBadgesHTML = isComplete
      ? `<div class="text-xs text-emerald-400/90 font-semibold">✨ 此池全數貓咪皆已入手！</div>`
      : `
        <div class="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div class="text-[11px] text-slate-400 flex items-center justify-between">
            <span>缺漏貓咪名單（點擊可直接標記為「已獲得 ✓」）：</span>
            <button type="button" data-jump-pool="${p.poolName}" class="text-amber-400 hover:underline font-bold">
              於圖鑑檢視此池 →
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${p.missingCats.map(mc => {
              const rBadge = RARITY_STYLE[mc.rarity]?.badge || '';
              return `
                <button
                  type="button"
                  data-quick-obtain-id="${mc.id}"
                  class="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-rose-500/40 text-xs flex items-center gap-1.5 transition"
                >
                  <span class="font-mono text-[11px] text-amber-400 font-bold">#${mc.id}</span>
                  <span class="font-bold text-white">${mc.name}</span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] ${rBadge}">${mc.rarity}</span>
                  <span class="text-emerald-400 font-bold text-[11px] ml-0.5">+入手</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

    return `
      <article class="bg-slate-900/95 border ${isComplete ? 'border-slate-800/80' : 'border-amber-500/30'} rounded-2xl p-3.5 space-y-2.5 shadow-md">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${p.groupLabel}</div>
            <h3 class="text-base font-extrabold text-white mt-0.5">${p.poolName}</h3>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            ${adviceBadge}
            <span class="text-xs font-mono text-slate-300">
              已獲 <strong class="text-white">${p.obtainedCount}</strong> / ${p.total} 隻 (${p.completionRate.toFixed(1)}%)
            </span>
          </div>
        </div>

        <!-- 進度條 -->
        <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div class="h-full ${barColor} transition-all duration-300" style="width: ${p.completionRate.toFixed(1)}%"></div>
        </div>

        ${missingBadgesHTML}
      </article>
    `;
  }).join('');
}

// ============================================================================
// 6. 檔案匯出與匯入 (Tab 4 Data Sync & Backup)
// ============================================================================
function exportCSVFile() {
  const csvContent = serializeCatsToCSV(state.cats);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `貓咪圖鑑_最新進度_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📄 已匯出 70 欄完整 CSV 檔案！');
}

function exportJSONFile() {
  const payload = {
    app: '貓咪補完計劃 App',
    exportedAt: new Date().toISOString(),
    totalCats: state.cats.length,
    cats: state.cats
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `貓咪補完計劃_備份_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📦 已匯出 JSON 完整備份檔！');
}

function handleImportFile(file) {
  if (!file) return;
  const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const content = String(e.target.result || '');
      let incomingCats = [];

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(content);
        const arr = Array.isArray(parsed) ? parsed : (parsed.cats || []);
        incomingCats = arr.map(item => (item.id && item.pools) ? item : normalizeCatRecord(item));
      } else {
        const { records } = parseCSV(content);
        if (records.length === 0) throw new Error('CSV 內容為空或格式不正確');
        incomingCats = records.map(normalizeCatRecord);
      }

      if (mode === 'overwrite') {
        state.cats = incomingCats.sort((a, b) => a.sortId - b.sortId);
        saveToLocalStorage(`✅ 完整覆蓋匯入成功（共 ${state.cats.length} 隻貓咪）`);
      } else {
        // 智慧合併模式：保留現有獲得/三階/四階/本能進度，更新新貓咪與開放進化上限
        const existingMap = new Map(state.cats.map(c => [c.id, c]));
        let addedCount = 0;
        let updatedCount = 0;

        for (const inc of incomingCats) {
          const prev = existingMap.get(inc.id);
          if (prev) {
            // 保留玩家已打勾的進度 (若新表也為 Yes 則取 OR)
            inc.obtained = prev.obtained || inc.obtained;
            inc.tfDone = prev.tfDone || inc.tfDone;
            inc.ufDone = prev.ufDone || inc.ufDone;
            inc.instinct = prev.instinct || inc.instinct;
            inc.superInstinct = prev.superInstinct || inc.superInstinct;
            existingMap.set(inc.id, inc);
            updatedCount++;
          } else {
            existingMap.set(inc.id, inc);
            addedCount++;
          }
        }
        state.cats = Array.from(existingMap.values()).sort((a, b) => a.sortId - b.sortId);
        saveToLocalStorage(`✅ 智慧合併完成（更新 ${updatedCount} 隻、新增 ${addedCount} 隻）`);
      }

      buildFilterControls();
      updateGlobalCounters();
      renderCatList(true);
      renderMaterialDashboard();
      renderGachaDashboard();
    } catch (err) {
      console.error('匯入檔案失敗:', err);
      showToast(`❌ 匯入失敗：${err.message}`);
    }
  };

  reader.readAsText(file, 'utf-8');
}

// ============================================================================
// 7. 互動事件綁定與無限捲動
// ============================================================================
let toastTimer = null;
function showToast(msg) {
  const container = document.getElementById('toast-container');
  const textEl = document.getElementById('toast-message');
  if (!container || !textEl) return;
  textEl.textContent = msg;
  container.classList.remove('opacity-0', '-translate-y-2');
  container.classList.add('opacity-100', 'translate-y-0');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    container.classList.add('opacity-0', '-translate-y-2');
    container.classList.remove('opacity-100', 'translate-y-0');
  }, 2200);
}

function switchTab(tabName) {
  state.activeTab = tabName;
  const sections = {
    pokedex: document.getElementById('tab-pokedex'),
    materials: document.getElementById('tab-materials'),
    gacha: document.getElementById('tab-gacha'),
    backup: document.getElementById('tab-backup')
  };

  for (const [k, el] of Object.entries(sections)) {
    if (!el) continue;
    el.classList.toggle('hidden', k !== tabName);
  }

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const t = btn.getAttribute('data-tab');
    const isActive = t === tabName;
    btn.classList.toggle('text-amber-400', isActive);
    btn.classList.toggle('text-slate-400', !isActive);
  });

  if (tabName === 'materials') renderMaterialDashboard();
  if (tabName === 'gacha') renderGachaDashboard();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindEvents() {
  // 底部導覽切換
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // 搜尋框即時檢索
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    clearSearchBtn.classList.toggle('hidden', !state.filters.search);
    renderCatList(true);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.filters.search = '';
    clearSearchBtn.classList.add('hidden');
    renderCatList(true);
  });

  // 補完狀態快篩
  document.getElementById('status-filter-group').addEventListener('click', (e) => {
    const btn = e.target.closest('.status-pill');
    if (!btn) return;
    state.filters.status = btn.getAttribute('data-status');
    updateGlobalCounters();
    renderCatList(true);
  });

  // 稀有度多選膠囊
  document.getElementById('rarity-pills-container').addEventListener('click', (e) => {
    const btn = e.target.closest('.rarity-pill');
    if (!btn) return;
    const rarity = btn.getAttribute('data-rarity');
    if (state.filters.rarities.has(rarity)) {
      state.filters.rarities.delete(rarity);
    } else {
      state.filters.rarities.add(rarity);
    }
    buildFilterControls();
    renderCatList(true);
  });

  document.getElementById('clear-rarity-btn').addEventListener('click', () => {
    state.filters.rarities.clear();
    buildFilterControls();
    renderCatList(true);
  });

  // 轉蛋池選單與排序選單
  document.getElementById('pool-select').addEventListener('change', (e) => {
    state.filters.pool = e.target.value;
    renderCatList(true);
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    renderCatList(true);
  });

  // 重置所有篩選條件
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    state.filters.search = '';
    state.filters.status = 'all';
    state.filters.rarities.clear();
    state.filters.pool = 'ALL';
    state.filters.sort = 'id_asc';
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    document.getElementById('sort-select').value = 'id_asc';
    buildFilterControls();
    updateGlobalCounters();
    renderCatList(true);
    showToast('已重置所有篩選條件');
  });

  // 卡片一鍵狀態切換 (Event Delegation)
  document.getElementById('cat-list-container').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="toggle"]');
    if (!btn || btn.disabled) return;
    const catId = btn.getAttribute('data-id');
    const field = btn.getAttribute('data-field');
    toggleCatStatus(catId, field);
  });

  // 載入更多按鈕與 IntersectionObserver 自動無限捲動
  const loadMoreBtn = document.getElementById('load-more-btn');
  loadMoreBtn.addEventListener('click', () => {
    state.renderLimit += 60;
    renderCatList(false);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && state.activeTab === 'pokedex') {
        state.renderLimit += 60;
        renderCatList(false);
      }
    }, { rootMargin: '250px' });
    observer.observe(document.getElementById('load-more-sentinel'));
  }

  // ==================== Tab 2: 尚缺素材儀表板互動事件 ====================
  document.getElementById('toggle-include-unobtained')?.addEventListener('change', (e) => {
    state.matDashboard.includeUnobtained = e.target.checked;
    renderMaterialDashboard();
  });

  document.getElementById('toggle-show-zero-mats')?.addEventListener('change', (e) => {
    state.matDashboard.showZero = e.target.checked;
    renderMaterialDashboard();
  });

  document.getElementById('mat-stage-scope-group')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.mat-scope-btn');
    if (!btn) return;
    state.matDashboard.stageScope = btn.getAttribute('data-scope');
    renderMaterialDashboard();
  });

  document.getElementById('material-groups-container')?.addEventListener('click', (e) => {
    const card = e.target.closest('.mat-card-btn');
    if (!card) return;
    const baseKey = card.getAttribute('data-mat-key');
    if (baseKey) openMaterialReverseModal(baseKey);
  });

  document.getElementById('close-mat-modal-btn')?.addEventListener('click', closeMaterialReverseModal);
  document.getElementById('material-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'material-modal-backdrop') closeMaterialReverseModal();
  });

  document.getElementById('modal-mat-cat-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-modal-toggle-id]');
    if (!btn) return;
    const catId = btn.getAttribute('data-modal-toggle-id');
    const field = btn.getAttribute('data-modal-toggle-field');
    toggleCatStatus(catId, field);
  });

  // ==================== Tab 3: 轉蛋池建議互動事件 ====================
  document.getElementById('gacha-group-pills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.gacha-grp-pill');
    if (!pill) return;
    state.gachaAnalyzer.groupKey = pill.getAttribute('data-gacha-group');
    renderGachaDashboard();
  });

  document.getElementById('gacha-sort-select')?.addEventListener('change', (e) => {
    state.gachaAnalyzer.sortBy = e.target.value;
    renderGachaDashboard();
  });

  document.getElementById('toggle-gacha-only-missing')?.addEventListener('change', (e) => {
    state.gachaAnalyzer.onlyMissing = e.target.checked;
    renderGachaDashboard();
  });

  document.getElementById('gacha-pools-container')?.addEventListener('click', (e) => {
    // 1. 直接點擊缺漏貓咪標記為已獲得
    const quickBtn = e.target.closest('button[data-quick-obtain-id]');
    if (quickBtn) {
      const catId = quickBtn.getAttribute('data-quick-obtain-id');
      toggleCatStatus(catId, 'obtained');
      return;
    }
    // 2. 跳轉至 Tab 1 圖鑑檢視該轉蛋池
    const jumpBtn = e.target.closest('button[data-jump-pool]');
    if (jumpBtn) {
      const poolName = jumpBtn.getAttribute('data-jump-pool');
      state.filters.pool = poolName;
      state.filters.status = 'all';
      document.getElementById('pool-select').value = poolName;
      updateGlobalCounters();
      renderCatList(true);
      switchTab('pokedex');
      showToast(`已篩選轉蛋池：${poolName}`);
    }
  });

  // ==================== Tab 4: 匯出 / 匯入 / 重置按鈕 ====================
  document.getElementById('export-csv-btn').addEventListener('click', exportCSVFile);
  document.getElementById('export-json-btn').addEventListener('click', exportJSONFile);

  const fileInput = document.getElementById('import-file-input');
  document.getElementById('trigger-import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
    fileInput.value = '';
  });

  document.getElementById('reset-storage-btn').addEventListener('click', () => {
    if (!confirm('確定要清除手機上的修改紀錄，還原成最初匯入的 770 筆預設狀態嗎？')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
    state.lastSavedAt = null;
    document.getElementById('dirty-indicator')?.classList.add('hidden');
    initDatabase();
    buildFilterControls();
    updateGlobalCounters();
    renderCatList(true);
    renderMaterialDashboard();
    renderGachaDashboard();
    showToast('🔄 已還原為預設 770 筆初始狀態');
  });
}

// 啟動應用程式
document.addEventListener('DOMContentLoaded', () => {
  initDatabase();
  buildFilterControls();
  updateGlobalCounters();
  renderCatList(true);
  renderMaterialDashboard();
  renderGachaDashboard();
  bindEvents();
});
