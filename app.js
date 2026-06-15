import { GEUMGO_INITIAL_USED_BY_LEVEL, GEUMGO_SUPPLY_BY_LEVEL } from "./geumgo-data.js";
import { SUPPLY_BY_LEVEL } from "./supply-data.js";

const MAP_SIZE = 1000;
const SUPPLY_LEVEL_IDS = ["1", "2", "3", "4", "5", "6", "7"];
const EMPTY_SUPPLY_BY_LEVEL = Object.fromEntries(SUPPLY_LEVEL_IDS.map((level) => [level, ""]));
const SUPPLY_SOURCES = {
  cpt: {
    label: "CptHedgehog",
    supplyByLevel: SUPPLY_BY_LEVEL,
    initialUsedByLevel: {},
    sourceUrl: "https://cpt-hedge.com/maps/season-2/supplies",
  },
  geumgo: {
    label: "금고",
    supplyByLevel: GEUMGO_SUPPLY_BY_LEVEL,
    initialUsedByLevel: GEUMGO_INITIAL_USED_BY_LEVEL,
    sourceUrl:
      "https://docs.google.com/spreadsheets/d/1hE-9zooI2krrEBjOFF0E2Too51ulXqenJTP8GKemtOY/edit?gid=418127067#gid=418127067",
  },
  untitled: {
    label: "무제",
    supplyByLevel: EMPTY_SUPPLY_BY_LEVEL,
    initialUsedByLevel: {},
    sourceUrl: "",
  },
};
const SOURCE_KEYS = Object.keys(SUPPLY_SOURCES);
const DEFAULT_SOURCE = "cpt";
const LEVELS = [...new Set(SOURCE_KEYS.flatMap((source) => Object.keys(SUPPLY_SOURCES[source].supplyByLevel)))].sort(
  (a, b) => Number(a) - Number(b),
);
const DEFAULT_LEVEL = "3";
const BOUNDARIES = [0, 74, 149, 224, 299, 374, 449, 549, 624, 699, 774, 849, 924, 999];
const BUILDING_NAMES = {
  ko: {
    1: "마을",
    2: "도시",
    3: "공장",
    4: "열차역",
    5: "로켓기지",
    6: "전쟁 궁전",
    7: "원자력 전기로",
  },
  en: {
    1: "Village",
    2: "City",
    3: "Factory",
    4: "Train Station",
    5: "Rocket Base",
    6: "War Palace",
    7: "Nuclear Reactor",
  },
};
const BUILDING_GRID = [
  ".1.1.1.1.1.1.",
  "1.2.1.2.1.2.1",
  ".2.3.3.3.3.2.",
  "1.3.4.4.4.3.1",
  ".2.4.5.5.4.2.",
  "1.3.5.6.5.3.1",
  "2.4.6.7.6.4.2",
  "1.3.5.6.5.3.1",
  ".2.4.5.5.4.2.",
  "1.3.4.4.4.3.1",
  ".2.3.3.3.3.2.",
  "1.2.1.2.1.2.1",
  ".1.1.1.1.1.1.",
];

const INITIAL_USED = `
218,423 190,716 205,709 767,785
770,799 586,199 218,423 759,159 761,163 249,849 250,844
202,701 838,559 150,431 278,222 255,198 576,797
232,218 393,190 384,849 399,827 190,394 441,803 260,777
196,236 196,238 272,177 435,180 291,162 431,222
152,249 393,203 220,395 220,399 430,208 593,223 373,203
608,203 422,223 431,777 435,780 420,180 833,601 155,292
`;

const MANUAL_USED_NOTE = {
  ko: "수기 입력 좌표입니다. 보급품 목록 중 가까운 좌표가 잘못 표기된 것으로 보고, 근처 보급품이 사용된 것으로 참고하세요.",
  en: "Manual coordinate. Treat nearby supply coordinates as likely used because the original manual entry may be slightly off.",
};
const LANG_KEY = "lastwar-language";
const I18N = {
  ko: {
    appTitle: "라스트워 좌표 맵",
    languageToggle: "English",
    updatedDash: "최신화 -",
    sourcePrefix: "출처",
    statsDash: "접속 -",
    statsTitle: "동시 접속자 / 오늘 방문수 / 누적 방문수",
    countSummary: ({ supply, used }) => `남은 보급품 ${supply}개 · 사용 ${used}개`,
    mapTools: "지도 도구",
    mapView: "지도 보기",
    showBuildings: "건물 보기",
    showBuildingsHelp: "마을·도시·공장 같은 건물 위치를 지도에 겹쳐 봅니다.",
    showGrid: "격자선 보기",
    showGridHelp: "모눈종이처럼 투명한 보조 격자선을 지도에 겹쳐 봅니다.",
    fitMap: "전체 보기",
    fitMapHelp: "지도를 0,0부터 999,999까지 한 번에 맞춥니다.",
    rangeTools: "범위 찍기",
    incendiary: "연소탄 찍기",
    incendiaryTitle: "9×9 연소탄 범위를 커서 위치에 미리 표시합니다.",
    incendiaryHelp: "켜고 지도 클릭 시 9×9 연소탄 범위를 임시 표시합니다.",
    furnace: "용광로 찍기",
    furnaceTitle: "5×5 본체와 38×38 연맹 용광로 온도 범위를 중심 기준으로 표시합니다.",
    furnaceHelp: "켜고 지도 클릭 시 5×5 본체와 38×38 효과 범위를 임시 표시합니다.",
    missile: "미사일 찍기",
    missileTitle: "25×25 미사일 범위를 커서 위치에 미리 표시합니다.",
    missileHelp: "켜고 지도 클릭 시 중심과 네 꼭짓점 좌표를 함께 표시합니다.",
    dummyBase: "더미 기지 찍기",
    dummyBaseTitle: "3×3 더미 기지 범위를 커서 위치에 미리 표시합니다.",
    dummyBaseHelp: "켜고 지도 클릭 시 3×3 더미 기지 범위를 임시 표시합니다.",
    clearTemp: "임시 표시 지우기",
    clearTempHelp: "지도에 찍어둔 연소탄·용광로·미사일·더미 기지 임시 범위를 모두 지웁니다.",
    analysis: "분석",
    recommendation: "연소탄 추천",
    recommendationHelp: "남은 보급품 중 2개 이상 같이 먹기 좋은 위치를 보여줍니다.",
    manage: "관리",
    clearCurrent: "현재 단계 사용 전체 취소",
    clearCurrentHelp: "현재 출처·단계의 사용 표시를 모두 미사용으로 되돌립니다.",
    cautionTitle: "연소탄 주의",
    coldWarning: "한파때 연소탄 사용 x",
    baseWarning: "기지나 채집지 연소탄 범위에 넣지 말기",
    sourceTabsLabel: "좌표 출처",
    levelTabsLabel: "보급품 단계",
    level: (level) => `${level}단계`,
    coordDash: "좌표: -",
    legendLabel: "지도 색상 설명",
    blueLegend: "파란색: 남은 보급품",
    redLegend: "빨간색: 사용한 보급품",
    purpleLegend: "보라색: 수기 입력 보정",
    defaultMessage: "파란 핀을 클릭하면 사용, 빨간 핀을 클릭하면 취소됩니다.",
    sidePanelLabel: "좌표 관리",
    admin: "관리자",
    adminCode: "관리자 코드",
    login: "입력",
    logout: "나가기",
    viewerMode: "보기 전용 모드",
    adminMode: "관리자 모드",
    superAdminMode: "상위 관리자 모드",
    bulkAdd: "사용 목록 대량 추가",
    paste: "붙여넣기",
    addUsed: "사용 추가",
    history: "변경 로그",
    historyHelp: "상위 관리자 전용입니다. 로그 시점을 내 화면에서만 미리 보거나, 선택한 버전을 사용자 화면에 반영할 수 있습니다.",
    snapshotCurrent: "현재 선택 단계 기록",
    refreshHistory: "로그 새로고침",
    exitPreview: "실시간 목록으로 돌아가기",
    previewNotice: "변경 로그 미리보기 중입니다. 이 상태는 내 화면에만 보입니다.",
    list: "목록",
    searchPlaceholder: "좌표 검색: 123,456",
    remainingList: "남은 보급품 목록",
    usedList: "사용한 보급품 목록",
    copy: "복사",
    important: "중요",
    allianceTitle: "보급품 연소탄 사용 주의",
    allianceLead: "보급품 연소탄은 반대 진형에만 사용하세요.",
    possible: "가능",
    possibleText: "외교 제한이 없는 반대 진형 보급품만 연소탄 사용 가능합니다.",
    diplomacyBan: "외교상 금지",
    diplomacyText: "적대 서버지만 외교 문제로 보급품 약탈 금지입니다.",
    impossible: "불가능",
    impossibleText: "우리 진형 보급품은 약탈하면 안 됩니다.",
    allianceNote: "1866은 우리 서버입니다. 같은 진형 보급품과 1870 보급품을 연소탄 범위에 넣지 마세요.",
    skipToday: "오늘은 다시 보지 않기",
    confirmRead: "확인했습니다",
    languageBadge: "언어",
    languageTitle: "언어 선택 / Select Language",
    languageLead: "처음 사용할 언어를 선택해 주세요. 나중에 상단 버튼으로 다시 바꿀 수 있습니다.",
    koChoiceHelp: "한국어 화면으로 시작합니다.",
    enChoiceHelp: "영어 화면으로 시작합니다.",
  },
  en: {
    appTitle: "Last War Coordinate Map",
    languageToggle: "한국어",
    updatedDash: "Updated -",
    sourcePrefix: "Source",
    statsDash: "Online -",
    statsTitle: "Active users / today's visits / total visits",
    countSummary: ({ supply, used }) => `Remaining supplies ${supply} · Used ${used}`,
    mapTools: "Map View",
    mapView: "View",
    showBuildings: "Buildings",
    showBuildingsHelp: "Overlay building positions on the map.",
    showGrid: "Grid",
    showGridHelp: "Overlay a faint graph-paper grid on the map.",
    fitMap: "Fit Map",
    fitMapHelp: "Fit the full 0,0 to 999,999 map.",
    rangeTools: "Range Pins",
    incendiary: "Incendiary",
    incendiaryTitle: "Preview a 9×9 incendiary range at the cursor position.",
    incendiaryHelp: "Click the map to place a temporary 9×9 range.",
    furnace: "Furnace",
    furnaceTitle: "Show the 5×5 body and 38×38 alliance furnace temperature range from the center.",
    furnaceHelp: "Click the map to place a 5×5 body and 38×38 range.",
    missile: "Missile",
    missileTitle: "Preview a 25×25 missile range at the cursor position.",
    missileHelp: "Click the map to show the center and four corner coordinates.",
    dummyBase: "Dummy Base",
    dummyBaseTitle: "Preview a 3×3 dummy base range at the cursor position.",
    dummyBaseHelp: "Click the map to place a temporary 3×3 dummy base range.",
    clearTemp: "Clear Pins",
    clearTempHelp: "Remove all temporary ranges.",
    analysis: "Analysis",
    recommendation: "Recommendations",
    recommendationHelp: "Show supply pairs that can be hit together.",
    manage: "Manage",
    clearCurrent: "Clear Current Used",
    clearCurrentHelp: "Return this source and level to unused.",
    cautionTitle: "Incendiary Caution",
    coldWarning: "Do not use incendiaries during the cold wave",
    baseWarning: "Do not include bases or gathering sites in the incendiary range",
    sourceTabsLabel: "Coordinate source",
    levelTabsLabel: "Supply level",
    level: (level) => `Level ${level}`,
    coordDash: "Coord: -",
    legendLabel: "Map color legend",
    blueLegend: "Blue: remaining supply",
    redLegend: "Red: used supply",
    purpleLegend: "Purple: manual correction",
    defaultMessage: "Click a blue pin to mark used. Click a red pin to undo.",
    sidePanelLabel: "Coordinate management",
    admin: "Admin",
    adminCode: "Admin code",
    login: "Enter",
    logout: "Exit",
    viewerMode: "View-only mode",
    adminMode: "Admin mode",
    superAdminMode: "Super admin mode",
    bulkAdd: "Bulk Add Used Coordinates",
    paste: "Paste",
    addUsed: "Add Used",
    history: "Change Log",
    historyHelp: "Super admin only. Preview log versions locally or publish a selected version to users.",
    snapshotCurrent: "Record Current Level",
    refreshHistory: "Refresh Log",
    exitPreview: "Return to Live List",
    previewNotice: "Previewing a change log version. This is visible only on your screen.",
    list: "Lists",
    searchPlaceholder: "Search coordinate: 123,456",
    remainingList: "Remaining Supplies",
    usedList: "Used Supplies",
    copy: "Copy",
    important: "Important",
    allianceTitle: "Supply Incendiary Warning",
    allianceLead: "Use supply incendiaries only against the opposing side.",
    possible: "Allowed",
    possibleText: "Opposing-side supplies only, except diplomacy-ban targets.",
    diplomacyBan: "Diplomacy Ban",
    diplomacyText: "1870 is hostile, but supply raids are banned by diplomacy.",
    impossible: "Not Allowed",
    impossibleText: "Do not raid supplies from our side.",
    allianceNote: "1866 is our server. Do not include same-side or 1870 supplies in an incendiary range.",
    skipToday: "Do not show again today",
    confirmRead: "Understood",
    languageBadge: "Language",
    languageTitle: "Select Language / 언어 선택",
    languageLead: "Choose the language for this map. You can change it later from the top button.",
    koChoiceHelp: "Start with the Korean interface.",
    enChoiceHelp: "Start with the English interface.",
  },
};

const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const supplyCount = document.getElementById("supplyCount");
const usedCount = document.getElementById("usedCount");
const hoverCoord = document.getElementById("hoverCoord");
const message = document.getElementById("message");
const addInput = document.getElementById("addInput");
const adminCodeInput = document.getElementById("adminCodeInput");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminLogoutButton = document.getElementById("adminLogoutButton");
const adminState = document.getElementById("adminState");
const supplyList = document.getElementById("supplyList");
const usedList = document.getElementById("usedList");
const supplyListCount = document.getElementById("supplyListCount");
const usedListCount = document.getElementById("usedListCount");
const searchInput = document.getElementById("searchInput");
const toast = document.getElementById("toast");
const languageModal = document.getElementById("languageModal");
const languageToggle = document.getElementById("languageToggle");
const allianceNotice = document.getElementById("allianceNotice");
const closeAllianceNoticeButton = document.getElementById("closeAllianceNotice");
const skipAllianceNoticeCheckbox = document.getElementById("skipAllianceNotice");
const updatedAtLabel = document.getElementById("updatedAtLabel");
const sourceLabel = document.getElementById("sourceLabel");
const sourceTabs = document.getElementById("sourceTabs");
const bulkAddSection = document.getElementById("bulkAddSection");
const buildingToggle = document.getElementById("buildingToggle");
const gridToggle = document.getElementById("gridToggle");
const incendiaryToggle = document.getElementById("incendiaryToggle");
const furnaceToggle = document.getElementById("furnaceToggle");
const missileToggle = document.getElementById("missileToggle");
const dummyBaseToggle = document.getElementById("dummyBaseToggle");
const recommendationToggle = document.getElementById("recommendationToggle");
const clearTempButton = document.getElementById("clearTempButton");
const recommendationSection = document.getElementById("recommendationSection");
const recommendationList = document.getElementById("recommendationList");
const recommendationCount = document.getElementById("recommendationCount");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const createHistorySnapshotButton = document.getElementById("createHistorySnapshotButton");
const refreshHistoryButton = document.getElementById("refreshHistoryButton");
const exitHistoryPreviewButton = document.getElementById("exitHistoryPreviewButton");
const historyPreviewNotice = document.getElementById("historyPreviewNotice");
const statsLabel = document.getElementById("statsLabel");
const levelTabs = document.getElementById("levelTabs");
const cursorCoord = document.getElementById("cursorCoord");

