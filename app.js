/**
 * 貓咪補完計劃 App — 核心資料層與 Step 2 (Tab 1 圖鑑檢索 & Tab 4 資料備份)
 */

const STORAGE_KEY = 'battlecats_tracker_v2';
const STORAGE_META_KEY = 'battlecats_tracker_meta_v2';
const STORAGE_GAS_URL_KEY = 'battlecats_gas_url_v1';

// 內建給使用者一鍵複製的 Google Apps Script 雙向同步後端程式碼
const GAS_BACKEND_TEMPLATE = `/**
 * 貓咪補完計劃 App — Google 試算表雙向雲端資料庫 API (Apps Script)
 * 支援：
 * 1. GET  讀取整張試算表 (770 筆貓咪與 70 欄狀態)
 * 2. POST action="update" 即時更新單筆或多筆貓咪的 [獲得/三階/四階/本能/超本能]
 * 3. POST action="init_full" 一鍵將 770 筆完整 70 欄資料寫入空白試算表
 */

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getDisplayValues();
  if (!data || data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, empty: true, records: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const headers = data[0].map(h => String(h).trim());
  const records = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row[0] && !row[headers.indexOf('圖鑑')]) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    records.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, headers, records }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // 模式 A：一鍵初始化空白試算表 (寫入完整 70 欄標題與 770 筆貓咪)
    if (payload.action === 'init_full' && Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
      sheet.clearContents();
      const matrix = [payload.headers, ...payload.rows];
      sheet.getRange(1, 1, matrix.length, payload.headers.length).setValues(matrix);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, mode: 'init_full', count: payload.rows.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 模式 B：單筆或批次更新貓咪狀態 (獲得 / 三階 / 四階 / 本能 / 超本能)
    const data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: '試算表為空，請先點擊「一鍵初始化空白試算表」' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const headers = data[0].map(h => String(h).trim());
    const idCol = headers.indexOf('圖鑑');
    const colMap = {
      obtained: headers.indexOf('獲得'),
      tfDone: headers.indexOf('三階'),
      ufDone: headers.indexOf('四階'),
      instinct: headers.indexOf('本能'),
      superInstinct: headers.indexOf('超本能')
    };

    const rowIndexMap = new Map();
    for (let r = 1; r < data.length; r++) {
      rowIndexMap.set(String(data[r][idCol]).trim(), r + 1);
    }

    const updates = payload.updates || [];
    let updatedCount = 0;
    updates.forEach(u => {
      const rowNum = rowIndexMap.get(String(u.id).trim());
      if (!rowNum) return;
      Object.entries(colMap).forEach(([key, colIdx]) => {
        if (colIdx !== -1 && u[key] !== undefined) {
          sheet.getRange(rowNum, colIdx + 1).setValue(u[key] ? 'Yes' : 'No');
        }
      });
      updatedCount++;
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, mode: 'update', updatedCount }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

// 稀有度順序與色票設定（Organic 大地、苔蘚、赤陶、石材與乾草色系）
const RARITY_ORDER = ['基本', 'EX', '稀有', '激稀有', '超激稀有', '傳說稀有'];
const RARITY_STYLE = {
  '基本': {
    badge: 'bg-[#ddd5c3] text-[#29251d] border border-[#443b2f]/30 font-medium',
    pillActive: 'organic-control bg-[#35422d] text-[#f5eddf] border border-[#f5eddf]/40 font-semibold',
    pillInactive: 'organic-control bg-[#f5eddf]/90 text-[#29251d] border border-[#29251d]/20 hover:bg-[#f5eddf]',
    rank: 1
  },
  'EX': {
    badge: 'bg-[#b9b28b]/55 text-[#29251d] border border-[#443b2f]/35 font-medium',
    pillActive: 'organic-control bg-[#35422d] text-[#f5eddf] border border-[#f5eddf]/40 font-semibold',
    pillInactive: 'organic-control bg-[#f5eddf]/90 text-[#29251d] border border-[#29251d]/20 hover:bg-[#f5eddf]',
    rank: 2
  },
  '稀有': {
    badge: 'bg-[#ad7d62]/35 text-[#29251d] border border-[#694737]/40 font-medium',
    pillActive: 'organic-control bg-[#35422d] text-[#f5eddf] border border-[#f5eddf]/40 font-semibold',
    pillInactive: 'organic-control bg-[#f5eddf]/90 text-[#29251d] border border-[#29251d]/20 hover:bg-[#f5eddf]',
    rank: 3
  },
  '激稀有': {
    badge: 'bg-[#b9b28b] text-[#29251d] border border-[#443b2f]/45 font-semibold',
    pillActive: 'organic-control bg-[#35422d] text-[#f5eddf] border border-[#f5eddf]/40 font-semibold',
    pillInactive: 'organic-control bg-[#f5eddf]/90 text-[#29251d] border border-[#29251d]/20 hover:bg-[#f5eddf]',
    rank: 4
  },
  '超激稀有': {
    badge: 'bg-[#694737] text-[#f5eddf] border border-[#694737] font-semibold',
    pillActive: 'organic-control bg-[#35422d] text-[#f5eddf] border border-[#f5eddf]/40 font-semibold',
    pillInactive: 'organic-control bg-[#f5eddf]/90 text-[#29251d] border border-[#29251d]/20 hover:bg-[#f5eddf]',
    rank: 5
  },
  '傳說稀有': {
    badge: 'bg-[#35422d] text-[#f5eddf] border border-[#29251d] font-semibold',
    pillActive: 'organic-control bg-[#35422d] text-[#f5eddf] border border-[#f5eddf]/40 font-semibold',
    pillInactive: 'organic-control bg-[#f5eddf]/90 text-[#29251d] border border-[#29251d]/20 hover:bg-[#f5eddf]',
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

// Tab 2 視覺化四大分組定義（搭配小手繪符號與自然大地色階層）
const MATERIAL_CATEGORIES = [
  {
    id: 'catfruit_normal',
    title: '一般貓薄荷（紅 / 綠 / 藍 / 紫 / 黃 / 彩）',
    desc: '雙週一至週五常駐進化關卡、貓薄荷挑戰',
    items: [
      { baseKey: '紅薄', name: '紅色貓薄荷', short: '紅薄', colorCls: 'bg-[#694737] text-[#f5eddf]', dot: '✾' },
      { baseKey: '綠薄', name: '綠色貓薄荷', short: '綠薄', colorCls: 'bg-[#35422d] text-[#f5eddf]', dot: '✾' },
      { baseKey: '藍薄', name: '藍色貓薄荷', short: '藍薄', colorCls: 'bg-[#443b2f] text-[#f5eddf]', dot: '✾' },
      { baseKey: '紫薄', name: '紫色貓薄荷', short: '紫薄', colorCls: 'bg-[#54423b] text-[#f5eddf]', dot: '✾' },
      { baseKey: '黃薄', name: '黃色貓薄荷', short: '黃薄', colorCls: 'bg-[#b9b28b] text-[#29251d]', dot: '✾' },
      { baseKey: '彩薄', name: '彩虹貓薄荷', short: '彩薄', colorCls: 'bg-[#ad7d62] text-[#f5eddf]', dot: '✦' }
    ]
  },
  {
    id: 'catfruit_seed',
    title: '一般貓薄荷種子（紅 / 綠 / 藍 / 紫 / 黃 / 彩）',
    desc: '初級／中級進化關卡或彩虹薄荷關卡掉落',
    items: [
      { baseKey: '紅種', name: '紅貓薄荷種子', short: '紅種', colorCls: 'bg-[#eee6d6] text-[#29251d]', dot: '◦' },
      { baseKey: '綠種', name: '綠貓薄荷種子', short: '綠種', colorCls: 'bg-[#eee6d6] text-[#29251d]', dot: '◦' },
      { baseKey: '藍種', name: '藍貓薄荷種子', short: '藍種', colorCls: 'bg-[#eee6d6] text-[#29251d]', dot: '◦' },
      { baseKey: '紫種', name: '紫貓薄荷種子', short: '紫種', colorCls: 'bg-[#eee6d6] text-[#29251d]', dot: '◦' },
      { baseKey: '黃種', name: '黃貓薄荷種子', short: '黃種', colorCls: 'bg-[#eee6d6] text-[#29251d]', dot: '◦' },
      { baseKey: '彩種', name: '彩虹貓薄荷種子', short: '彩種', colorCls: 'bg-[#ddd5c3] text-[#29251d]', dot: '✧' }
    ]
  },
  {
    id: 'catfruit_special',
    title: '特殊薄荷與種子（古代 / 惡魔 / 黃金）',
    desc: '成長的古代、成長的惡魔、黃金薄荷挑戰與貓咪神社',
    items: [
      { baseKey: '古薄', name: '古代貓薄荷', short: '古薄', colorCls: 'bg-[#35422d] text-[#f5eddf]', dot: '❖' },
      { baseKey: '古種', name: '古代貓薄荷種子', short: '古種', colorCls: 'bg-[#ddd5c3] text-[#29251d]', dot: '◇' },
      { baseKey: '惡薄', name: '惡魔貓薄荷', short: '惡薄', colorCls: 'bg-[#443b2f] text-[#f5eddf]', dot: '❖' },
      { baseKey: '惡種', name: '惡魔貓薄荷種子', short: '惡種', colorCls: 'bg-[#ddd5c3] text-[#29251d]', dot: '◇' },
      { baseKey: '金薄', name: '黃金貓薄荷', short: '金薄', colorCls: 'bg-[#b9b28b] text-[#29251d]', dot: '❂' },
      { baseKey: '金種', name: '黃金貓薄荷種子', short: '金種', colorCls: 'bg-[#eee6d6] text-[#29251d]', dot: '☼' }
    ]
  },
  {
    id: 'behemoth_stones',
    title: '獸石與獸結晶（紅 / 紫 / 翠 / 蒼 / 黃 / 彩）',
    desc: '發掘地圖、狩獵地圖（森林／沙漠／火山）與超獸討伐',
    items: [
      { baseKey: '紅石', name: '紅獸石', short: '紅石', colorCls: 'bg-[#694737] text-[#f5eddf]', dot: '◆' },
      { baseKey: '紫石', name: '紫獸石', short: '紫石', colorCls: 'bg-[#443b2f] text-[#f5eddf]', dot: '◆' },
      { baseKey: '翠石', name: '翠獸石', short: '翠石', colorCls: 'bg-[#35422d] text-[#f5eddf]', dot: '◆' },
      { baseKey: '蒼石', name: '蒼獸石', short: '蒼石', colorCls: 'bg-[#544b3d] text-[#f5eddf]', dot: '◆' },
      { baseKey: '黃石', name: '黃獸石', short: '黃石', colorCls: 'bg-[#b9b28b] text-[#29251d]', dot: '◆' },
      { baseKey: '彩石', name: '虹獸石', short: '彩石', colorCls: 'bg-[#ad7d62] text-[#f5eddf]', dot: '✦' },
      { baseKey: '紅晶', name: '紅獸結晶', short: '紅晶', colorCls: 'bg-[#694737] text-[#f5eddf]', dot: '◈' },
      { baseKey: '紫晶', name: '紫獸結晶', short: '紫晶', colorCls: 'bg-[#443b2f] text-[#f5eddf]', dot: '◈' },
      { baseKey: '翠晶', name: '翠獸結晶', short: '翠晶', colorCls: 'bg-[#35422d] text-[#f5eddf]', dot: '◈' },
      { baseKey: '蒼晶', name: '蒼獸結晶', short: '蒼晶', colorCls: 'bg-[#544b3d] text-[#f5eddf]', dot: '◈' },
      { baseKey: '黃晶', name: '黃獸結晶', short: '黃晶', colorCls: 'bg-[#b9b28b] text-[#29251d]', dot: '◈' }
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
  cloud: {
    gasUrl: '',               // Google Apps Script Web App URL (/exec)
    status: 'unbound',        // 'unbound' | 'syncing' | 'synced' | 'error'
    lastSyncMsg: '',
    pendingQueue: new Map(),  // cat.id -> updateObj (防抖批次寫回佇列)
    flushTimer: null
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

  // 讀取已綁定的 Google Apps Script URL
  try {
    const savedGasUrl = (localStorage.getItem(STORAGE_GAS_URL_KEY) || '').trim();
    if (savedGasUrl) {
      state.cloud.gasUrl = savedGasUrl;
      const inputEl = document.getElementById('gas-url-input');
      if (inputEl) inputEl.value = savedGasUrl;
      updateCloudStatusUI('synced', '已綁定 Google 試算表（開啟時自動同步）');
      // 啟動時非同步從 Google 試算表拉取最新狀態
      setTimeout(() => pullFromGoogleSheet(true), 150);
    } else {
      updateCloudStatusUI('unbound', '狀態：尚未設定 Google 試算表 API 網址');
    }
  } catch (e) {}
}

// ============================================================================
// 2B. ☁️ Google 試算表 (Apps Script) 雲端雙向同步引擎
// ============================================================================
function updateCloudStatusUI(status, message) {
  state.cloud.status = status;
  if (message) state.cloud.lastSyncMsg = message;

  const dotEl = document.getElementById('cloud-status-dot');
  const textEl = document.getElementById('cloud-status-text');
  const badgeEl = document.getElementById('backup-cloud-badge');
  const logEl = document.getElementById('gas-sync-log');

  if (dotEl && textEl) {
    if (status === 'syncing') {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-[#b9b28b] animate-pulse';
      textEl.textContent = '同步中...';
      textEl.className = 'text-xs font-semibold text-[#694737] leading-tight mt-0.5';
    } else if (status === 'synced') {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-[#35422d]';
      textEl.textContent = '已連線';
      textEl.className = 'text-xs font-semibold text-[#35422d] leading-tight mt-0.5';
    } else if (status === 'error') {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-[#694737]';
      textEl.textContent = '同步失敗';
      textEl.className = 'text-xs font-semibold text-[#694737] leading-tight mt-0.5';
    } else {
      dotEl.className = 'w-2.5 h-2.5 rounded-full bg-[#ad7d62]';
      textEl.textContent = '未綁定';
      textEl.className = 'text-xs font-semibold text-[#29251d] leading-tight mt-0.5';
    }
  }

  if (badgeEl) {
    if (status === 'synced') {
      badgeEl.textContent = '雲端連線正常';
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#b9b28b] text-[#29251d] text-xs font-semibold shrink-0';
    } else if (status === 'syncing') {
      badgeEl.textContent = '雲端同步中...';
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#f5eddf]/25 text-[#f5eddf] text-xs font-medium shrink-0';
    } else if (status === 'error') {
      badgeEl.textContent = '連線異常';
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#694737] text-[#f5eddf] text-xs font-medium shrink-0';
    } else {
      badgeEl.textContent = '未連線';
      badgeEl.className = 'px-3 py-1 rounded-full bg-[#f5eddf]/15 border border-[#f5eddf]/30 text-[#f5eddf] text-xs shrink-0';
    }
  }

  if (logEl && state.cloud.lastSyncMsg) {
    logEl.textContent = state.cloud.lastSyncMsg;
  }
}

/**
 * 將單筆貓咪狀態加入防抖佇列，450ms 後自動批次 POST 寫回 Google 試算表
 */
function queueCloudCatUpdate(cat) {
  if (!state.cloud.gasUrl) return;

  state.cloud.pendingQueue.set(cat.id, {
    id: cat.id,
    obtained: cat.obtained,
    tfDone: cat.tfDone,
    ufDone: cat.ufDone,
    instinct: cat.instinct,
    superInstinct: cat.superInstinct
  });

  updateCloudStatusUI('syncing', `⏳ 正在將 #${cat.id} ${cat.name} 同步至 Google 試算表...`);

  clearTimeout(state.cloud.flushTimer);
  state.cloud.flushTimer = setTimeout(() => {
    flushCloudUpdateQueue();
  }, 450);
}