const layers = {
  supply: new Set(),
  used: new Set(),
  supplyBySource: {},
  savedUsedBySource: {},
  initialUsedBySource: {},
  hiddenInitialBySource: {},
};
const buildings = createBuildings();
const STORAGE_KEY = "lastwar-coordinate-map-v2";
const LEVEL_STORAGE_KEY = "lastwar-active-supply-level";
const SOURCE_STORAGE_KEY = "lastwar-active-supply-source";
const LEGACY_STORAGE_KEY = "lastwar-coordinate-map-v1";
const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:4174" : "";
const ADMIN_TOKEN_KEY = "lastwar-admin-token";
const ADMIN_ROLE_KEY = "lastwar-admin-role";
const BUILDING_TOGGLE_KEY = "lastwar-show-buildings";
const GRID_TOGGLE_KEY = "lastwar-show-grid";
const INCENDIARY_TOGGLE_KEY = "lastwar-show-incendiary";
const FURNACE_TOGGLE_KEY = "lastwar-show-furnace";
const MISSILE_TOGGLE_KEY = "lastwar-show-missile";
const DUMMY_BASE_TOGGLE_KEY = "lastwar-show-dummy-base";
const RECOMMENDATION_TOGGLE_KEY = "lastwar-show-incendiary-recommendations";
const TEMP_RANGES_KEY = "lastwar-temp-ranges";
const CLIENT_ID_KEY = "lastwar-client-id";
const VISIT_RECORDED_KEY = "lastwar-visit-recorded-date";
const ALLIANCE_NOTICE_KEY = "lastwar-alliance-notice-date-v2";
const HEARTBEAT_MS = 30 * 1000;
const STATS_POLL_MS = 20 * 1000;

let view = { x: 0, y: 0, size: MAP_SIZE };
let isDragging = false;
let dragStart = null;
let touchGesture = null;
let lastTouchAt = 0;
let currentLanguage = localStorage.getItem(LANG_KEY) === "en" ? "en" : "ko";
let adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
let adminRole = sessionStorage.getItem(ADMIN_ROLE_KEY) || decodeAdminRole(adminToken);
let isAdmin = Boolean(adminToken);
let isSuperAdmin = adminRole === "super";
let toastTimer = null;
let latestUpdatedAt = "";
let showBuildings = localStorage.getItem(BUILDING_TOGGLE_KEY) === "1";
let showGrid = localStorage.getItem(GRID_TOGGLE_KEY) === "1";
let showIncendiary = localStorage.getItem(INCENDIARY_TOGGLE_KEY) === "1";
let showFurnace = localStorage.getItem(FURNACE_TOGGLE_KEY) === "1";
let showMissile = localStorage.getItem(MISSILE_TOGGLE_KEY) === "1";
let showDummyBase = localStorage.getItem(DUMMY_BASE_TOGGLE_KEY) === "1";
let showRecommendations = localStorage.getItem(RECOMMENDATION_TOGGLE_KEY) === "1";
let hoverMapPoint = null;
let clientId = "";
let heartbeatTimer = null;
let statsTimer = null;
let activeSource = normalizeSource(localStorage.getItem(SOURCE_STORAGE_KEY) || DEFAULT_SOURCE);
let activeLevel = normalizeLevel(localStorage.getItem(LEVEL_STORAGE_KEY) || DEFAULT_LEVEL);
let pulses = [];
let pulseFrame = null;
let activeRecommendationId = "";
let tempRanges = loadTempRanges();
let historyEntries = [];
let isHistoryPreview = false;

function keyOf(x, y) {
  return `${x},${y}`;
}

function t(key, params) {
  const value = I18N[currentLanguage]?.[key] ?? I18N.ko[key] ?? key;
  return typeof value === "function" ? value(params || {}) : value;
}

function manualUsedNote() {
  return MANUAL_USED_NOTE[currentLanguage] || MANUAL_USED_NOTE.ko;
}

function countText(value) {
  const formatted = Number(value || 0).toLocaleString(currentLanguage === "ko" ? "ko-KR" : "en-US");
  return currentLanguage === "ko" ? `${formatted}개` : formatted;
}

function coordinateLabel(x, y, tags = []) {
  return `${currentLanguage === "ko" ? "좌표" : "Coord"}: ${x},${y}${tags.length ? ` · ${tags.join("/")}` : ""}`;
}

function decodeAdminRole(token) {
  if (!token || !token.includes(".")) return "";
  try {
    const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return payload.role === "super" ? "super" : "admin";
  } catch {
    return "";
  }
}

function loadTempRanges() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEMP_RANGES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        (item?.type === "incendiary" || item?.type === "furnace" || item?.type === "missile" || item?.type === "dummyBase") &&
        Number.isInteger(item.x) &&
        Number.isInteger(item.y) &&
        item.x >= 0 &&
        item.x <= 999 &&
        item.y >= 0 &&
        item.y <= 999,
    );
  } catch {
    return [];
  }
}

function saveTempRanges() {
  localStorage.setItem(TEMP_RANGES_KEY, JSON.stringify(tempRanges));
}

function syncRangeModeToggles() {
  localStorage.setItem(INCENDIARY_TOGGLE_KEY, showIncendiary ? "1" : "0");
  localStorage.setItem(FURNACE_TOGGLE_KEY, showFurnace ? "1" : "0");
  localStorage.setItem(MISSILE_TOGGLE_KEY, showMissile ? "1" : "0");
  localStorage.setItem(DUMMY_BASE_TOGGLE_KEY, showDummyBase ? "1" : "0");
  incendiaryToggle.setAttribute("aria-pressed", String(showIncendiary));
  incendiaryToggle.classList.toggle("is-active", showIncendiary);
  furnaceToggle.setAttribute("aria-pressed", String(showFurnace));
  furnaceToggle.classList.toggle("is-active", showFurnace);
  missileToggle.setAttribute("aria-pressed", String(showMissile));
  missileToggle.classList.toggle("is-active", showMissile);
  dummyBaseToggle.setAttribute("aria-pressed", String(showDummyBase));
  dummyBaseToggle.classList.toggle("is-active", showDummyBase);
  if (!showIncendiary && !showFurnace && !showMissile && !showDummyBase) hoverMapPoint = null;
}

function setRangeMode(mode) {
  showIncendiary = mode === "incendiary";
  showFurnace = mode === "furnace";
  showMissile = mode === "missile";
  showDummyBase = mode === "dummyBase";
  syncRangeModeToggles();
}

function rangeName(type) {
  if (type === "furnace") return currentLanguage === "ko" ? "용광로" : "furnace";
  if (type === "missile") return currentLanguage === "ko" ? "미사일" : "missile";
  if (type === "dummyBase") return currentLanguage === "ko" ? "더미 기지" : "dummy base";
  return currentLanguage === "ko" ? "연소탄" : "incendiary";
}

function activeRangeType() {
  if (showFurnace) return "furnace";
  if (showMissile) return "missile";
  if (showDummyBase) return "dummyBase";
  if (showIncendiary) return "incendiary";
  return "";
}

function addTempRange(type, point) {
  const item = { type, x: point.x, y: point.y };
  tempRanges.push(item);
  saveTempRanges();
  draw();
  setMessage(
    currentLanguage === "ko"
      ? `${rangeName(type)} 임시 위치 ${point.x},${point.y}를 표시했습니다.`
      : `Placed temporary ${rangeName(type)} range at ${point.x},${point.y}.`,
  );
}

function normalizeLevel(value) {
  const level = String(value || DEFAULT_LEVEL);
  return LEVELS.includes(level) ? level : DEFAULT_LEVEL;
}

function normalizeSource(value) {
  const source = String(value || DEFAULT_SOURCE);
  return SOURCE_KEYS.includes(source) ? source : DEFAULT_SOURCE;
}

function sourceHasLevel(source, level) {
  return Boolean(SUPPLY_SOURCES[normalizeSource(source)].supplyByLevel[normalizeLevel(level)]);
}

function firstLevelForSource(source) {
  return Object.keys(SUPPLY_SOURCES[normalizeSource(source)].supplyByLevel).sort((a, b) => Number(a) - Number(b))[0] || DEFAULT_LEVEL;
}

function emptyUsedByLevel() {
  return Object.fromEntries(LEVELS.map((level) => [level, new Set()]));
}

function emptyUsedBySource() {
  return Object.fromEntries(SOURCE_KEYS.map((source) => [source, emptyUsedByLevel()]));
}

function normalizeUsedByLevel(input) {
  const next = emptyUsedByLevel();
  if (!input || typeof input !== "object") return next;
  for (const level of LEVELS) {
    for (const coord of Array.isArray(input[level]) ? input[level] : []) {
      if (isCoordinateText(coord)) next[level].add(coord);
    }
  }
  return next;
}

function normalizeUsedBySource(input) {
  const next = emptyUsedBySource();
  if (!input || typeof input !== "object") return next;
  for (const source of SOURCE_KEYS) {
    next[source] = normalizeUsedByLevel(input[source]);
  }
  return next;
}

function isCoordinateText(value) {
  return typeof value === "string" && /^\d{1,3},\d{1,3}$/.test(value);
}

function syncActiveLayers() {
  activeSource = normalizeSource(activeSource);
  activeLevel = normalizeLevel(activeLevel);
  if (!sourceHasLevel(activeSource, activeLevel)) activeLevel = firstLevelForSource(activeSource);
  layers.supply = layers.supplyBySource[activeSource]?.[activeLevel] || new Set();
  const initialUsed = layers.initialUsedBySource[activeSource]?.[activeLevel] || new Set();
  const hiddenInitial = layers.hiddenInitialBySource[activeSource]?.[activeLevel] || new Set();
  const savedUsed = layers.savedUsedBySource[activeSource]?.[activeLevel] || new Set();
  layers.used = new Set([...Array.from(initialUsed).filter((coord) => !hiddenInitial.has(coord)), ...savedUsed]);
}

function applyState(data) {
  layers.savedUsedBySource = normalizeUsedBySource(data.usedBySource);
  layers.hiddenInitialBySource = normalizeUsedBySource(data.hiddenInitialBySource);
  if (!data.usedBySource) {
    layers.savedUsedBySource[DEFAULT_SOURCE] = normalizeUsedByLevel(data.usedByLevel);
    if (!data.usedByLevel && Array.isArray(data.used)) {
      layers.savedUsedBySource[DEFAULT_SOURCE][DEFAULT_LEVEL] = new Set(data.used.filter(isCoordinateText));
    }
  }
  syncActiveLayers();
  latestUpdatedAt = data.updatedAt || "";
}

function parseCoordinates(text) {
  const matches = text.match(/-?\d+/g) || [];
  const parsed = [];
  const invalid = [];

  for (let i = 0; i < matches.length; i += 2) {
    if (matches[i + 1] === undefined) {
      invalid.push(matches[i]);
      break;
    }
    const x = Number(matches[i]);
    const y = Number(matches[i + 1]);
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
      parsed.push([x, y]);
    } else {
      invalid.push(`${x},${y}`);
    }
  }

  return { parsed, invalid };
}

async function loadInitialData() {
  layers.supplyBySource = {};
  layers.savedUsedBySource = emptyUsedBySource();
  layers.initialUsedBySource = emptyUsedBySource();
  layers.hiddenInitialBySource = emptyUsedBySource();
  for (const source of SOURCE_KEYS) {
    layers.supplyBySource[source] = {};
    for (const level of LEVELS) {
      layers.supplyBySource[source][level] = new Set();
      for (const [x, y] of parseCoordinates(SUPPLY_SOURCES[source].supplyByLevel[level] || "").parsed) {
        layers.supplyBySource[source][level].add(keyOf(x, y));
      }
      for (const [x, y] of parseCoordinates(SUPPLY_SOURCES[source].initialUsedByLevel[level] || "").parsed) {
        layers.initialUsedBySource[source][level].add(keyOf(x, y));
      }
    }
  }
  syncActiveLayers();

  setAdminMode(isAdmin, isAdmin ? t("adminMode") : t("viewerMode"));
  renderSourceTabs();
  renderLevelTabs();

  try {
    const data = await apiFetch("/api/state");
    applyState(data);
    refresh(currentLanguage === "ko" ? "서버의 사용 목록을 불러왔습니다." : "Loaded the used list from the server.");
    return;
  } catch {
    setMessage(currentLanguage === "ko" ? "서버 연결이 없어 임시 로컬 데이터로 표시합니다." : "Server is unavailable. Showing temporary local data.");
  }

  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.usedBySource) {
        layers.savedUsedBySource = normalizeUsedBySource(parsed.usedBySource);
        layers.hiddenInitialBySource = normalizeUsedBySource(parsed.hiddenInitialBySource);
      } else if (parsed.usedByLevel) {
        layers.savedUsedBySource[DEFAULT_SOURCE] = normalizeUsedByLevel(parsed.usedByLevel);
      } else {
        layers.savedUsedBySource = emptyUsedBySource();
        layers.savedUsedBySource[DEFAULT_SOURCE][DEFAULT_LEVEL] = new Set(Array.isArray(parsed.used) ? parsed.used.filter(isCoordinateText) : []);
      }
      syncActiveLayers();
      latestUpdatedAt = parsed.updatedAt || "";
      refresh(currentLanguage === "ko" ? "저장된 좌표를 불러왔습니다." : "Loaded saved coordinates.");
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  for (const [x, y] of parseCoordinates(INITIAL_USED).parsed) layers.savedUsedBySource[DEFAULT_SOURCE][DEFAULT_LEVEL].add(keyOf(x, y));
  syncActiveLayers();
  latestUpdatedAt = new Date().toISOString();
  refresh(currentLanguage === "ko" ? "사진 좌표를 불러왔습니다. 파란 보급품 핀을 클릭하면 사용 목록으로 이동합니다." : "Loaded photo coordinates. Click a blue supply pin to move it to the used list.");
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "요청에 실패했습니다.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function setAdminMode(nextIsAdmin, text) {
  isAdmin = nextIsAdmin;
  isSuperAdmin = isAdmin && adminRole === "super";
  document.body.classList.toggle("is-admin", isAdmin);
  document.body.classList.toggle("is-super-admin", isSuperAdmin);
  bulkAddSection.hidden = !isAdmin;
  if (historySection) historySection.hidden = !isSuperAdmin;
  if (!isSuperAdmin) {
    historyEntries = [];
    if (historyList) historyList.innerHTML = "";
    if (historyCount) historyCount.textContent = countText(0);
    clearHistoryPreview(false);
  }
  recommendationSection.hidden = !showRecommendations;
  adminState.textContent = text || (isSuperAdmin ? t("superAdminMode") : isAdmin ? t("adminMode") : t("viewerMode"));
  if (isAdmin) startStatsPolling();
  else stopStatsPolling();
  if (isSuperAdmin) loadHistory();
}

function setText(selector, value) {
  const element = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (element) element.textContent = value;
}

function setAttr(selector, name, value) {
  const element = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (element) element.setAttribute(name, value);
}

function setDotLabel(element, dotClass, label) {
  if (!element) return;
  element.innerHTML = `<b class="dot ${dotClass}"></b>${escapeHtml(label)}`;
}

function updateCountSummary() {
  const summary = document.querySelector(".map-toolbar p");
  if (!summary) return;
  const supply = getRemainingSupply().size.toLocaleString(currentLanguage === "ko" ? "ko-KR" : "en-US");
  const used = layers.used.size.toLocaleString(currentLanguage === "ko" ? "ko-KR" : "en-US");
  summary.innerHTML =
    currentLanguage === "ko"
      ? `남은 보급품 <span id="supplyCount">${supply}</span>개 · 사용 <span id="usedCount">${used}</span>개`
      : `Remaining supplies <span id="supplyCount">${supply}</span> · Used <span id="usedCount">${used}</span>`;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = t("appTitle");
  setText("h1", t("appTitle"));
  setText(languageToggle, t("languageToggle"));
  setText(updatedAtLabel, formatUpdatedAt(latestUpdatedAt));
  setText(sourceLabel, `${t("sourcePrefix")} ${historySourceLabel(activeSource)}`);
  setText(statsLabel, t("statsDash"));
  setAttr(statsLabel, "title", t("statsTitle"));
  updateCountSummary();
  setAttr(".toolbar-actions", "aria-label", t("mapTools"));
  const groups = document.querySelectorAll(".tool-group-title");
  [t("mapView"), t("rangeTools"), t("analysis"), t("manage")].forEach((label, index) => setText(groups[index], label));
  setText(buildingToggle, t("showBuildings"));
  setText(buildingToggle.closest(".tool-control")?.querySelector("small"), t("showBuildingsHelp"));
  setText(gridToggle, t("showGrid"));
  setText(gridToggle.closest(".tool-control")?.querySelector("small"), t("showGridHelp"));
  setText("#fitButton", t("fitMap"));
  setText(document.getElementById("fitButton")?.closest(".tool-control")?.querySelector("small"), t("fitMapHelp"));
  setText(incendiaryToggle, t("incendiary"));
  setAttr(incendiaryToggle, "title", t("incendiaryTitle"));
  setText(incendiaryToggle.closest(".tool-control")?.querySelector("small"), t("incendiaryHelp"));
  setText(furnaceToggle, t("furnace"));
  setAttr(furnaceToggle, "title", t("furnaceTitle"));
  setText(furnaceToggle.closest(".tool-control")?.querySelector("small"), t("furnaceHelp"));
  setText(missileToggle, t("missile"));
  setAttr(missileToggle, "title", t("missileTitle"));
  setText(missileToggle.closest(".tool-control")?.querySelector("small"), t("missileHelp"));
  setText(dummyBaseToggle, t("dummyBase"));
  setAttr(dummyBaseToggle, "title", t("dummyBaseTitle"));
  setText(dummyBaseToggle.closest(".tool-control")?.querySelector("small"), t("dummyBaseHelp"));
  setText(clearTempButton, t("clearTemp"));
  setText(clearTempButton.closest(".tool-control")?.querySelector("small"), t("clearTempHelp"));
  setText(recommendationToggle, t("recommendation"));
  setText(recommendationToggle.closest(".tool-control")?.querySelector("small"), t("recommendationHelp"));
  setText("#clearButton", t("clearCurrent"));
  setText(document.getElementById("clearButton")?.closest(".tool-control")?.querySelector("small"), t("clearCurrentHelp"));
  setText(".notice-box strong", t("cautionTitle"));
  const noticeItems = document.querySelectorAll(".notice-box span");
  setText(noticeItems[0], t("coldWarning"));
  setText(noticeItems[1], t("baseWarning"));
  setAttr(".notice-box", "aria-label", t("cautionTitle"));
  setAttr(sourceTabs, "aria-label", t("sourceTabsLabel"));
  setAttr(levelTabs, "aria-label", t("levelTabsLabel"));
  setText(hoverCoord, t("coordDash"));
  setAttr(".legend", "aria-label", t("legendLabel"));
  const legendItems = document.querySelectorAll(".legend span");
  setDotLabel(legendItems[0], "supply-dot", t("blueLegend"));
  setDotLabel(legendItems[1], "used-dot", t("redLegend"));
  setDotLabel(legendItems[2], "manual-dot", t("purpleLegend"));
  if (message.textContent === I18N.ko.defaultMessage || message.textContent === I18N.en.defaultMessage) setText(message, t("defaultMessage"));
  setAttr(".side-panel", "aria-label", t("sidePanelLabel"));
  setText(".admin-login-section h2", t("admin"));
  setAttr(adminCodeInput, "placeholder", t("adminCode"));
  setText(adminLoginButton, t("login"));
  setText(adminLogoutButton, t("logout"));
  if (!isAdmin) setText(adminState, t("viewerMode"));
  else setText(adminState, isSuperAdmin ? t("superAdminMode") : t("adminMode"));
  setText("#bulkAddSection h2", t("bulkAdd"));
  setText("#pasteAddButton", t("paste"));
  setText("#addButton", t("addUsed"));
  setText("#historySection h2", t("history"));
  setText(".history-section .section-help", t("historyHelp"));
  setText(createHistorySnapshotButton, t("snapshotCurrent"));
  setText(refreshHistoryButton, t("refreshHistory"));
  setText(exitHistoryPreviewButton, t("exitPreview"));
  setText(historyPreviewNotice, t("previewNotice"));
  setText("#recommendationSection h2", t("recommendation"));
  setText(".compact h2", t("list"));
  setAttr(searchInput, "placeholder", t("searchPlaceholder"));
  const listHeaders = document.querySelectorAll(".list-header > span:first-child");
  setDotLabel(listHeaders[0], "supply-dot", t("remainingList"));
  setDotLabel(listHeaders[1], "used-dot", t("usedList"));
  setText("#copySupplyButton", t("copy"));
  setText("#copyUsedButton", t("copy"));
  setText(".alliance-modal .warning-badge", t("important"));
  setText("#allianceNoticeTitle", t("allianceTitle"));
  const leadStrong = document.querySelector(".alliance-modal-lead strong");
  if (leadStrong) {
    document.querySelector(".alliance-modal-lead").innerHTML =
      currentLanguage === "ko"
        ? `보급품 연소탄은 <strong>반대 진형</strong>에만 사용하세요.`
        : `Use supply incendiaries only against the <strong>opposing side</strong>.`;
  }
  setAttr(".alliance-rule-grid", "aria-label", currentLanguage === "ko" ? "연소탄 사용 기준" : "Incendiary usage rules");
  const ruleCards = document.querySelectorAll(".rule-card");
  setText(ruleCards[0]?.querySelector("span"), t("possible"));
  setText(ruleCards[0]?.querySelector("strong"), "#1865 · #1882 · #1890");
  setText(ruleCards[0]?.querySelector("p"), t("possibleText"));
  setText(ruleCards[1]?.querySelector("span"), t("diplomacyBan"));
  setText(ruleCards[1]?.querySelector("strong"), "#1870");
  setText(ruleCards[1]?.querySelector("p"), t("diplomacyText"));
  setText(ruleCards[2]?.querySelector("span"), t("impossible"));
  setText(ruleCards[2]?.querySelector("strong"), "#1866 · #1884 · #1891 · #1869");
  setText(ruleCards[2]?.querySelector("p"), t("impossibleText"));
  setText(".alliance-modal .alliance-modal-note", t("allianceNote"));
  setText(".notice-check span", t("skipToday"));
  setText("#closeAllianceNotice", t("confirmRead"));
  setText(".language-modal .warning-badge", t("languageBadge"));
  setText("#languageModalTitle", t("languageTitle"));
  setText(".language-modal .alliance-modal-note", t("languageLead"));
  setText('.language-choice[data-lang-choice="ko"] span', t("koChoiceHelp"));
  setText('.language-choice[data-lang-choice="en"] span', t("enChoiceHelp"));
  renderLevelTabs();
  renderSourceTabs();
}

function renderLevelTabs() {
  for (const button of levelTabs.querySelectorAll("button[data-level]")) {
    const selected = button.dataset.level === activeLevel;
    const available = sourceHasLevel(activeSource, button.dataset.level);
    button.textContent = t("level", button.dataset.level);
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.disabled = !available;
    button.hidden = !available;
  }
  const activeSourceMeta = SUPPLY_SOURCES[activeSource];
  sourceLabel.hidden = !activeSourceMeta.sourceUrl;
  if (activeSourceMeta.sourceUrl) sourceLabel.href = activeSourceMeta.sourceUrl;
  else sourceLabel.removeAttribute("href");
  sourceLabel.textContent = `${t("sourcePrefix")} ${historySourceLabel(activeSource)}`;
}

function renderSourceTabs() {
  for (const button of sourceTabs.querySelectorAll("button[data-source]")) {
    const selected = button.dataset.source === activeSource;
    button.textContent = historySourceLabel(button.dataset.source);
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  }
}

function setActiveLevel(level) {
  activeLevel = normalizeLevel(level);
  if (!sourceHasLevel(activeSource, activeLevel)) activeLevel = firstLevelForSource(activeSource);
  localStorage.setItem(LEVEL_STORAGE_KEY, activeLevel);
  syncActiveLayers();
  pulses = [];
  if (pulseFrame) {
    cancelAnimationFrame(pulseFrame);
    pulseFrame = null;
  }
  activeRecommendationId = "";
  renderLevelTabs();
  refresh(currentLanguage === "ko" ? `${activeLevel}단계 보급품을 표시합니다.` : `Showing Level ${activeLevel} supplies.`);
}

function setActiveSource(source) {
  activeSource = normalizeSource(source);
  if (!sourceHasLevel(activeSource, activeLevel)) activeLevel = firstLevelForSource(activeSource);
  localStorage.setItem(SOURCE_STORAGE_KEY, activeSource);
  localStorage.setItem(LEVEL_STORAGE_KEY, activeLevel);
  syncActiveLayers();
  pulses = [];
  if (pulseFrame) {
    cancelAnimationFrame(pulseFrame);
    pulseFrame = null;
  }
  activeRecommendationId = "";
  renderSourceTabs();
  renderLevelTabs();
  refresh(currentLanguage === "ko" ? `${historySourceLabel(activeSource)} 출처로 전환했습니다.` : `Switched to ${historySourceLabel(activeSource)} source.`);
}

function getOrCreateClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function todayUtcDateString() {
  return new Date().toISOString().slice(0, 10);
}

function todayKoreaDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  })
    .formatToParts(new Date())
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function setLanguage(language, options = {}) {
  currentLanguage = language === "en" ? "en" : "ko";
  localStorage.setItem(LANG_KEY, currentLanguage);
  applyTranslations();
  renderList();
  renderRecommendations();
  renderHistory(historyEntries);
  if (isAdmin) refreshStats();
  draw();
  if (options.closeModal && languageModal) languageModal.hidden = true;
  if (options.showAlliance) showAllianceNoticeIfNeeded();
}

function showLanguageModalIfNeeded() {
  if (!languageModal) return false;
  if (localStorage.getItem(LANG_KEY)) return false;
  applyTranslations();
  languageModal.hidden = false;
  languageModal.querySelector("button[data-lang-choice]")?.focus();
  return true;
}

function showAllianceNoticeIfNeeded() {
  if (languageModal && !languageModal.hidden) return;
  if (!allianceNotice) return;
  try {
    if (localStorage.getItem(ALLIANCE_NOTICE_KEY) === todayKoreaDateString()) return;
  } catch {}
  allianceNotice.hidden = false;
  closeAllianceNoticeButton?.focus();
}

function closeAllianceNotice() {
  if (!allianceNotice) return;
  if (skipAllianceNoticeCheckbox?.checked) {
    try {
      localStorage.setItem(ALLIANCE_NOTICE_KEY, todayKoreaDateString());
    } catch {}
  }
  allianceNotice.hidden = true;
}

async function sendHeartbeat() {
  if (!clientId) return;
  try {
    await fetch(`${API_BASE}/api/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
      keepalive: true,
    });
  } catch {}
}

async function recordVisitIfNeeded() {
  const today = todayUtcDateString();
  try {
    if (localStorage.getItem(VISIT_RECORDED_KEY) === today) {
      sendHeartbeat();
      return;
    }
  } catch {}
  try {
    await fetch(`${API_BASE}/api/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
      keepalive: true,
    });
    try {
      localStorage.setItem(VISIT_RECORDED_KEY, today);
    } catch {}
  } catch {}
}