async function flushCloudUpdateQueue() {
  if (!state.cloud.gasUrl || state.cloud.pendingQueue.size === 0) return;

  const updates = Array.from(state.cloud.pendingQueue.values());
  state.cloud.pendingQueue.clear();

  try {
    // 使用 text/plain 避免引發 CORS preflight (OPTIONS) 阻擋，GAS doPost 可直接讀取 e.postData.contents
    const res = await fetch(state.cloud.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', updates })
    });
    const data = await res.json();
    if (!data || !data.ok) {
      throw new Error(data?.error || '試算表回傳未知錯誤');
    }
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    updateCloudStatusUI('synced', `✅ 已於 ${timeStr} 同步 ${updates.length} 筆修改至 Google 試算表`);
  } catch (err) {
    console.error('Google 試算表寫回失敗:', err);
    updateCloudStatusUI('error', `❌ 雲端寫回失敗：${err.message}`);
  }
}

/**
 * 從 Google 試算表拉取最新資料 (GET)
 */
async function pullFromGoogleSheet(silent = false) {
  const url = state.cloud.gasUrl;
  if (!url) {
    if (!silent) showToast('⚠️ 請先輸入並儲存 Google Apps Script 網址');
    return;
  }

  updateCloudStatusUI('syncing', '⬇️ 正在從 Google 試算表拉取最新資料...');
  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}_t=${Date.now()}`, { method: 'GET' });
    const data = await res.json();

    if (!data || !data.ok) {
      throw new Error(data?.error || '回傳格式不正確');
    }

    if (data.empty || !Array.isArray(data.records) || data.records.length === 0) {
      updateCloudStatusUI('synced', '💡 試算表目前是空白的，請點「🚀 一鍵初始化空白試算表(770筆)」寫入資料！');
      if (!silent) showToast('試算表目前為空白，請點「一鍵初始化空白試算表」');
      return;
    }

    const remoteCats = data.records.map(normalizeCatRecord).sort((a, b) => a.sortId - b.sortId);
    state.cats = remoteCats;
    saveToLocalStorage();

    buildFilterControls();
    updateGlobalCounters();
    renderCatList(false);
    renderMaterialDashboard();
    renderGachaDashboard();

    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    updateCloudStatusUI('synced', `✅ 已於 ${timeStr} 從 Google 試算表同步 ${remoteCats.length} 筆貓咪資料`);
    if (!silent) showToast(`☁️ 已從試算表同步 ${remoteCats.length} 隻貓咪！`);
  } catch (err) {
    console.error('從 Google 試算表拉取失敗:', err);
    updateCloudStatusUI('error', `❌ 拉取失敗：${err.message}（請確認部署權限設為「所有人」）`);
    if (!silent) showToast(`❌ 雲端拉取失敗：${err.message}`);
  }
}

/**
 * 推送手機上目前所有貓咪的勾選狀態 (獲得/三階/四階/本能/超本能) 至已存在的試算表
 */
async function pushAllStatusesToGoogleSheet() {
  const url = state.cloud.gasUrl;
  if (!url) {
    showToast('⚠️ 請先輸入並儲存 Google Apps Script 網址');
    return;
  }

  updateCloudStatusUI('syncing', '⬆️ 正在將 770 筆勾選狀態推送至 Google 試算表...');
  try {
    const updates = state.cats.map(cat => ({
      id: cat.id,
      obtained: cat.obtained,
      tfDone: cat.tfDone,
      ufDone: cat.ufDone,
      instinct: cat.instinct,
      superInstinct: cat.superInstinct
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', updates })
    });
    const data = await res.json();
    if (!data || !data.ok) {
      throw new Error(data?.error || '推送失敗');
    }
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    updateCloudStatusUI('synced', `✅ 已於 ${timeStr} 完整推送 ${ data.updatedCount || updates.length } 筆狀態至試算表`);
    showToast('☁️ 已將所有貓咪勾選進度推送至 Google 試算表！');
  } catch (err) {
    console.error('推送狀態失敗:', err);
    updateCloudStatusUI('error', `❌ 推送失敗：${err.message}`);
    showToast(`❌ 推送失敗：${err.message}`);
  }
}

/**
 * 一鍵將完整 70 欄標題與 770 筆貓咪資料寫入空白 Google 試算表
 */
async function initFullTableToGoogleSheet() {
  const url = state.cloud.gasUrl;
  if (!url) {
    showToast('⚠️ 請先輸入並儲存 Google Apps Script 網址');
    return;
  }
  if (!confirm('這會將目前 App 內的 770 筆貓咪與 70 個欄位完整寫入你的 Google 試算表第一頁。確定執行嗎？')) {
    return;
  }

  updateCloudStatusUI('syncing', '🚀 正在將 770 筆完整 70 欄圖鑑寫入 Google 試算表（約需 3~6 秒）...');
  try {
    const headers = window.CSV_HEADERS || [
      '名稱','三古種','三古薄','三彩石','三彩種','三彩薄','三惡種','三惡薄','三紅晶','三紅石','三紅種','三紅薄','三紫晶','三紫石','三紫種','三紫薄','三綠種','三綠薄','三翠晶','三翠石','三蒼晶','三蒼石','三藍種','三藍薄','三金種','三金薄','三階','三階XP','三黃晶','三黃石','三黃種','三黃薄','四古種','四古薄','四彩石','四彩種','四彩薄','四惡種','四惡薄','四紅晶','四紅石','四紅種','四紅薄','四紫晶','四紫石','四紫種','四紫薄','四綠種','四綠薄','四翠晶','四翠石','四蒼晶','四蒼石','四藍種','四藍薄','四金種','四金薄','四階','四階XP','四黃晶','四黃石','四黃種','四黃薄','圖鑑','所屬轉蛋池分類','本能','獲得','稀有度','超本能','開放進化狀態'
    ];

    const rows = state.cats.map(cat => {
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
      return headers.map(h => rowObj[h] ?? '');
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'init_full', headers, rows })
    });
    const data = await res.json();
    if (!data || !data.ok) {
      throw new Error(data?.error || '初始化寫入失敗');
    }
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    updateCloudStatusUI('synced', `🎉 已於 ${timeStr} 成功將 ${data.count} 筆完整圖鑑寫入 Google 試算表！`);
    showToast(`🎉 成功初始化 Google 試算表（共 ${data.count} 筆資料）！`);
  } catch (err) {
    console.error('初始化試算表失敗:', err);
    updateCloudStatusUI('error', `❌ 初始化失敗：${err.message}`);
    showToast(`❌ 初始化失敗：${err.message}`);
  }
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
  queueCloudCatUpdate(cat);
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
        aria-pressed="${isActive}"
        class="rarity-pill shrink-0 px-3.5 py-1.5 text-xs flex items-center gap-1.5 ${cls}"
      >
        <span>${rarity}</span>
        <span class="font-serif-organic text-xs opacity-85">${rarityCounts[rarity] || 0}</span>
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

  let optionsHTML = `<option value="ALL">全部轉蛋池分類 (${state.cats.length})</option>`;
  for (const group of POOL_GROUPS) {
    // 計算該群組涵蓋的不重複貓咪數
    const groupCatCount = state.cats.filter(c => c.pools.some(p => group.pools.includes(p))).length;
    optionsHTML += `<optgroup label="${group.label}">`;
    optionsHTML += `<option value="GROUP:${group.key}">篩選整個【${group.label.replace(/^[^\s]+\s\d+\.\s/, '')}】群組 (${groupCatCount})</option>`;
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
    `已獲得 ${obtainedCount} / ${total} 隻貓咪 ‧ 待升三階 ${pendingTFCount} 隻 ‧ 待升四階 ${pendingUFCount} 隻`;

  // 更新快篩按鈕上的即時數字
  document.getElementById('count-status-all').textContent = total;
  document.getElementById('count-status-unobtained').textContent = unobtainedCount;
  document.getElementById('count-status-tf').textContent = pendingTFCount;
  document.getElementById('count-status-uf').textContent = pendingUFCount;

  // 更新快篩按鈕高亮樣式（Moss active action vs quiet paper outline）
  document.querySelectorAll('#status-filter-group .status-pill').forEach(btn => {
    const st = btn.getAttribute('data-status');
    const active = st === state.filters.status;
    btn.setAttribute('aria-pressed', String(active));
    btn.className = `status-pill btn-touch organic-control px-3 py-2 text-left flex items-baseline justify-between gap-2 ${
      active
        ? 'organic-btn-moss font-semibold'
        : 'bg-[#eee6d6]/75 hover:bg-[#ddd5c3] text-[#29251d] border border-[#443b2f]/20'
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
      pills.push(`<span class="px-2 py-0.5 rounded-full bg-[#35422d]/10 border border-[#35422d]/30 text-[#35422d] text-[11px] font-medium">${k.slice(1)} &times; ${v}</span>`);
    }
  }
  if (hasUFOpen(cat) && !cat.ufDone) {
    for (const [k, v] of Object.entries(cat.matsUF)) {
      pills.push(`<span class="px-2 py-0.5 rounded-full bg-[#694737]/12 border border-[#694737]/35 text-[#694737] text-[11px] font-medium">${k.slice(1)} &times; ${v}</span>`);
    }
  }
  if (pills.length === 0) return '';
  return `
    <div class="mt-3 pt-2.5 border-t border-[#443b2f]/15 flex items-center gap-1.5 flex-wrap">
      <span class="text-xs text-[#694737] font-medium">◈ 尚缺進化素材：</span>
      ${pills.join('')}
    </div>
  `;
}