async function refreshStats() {
  if (!isAdmin) return;
  try {
    const data = await apiFetch("/api/stats");
    if (!statsLabel) return;
    statsLabel.textContent =
      currentLanguage === "ko"
        ? `접속 ${Number(data.active) || 0} · 오늘 ${Number(data.today) || 0} · 누적 ${Number(data.total) || 0}`
        : `Online ${Number(data.active) || 0} · Today ${Number(data.today) || 0} · Total ${Number(data.total) || 0}`;
  } catch (error) {
    if (error.status === 401 || error.status === 403) stopStatsPolling();
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatHistoryTime(value) {
  const label = formatUpdatedAt(value);
  if (label === t("updatedDash")) return "-";
  return label.replace(/^최신화\s+/, "").replace(/^Updated\s+/, "");
}

function historySourceLabel(source) {
  const normalizedSource = normalizeSource(source);
  if (normalizedSource === "geumgo" && currentLanguage === "en") return "Geumgo";
  if (normalizedSource === "untitled") return currentLanguage === "ko" ? "무제" : "Untitled";
  return SUPPLY_SOURCES[normalizedSource]?.label || source;
}

function buildingName(type) {
  return BUILDING_NAMES[currentLanguage]?.[type] || BUILDING_NAMES.ko[type] || String(type);
}

function historyCoordButtons(coords, className, label, max = 10) {
  const visible = coords.slice(0, max);
  const buttons = visible
    .map(
      (coord) =>
        `<button class="history-coord ${className}" type="button" data-action="history-jump" data-coord="${coord}" title="${label}">${coord}</button>`,
    )
    .join("");
  const hidden = coords.length > visible.length ? `<span class="history-meta">+${countText(coords.length - visible.length)}</span>` : "";
  return buttons + hidden;
}

function historySummary(entry) {
  if (currentLanguage === "ko") return entry.summary || "변경 사항";
  if (entry.action === "snapshot") {
    return `Start snapshot: ${historySourceLabel(entry.source)} Level ${entry.level}, used ${entry.totalsAfter?.used ?? 0}, hidden ${entry.totalsAfter?.hiddenInitial ?? 0}`;
  }
  const parts = [];
  const usedAdded = entry.diff?.used?.added?.length || 0;
  const usedRemoved = entry.diff?.used?.removed?.length || 0;
  const hiddenAdded = entry.diff?.hiddenInitial?.added?.length || 0;
  const hiddenRemoved = entry.diff?.hiddenInitial?.removed?.length || 0;
  if (usedAdded) parts.push(`used added ${usedAdded}`);
  if (usedRemoved) parts.push(`used removed ${usedRemoved}`);
  if (hiddenAdded) parts.push(`initial used hidden ${hiddenAdded}`);
  if (hiddenRemoved) parts.push(`initial used restored ${hiddenRemoved}`);
  return parts.length ? parts.join(", ") : "Change";
}

function renderHistory(entries = historyEntries) {
  if (!historyList || !historyCount) return;
  historyEntries = Array.isArray(entries) ? entries : [];
  historyCount.textContent = countText(historyEntries.length);

  if (!historyEntries.length) {
    historyList.innerHTML = `<div class="empty-list">${
      currentLanguage === "ko"
        ? "기능 적용 이후 아직 기록된 변경이 없습니다. 지금부터 사용 추가/취소를 하면 시간별 로그가 쌓입니다."
        : "No changes have been recorded since this feature was added. New add/undo actions will appear here."
    }</div>`;
    return;
  }

  historyList.innerHTML = historyEntries
    .map((entry) => {
      const usedAdded = entry.diff?.used?.added || [];
      const usedRemoved = entry.diff?.used?.removed || [];
      const hiddenAdded = entry.diff?.hiddenInitial?.added || [];
      const hiddenRemoved = entry.diff?.hiddenInitial?.removed || [];
      const addedCoords = [...usedAdded, ...hiddenRemoved];
      const removedCoords = [...usedRemoved, ...hiddenAdded];
      const coordsHtml = [
        addedCoords.length ? historyCoordButtons(addedCoords, "added", currentLanguage === "ko" ? "사용으로 바뀐 좌표" : "Coordinates changed to used") : "",
        removedCoords.length ? historyCoordButtons(removedCoords, "removed", currentLanguage === "ko" ? "미사용으로 바뀐 좌표" : "Coordinates changed to unused") : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <article class="history-row" data-history-id="${entry.id}">
          <div class="history-row-header">
            <span class="history-meta">${formatHistoryTime(entry.createdAt)} · ${historySourceLabel(entry.source)} ${t("level", entry.level)}</span>
            <span class="history-meta">${entry.action || "update"}</span>
          </div>
          <div class="history-summary">${escapeHtml(historySummary(entry))}</div>
          ${coordsHtml ? `<div class="history-coords">${coordsHtml}</div>` : ""}
          <div class="history-row-actions">
            <button class="row-action" type="button" data-action="history-preview" data-id="${entry.id}" data-snapshot="before">${currentLanguage === "ko" ? "변경 전 보기" : "Preview Before"}</button>
            <button class="row-action" type="button" data-action="history-preview" data-id="${entry.id}" data-snapshot="after">${currentLanguage === "ko" ? "변경 후 보기" : "Preview After"}</button>
            <button class="row-action history-publish-button" type="button" data-action="history-publish" data-id="${entry.id}">${currentLanguage === "ko" ? "이 버전을 사용자 화면에 반영" : "Publish This Version"}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadHistory() {
  if (!isSuperAdmin) return;
  try {
    const data = await apiFetch("/api/history?limit=100");
    renderHistory(data.history || []);
  } catch (error) {
    renderHistory([]);
    if (error.status === 401 || error.status === 403) {
      logoutAdmin("상위 관리자 코드가 만료되었거나 올바르지 않습니다.");
      return;
    }
    if (historyList) {
      historyList.innerHTML = `<div class="empty-list">${
        currentLanguage === "ko"
          ? "변경 로그 저장소를 확인할 수 없습니다. Supabase에서 used_history 테이블이 생성되어 있는지 확인해 주세요."
          : "The change-log store is unavailable. Check that the used_history table exists in Supabase."
      }</div>`;
    }
    setMessage(currentLanguage === "ko" ? `변경 로그를 불러오지 못했습니다: ${error.message}` : `Could not load change log: ${error.message}`);
  }
}

async function createHistorySnapshot() {
  if (!isSuperAdmin) return;
  const label = `${historySourceLabel(activeSource)} ${t("level", activeLevel)}`;
  if (!confirm(currentLanguage === "ko" ? `현재 선택한 ${label} 사용 상태만 변경 로그의 기준점으로 기록할까요?` : `Record only the selected ${label} used state as a change-log baseline?`)) return;
  try {
    const data = await apiFetch("/api/history/snapshot", {
      method: "POST",
      body: JSON.stringify({ source: activeSource, level: activeLevel }),
    });
    if (data.history) {
      historyEntries = [data.history, ...historyEntries.filter((entry) => entry.id !== data.history.id)];
      renderHistory(historyEntries);
    } else {
      await loadHistory();
    }
    setMessage(currentLanguage === "ko" ? `${label} 현재 상태를 변경 로그에 기록했습니다.` : `Recorded the current ${label} state in the change log.`);
    showToast(currentLanguage === "ko" ? `${label} 상태를 기록했습니다.` : `Recorded ${label}.`);
  } catch (error) {
    setMessage(currentLanguage === "ko" ? `현재 상태 기록 실패: ${error.message}` : `Could not record current state: ${error.message}`);
    if (historyList) {
      historyList.innerHTML = `<div class="empty-list">${
        currentLanguage === "ko"
          ? "현재 상태를 기록하지 못했습니다. Supabase에서 used_history 테이블이 생성되어 있는지 확인해 주세요."
          : "Could not record the current state. Check that the used_history table exists in Supabase."
      }</div>`;
    }
  }
}

async function previewHistoryVersion(id, snapshot) {
  if (!isSuperAdmin) return;
  const entry = historyEntries.find((item) => item.id === id);
  try {
    const data = await apiFetch("/api/history/restore", {
      method: "POST",
      body: JSON.stringify({ historyId: id, snapshot, publish: false }),
    });
    if (entry) {
      activeSource = normalizeSource(entry.source);
      activeLevel = normalizeLevel(entry.level);
      localStorage.setItem(SOURCE_STORAGE_KEY, activeSource);
      localStorage.setItem(LEVEL_STORAGE_KEY, activeLevel);
    }
    applyState(data.state);
    isHistoryPreview = true;
    if (historyPreviewNotice) historyPreviewNotice.hidden = false;
    if (exitHistoryPreviewButton) exitHistoryPreviewButton.hidden = false;
    refresh(
      currentLanguage === "ko"
        ? `${snapshot === "before" ? "변경 전" : "변경 후"} 버전을 내 화면에서만 미리봅니다.`
        : `Previewing the ${snapshot === "before" ? "before" : "after"} version on your screen only.`,
    );
  } catch (error) {
    setMessage(currentLanguage === "ko" ? `버전 미리보기 실패: ${error.message}` : `Version preview failed: ${error.message}`);
  }
}

async function publishHistoryVersion(id) {
  if (!isSuperAdmin) return;
  if (!confirm(currentLanguage === "ko" ? "이 변경 로그의 '변경 후' 버전을 실제 사용자 화면에 반영할까요?" : "Publish this log entry's 'after' version to the live user view?")) return;
  try {
    const data = await apiFetch("/api/history/restore", {
      method: "POST",
      body: JSON.stringify({ historyId: id, snapshot: "after", publish: true }),
    });
    applyState(data.state);
    isHistoryPreview = false;
    if (historyPreviewNotice) historyPreviewNotice.hidden = true;
    if (exitHistoryPreviewButton) exitHistoryPreviewButton.hidden = true;
    refresh(currentLanguage === "ko" ? "선택한 버전을 사용자 화면에 반영했습니다." : "Published the selected version to users.");
    showToast(currentLanguage === "ko" ? "사용자 화면에 반영되었습니다." : "Published to users.");
    loadHistory();
  } catch (error) {
    setMessage(currentLanguage === "ko" ? `버전 반영 실패: ${error.message}` : `Publish failed: ${error.message}`);
  }
}

async function clearHistoryPreview(reloadLive = true) {
  if (!isHistoryPreview) {
    if (historyPreviewNotice) historyPreviewNotice.hidden = true;
    if (exitHistoryPreviewButton) exitHistoryPreviewButton.hidden = true;
    return;
  }
  isHistoryPreview = false;
  if (historyPreviewNotice) historyPreviewNotice.hidden = true;
  if (exitHistoryPreviewButton) exitHistoryPreviewButton.hidden = true;
  if (!reloadLive) return;
  try {
    const data = await apiFetch("/api/state");
    applyState(data);
    refresh(currentLanguage === "ko" ? "실시간 사용자 화면 기준 목록으로 돌아왔습니다." : "Returned to the live user list.");
  } catch (error) {
    setMessage(currentLanguage === "ko" ? `실시간 목록 복귀 실패: ${error.message}` : `Could not return to live list: ${error.message}`);
  }
}

function startStatsPolling() {
  stopStatsPolling();
  refreshStats();
  statsTimer = setInterval(refreshStats, STATS_POLL_MS);
}

function stopStatsPolling() {
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
  if (statsLabel) statsLabel.textContent = t("statsDash");
}

async function pasteInto(textarea) {
  try {
    textarea.value = await navigator.clipboard.readText();
    textarea.focus();
    setMessage(currentLanguage === "ko" ? "클립보드 내용을 붙여넣었습니다." : "Pasted clipboard contents.");
  } catch {
    textarea.focus();
    setMessage(currentLanguage === "ko" ? "브라우저 권한 때문에 자동 붙여넣기가 막혔습니다. Cmd+V로 붙여넣어 주세요." : "Auto-paste was blocked by browser permissions. Use Cmd+V to paste.");
  }
}

async function addCoordinates(text) {
  const { parsed, invalid } = parseCoordinates(text);
  const requested = parsed.map(([x, y]) => keyOf(x, y));
  const add = requested;
  const manualCount = add.filter((coord) => !layers.supply.has(coord)).length;
  const before = layers.used.size;
  const ok = await mutateUsed(
    { add },
    currentLanguage === "ko"
      ? `사용 위치 추가 요청 ${add.length}개${manualCount ? `, 수기 보정 ${manualCount}개` : ""}${invalid.length ? `, 오류 ${invalid.length}개` : ""}`
      : `Adding ${add.length} used coordinates${manualCount ? `, manual corrections ${manualCount}` : ""}${invalid.length ? `, invalid ${invalid.length}` : ""}`,
  );
  if (!ok) return;
  const added = layers.used.size - before;
  if (add[0]) startCoordinatePulse(add[0], markerColorForCoordinate(add[0]));
  setMessage(
    currentLanguage === "ko"
      ? `반영되었습니다. 추가 ${added}개, 중복 ${add.length - added}개${manualCount ? `, 수기 보정 ${manualCount}개` : ""}${invalid.length ? `, 오류 ${invalid.length}개` : ""}`
      : `Applied. Added ${added}, duplicates ${add.length - added}${manualCount ? `, manual corrections ${manualCount}` : ""}${invalid.length ? `, invalid ${invalid.length}` : ""}`,
  );
  window.alert(currentLanguage === "ko" ? "반영되었습니다.\n표시까지 시간이 조금 걸릴 수 있습니다." : "Applied.\nIt may take a moment to appear.");
}

function deleteCoordinates(text) {
  const { parsed, invalid } = parseCoordinates(text);
  let removed = 0;
  for (const [x, y] of parsed) {
    if (layers.used.delete(keyOf(x, y))) removed += 1;
  }
  refresh(
    currentLanguage === "ko"
      ? `사용 취소 ${removed}개, 미존재 ${parsed.length - removed}개${invalid.length ? `, 오류 ${invalid.length}개` : ""}`
      : `Removed ${removed}, not found ${parsed.length - removed}${invalid.length ? `, invalid ${invalid.length}` : ""}`,
  );
}

function layerLabel(layerName) {
  if (currentLanguage === "ko") return layerName === "used" ? "사용 위치" : "보급품 위치";
  return layerName === "used" ? "used coordinates" : "supply coordinates";
}

function refresh(text) {
  updateCountSummary();
  updatedAtLabel.textContent = formatUpdatedAt(latestUpdatedAt);
  applyTranslations();
  renderSourceTabs();
  renderLevelTabs();
  saveLocalFallback();
  setMessage(text);
  renderList();
  renderRecommendations();
  draw();
}

function saveLocalFallback() {
  if (isHistoryPreview) return;
  const usedBySource = Object.fromEntries(
    SOURCE_KEYS.map((source) => [
      source,
      Object.fromEntries(LEVELS.map((level) => [level, Array.from(layers.savedUsedBySource[source]?.[level] || [])])),
    ]),
  );
  const hiddenInitialBySource = Object.fromEntries(
    SOURCE_KEYS.map((source) => [
      source,
      Object.fromEntries(LEVELS.map((level) => [level, Array.from(layers.hiddenInitialBySource[source]?.[level] || [])])),
    ]),
  );
  const usedByLevel = usedBySource[DEFAULT_SOURCE];
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      used: usedByLevel[DEFAULT_LEVEL],
      usedByLevel,
      usedBySource,
      hiddenInitialBySource,
      updatedAt: latestUpdatedAt,
    }),
  );
}

async function mutateUsed(payload, pendingText) {
  if (!isAdmin) {
    setMessage(currentLanguage === "ko" ? "관리자 코드 입력 후 수정할 수 있습니다." : "Enter the admin code to make changes.");
    return false;
  }
  if (isHistoryPreview) {
    setMessage(currentLanguage === "ko" ? "변경 로그 미리보기 중입니다. 실시간 목록으로 돌아간 뒤 수정해 주세요." : "You are previewing a log version. Return to the live list before editing.");
    return false;
  }

  try {
    if (pendingText) setMessage(pendingText);
    const data = await apiFetch("/api/used", {
      method: "POST",
      body: JSON.stringify({ source: activeSource, level: activeLevel, ...payload }),
    });
    applyState({ ...data, updatedAt: data.updatedAt || new Date().toISOString() });
    refresh(currentLanguage === "ko" ? "반영되었습니다." : "Applied.");
    showToast(currentLanguage === "ko" ? "반영되었습니다." : "Applied.");
    if (isSuperAdmin) loadHistory();
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      logoutAdmin(currentLanguage === "ko" ? "관리자 코드가 만료되었거나 올바르지 않습니다." : "Admin code expired or is invalid.");
      return false;
    }
    setMessage(currentLanguage === "ko" ? `저장 실패: ${error.message}` : `Save failed: ${error.message}`);
    return false;
  }
}

function setMessage(text) {
  message.textContent = text;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function formatUpdatedAt(value) {
  if (!value) return t("updatedDash");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("updatedDash");
  const parts = new Intl.DateTimeFormat(currentLanguage === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  })
    .formatToParts(date)
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return currentLanguage === "ko"
    ? `최신화 ${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`
    : `Updated ${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function renderList() {
  const query = searchInput.value.trim();
  renderLayerList(getRemainingSupply(), supplyList, supplyListCount, query);
  renderLayerList(layers.used, usedList, usedListCount, query);
}

function createBuildings() {
  const entries = [];
  BUILDING_GRID.forEach((row, rowIndex) => {
    [...row].forEach((value, colIndex) => {
      if (value === ".") return;
      const type = Number(value);
      const x = (BOUNDARIES[colIndex] + BOUNDARIES[colIndex + 1]) / 2;
      const yIndex = BOUNDARIES.length - 2 - rowIndex;
      const y = (BOUNDARIES[yIndex] + BOUNDARIES[yIndex + 1]) / 2;
      entries.push({ x, y, type });
    });
  });
  return entries;
}

function getRemainingSupply() {
  const remaining = new Set();
  for (const coord of layers.supply) {
    if (!layers.used.has(coord)) remaining.add(coord);
  }
  return remaining;
}

function getConfirmedUsed() {
  const used = new Set();
  for (const coord of layers.used) {
    if (layers.supply.has(coord)) used.add(coord);
  }
  return used;
}

function getManualUsed() {
  const used = new Set();
  for (const coord of layers.used) {
    if (!layers.supply.has(coord)) used.add(coord);
  }
  return used;
}

function isInitialUsedCoordinate(coord) {
  return Boolean(
    layers.initialUsedBySource[activeSource]?.[activeLevel]?.has(coord) &&
      !layers.hiddenInitialBySource[activeSource]?.[activeLevel]?.has(coord),
  );
}

function isInNineByNine(centerCoord, targetCoord) {
  const [cx, cy] = centerCoord.split(",").map(Number);
  const [x, y] = targetCoord.split(",").map(Number);
  return Math.abs(cx - x) <= 4 && Math.abs(cy - y) <= 4;
}

function getManualRangeExcludedSupply() {
  const excluded = new Set();
  const manualUsed = getManualUsed();
  for (const coord of layers.supply) {
    if (layers.used.has(coord)) continue;
    for (const manual of manualUsed) {
      if (isInNineByNine(manual, coord)) {
        excluded.add(coord);
        break;
      }
    }
  }
  return excluded;
}

function getRecommendationSupply() {
  const manualExcluded = getManualRangeExcludedSupply();
  const remaining = [];
  for (const coord of layers.supply) {
    if (!layers.used.has(coord) && !manualExcluded.has(coord)) remaining.push(coord);
  }
  return remaining.sort(compareCoordinates);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function recommendationTarget(coordA, coordB) {
  const [ax, ay] = coordA.split(",").map(Number);
  const [bx, by] = coordB.split(",").map(Number);
  const minCenterX = Math.max(ax, bx) - 4;
  const maxCenterX = Math.min(ax, bx) + 4;
  const minCenterY = Math.max(ay, by) - 4;
  const maxCenterY = Math.min(ay, by) + 4;
  return {
    x: clampNumber(Math.round((ax + bx) / 2), minCenterX, maxCenterX),
    y: clampNumber(Math.round((ay + by) / 2), minCenterY, maxCenterY),
  };
}

function recommendationId(coordA, coordB) {
  return [coordA, coordB].sort(compareCoordinates).join("|");
}

function getIncendiaryRecommendations() {
  const coords = getRecommendationSupply();
  const results = [];
  for (let i = 0; i < coords.length; i += 1) {
    const [ax, ay] = coords[i].split(",").map(Number);
    for (let j = i + 1; j < coords.length; j += 1) {
      const [bx, by] = coords[j].split(",").map(Number);
      const dx = Math.abs(ax - bx);
      const dy = Math.abs(ay - by);
      if (dy > 8 && by > ay) break;
      if (dx <= 8 && dy <= 8 && !(dx <= 1 && dy <= 1)) {
        const target = recommendationTarget(coords[i], coords[j]);
        results.push({
          id: recommendationId(coords[i], coords[j]),
          coords: [coords[i], coords[j]],
          target,
          dx,
          dy,
          distance: Math.hypot(dx, dy),
        });
      }
    }
  }
  return results.sort((a, b) => a.distance - b.distance || a.dy - b.dy || compareCoordinates(a.coords[0], b.coords[0]));
}

function renderRecommendations() {
  const recommendations = getIncendiaryRecommendations();
  recommendationCount.textContent = countText(recommendations.length);
  recommendationSection.hidden = !showRecommendations;

  if (recommendations.length === 0) {
    recommendationList.innerHTML = `<div class="empty-list">${currentLanguage === "ko" ? "추천 가능한 좌표쌍이 없습니다." : "No recommended coordinate pairs."}</div>`;
    return;
  }

  recommendationList.innerHTML = recommendations
    .map((item, index) => {
      const [a, b] = item.coords;
      return `
        <div class="recommendation-row${item.id === activeRecommendationId ? " is-selected" : ""}">
          <button class="recommendation-jump" type="button" data-action="recommendation-jump" data-id="${item.id}">
            <span class="recommendation-rank">${index + 1}</span>
            <span class="recommendation-coords">${a} + ${b}</span>
            <span class="recommendation-meta">${currentLanguage === "ko" ? "중심" : "Center"} ${item.target.x},${item.target.y}</span>
          </button>
          <button class="row-action admin-only" type="button" data-action="recommendation-use" data-id="${item.id}">${currentLanguage === "ko" ? "둘 다 사용" : "Mark both used"}</button>
        </div>
      `;
    })
    .join("");
}

function renderLayerList(layer, target, countTarget, query) {
  const entries = Array.from(layer).filter((coord) => !query || coord.includes(query));
  const layerName = target.dataset.layer;
  if (layerName === "used") {
    entries.reverse();
  } else {
    entries.sort(compareCoordinates);
  }

  const visible = entries.slice(0, 5000);
  const hiddenCount = entries.length - visible.length;
  countTarget.textContent = countText(entries.length);

  if (visible.length === 0) {
    target.innerHTML = `<div class="empty-list">${currentLanguage === "ko" ? "표시할 좌표가 없습니다." : "No coordinates to show."}</div>`;
    return;
  }

  const rows = visible
    .map((coord) => {
      const isManual = layerName === "used" && !layers.supply.has(coord);
      const secondaryAction =
        layerName === "supply"
          ? `<button class="row-action admin-only" type="button" data-action="mark-used" data-layer="${layerName}" data-coord="${coord}">${currentLanguage === "ko" ? "사용" : "Use"}</button>`
          : `<button class="row-action delete admin-only" type="button" data-action="remove" data-layer="${layerName}" data-coord="${coord}">${currentLanguage === "ko" ? "취소" : "Undo"}</button>`;
      return `
        <div class="coord-row${isManual ? " manual-row" : ""}">
          <button class="coord-jump" type="button" data-action="jump" data-coord="${coord}" ${isManual ? `title="${escapeHtml(manualUsedNote())}"` : ""}>${isManual ? '<b class="dot manual-dot"></b>' : ""}${coord}</button>
          ${secondaryAction}
        </div>
      `;
    })
    .join("");
  const overflow =
    hiddenCount > 0
      ? `<div class="empty-list">${currentLanguage === "ko" ? `... ${hiddenCount.toLocaleString("ko-KR")}개 더 있음` : `... ${hiddenCount.toLocaleString("en-US")} more`}</div>`
      : "";
  target.innerHTML = rows + overflow;
}

function compareCoordinates(a, b) {
  const [ax, ay] = a.split(",").map(Number);
  const [bx, by] = b.split(",").map(Number);
  return ay - by || ax - bx;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top, w: rect.width, h: rect.height };
}

function updateCursorCoord(point, label) {
  if (!cursorCoord) return;
  cursorCoord.hidden = false;
  cursorCoord.textContent = label;

  const offset = 14;
  const safeGap = 8;
  const boxWidth = cursorCoord.offsetWidth;
  const boxHeight = cursorCoord.offsetHeight;
  let left = point.x + offset;
  let top = point.y + offset;

  if (left + boxWidth + safeGap > point.w) left = point.x - boxWidth - offset;
  if (top + boxHeight + safeGap > point.h) top = point.y - boxHeight - offset;

  left = Math.max(safeGap, Math.min(point.w - boxWidth - safeGap, left));
  top = Math.max(safeGap, Math.min(point.h - boxHeight - safeGap, top));
  cursorCoord.style.left = `${left}px`;
  cursorCoord.style.top = `${top}px`;
}

function hideCursorCoord() {
  if (cursorCoord) cursorCoord.hidden = true;
}

function touchPoint(touch) {
  const rect = canvas.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top, w: rect.width, h: rect.height };
}

function touchCenter(touches) {
  const a = touchPoint(touches[0]);
  const b = touchPoint(touches[1]);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: a.w, h: a.h };
}

function touchDistance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function screenToMap(point) {
  const x = Math.floor(view.x + (point.x / point.w) * view.size);
  const y = Math.floor(view.y + (1 - point.y / point.h) * view.size);
  return { x: Math.max(0, Math.min(999, x)), y: Math.max(0, Math.min(999, y)) };
}

function clampView() {
  view.size = Math.max(10, Math.min(MAP_SIZE, view.size));
  view.x = Math.max(0, Math.min(MAP_SIZE - view.size, view.x));
  view.y = Math.max(0, Math.min(MAP_SIZE - view.size, view.y));
}

async function applyMapClick(point) {
  if (!isAdmin) {
    const target = findNearestVisibleCoordinate(layers.used, point) || findNearestVisibleCoordinate(getRemainingSupply(), point);
    if (target) {
      startCoordinatePulse(target, markerColorForCoordinate(target), false);
      setMessage(currentLanguage === "ko" ? `${target} 위치를 확인했습니다.` : `Checked ${target}.`);
    } else {
      setMessage(currentLanguage === "ko" ? "관리자 코드 입력 후 수정할 수 있습니다." : "Enter the admin code to make changes.");
    }
    return;
  }

  const used = findNearestVisibleCoordinate(layers.used, point);
  if (used) {
    const payload = isInitialUsedCoordinate(used) ? { remove: [used], hideInitial: [used] } : { remove: [used] };
    const ok = await mutateUsed(payload);
    if (ok) {
      startCoordinatePulse(used, layers.supply.has(used) ? "#6aa6ff" : "#b779ff", false);
      setMessage(currentLanguage === "ko" ? `${used} 사용 표시를 취소했습니다.` : `Undid used mark for ${used}.`);
    }
    return;
  }

  const supply = findNearestVisibleCoordinate(getRemainingSupply(), point);
  if (supply) {
    const ok = await mutateUsed({ add: [supply] });
    if (ok) {
      startCoordinatePulse(supply, "#ff6b6b", false);
      setMessage(currentLanguage === "ko" ? `${supply} 보급품을 사용한 것으로 표시했습니다.` : `Marked ${supply} as used.`);
    }
  }
}

function findNearestVisibleCoordinate(layer, point) {
  const rect = canvas.getBoundingClientRect();
  const threshold = Math.max(10, markerSize(rect) * 0.75);
  let nearest = null;
  let nearestDistance = Infinity;

  for (const coord of layer) {
    const [x, y] = coord.split(",").map(Number);
    if (x < view.x || x > view.x + view.size || y < view.y || y > view.y + view.size) continue;
    const screen = mapToScreen(x, y, rect);
    const distance = Math.hypot(screen.x - point.x, screen.y - point.y);
    if (distance <= threshold && distance < nearestDistance) {
      nearest = coord;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function findNearestBuilding(point) {
  const rect = canvas.getBoundingClientRect();
  const threshold = Math.max(14, buildingSize(rect) * 0.9);
  let nearest = null;
  let nearestDistance = Infinity;

  for (const building of buildings) {
    if (building.x < view.x || building.x > view.x + view.size || building.y < view.y || building.y > view.y + view.size) continue;
    const screen = mapToScreen(building.x, building.y, rect);
    const distance = Math.hypot(screen.x - point.x, screen.y - point.y);
    if (distance <= threshold && distance < nearestDistance) {
      nearest = building;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function jumpToCoordinate(coordText) {
  focusCoordinate(coordText);
  startCoordinatePulse(coordText, markerColorForCoordinate(coordText), false);
  setMessage(currentLanguage === "ko" ? `${coordText} 위치로 이동했습니다.` : `Moved to ${coordText}.`);
}

function focusCoordinate(coordText) {
  const [x, y] = coordText.split(",").map(Number);
  view.size = Math.min(view.size, 80);
  view.x = x - view.size / 2;
  view.y = y - view.size / 2;
  clampView();
  draw();
}

function coordinateIsInView(coordText) {
  const [x, y] = coordText.split(",").map(Number);
  return x >= view.x && x <= view.x + view.size && y >= view.y && y <= view.y + view.size;
}

function markerColorForCoordinate(coordText) {
  if (layers.used.has(coordText) && !layers.supply.has(coordText)) return "#b779ff";
  if (layers.used.has(coordText)) return "#ff6b6b";
  if (layers.supply.has(coordText)) return "#6aa6ff";
  return "#b779ff";
}

function startCoordinatePulse(coordText, color = markerColorForCoordinate(coordText), shouldFocus = true) {
  if (!isCoordinateText(coordText)) return;
  if (shouldFocus && !coordinateIsInView(coordText)) focusCoordinate(coordText);
  pulses = pulses.filter((pulse) => pulse.coord !== coordText);
  pulses.push({ coord: coordText, color, startedAt: performance.now(), duration: 1800 });
  draw();
  schedulePulseFrame();
}

function schedulePulseFrame() {
  if (pulseFrame) return;
  pulseFrame = requestAnimationFrame(animatePulses);
}

function animatePulses() {
  pulseFrame = null;
  const now = performance.now();
  pulses = pulses.filter((pulse) => now - pulse.startedAt < pulse.duration);
  draw();
  if (pulses.length) schedulePulseFrame();
}

function findRecommendation(id) {
  return getIncendiaryRecommendations().find((item) => item.id === id) || null;
}

function focusRecommendation(item) {
  view.size = Math.min(view.size, 90);
  view.x = item.target.x - view.size / 2;
  view.y = item.target.y - view.size / 2;
  clampView();
  activeRecommendationId = item.id;
  startCoordinatePulse(`${item.target.x},${item.target.y}`, "#facc15", false);
  for (const coord of item.coords) {
    startCoordinatePulse(coord, "#facc15", false);
  }
  renderRecommendations();
  draw();
}

async function handleRecommendationAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = findRecommendation(button.dataset.id || "");
  if (!item) {
    renderRecommendations();
    setMessage(currentLanguage === "ko" ? "추천 좌표가 최신 목록에 없습니다." : "This recommendation is no longer in the latest list.");
    return;
  }

  if (button.dataset.action === "recommendation-jump") {
    focusRecommendation(item);
    setMessage(
      currentLanguage === "ko"
        ? `${item.coords.join(" + ")} 추천 중심은 ${item.target.x},${item.target.y} 입니다.`
        : `${item.coords.join(" + ")} recommended center is ${item.target.x},${item.target.y}.`,
    );
    return;
  }

  if (button.dataset.action === "recommendation-use") {
    const ok = await mutateUsed({ add: item.coords });
    if (ok) {
      focusRecommendation(item);
      setMessage(currentLanguage === "ko" ? `${item.coords.join(" + ")} 두 좌표를 사용 처리했습니다.` : `Marked both ${item.coords.join(" + ")} as used.`);
    }
  }
}

async function handleListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const coord = button.dataset.coord;
  const layerName = button.dataset.layer;

  if (action === "jump") {
    jumpToCoordinate(coord);
    return;
  }
  if (action === "mark-used") {
    const ok = await mutateUsed({ add: [coord] });
    if (ok) {
      startCoordinatePulse(coord, "#ff6b6b");
      setMessage(currentLanguage === "ko" ? `${coord} 사용한 보급품으로 표시했습니다.` : `Marked ${coord} as used.`);
    }
    return;
  }
  if (action === "remove") {
    const payload = isInitialUsedCoordinate(coord) ? { remove: [coord], hideInitial: [coord] } : { remove: [coord] };
    const ok = await mutateUsed(payload);
    if (ok) {
      startCoordinatePulse(coord, layers.supply.has(coord) ? "#6aa6ff" : "#b779ff");
      setMessage(currentLanguage === "ko" ? `${coord} 사용 표시를 취소했습니다.` : `Undid used mark for ${coord}.`);
    }
  }
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
  grad.addColorStop(0, "#0e1a18");
  grad.addColorStop(1, "#0a1414");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, rect.width, rect.height);
  if (showGrid) drawGrid(rect);
  drawBoundaries(rect);
  if (showBuildings) drawBuildings(rect);
  drawLayer(rect, getRemainingSupply(), "#6aa6ff", 1);
  drawLayer(rect, getConfirmedUsed(), "#ff6b6b", 1);
  drawManualLayer(rect, getManualUsed(), "#b779ff");
  if (showRecommendations) drawRecommendationLayer(rect);
  drawTempRanges(rect);
  if (showIncendiary && hoverMapPoint) {
    drawIncendiaryRange(rect, hoverMapPoint.x, hoverMapPoint.y);
  }
  if (showFurnace && hoverMapPoint) {
    drawFurnaceRange(rect, hoverMapPoint.x, hoverMapPoint.y);
  }
  if (showMissile && hoverMapPoint) {
    drawMissileRange(rect, hoverMapPoint.x, hoverMapPoint.y);
  }
  if (showDummyBase && hoverMapPoint) {
    drawDummyBaseRange(rect, hoverMapPoint.x, hoverMapPoint.y);
  }
  drawFrame(rect);
  drawPulses(rect);
}

function drawTempRanges(rect) {
  for (const item of tempRanges) {
    if (item.type === "furnace") drawFurnaceRange(rect, item.x, item.y);
    else if (item.type === "missile") drawMissileRange(rect, item.x, item.y);
    else if (item.type === "dummyBase") drawDummyBaseRange(rect, item.x, item.y);
    else drawIncendiaryRange(rect, item.x, item.y);
  }
}

function rangeBounds(x, y, radius) {
  return {
    minX: Math.max(0, x - radius),
    minY: Math.max(0, y - radius),
    maxX: Math.min(999, x + radius),
    maxY: Math.min(999, y + radius),
  };
}

function gridStepForView(rect) {
  const minPixels = 18;
  const candidates = [1, 2, 5, 10, 25, 50, 100, 200];
  return candidates.find((step) => (step / view.size) * rect.width >= minPixels) || 200;
}

function firstGridBoundary(start, step) {
  return Math.ceil((start + 0.5) / step) * step - 0.5;
}

function drawGrid(rect) {
  const step = gridStepForView(rect);
  const majorStep = step * 5;
  const startX = firstGridBoundary(view.x, step);
  const endX = view.x + view.size + 0.5;
  const startY = firstGridBoundary(view.y, step);
  const endY = view.y + view.size + 0.5;

  ctx.save();
  ctx.lineWidth = 1;
  for (let x = startX; x <= endX; x += step) {
    const p = mapToScreen(x, view.y, rect);
    const coordinateIndex = Math.round(x + 0.5);
    const major = coordinateIndex % majorStep === 0;
    ctx.strokeStyle = major ? "rgba(255, 255, 255, 0.13)" : "rgba(255, 255, 255, 0.055)";
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, rect.height);
    ctx.stroke();
  }
  for (let y = startY; y <= endY; y += step) {
    const p = mapToScreen(view.x, y, rect);
    const coordinateIndex = Math.round(y + 0.5);
    const major = coordinateIndex % majorStep === 0;
    ctx.strokeStyle = major ? "rgba(255, 255, 255, 0.13)" : "rgba(255, 255, 255, 0.055)";
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(rect.width, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMapRect(rect, minX, minY, maxX, maxY, fillStyle, strokeStyle, lineWidth) {
  const leftBottom = mapToScreen(minX - 0.5, minY - 0.5, rect);
  const rightTop = mapToScreen(maxX + 0.5, maxY + 0.5, rect);
  const left = Math.min(leftBottom.x, rightTop.x);
  const top = Math.min(leftBottom.y, rightTop.y);
  const width = Math.abs(rightTop.x - leftBottom.x);
  const height = Math.abs(leftBottom.y - rightTop.y);
  if (width < 1 || height < 1) return null;

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.fillRect(left, top, width, height);
  ctx.strokeRect(left, top, width, height);
  return { left, top, width, height };
}

function drawIncendiaryRange(rect, x, y) {
  const topLeft = mapToScreen(x - 4.5, y + 4.5, rect);
  const bottomRight = mapToScreen(x + 4.5, y - 4.5, rect);
  const left = Math.min(topLeft.x, bottomRight.x);
  const top = Math.min(topLeft.y, bottomRight.y);
  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);
  if (width < 1 || height < 1) return;

  ctx.save();
  ctx.fillStyle = "rgba(255, 107, 107, 0.12)";
  ctx.strokeStyle = "rgba(255, 107, 107, 0.9)";
  ctx.lineWidth = Math.max(1.5, Math.min(2.5, rect.width / view.size));
  ctx.fillRect(left, top, width, height);
  ctx.strokeRect(left, top, width, height);

  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.strokeStyle = "rgba(255, 170, 170, 0.7)";
  ctx.lineWidth = 1.5;
  const spacing = Math.max(5, Math.min(12, width / 6));
  for (let offset = -height; offset < width + height; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(left + offset, top + height);
    ctx.lineTo(left + offset + height, top);
    ctx.stroke();
  }
  ctx.restore();

  if (view.size <= 180) {
    const center = mapToScreen(x, y, rect);
    ctx.save();
    ctx.font = `700 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = `${x},${y} · 9×9`;
    const textWidth = ctx.measureText(label).width;
    const padX = 6;
    const padY = 4;
    const boxW = textWidth + padX * 2;
    const boxH = 12 + padY * 2;
    const boxX = center.x - boxW / 2;
    const boxY = center.y - boxH / 2;
    ctx.fillStyle = "rgba(8, 13, 22, 0.85)";
    roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 107, 107, 0.9)";
    ctx.lineWidth = 1;
    roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.stroke();
    ctx.fillStyle = "#ffd6d6";
    ctx.fillText(label, center.x, center.y);
    ctx.restore();
  }
}

function drawFurnaceRange(rect, x, y) {
  ctx.save();
  const effect = drawMapRect(
    rect,
    Math.max(0, x - 18),
    Math.max(0, y - 18),
    Math.min(999, x + 19),
    Math.min(999, y + 19),
    "rgba(56, 189, 248, 0.11)",
    "rgba(56, 189, 248, 0.85)",
    Math.max(1.3, Math.min(2.4, rect.width / view.size)),
  );

  if (effect) {
    ctx.beginPath();
    ctx.rect(effect.left, effect.top, effect.width, effect.height);
    ctx.clip();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.32)";
    ctx.lineWidth = 1;
    const spacing = Math.max(8, Math.min(18, effect.width / 12));
    for (let offset = -effect.height; offset < effect.width + effect.height; offset += spacing) {
      ctx.beginPath();
      ctx.moveTo(effect.left + offset, effect.top + effect.height);
      ctx.lineTo(effect.left + offset + effect.height, effect.top);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  drawMapRect(
    rect,
    Math.max(0, x - 2),
    Math.max(0, y - 2),
    Math.min(999, x + 2),
    Math.min(999, y + 2),
    "rgba(14, 165, 233, 0.34)",
    "rgba(224, 242, 254, 0.95)",
    Math.max(1.8, Math.min(3, rect.width / view.size)),
  );
  ctx.restore();

  if (view.size <= 260) {
    const center = mapToScreen(x, y, rect);
    ctx.save();
    ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = currentLanguage === "ko" ? `${x},${y} · 용광로 38×38` : `${x},${y} · Furnace 38×38`;
    const textWidth = ctx.measureText(label).width;
    const boxW = textWidth + 12;
    const boxH = 22;
    const boxX = center.x - boxW / 2;
    const boxY = center.y - boxH / 2;
    ctx.fillStyle = "rgba(8, 13, 22, 0.88)";
    roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = 1;
    roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.stroke();
    ctx.fillStyle = "#e0f2fe";
    ctx.fillText(label, center.x, center.y);
    ctx.restore();
  }
}

function drawMissileRange(rect, x, y) {
  const bounds = rangeBounds(x, y, 12);
  const box = drawMapRect(
    rect,
    bounds.minX,
    bounds.minY,
    bounds.maxX,
    bounds.maxY,
    "rgba(255, 255, 255, 0.08)",
    "rgba(255, 255, 255, 0.92)",
    Math.max(1.6, Math.min(2.8, rect.width / view.size)),
  );
  if (!box) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, box.width, box.height);
  ctx.clip();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
  ctx.lineWidth = Math.max(1, Math.min(1.8, rect.width / view.size));
  const spacing = Math.max(6, Math.min(14, box.width / 8));
  for (let offset = -box.height; offset < box.width + box.height; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(box.left + offset, box.top + box.height);
    ctx.lineTo(box.left + offset + box.height, box.top);
    ctx.stroke();
  }
  ctx.restore();

  const center = mapToScreen(x, y, rect);
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = Math.max(1.5, Math.min(2.5, rect.width / view.size));
  const cross = Math.max(5, Math.min(12, rect.width / view.size));
  ctx.beginPath();
  ctx.moveTo(center.x - cross, center.y);
  ctx.lineTo(center.x + cross, center.y);
  ctx.moveTo(center.x, center.y - cross);
  ctx.lineTo(center.x, center.y + cross);
  ctx.stroke();
  ctx.restore();

  const corners = [
    { x: bounds.minX, y: bounds.maxY, anchor: "bottom" },
    { x: bounds.maxX, y: bounds.maxY, anchor: "bottom" },
    { x: bounds.minX, y: bounds.minY, anchor: "top" },
    { x: bounds.maxX, y: bounds.minY, anchor: "top" },
  ];
  drawMapLabel(rect, x, y, `${currentLanguage === "ko" ? "중심" : "Center"} ${x},${y}`, "#ffffff", "center");
  for (const corner of corners) {
    drawMapLabel(rect, corner.x, corner.y, `${corner.x},${corner.y}`, "#ffffff", corner.anchor);
  }
}