function renderCatCardHTML(cat) {
  const rarityStyle = RARITY_STYLE[cat.rarity]?.badge || RARITY_STYLE['基本'].badge;
  const tfOpen = hasTFOpen(cat);
  const ufOpen = hasUFOpen(cat);

  // 開放進化階段標籤色 (Organic earth tones)
  const maxEvoBadge =
    cat.maxEvo === '四階'
      ? 'bg-[#694737]/15 text-[#694737] border border-[#694737]/35 font-medium'
      : cat.maxEvo === '三階'
      ? 'bg-[#35422d]/12 text-[#35422d] border border-[#35422d]/30 font-medium'
      : 'bg-[#ddd5c3] text-[#443b2f] border border-[#443b2f]/20';

  // 轉蛋池多標籤渲染
  const poolBadges = cat.pools
    .map(p => `<span class="px-2.5 py-0.5 rounded-full bg-[#eee6d6] border border-[#443b2f]/20 text-xs text-[#443b2f]">◦ ${p}</span>`)
    .join('');

  // 四大狀態切換按鈕樣式 (Softly rounded, solid moss actions with quieter outlined alternatives)
  const btnObtainedCls = cat.obtained
    ? 'organic-control organic-btn-moss font-semibold'
    : 'organic-control organic-btn-outline text-[#443b2f]';

  const btnTFCls = !tfOpen
    ? 'organic-control bg-[#ddd5c3]/50 border border-[#443b2f]/15 text-[#443b2f]/45 cursor-not-allowed'
    : cat.tfDone
    ? 'organic-control organic-btn-moss font-semibold'
    : 'organic-control organic-btn-outline text-[#29251d]';

  const btnUFCls = !ufOpen
    ? 'organic-control bg-[#ddd5c3]/50 border border-[#443b2f]/15 text-[#443b2f]/45 cursor-not-allowed'
    : cat.ufDone
    ? 'organic-control bg-[#694737] text-[#f5eddf] border border-[#694737] font-semibold'
    : 'organic-control organic-btn-outline text-[#29251d]';

  const btnInstinctCls = cat.instinct
    ? 'organic-control bg-[#ad7d62] text-[#f5eddf] border border-[#ad7d62] font-semibold'
    : 'organic-control organic-btn-outline text-[#443b2f]';

  return `
    <article
      data-cat-card="${cat.id}"
      class="${!cat.obtained ? 'organic-card-unobtained' : 'organic-card'} p-4"
    >
      <!-- 卡片頂部：大字襯線編號、名稱、稀有度、最高開放階數 -->
      <div class="flex items-baseline justify-between gap-2 flex-wrap">
        <div class="flex items-baseline gap-2.5 flex-wrap">
          <span class="font-serif-organic text-lg font-semibold text-[#694737]">
            #${cat.id}
          </span>
          <h3 class="font-serif-organic text-lg sm:text-xl font-semibold text-[#29251d]">${cat.name}</h3>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-2.5 py-0.5 rounded-full text-xs ${rarityStyle}">${cat.rarity}</span>
          <span class="px-2.5 py-0.5 rounded-full text-xs ${maxEvoBadge}">最高${cat.maxEvo}</span>
        </div>
      </div>

      <!-- 轉蛋池標籤列 -->
      <div class="flex flex-wrap gap-1.5 mt-2">
        ${poolBadges}
      </div>

      <!-- 一鍵打卡按鈕列 (最小高度 44px 符合觸控與鍵盤聚焦規範) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="obtained"
          aria-pressed="${cat.obtained}"
          class="btn-touch px-3 py-2 text-xs flex items-center justify-center gap-1.5 ${btnObtainedCls}"
        >
          <span aria-hidden="true">${cat.obtained ? '✓' : '○'}</span>
          <span>已獲得</span>
        </button>

        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="tfDone"
          aria-pressed="${cat.tfDone}"
          ${!tfOpen ? 'disabled' : ''}
          class="btn-touch px-3 py-2 text-xs flex items-center justify-center gap-1.5 ${btnTFCls}"
        >
          <span aria-hidden="true">${!tfOpen ? '—' : cat.tfDone ? '✓' : '○'}</span>
          <span>三階</span>
        </button>

        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="ufDone"
          aria-pressed="${cat.ufDone}"
          ${!ufOpen ? 'disabled' : ''}
          class="btn-touch px-3 py-2 text-xs flex items-center justify-center gap-1.5 ${btnUFCls}"
        >
          <span aria-hidden="true">${!ufOpen ? '—' : cat.ufDone ? '✓' : '○'}</span>
          <span>四階</span>
        </button>

        <button
          type="button"
          data-action="toggle"
          data-id="${cat.id}"
          data-field="instinct"
          aria-pressed="${cat.instinct}"
          class="btn-touch px-3 py-2 text-xs flex items-center justify-center gap-1.5 ${btnInstinctCls}"
        >
          <span aria-hidden="true">${cat.instinct ? '✓' : '○'}</span>
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
      <div class="organic-sheet p-8 text-center space-y-2">
        <div class="font-serif-organic text-2xl text-[#694737]">查無符合條件的圖鑑紀錄</div>
        <p class="text-xs text-[#443b2f]">請嘗試清除關鍵字或切換上方的稀有度／轉蛋池分類。</p>
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
    document.getElementById('load-more-btn').textContent = `展開更多圖鑑紀錄（尚有 ${remain} 隻）...`;
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
    btn.setAttribute('aria-pressed', String(active));
    btn.className = `mat-scope-btn px-3 py-1.5 rounded-[18px_14px_20px_12px] text-xs font-medium transition ${
      active ? 'bg-[#b9b28b] text-[#29251d] font-semibold' : 'text-[#f5eddf]/80 hover:text-[#f5eddf]'
    }`;
  });

  // 渲染四大分類卡片群組 (Open lists with small drawn symbols & large serif numbers)
  const groupsHTML = MATERIAL_CATEGORIES.map((group, idx) => {
    const visibleItems = group.items
      .map(item => statsMap[item.baseKey])
      .filter(st => showZero || st.total > 0);

    const groupSum = group.items.reduce((s, it) => s + statsMap[it.baseKey].total, 0);
    const stepNum = String(idx + 1).padStart(2, '0');

    if (visibleItems.length === 0) {
      return `
        <div class="organic-sheet p-4 sm:p-5 flex items-center justify-between gap-3">
          <div class="flex items-baseline gap-3">
            <span class="font-serif-organic text-2xl text-[#ad7d62]">${stepNum}</span>
            <div>
              <h3 class="font-serif-organic text-lg font-semibold text-[#29251d]">${group.title}</h3>
              <p class="text-xs text-[#443b2f]">${group.desc}</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full bg-[#35422d]/10 border border-[#35422d]/30 text-[#35422d] text-xs font-medium shrink-0">
            ✓ 全數不缺 (0)
          </span>
        </div>
      `;
    }

    const cardsHTML = visibleItems.map(st => {
      const isZero = st.total === 0;
      const stageBreakdown = [];
      if (st.tfTotal > 0) stageBreakdown.push(`三階 ${st.tfTotal}`);
      if (st.ufTotal > 0) stageBreakdown.push(`四階 ${st.ufTotal}`);

      return `
        <button
          type="button"
          data-mat-key="${st.baseKey}"
          class="mat-card-btn organic-control text-left p-3.5 border border-[#443b2f]/25 flex flex-col justify-between ${
            isZero
              ? 'bg-[#eee6d6]/60 text-[#443b2f]/55'
              : `${st.colorCls}`
          }"
        >
          <div class="flex items-center justify-between gap-1.5 w-full">
            <span class="text-xs font-medium flex items-center gap-1.5 truncate">
              <span aria-hidden="true">${st.dot}</span>
              <span>${st.name}</span>
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-black/15 shrink-0">
              ${st.usages.length} 隻需用
            </span>
          </div>

          <div class="mt-3 flex items-baseline justify-between w-full border-t border-current/15 pt-2">
            <div class="font-serif-organic text-3xl font-semibold tracking-tight leading-none">
              ${st.total}
            </div>
            <div class="text-[11px] opacity-85">
              ${stageBreakdown.join(' · ') || '不缺'}
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <div class="organic-sheet p-4 sm:p-5 space-y-3.5">
        <div class="flex items-baseline justify-between gap-2 border-b border-[#443b2f]/15 pb-3">
          <div class="flex items-baseline gap-3">
            <span class="font-serif-organic text-2xl sm:text-3xl text-[#ad7d62]">${stepNum}</span>
            <div>
              <h3 class="font-serif-organic text-lg sm:text-xl font-semibold text-[#29251d]">${group.title}</h3>
              <p class="text-xs text-[#443b2f]">${group.desc}</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full bg-[#eee6d6] border border-[#443b2f]/25 text-[#29251d] text-xs font-medium shrink-0">
            小計 <strong class="font-serif-organic text-sm">${groupSum}</strong> 顆
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
      <div class="p-6 text-center text-[#443b2f] text-sm">
        目前沒有任何待進化的貓咪需要【${st.name}】。
      </div>
    `;
  } else {
    listEl.innerHTML = st.usages.map(({ cat, stage, amount }) => {
      const rarityBadge = RARITY_STYLE[cat.rarity]?.badge || '';
      const field = stage === '四階' ? 'ufDone' : 'tfDone';
      return `
        <div class="bg-[#eee6d6] border border-[#443b2f]/25 rounded-[20px_14px_22px_16px] p-3.5 flex items-center justify-between gap-3">
          <div class="space-y-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="font-serif-organic text-sm font-semibold text-[#694737]">#${cat.id}</span>
              <span class="font-serif-organic text-base font-semibold text-[#29251d] truncate">${cat.name}</span>
              <span class="px-2 py-0.5 rounded-full text-[11px] ${rarityBadge}">${cat.rarity}</span>
              ${!cat.obtained ? '<span class="px-2 py-0.5 rounded-full bg-[#694737] text-[#f5eddf] text-[11px]">未獲得</span>' : ''}
            </div>
            <div class="text-xs text-[#443b2f]">
              <span>升${stage}需求：<strong class="font-serif-organic text-sm text-[#29251d]">${st.name} &times; ${amount}</strong></span>
            </div>
          </div>

          <button
            type="button"
            data-modal-toggle-id="${cat.id}"
            data-modal-toggle-field="${field}"
            class="organic-control organic-btn-moss btn-touch px-3.5 py-2 text-xs font-medium shrink-0"
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
// 5C. TAB 3: 轉蛋池補完率與抽卡建議 (Broad Horizontal Comparison Rows)
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
    btn.setAttribute('aria-pressed', String(active));
    btn.className = `gacha-grp-pill organic-control px-3.5 py-1.5 text-xs font-medium shrink-0 ${
      active
        ? 'organic-btn-moss font-semibold'
        : 'organic-btn-outline'
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
      <div class="organic-sheet p-8 text-center space-y-2">
        <div class="font-serif-organic text-2xl text-[#35422d]">此分類下的轉蛋池已 100% 全部集滿</div>
      </div>
    `;
    return;
  }

  // 寬幅比較列 (Comparison rows divide identity, details, and action across a shared width; featured row stays moss)
  container.innerHTML = filteredPools.map((p, index) => {
    const isComplete = p.missingCount === 0;
    const isFeatured = !isComplete && index === 0; // 第一順位推薦池保持 Moss 強調背景

    const rowSurfaceCls = isFeatured
      ? 'organic-moss-basin p-4 sm:p-5 ring-1 ring-inset ring-[#b9b28b]/50'
      : 'organic-card p-4 sm:p-5';

    const titleColor = isFeatured ? 'text-[#f5eddf]' : 'text-[#29251d]';
    const subColor = isFeatured ? 'text-[#b9b28b]' : 'text-[#694737]';
    const mutedColor = isFeatured ? 'text-[#f5eddf]/80' : 'text-[#443b2f]';
    const barTrackCls = isFeatured ? 'bg-[#29251d]/45 border-[#f5eddf]/25' : 'bg-[#ddd5c3] border-[#443b2f]/20';
    const barFillCls = isComplete
      ? 'bg-[#35422d]'
      : isFeatured
      ? 'bg-[#b9b28b]'
      : 'bg-[#694737]';

    let adviceBadge = '';
    if (isComplete) {
      adviceBadge = `<span class="px-2.5 py-0.5 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30 text-xs font-medium">已全齊制霸</span>`;
    } else if (isFeatured) {
      adviceBadge = `<span class="px-2.5 py-0.5 rounded-full bg-[#b9b28b] text-[#29251d] text-xs font-semibold">★ 首選推薦池 &middot; New ${p.newRate.toFixed(1)}%</span>`;
    } else {
      adviceBadge = `<span class="px-2.5 py-0.5 rounded-full bg-[#694737]/15 text-[#694737] border border-[#694737]/30 text-xs font-medium">尚缺 ${p.missingCount} 隻 &middot; New ${p.newRate.toFixed(1)}%</span>`;
    }

    const missingBadgesHTML = isComplete
      ? `<div class="text-xs ${mutedColor}">✦ 此轉蛋池全數貓咪皆已收錄完成。</div>`
      : `
        <div class="pt-3 border-t ${isFeatured ? 'border-[#f5eddf]/20' : 'border-[#443b2f]/15'} space-y-2">
          <div class="text-xs ${mutedColor} flex items-center justify-between flex-wrap gap-1">
            <span>缺漏貓咪名單（點擊可直接標記為「已獲得 ✓」）：</span>
            <button type="button" data-jump-pool="${p.poolName}" class="${isFeatured ? 'text-[#b9b28b]' : 'text-[#694737]'} underline font-medium">
              於圖鑑檢視此池 →
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${p.missingCats.map(mc => {
              return `
                <button
                  type="button"
                  data-quick-obtain-id="${mc.id}"
                  class="organic-control px-3 py-1.5 ${
                    isFeatured
                      ? 'bg-[#f5eddf]/12 hover:bg-[#f5eddf]/22 text-[#f5eddf] border border-[#f5eddf]/30'
                      : 'bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] border border-[#443b2f]/25'
                  } text-xs flex items-center gap-1.5"
                >
                  <span class="font-serif-organic font-semibold">#${mc.id}</span>
                  <span class="font-medium">${mc.name}</span>
                  <span class="text-[11px] opacity-75">(${mc.rarity})</span>
                  <span class="underline text-[11px] ml-0.5">+入手</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

    return `
      <article class="${rowSurfaceCls} space-y-3">
        <!-- Broad Horizontal Comparison Row: Identity | Details | Action/Progress -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div class="md:col-span-5">
            <div class="text-[11px] uppercase tracking-wider font-medium ${subColor}">${p.groupLabel}</div>
            <h3 class="font-serif-organic text-xl font-semibold ${titleColor} mt-0.5">${p.poolName}</h3>
          </div>

          <div class="md:col-span-4 space-y-1.5">
            <div class="flex items-baseline justify-between text-xs ${mutedColor}">
              <span>收錄進度</span>
              <span class="font-serif-organic text-base font-semibold ${titleColor}">${p.obtainedCount} / ${p.total} 隻 (${p.completionRate.toFixed(1)}%)</span>
            </div>
            <div class="w-full h-2 rounded-full overflow-hidden border ${barTrackCls}">
              <div class="h-full rounded-full ${barFillCls}" style="width: ${p.completionRate.toFixed(1)}%"></div>
            </div>
          </div>

          <div class="md:col-span-3 flex md:justify-end items-center">
            ${adviceBadge}
          </div>
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
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    btn.className = `nav-tab-btn btn-touch organic-control flex flex-col items-center justify-center py-1.5 ${
      isActive
        ? 'organic-btn-moss font-semibold'
        : 'bg-transparent text-[#443b2f] hover:bg-[#eee6d6]'
    }`;
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

  // ==================== Tab 4: 雲端同步與匯出 / 匯入 / 重置按鈕 ====================
  document.getElementById('header-cloud-btn')?.addEventListener('click', () => {
    switchTab('backup');
  });

  document.getElementById('save-gas-url-btn')?.addEventListener('click', () => {
    const val = (document.getElementById('gas-url-input')?.value || '').trim();
    if (!val) {
      showToast('⚠️ 請貼上 Google Apps Script 網址');
      return;
    }
    if (!val.startsWith('https://script.google.com/')) {
      showToast('⚠️ 網址格式似乎不是 https://script.google.com/ 開頭');
    }
    state.cloud.gasUrl = val;
    localStorage.setItem(STORAGE_GAS_URL_KEY, val);
    showToast('✅ 已儲存雲端網址，正在測試連線...');
    pullFromGoogleSheet(false);
  });

  document.getElementById('clear-gas-url-btn')?.addEventListener('click', () => {
    state.cloud.gasUrl = '';
    localStorage.removeItem(STORAGE_GAS_URL_KEY);
    const inputEl = document.getElementById('gas-url-input');
    if (inputEl) inputEl.value = '';
    updateCloudStatusUI('unbound', '狀態：已解除 Google 試算表綁定（僅使用手機本機儲存）');
    showToast('已解除 Google 試算表雲端綁定');
  });

  document.getElementById('cloud-pull-btn')?.addEventListener('click', () => {
    pullFromGoogleSheet(false);
  });

  document.getElementById('cloud-push-status-btn')?.addEventListener('click', () => {
    pushAllStatusesToGoogleSheet();
  });

  document.getElementById('cloud-init-full-sheet-btn')?.addEventListener('click', () => {
    initFullTableToGoogleSheet();
  });

  document.getElementById('copy-gas-code-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(GAS_BACKEND_TEMPLATE);
      showToast('📋 已複製 Google Apps Script 程式碼！請貼到試算表的 Apps Script 中');
    } catch (err) {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = GAS_BACKEND_TEMPLATE;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📋 已複製 Google Apps Script 程式碼！');
    }
  });

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
  switchTab('pokedex');
});