function drawDummyBaseRange(rect, x, y) {
  const bounds = rangeBounds(x, y, 1);
  const box = drawMapRect(
    rect,
    bounds.minX,
    bounds.minY,
    bounds.maxX,
    bounds.maxY,
    "rgba(148, 163, 184, 0.18)",
    "rgba(226, 232, 240, 0.92)",
    Math.max(1.5, Math.min(2.6, rect.width / view.size)),
  );
  if (!box) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, box.width, box.height);
  ctx.clip();
  ctx.strokeStyle = "rgba(226, 232, 240, 0.38)";
  ctx.lineWidth = Math.max(1, Math.min(1.8, rect.width / view.size));
  const spacing = Math.max(5, Math.min(10, box.width / 4));
  for (let offset = -box.height; offset < box.width + box.height; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(box.left + offset, box.top + box.height);
    ctx.lineTo(box.left + offset + box.height, box.top);
    ctx.stroke();
  }
  ctx.restore();

  const center = mapToScreen(x, y, rect);
  ctx.save();
  ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
  ctx.lineWidth = Math.max(1, Math.min(2, rect.width / view.size));
  const radius = Math.max(3, Math.min(8, rect.width / view.size * 1.2));
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (view.size <= 180) {
    const label = currentLanguage === "ko" ? `더미 ${x},${y}` : `Dummy ${x},${y}`;
    drawMapLabel(rect, x, y, label, "#e2e8f0", "center");
  }
}

function drawMapLabel(rect, x, y, text, color, anchor = "center") {
  const point = mapToScreen(x, y, rect);
  const fontSize = Math.max(10, Math.min(13, rect.width / view.size * 1.8));
  const paddingX = 5;
  const paddingY = 3;
  const textOffset = anchor === "top" ? 13 : anchor === "bottom" ? -13 : 0;

  ctx.save();
  ctx.font = `800 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const boxX = Math.max(2, Math.min(rect.width - boxWidth - 2, point.x - boxWidth / 2));
  const boxY = Math.max(2, Math.min(rect.height - boxHeight - 2, point.y + textOffset - boxHeight / 2));
  ctx.fillStyle = "rgba(8, 13, 22, 0.86)";
  roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, boxX + boxWidth / 2, boxY + boxHeight / 2);
  ctx.restore();
}

function mapToScreen(x, y, rect) {
  return { x: ((x - view.x) / view.size) * rect.width, y: (1 - (y - view.y) / view.size) * rect.height };
}

function drawBoundaries(rect) {
  ctx.strokeStyle = "rgba(148, 200, 180, 0.14)";
  ctx.lineWidth = 1;
  for (const boundary of BOUNDARIES) {
    if (boundary >= view.x && boundary <= view.x + view.size) {
      const p = mapToScreen(boundary, view.y, rect);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, rect.height);
      ctx.stroke();
    }
    if (boundary >= view.y && boundary <= view.y + view.size) {
      const p = mapToScreen(view.x, boundary, rect);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(rect.width, p.y);
      ctx.stroke();
    }
  }
}

function drawBuildings(rect) {
  const size = buildingSize(rect);
  const showNames = view.size <= 380;
  for (const building of buildings) {
    if (building.x < view.x || building.x > view.x + view.size || building.y < view.y || building.y > view.y + view.size) continue;
    const p = mapToScreen(building.x, building.y, rect);
    drawBuildingMarker(p.x, p.y, size, building, showNames);
  }
}

function buildingSize(rect) {
  const pixelsPerCoordinate = rect.width / view.size;
  return Math.max(18, Math.min(86, 14 + pixelsPerCoordinate * 7));
}

function drawBuildingMarker(x, y, size, building, showName) {
  ctx.save();
  const glow = size * 1.55;
  const gradient = ctx.createRadialGradient(x, y, size * 0.15, x, y, glow * 0.5);
  gradient.addColorStop(0, "rgba(116, 202, 255, 0.38)");
  gradient.addColorStop(0.65, "rgba(70, 160, 255, 0.18)");
  gradient.addColorStop(1, "rgba(70, 160, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glow * 0.5, 0, Math.PI * 2);
  ctx.fill();

  const baseW = size * 0.58;
  const baseH = size * 0.34;
  ctx.fillStyle = "rgba(214, 224, 235, 0.84)";
  ctx.strokeStyle = "rgba(75, 86, 103, 0.7)";
  ctx.lineWidth = Math.max(1, size * 0.035);
  roundRect(x - baseW / 2, y + size * 0.08, baseW, baseH, Math.max(3, size * 0.08));
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y + size * 0.06, size * 0.16, Math.PI, 0);
  ctx.lineTo(x + size * 0.16, y + size * 0.14);
  ctx.lineTo(x - size * 0.16, y + size * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const shieldW = size * 0.42;
  const shieldH = size * 0.5;
  const shieldX = x - size * 0.58;
  const shieldY = y - size * 0.62;
  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(shieldX - shieldW / 2, shieldY - shieldH / 2);
  ctx.lineTo(shieldX + shieldW / 2, shieldY - shieldH / 2);
  ctx.lineTo(shieldX + shieldW / 2, shieldY + shieldH * 0.22);
  ctx.lineTo(shieldX, shieldY + shieldH / 2);
  ctx.lineTo(shieldX - shieldW / 2, shieldY + shieldH * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.max(9, size * 0.27)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(building.type), shieldX, shieldY - size * 0.02);

  if (showName) {
    const name = buildingName(building.type);
    ctx.font = `700 ${Math.max(10, Math.min(15, size * 0.26))}px ui-sans-serif, system-ui, sans-serif`;
    const paddingX = size * 0.16;
    const labelW = ctx.measureText(name).width + paddingX * 2;
    const labelH = Math.max(18, size * 0.34);
    const labelX = x - size * 0.34;
    const labelY = y - size * 0.68;
    ctx.fillStyle = "rgba(53, 57, 63, 0.72)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    roundRect(labelX, labelY, labelW, labelH, labelH / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f5f7fb";
    ctx.textAlign = "left";
    ctx.fillText(name, labelX + paddingX, labelY + labelH / 2);
  }
  ctx.restore();
}

function drawLayer(rect, layer, color, alpha, note = "") {
  const iconSize = markerSize(rect);
  const showLabels = view.size <= 180;
  for (const coord of layer) {
    const [x, y] = coord.split(",").map(Number);
    if (x < view.x || x > view.x + view.size || y < view.y || y > view.y + view.size) continue;
    const p = mapToScreen(x, y, rect);
    drawMarker(p.x, p.y, iconSize, color, alpha);
    if (showLabels) drawCoordinateLabel(p.x, p.y, iconSize, note ? `${coord} ${currentLanguage === "ko" ? "수기" : "manual"}` : coord, color);
  }
}

function drawManualLayer(rect, layer, color) {
  const iconSize = markerSize(rect);
  const showLabels = view.size <= 180;
  for (const coord of layer) {
    const [x, y] = coord.split(",").map(Number);
    if (x + 4.5 < view.x || x - 4.5 > view.x + view.size || y + 4.5 < view.y || y - 4.5 > view.y + view.size) continue;
    drawManualRange(rect, x, y, color);
    const p = mapToScreen(x, y, rect);
    drawMarker(p.x, p.y, iconSize, color, 1);
    if (showLabels) drawCoordinateLabel(p.x, p.y, iconSize, `${coord} ${currentLanguage === "ko" ? "수기" : "manual"}`, color);
  }
}

function drawManualRange(rect, x, y, color) {
  const topLeft = mapToScreen(x - 4.5, y + 4.5, rect);
  const bottomRight = mapToScreen(x + 4.5, y - 4.5, rect);
  const left = Math.min(topLeft.x, bottomRight.x);
  const top = Math.min(topLeft.y, bottomRight.y);
  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);
  if (width < 1 || height < 1) return;

  ctx.save();
  ctx.fillStyle = "rgba(183, 121, 255, 0.10)";
  ctx.strokeStyle = "rgba(183, 121, 255, 0.75)";
  ctx.lineWidth = Math.max(1, Math.min(2, rect.width / view.size));
  ctx.fillRect(left, top, width, height);
  ctx.strokeRect(left, top, width, height);

  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.strokeStyle = "rgba(230, 210, 255, 0.42)";
  ctx.lineWidth = 1;
  const spacing = Math.max(4, Math.min(10, width / 3));
  for (let offset = -height; offset < width + height; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(left + offset, top + height);
    ctx.lineTo(left + offset + height, top);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRecommendationLayer(rect) {
  const recommendations = getIncendiaryRecommendations();
  const visible = recommendations.slice(0, 80);
  for (const item of visible) {
    const active = item.id === activeRecommendationId;
    drawRecommendationRange(rect, item, active);
  }
  for (const item of visible) {
    drawRecommendationConnector(rect, item, item.id === activeRecommendationId);
  }
}

function drawRecommendationRange(rect, item, active) {
  const leftBottom = mapToScreen(item.target.x - 4.5, item.target.y - 4.5, rect);
  const rightTop = mapToScreen(item.target.x + 4.5, item.target.y + 4.5, rect);
  const left = Math.min(leftBottom.x, rightTop.x);
  const top = Math.min(leftBottom.y, rightTop.y);
  const width = Math.abs(rightTop.x - leftBottom.x);
  const height = Math.abs(leftBottom.y - rightTop.y);
  if (width < 1 || height < 1) return;

  ctx.save();
  ctx.fillStyle = active ? "rgba(250, 204, 21, 0.20)" : "rgba(250, 204, 21, 0.08)";
  ctx.strokeStyle = active ? "rgba(250, 204, 21, 0.95)" : "rgba(250, 204, 21, 0.42)";
  ctx.lineWidth = active ? 2.4 : 1.4;
  ctx.fillRect(left, top, width, height);
  ctx.strokeRect(left, top, width, height);

  if (active && view.size <= 180) {
    const center = mapToScreen(item.target.x, item.target.y, rect);
    const label = `${currentLanguage === "ko" ? "중심" : "Center"} ${item.target.x},${item.target.y}`;
    ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(label).width;
    const boxWidth = textWidth + 12;
    const boxHeight = 22;
    const boxX = center.x - boxWidth / 2;
    const boxY = center.y - boxHeight / 2;
    ctx.fillStyle = "rgba(8, 13, 22, 0.88)";
    roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
    ctx.lineWidth = 1;
    roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.stroke();
    ctx.fillStyle = "#fef3c7";
    ctx.fillText(label, center.x, center.y);
  }
  ctx.restore();
}

function drawRecommendationConnector(rect, item, active) {
  const [coordA, coordB] = item.coords;
  const [ax, ay] = coordA.split(",").map(Number);
  const [bx, by] = coordB.split(",").map(Number);
  if (
    Math.max(ax, bx) < view.x ||
    Math.min(ax, bx) > view.x + view.size ||
    Math.max(ay, by) < view.y ||
    Math.min(ay, by) > view.y + view.size
  ) {
    return;
  }

  const a = mapToScreen(ax, ay, rect);
  const b = mapToScreen(bx, by, rect);
  const size = markerSize(rect);
  ctx.save();
  ctx.strokeStyle = active ? "rgba(250, 204, 21, 0.95)" : "rgba(250, 204, 21, 0.58)";
  ctx.lineWidth = active ? Math.max(2.4, size * 0.18) : Math.max(1.4, size * 0.11);
  ctx.setLineDash(active ? [] : [5, 5]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const point of [a, b]) {
    ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = active ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(7, size * 0.65), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPulses(rect) {
  if (!pulses.length) return;
  const now = performance.now();
  const baseSize = markerSize(rect);
  for (const pulse of pulses) {
    const [x, y] = pulse.coord.split(",").map(Number);
    if (x < view.x || x > view.x + view.size || y < view.y || y > view.y + view.size) continue;
    const elapsed = now - pulse.startedAt;
    const progress = Math.max(0, Math.min(1, elapsed / pulse.duration));
    const p = mapToScreen(x, y, rect);
    const maxRadius = Math.max(34, baseSize * 3.6);

    ctx.save();
    ctx.shadowColor = pulse.color;
    ctx.shadowBlur = Math.max(8, baseSize * 0.45);
    ctx.lineWidth = Math.max(2.4, baseSize * 0.15);
    for (let i = 0; i < 3; i += 1) {
      const phase = progress - i * 0.16;
      if (phase < 0 || phase > 1) continue;
      const ease = 1 - Math.pow(1 - phase, 2);
      const radius = baseSize * 0.55 + ease * maxRadius;
      ctx.globalAlpha = Math.max(0, 0.88 * (1 - phase));
      ctx.strokeStyle = pulse.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 0.34 * (1 - progress));
    ctx.fillStyle = pulse.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(12, baseSize * 0.9) + progress * Math.max(18, baseSize), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, 0.9 * (1 - progress * 0.45));
    ctx.fillStyle = pulse.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(5, baseSize * 0.42), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function markerSize(rect) {
  const pixelsPerCoordinate = rect.width / view.size;
  return Math.max(4, Math.min(34, 3.5 + pixelsPerCoordinate * 2.8));
}

function drawMarker(x, y, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  if (size < 8) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const scale = size / 28;
  const shadowWidth = Math.max(5, size * 0.78);
  const shadowHeight = Math.max(2, size * 0.18);

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.24, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y - size * 0.22);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.bezierCurveTo(-12, 1, -10, -16, 0, -16);
  ctx.bezierCurveTo(10, -16, 12, 1, 0, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (size >= 14) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -5, 5.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCoordinateLabel(x, y, markerSizeValue, text, color) {
  const fontSize = Math.max(10, Math.min(14, markerSizeValue * 0.45));
  const paddingX = 5;
  const paddingY = 3;
  const offsetX = markerSizeValue * 0.42;
  const offsetY = -markerSizeValue * 0.58;

  ctx.save();
  ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const boxX = x + offsetX;
  const boxY = y + offsetY - fontSize / 2 - paddingY;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

  ctx.fillStyle = "rgba(8, 13, 22, 0.88)";
  roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.stroke();

  ctx.fillStyle = "#e7ecf5";
  ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFrame(rect) {
  ctx.strokeStyle = "rgba(15, 27, 45, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, rect.width - 1.5, rect.height - 1.5);
}

function zoomAt(event) {
  event.preventDefault();
  const point = canvasPoint(event);
  const before = screenToMap(point);
  const factor = event.deltaY < 0 ? 0.8 : 1.25;
  const newSize = Math.max(10, Math.min(MAP_SIZE, view.size * factor));
  view.x = before.x - (point.x / point.w) * newSize;
  view.y = before.y - (1 - point.y / point.h) * newSize;
  view.size = newSize;
  clampView();
  draw();
}

function copyLayer(layerName) {
  const source = layerName === "supply" ? getRemainingSupply() : layers[layerName];
  const coordinates = Array.from(source);
  if (layerName === "used") {
    coordinates.reverse();
  } else {
    coordinates.sort(compareCoordinates);
  }
  const text = coordinates.join("\n");
  navigator.clipboard.writeText(text).then(
    () => setMessage(currentLanguage === "ko" ? `${layerLabel(layerName)} 목록을 복사했습니다.` : `Copied ${layerLabel(layerName)} list.`),
    () => setMessage(currentLanguage === "ko" ? "복사 권한이 막혔습니다." : "Copy permission was blocked."),
  );
}

async function loginAdmin() {
  const code = adminCodeInput.value.trim();
  if (!code) {
    setMessage(currentLanguage === "ko" ? "관리자 코드를 입력해 주세요." : "Enter the admin code.");
    adminCodeInput.focus();
    return;
  }

  try {
    const data = await apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    adminToken = data.token || "";
    adminRole = data.role || decodeAdminRole(adminToken) || "admin";
    isSuperAdmin = adminRole === "super";
    sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    sessionStorage.setItem(ADMIN_ROLE_KEY, adminRole);
    adminCodeInput.value = "";
    setAdminMode(true, isSuperAdmin ? t("superAdminMode") : t("adminMode"));
    refresh(isSuperAdmin ? (currentLanguage === "ko" ? "상위 관리자 모드로 전환되었습니다." : "Switched to super admin mode.") : (currentLanguage === "ko" ? "관리자 모드로 전환되었습니다." : "Switched to admin mode."));
    showToast(isSuperAdmin ? t("superAdminMode") : t("adminMode"));
  } catch (error) {
    logoutAdmin(currentLanguage === "ko" ? "관리자 코드가 맞지 않습니다." : "Admin code is incorrect.");
  }
}

function logoutAdmin(text = t("viewerMode")) {
  adminToken = "";
  adminRole = "";
  isSuperAdmin = false;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_ROLE_KEY);
  clearHistoryPreview(false);
  setAdminMode(false, text);
  renderList();
  draw();
  setMessage(text);
}

document.getElementById("pasteAddButton").addEventListener("click", () => pasteInto(addInput));
document.getElementById("addButton").addEventListener("click", () => addCoordinates(addInput.value));
languageToggle?.addEventListener("click", () => {
  setLanguage(currentLanguage === "ko" ? "en" : "ko");
  setMessage(currentLanguage === "ko" ? "한국어로 전환했습니다." : "Switched to English.");
});
languageModal?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-lang-choice]");
  if (!button) return;
  setLanguage(button.dataset.langChoice, { closeModal: true, showAlliance: true });
});
closeAllianceNoticeButton?.addEventListener("click", closeAllianceNotice);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && allianceNotice && !allianceNotice.hidden) closeAllianceNotice();
});
document.getElementById("clearButton").addEventListener("click", () => {
  if (!confirm(currentLanguage === "ko" ? `${activeLevel}단계 사용한 보급품 목록을 모두 비울까요?` : `Clear the used supply list for Level ${activeLevel}?`)) return;
  const initialUsed = Array.from(layers.initialUsedBySource[activeSource]?.[activeLevel] || []);
  mutateUsed({ clear: true, hideInitial: initialUsed }).then((ok) => {
    if (ok) setMessage(currentLanguage === "ko" ? `${activeLevel}단계 사용한 보급품 목록을 모두 비웠습니다.` : `Cleared the used supply list for Level ${activeLevel}.`);
  });
});
document.getElementById("fitButton").addEventListener("click", () => {
  view = { x: 0, y: 0, size: MAP_SIZE };
  draw();
});
buildingToggle.addEventListener("click", () => {
  showBuildings = !showBuildings;
  localStorage.setItem(BUILDING_TOGGLE_KEY, showBuildings ? "1" : "0");
  buildingToggle.setAttribute("aria-pressed", String(showBuildings));
  buildingToggle.classList.toggle("is-active", showBuildings);
  draw();
  setMessage(showBuildings ? (currentLanguage === "ko" ? "건물 표시를 켰습니다." : "Buildings are visible.") : (currentLanguage === "ko" ? "건물 표시를 껐습니다." : "Buildings are hidden."));
});
gridToggle.addEventListener("click", () => {
  showGrid = !showGrid;
  localStorage.setItem(GRID_TOGGLE_KEY, showGrid ? "1" : "0");
  gridToggle.setAttribute("aria-pressed", String(showGrid));
  gridToggle.classList.toggle("is-active", showGrid);
  draw();
  setMessage(showGrid ? (currentLanguage === "ko" ? "격자선을 표시합니다." : "Grid is visible.") : (currentLanguage === "ko" ? "격자선을 숨겼습니다." : "Grid is hidden."));
});
incendiaryToggle.addEventListener("click", () => {
  setRangeMode(showIncendiary ? "" : "incendiary");
  draw();
  setMessage(
    showIncendiary
      ? (currentLanguage === "ko" ? "연소탄 찍기 ON · 지도 위에서 9×9 범위를 확인하고 클릭하면 임시 표시가 남습니다." : "Incendiary pin ON. Preview the 9×9 range and click the map to place it.")
      : (currentLanguage === "ko" ? "연소탄 찍기를 껐습니다." : "Incendiary pin OFF."),
  );
});
furnaceToggle.addEventListener("click", () => {
  setRangeMode(showFurnace ? "" : "furnace");
  draw();
  setMessage(
    showFurnace
      ? (currentLanguage === "ko" ? "용광로 찍기 ON · 중심 기준 5×5 본체와 38×38 온도 범위를 확인하고 클릭하면 임시 표시가 남습니다." : "Furnace pin ON. Preview the 5×5 body and 38×38 range, then click the map to place it.")
      : (currentLanguage === "ko" ? "용광로 찍기를 껐습니다." : "Furnace pin OFF."),
  );
});
missileToggle.addEventListener("click", () => {
  setRangeMode(showMissile ? "" : "missile");
  draw();
  setMessage(
    showMissile
      ? (currentLanguage === "ko" ? "미사일 찍기 ON · 지도 위에서 25×25 범위와 중심/꼭짓점 좌표를 확인하고 클릭하면 임시 표시가 남습니다." : "Missile pin ON. Preview the 25×25 range with center and corner coordinates, then click the map to place it.")
      : (currentLanguage === "ko" ? "미사일 찍기를 껐습니다." : "Missile pin OFF."),
  );
});
dummyBaseToggle.addEventListener("click", () => {
  setRangeMode(showDummyBase ? "" : "dummyBase");
  draw();
  setMessage(
    showDummyBase
      ? (currentLanguage === "ko" ? "더미 기지 찍기 ON · 지도 위에서 3×3 범위를 확인하고 클릭하면 임시 표시가 남습니다." : "Dummy base pin ON. Preview the 3×3 range and click the map to place it.")
      : (currentLanguage === "ko" ? "더미 기지 찍기를 껐습니다." : "Dummy base pin OFF."),
  );
});
recommendationToggle.addEventListener("click", () => {
  showRecommendations = !showRecommendations;
  localStorage.setItem(RECOMMENDATION_TOGGLE_KEY, showRecommendations ? "1" : "0");
  recommendationToggle.setAttribute("aria-pressed", String(showRecommendations));
  recommendationToggle.classList.toggle("is-active", showRecommendations);
  recommendationSection.hidden = !showRecommendations;
  if (!showRecommendations) activeRecommendationId = "";
  renderRecommendations();
  draw();
  setMessage(showRecommendations ? (currentLanguage === "ko" ? "연소탄 추천을 표시합니다." : "Showing incendiary recommendations.") : (currentLanguage === "ko" ? "연소탄 추천을 숨겼습니다." : "Hiding incendiary recommendations."));
});
clearTempButton.addEventListener("click", () => {
  tempRanges = [];
  saveTempRanges();
  draw();
  setMessage(currentLanguage === "ko" ? "임시 표시를 모두 지웠습니다." : "Cleared all temporary ranges.");
});
document.getElementById("copySupplyButton").addEventListener("click", () => copyLayer("supply"));
document.getElementById("copyUsedButton").addEventListener("click", () => copyLayer("used"));
createHistorySnapshotButton?.addEventListener("click", createHistorySnapshot);
refreshHistoryButton?.addEventListener("click", loadHistory);
exitHistoryPreviewButton?.addEventListener("click", () => clearHistoryPreview(true));
adminLoginButton.addEventListener("click", loginAdmin);
adminLogoutButton.addEventListener("click", () => logoutAdmin(t("viewerMode")));
adminCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginAdmin();
});
searchInput.addEventListener("input", renderList);
supplyList.addEventListener("click", handleListAction);
usedList.addEventListener("click", handleListAction);
recommendationList.addEventListener("click", handleRecommendationAction);
historyList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "history-jump") {
    jumpToCoordinate(button.dataset.coord);
    return;
  }
  if (action === "history-preview") {
    previewHistoryVersion(button.dataset.id, button.dataset.snapshot);
    return;
  }
  if (action === "history-publish") {
    publishHistoryVersion(button.dataset.id);
  }
});
levelTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-level]");
  if (!button || button.disabled) return;
  setActiveLevel(button.dataset.level);
});
sourceTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-source]");
  if (!button) return;
  setActiveSource(button.dataset.source);
});

canvas.addEventListener("mousemove", (event) => {
  const point = canvasPoint(event);
  const coord = screenToMap(point);
  const key = keyOf(coord.x, coord.y);
  const tags = [];
  if (layers.used.has(key) && !layers.supply.has(key)) tags.push(currentLanguage === "ko" ? "수기 보정" : "manual");
  else if (layers.used.has(key)) tags.push(currentLanguage === "ko" ? "사용" : "used");
  else if (layers.supply.has(key)) tags.push(currentLanguage === "ko" ? "보급품" : "supply");
  const label = coordinateLabel(coord.x, coord.y, tags);
  hoverCoord.textContent = label;
  updateCursorCoord(point, label);
  const manual = findNearestVisibleCoordinate(getManualUsed(), point);
  const building = showBuildings ? findNearestBuilding(point) : null;
  canvas.title = manual ? `${manual}: ${manualUsedNote()}` : building ? `${building.type}. ${buildingName(building.type)}` : "";
  if (activeRangeType()) {
    const prev = hoverMapPoint;
    hoverMapPoint = coord;
    if (!isDragging && (!prev || prev.x !== coord.x || prev.y !== coord.y)) draw();
  } else {
    hoverMapPoint = coord;
  }
  if (!isDragging) return;
  const moved = Math.hypot(point.x - dragStart.x, point.y - dragStart.y);
  if (moved > 3) dragStart.didDrag = true;
  const dx = ((point.x - dragStart.x) / point.w) * view.size;
  const dy = ((point.y - dragStart.y) / point.h) * view.size;
  view.x = dragStart.viewX - dx;
  view.y = dragStart.viewY + dy;
  clampView();
  draw();
});
canvas.addEventListener("mouseleave", () => {
  hoverCoord.textContent = t("coordDash");
  hideCursorCoord();
  if (activeRangeType() && hoverMapPoint) {
    hoverMapPoint = null;
    draw();
  } else {
    hoverMapPoint = null;
  }
});
canvas.addEventListener("mousedown", (event) => {
  if (Date.now() - lastTouchAt < 500) return;
  isDragging = true;
  const point = canvasPoint(event);
  dragStart = { ...point, viewX: view.x, viewY: view.y, didDrag: false };
});
window.addEventListener("mouseup", (event) => {
  if (isDragging && dragStart && !dragStart.didDrag && event.target === canvas) {
    const point = canvasPoint(event);
    const rangeType = activeRangeType();
    if (rangeType) addTempRange(rangeType, screenToMap(point));
    else applyMapClick(point);
  }
  isDragging = false;
});
canvas.addEventListener("wheel", zoomAt, { passive: false });
canvas.addEventListener(
  "touchstart",
  (event) => {
    lastTouchAt = Date.now();
    if (event.touches.length === 1) {
      const point = touchPoint(event.touches[0]);
      if (activeRangeType()) {
        hoverMapPoint = screenToMap(point);
        hoverCoord.textContent = coordinateLabel(hoverMapPoint.x, hoverMapPoint.y);
        touchGesture = { type: "preview", ...point, didDrag: false };
        draw();
        event.preventDefault();
        return;
      }
      touchGesture = { type: "pan", ...point, viewX: view.x, viewY: view.y, didDrag: false };
    } else if (event.touches.length === 2) {
      const center = touchCenter(event.touches);
      touchGesture = {
        type: "pinch",
        startDistance: Math.max(1, touchDistance(event.touches)),
        startSize: view.size,
        centerMap: screenToMap(center),
      };
    }
    event.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (event) => {
    lastTouchAt = Date.now();
    if (!touchGesture) return;

    if (event.touches.length === 1 && touchGesture.type === "preview") {
      const point = touchPoint(event.touches[0]);
      const moved = Math.hypot(point.x - touchGesture.x, point.y - touchGesture.y);
      if (moved > 3) touchGesture.didDrag = true;
      const coord = screenToMap(point);
      hoverCoord.textContent = coordinateLabel(coord.x, coord.y);
      const prev = hoverMapPoint;
      hoverMapPoint = coord;
      if (!prev || prev.x !== coord.x || prev.y !== coord.y) draw();
    } else if (event.touches.length === 1 && touchGesture.type === "pan") {
      const point = touchPoint(event.touches[0]);
      const moved = Math.hypot(point.x - touchGesture.x, point.y - touchGesture.y);
      if (moved > 3) touchGesture.didDrag = true;
      const dx = ((point.x - touchGesture.x) / point.w) * view.size;
      const dy = ((point.y - touchGesture.y) / point.h) * view.size;
      view.x = touchGesture.viewX - dx;
      view.y = touchGesture.viewY + dy;
      clampView();
      const coord = screenToMap(point);
      hoverCoord.textContent = coordinateLabel(coord.x, coord.y);
      hoverMapPoint = coord;
      draw();
    } else if (event.touches.length === 2) {
      if (touchGesture.type !== "pinch") {
        const center = touchCenter(event.touches);
        touchGesture = {
          type: "pinch",
          startDistance: Math.max(1, touchDistance(event.touches)),
          startSize: view.size,
          centerMap: screenToMap(center),
        };
      }
      const center = touchCenter(event.touches);
      const distance = Math.max(1, touchDistance(event.touches));
      const newSize = Math.max(10, Math.min(MAP_SIZE, touchGesture.startSize * (touchGesture.startDistance / distance)));
      view.x = touchGesture.centerMap.x - (center.x / center.w) * newSize;
      view.y = touchGesture.centerMap.y - (1 - center.y / center.h) * newSize;
      view.size = newSize;
      clampView();
      const coord = screenToMap(center);
      hoverCoord.textContent = coordinateLabel(coord.x, coord.y);
      draw();
    }

    event.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchend",
  (event) => {
    lastTouchAt = Date.now();
    if (
      touchGesture?.type === "pan" &&
      !touchGesture.didDrag &&
      event.changedTouches.length === 1 &&
      !activeRangeType()
    ) {
      applyMapClick(touchPoint(event.changedTouches[0]));
    } else if (
      touchGesture?.type === "preview" &&
      !touchGesture.didDrag &&
      event.changedTouches.length === 1 &&
      activeRangeType()
    ) {
      addTempRange(activeRangeType(), screenToMap(touchPoint(event.changedTouches[0])));
    }
    if (event.touches.length === 0) {
      touchGesture = null;
    } else if (event.touches.length === 1) {
      const point = touchPoint(event.touches[0]);
      if (activeRangeType()) {
        touchGesture = { type: "preview", ...point, didDrag: true };
      } else {
        touchGesture = { type: "pan", ...point, viewX: view.x, viewY: view.y, didDrag: true };
      }
    }
    event.preventDefault();
  },
  { passive: false },
);
window.addEventListener("resize", draw);

canvas.style.cursor = "grab";
if ([showIncendiary, showFurnace, showMissile, showDummyBase].filter(Boolean).length > 1) {
  const preferredMode = showDummyBase ? "dummyBase" : showMissile ? "missile" : showFurnace ? "furnace" : "incendiary";
  showIncendiary = preferredMode === "incendiary";
  showFurnace = preferredMode === "furnace";
  showMissile = preferredMode === "missile";
  showDummyBase = preferredMode === "dummyBase";
}
buildingToggle.setAttribute("aria-pressed", String(showBuildings));
buildingToggle.classList.toggle("is-active", showBuildings);
gridToggle.setAttribute("aria-pressed", String(showGrid));
gridToggle.classList.toggle("is-active", showGrid);
syncRangeModeToggles();
recommendationToggle.setAttribute("aria-pressed", String(showRecommendations));
recommendationToggle.classList.toggle("is-active", showRecommendations);

clientId = getOrCreateClientId();
recordVisitIfNeeded();
heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    sendHeartbeat();
    if (isAdmin) refreshStats();
  }
});

loadInitialData();
if (!showLanguageModalIfNeeded()) showAllianceNoticeIfNeeded();
