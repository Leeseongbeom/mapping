import { SUPPLY_BY_LEVEL } from "./supply-data.js";

const MAP_SIZE = 1000;
const LEVELS = Object.keys(SUPPLY_BY_LEVEL).sort((a, b) => Number(a) - Number(b));
const DEFAULT_LEVEL = "3";
const BOUNDARIES = [0, 74, 149, 224, 299, 374, 449, 549, 624, 699, 774, 849, 924, 999];
const BUILDING_NAMES = {
  1: "마을",
  2: "도시",
  3: "공장",
  4: "열차역",
  5: "로켓기지",
  6: "전쟁 궁전",
  7: "원자력 전기로",
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

const MANUAL_USED_NOTE =
  "수기 입력 좌표입니다. 보급품 목록 중 가까운 좌표가 잘못 표기된 것으로 보고, 근처 보급품이 사용된 것으로 참고하세요.";

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
const updatedAtLabel = document.getElementById("updatedAtLabel");
const sourceLabel = document.getElementById("sourceLabel");
const bulkAddSection = document.getElementById("bulkAddSection");
const buildingToggle = document.getElementById("buildingToggle");
const incendiaryToggle = document.getElementById("incendiaryToggle");
const recommendationToggle = document.getElementById("recommendationToggle");
const recommendationSection = document.getElementById("recommendationSection");
const recommendationList = document.getElementById("recommendationList");
const recommendationCount = document.getElementById("recommendationCount");
const statsLabel = document.getElementById("statsLabel");
const levelTabs = document.getElementById("levelTabs");

const layers = {
  supply: new Set(),
  used: new Set(),
  supplyByLevel: {},
  usedByLevel: {},
};
const buildings = createBuildings();
const STORAGE_KEY = "lastwar-coordinate-map-v2";
const LEVEL_STORAGE_KEY = "lastwar-active-supply-level";
const LEGACY_STORAGE_KEY = "lastwar-coordinate-map-v1";
const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:4174" : "";
const ADMIN_TOKEN_KEY = "lastwar-admin-token";
const BUILDING_TOGGLE_KEY = "lastwar-show-buildings";
const INCENDIARY_TOGGLE_KEY = "lastwar-show-incendiary";
const RECOMMENDATION_TOGGLE_KEY = "lastwar-show-incendiary-recommendations";
const CLIENT_ID_KEY = "lastwar-client-id";
const VISIT_RECORDED_KEY = "lastwar-visit-recorded-date";
const HEARTBEAT_MS = 30 * 1000;
const STATS_POLL_MS = 20 * 1000;

let view = { x: 0, y: 0, size: MAP_SIZE };
let isDragging = false;
let dragStart = null;
let touchGesture = null;
let lastTouchAt = 0;
let adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
let isAdmin = Boolean(adminToken);
let toastTimer = null;
let latestUpdatedAt = "";
let showBuildings = localStorage.getItem(BUILDING_TOGGLE_KEY) === "1";
let showIncendiary = localStorage.getItem(INCENDIARY_TOGGLE_KEY) === "1";
let showRecommendations = localStorage.getItem(RECOMMENDATION_TOGGLE_KEY) === "1";
let hoverMapPoint = null;
let clientId = "";
let heartbeatTimer = null;
let statsTimer = null;
let activeLevel = normalizeLevel(localStorage.getItem(LEVEL_STORAGE_KEY) || DEFAULT_LEVEL);
let pulses = [];
let pulseFrame = null;
let activeRecommendationId = "";

function keyOf(x, y) {
  return `${x},${y}`;
}

function normalizeLevel(value) {
  const level = String(value || DEFAULT_LEVEL);
  return LEVELS.includes(level) ? level : DEFAULT_LEVEL;
}

function emptyUsedByLevel() {
  return Object.fromEntries(LEVELS.map((level) => [level, new Set()]));
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

function isCoordinateText(value) {
  return typeof value === "string" && /^\d{1,3},\d{1,3}$/.test(value);
}

function syncActiveLayers() {
  activeLevel = normalizeLevel(activeLevel);
  layers.supply = layers.supplyByLevel[activeLevel] || new Set();
  layers.used = layers.usedByLevel[activeLevel] || new Set();
}

function applyState(data) {
  layers.usedByLevel = normalizeUsedByLevel(data.usedByLevel);
  if (!data.usedByLevel && Array.isArray(data.used)) {
    layers.usedByLevel[DEFAULT_LEVEL] = new Set(data.used.filter(isCoordinateText));
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
  for (const level of LEVELS) {
    layers.supplyByLevel[level] = new Set();
    layers.usedByLevel[level] = new Set();
    for (const [x, y] of parseCoordinates(SUPPLY_BY_LEVEL[level] || "").parsed) {
      layers.supplyByLevel[level].add(keyOf(x, y));
    }
  }
  syncActiveLayers();

  setAdminMode(isAdmin, isAdmin ? "관리자 모드" : "보기 전용 모드");
  renderLevelTabs();

  try {
    const data = await apiFetch("/api/state");
    applyState(data);
    refresh("서버의 사용 목록을 불러왔습니다.");
    return;
  } catch {
    setMessage("서버 연결이 없어 임시 로컬 데이터로 표시합니다.");
  }

  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.usedByLevel) {
        layers.usedByLevel = normalizeUsedByLevel(parsed.usedByLevel);
      } else {
        layers.usedByLevel = emptyUsedByLevel();
        layers.usedByLevel[DEFAULT_LEVEL] = new Set(Array.isArray(parsed.used) ? parsed.used.filter(isCoordinateText) : []);
      }
      syncActiveLayers();
      latestUpdatedAt = parsed.updatedAt || "";
      refresh("저장된 좌표를 불러왔습니다.");
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  for (const [x, y] of parseCoordinates(INITIAL_USED).parsed) layers.usedByLevel[DEFAULT_LEVEL].add(keyOf(x, y));
  syncActiveLayers();
  latestUpdatedAt = new Date().toISOString();
  refresh("사진 좌표를 불러왔습니다. 파란 보급품 핀을 클릭하면 사용 목록으로 이동합니다.");
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
  document.body.classList.toggle("is-admin", isAdmin);
  bulkAddSection.hidden = !isAdmin;
  recommendationSection.hidden = !showRecommendations;
  adminState.textContent = text || (isAdmin ? "관리자 모드" : "보기 전용 모드");
  if (isAdmin) startStatsPolling();
  else stopStatsPolling();
}

function renderLevelTabs() {
  for (const button of levelTabs.querySelectorAll("button[data-level]")) {
    const selected = button.dataset.level === activeLevel;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  }
  sourceLabel.hidden = activeLevel === DEFAULT_LEVEL;
}

function setActiveLevel(level) {
  activeLevel = normalizeLevel(level);
  localStorage.setItem(LEVEL_STORAGE_KEY, activeLevel);
  syncActiveLayers();
  pulses = [];
  if (pulseFrame) {
    cancelAnimationFrame(pulseFrame);
    pulseFrame = null;
  }
  activeRecommendationId = "";
  renderLevelTabs();
  refresh(`${activeLevel}단계 보급품을 표시합니다.`);
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
    statsLabel.textContent = `접속 ${Number(data.active) || 0} · 오늘 ${Number(data.today) || 0} · 누적 ${Number(data.total) || 0}`;
  } catch (error) {
    if (error.status === 401 || error.status === 403) stopStatsPolling();
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
  if (statsLabel) statsLabel.textContent = "접속 -";
}

async function pasteInto(textarea) {
  try {
    textarea.value = await navigator.clipboard.readText();
    textarea.focus();
    setMessage("클립보드 내용을 붙여넣었습니다.");
  } catch {
    textarea.focus();
    setMessage("브라우저 권한 때문에 자동 붙여넣기가 막혔습니다. Cmd+V로 붙여넣어 주세요.");
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
    `사용 위치 추가 요청 ${add.length}개${manualCount ? `, 수기 보정 ${manualCount}개` : ""}${invalid.length ? `, 오류 ${invalid.length}개` : ""}`,
  );
  if (!ok) return;
  const added = layers.used.size - before;
  if (add[0]) startCoordinatePulse(add[0], markerColorForCoordinate(add[0]));
  setMessage(
    `반영되었습니다. 추가 ${added}개, 중복 ${add.length - added}개${manualCount ? `, 수기 보정 ${manualCount}개` : ""}${invalid.length ? `, 오류 ${invalid.length}개` : ""}`,
  );
  window.alert("반영되었습니다.\n표시까지 시간이 조금 걸릴 수 있습니다.");
}

function deleteCoordinates(text) {
  const { parsed, invalid } = parseCoordinates(text);
  let removed = 0;
  for (const [x, y] of parsed) {
    if (layers.used.delete(keyOf(x, y))) removed += 1;
  }
  refresh(`사용 취소 ${removed}개, 미존재 ${parsed.length - removed}개${invalid.length ? `, 오류 ${invalid.length}개` : ""}`);
}

function layerLabel(layerName) {
  return layerName === "used" ? "사용 위치" : "보급품 위치";
}

function refresh(text) {
  supplyCount.textContent = getRemainingSupply().size.toLocaleString("ko-KR");
  usedCount.textContent = layers.used.size.toLocaleString("ko-KR");
  updatedAtLabel.textContent = formatUpdatedAt(latestUpdatedAt);
  sourceLabel.hidden = activeLevel === DEFAULT_LEVEL;
  saveLocalFallback();
  setMessage(text);
  renderList();
  renderRecommendations();
  draw();
}

function saveLocalFallback() {
  const usedByLevel = Object.fromEntries(LEVELS.map((level) => [level, Array.from(layers.usedByLevel[level] || [])]));
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      used: usedByLevel[DEFAULT_LEVEL],
      usedByLevel,
      updatedAt: latestUpdatedAt,
    }),
  );
}

async function mutateUsed(payload, pendingText) {
  if (!isAdmin) {
    setMessage("관리자 코드 입력 후 수정할 수 있습니다.");
    return false;
  }

  try {
    if (pendingText) setMessage(pendingText);
    const data = await apiFetch("/api/used", {
      method: "POST",
      body: JSON.stringify({ level: activeLevel, ...payload }),
    });
    applyState({ ...data, updatedAt: data.updatedAt || new Date().toISOString() });
    refresh("반영되었습니다.");
    showToast("반영되었습니다.");
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      logoutAdmin("관리자 코드가 만료되었거나 올바르지 않습니다.");
      return false;
    }
    setMessage(`저장 실패: ${error.message}`);
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
  if (!value) return "최신화 -";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "최신화 -";
  const parts = new Intl.DateTimeFormat("ko-KR", {
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
  return `최신화 ${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
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
      entries.push({ x, y, type, name: BUILDING_NAMES[type] });
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
  recommendationCount.textContent = `${recommendations.length.toLocaleString("ko-KR")}개`;
  recommendationSection.hidden = !showRecommendations;

  if (recommendations.length === 0) {
    recommendationList.innerHTML = `<div class="empty-list">추천 가능한 좌표쌍이 없습니다.</div>`;
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
            <span class="recommendation-meta">중심 ${item.target.x},${item.target.y}</span>
          </button>
          <button class="row-action admin-only" type="button" data-action="recommendation-use" data-id="${item.id}">둘 다 사용</button>
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
  countTarget.textContent = `${entries.length.toLocaleString("ko-KR")}개`;

  if (visible.length === 0) {
    target.innerHTML = `<div class="empty-list">표시할 좌표가 없습니다.</div>`;
    return;
  }

  const rows = visible
    .map((coord) => {
      const isManual = layerName === "used" && !layers.supply.has(coord);
      const secondaryAction =
        layerName === "supply"
          ? `<button class="row-action admin-only" type="button" data-action="mark-used" data-layer="${layerName}" data-coord="${coord}">사용</button>`
          : `<button class="row-action delete admin-only" type="button" data-action="remove" data-layer="${layerName}" data-coord="${coord}">취소</button>`;
      return `
        <div class="coord-row${isManual ? " manual-row" : ""}">
          <button class="coord-jump" type="button" data-action="jump" data-coord="${coord}" ${isManual ? `title="${MANUAL_USED_NOTE}"` : ""}>${isManual ? '<b class="dot manual-dot"></b>' : ""}${coord}</button>
          ${secondaryAction}
        </div>
      `;
    })
    .join("");
  const overflow = hiddenCount > 0 ? `<div class="empty-list">... ${hiddenCount.toLocaleString("ko-KR")}개 더 있음</div>` : "";
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
      setMessage(`${target} 위치를 확인했습니다.`);
    } else {
      setMessage("관리자 코드 입력 후 수정할 수 있습니다.");
    }
    return;
  }

  const used = findNearestVisibleCoordinate(layers.used, point);
  if (used) {
    const ok = await mutateUsed({ remove: [used] });
    if (ok) {
      startCoordinatePulse(used, layers.supply.has(used) ? "#6aa6ff" : "#b779ff", false);
      setMessage(`${used} 사용 표시를 취소했습니다.`);
    }
    return;
  }

  const supply = findNearestVisibleCoordinate(getRemainingSupply(), point);
  if (supply) {
    const ok = await mutateUsed({ add: [supply] });
    if (ok) {
      startCoordinatePulse(supply, "#ff6b6b", false);
      setMessage(`${supply} 보급품을 사용한 것으로 표시했습니다.`);
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
  setMessage(`${coordText} 위치로 이동했습니다.`);
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
  pulses.push({ coord: coordText, color, startedAt: performance.now(), duration: 1200 });
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
    setMessage("추천 좌표가 최신 목록에 없습니다.");
    return;
  }

  if (button.dataset.action === "recommendation-jump") {
    focusRecommendation(item);
    setMessage(`${item.coords.join(" + ")} 추천 중심은 ${item.target.x},${item.target.y} 입니다.`);
    return;
  }

  if (button.dataset.action === "recommendation-use") {
    const ok = await mutateUsed({ add: item.coords });
    if (ok) {
      focusRecommendation(item);
      setMessage(`${item.coords.join(" + ")} 두 좌표를 사용 처리했습니다.`);
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
      setMessage(`${coord} 사용한 보급품으로 표시했습니다.`);
    }
    return;
  }
  if (action === "remove") {
    const ok = await mutateUsed({ remove: [coord] });
    if (ok) {
      startCoordinatePulse(coord, layers.supply.has(coord) ? "#6aa6ff" : "#b779ff");
      setMessage(`${coord} 사용 표시를 취소했습니다.`);
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
  drawBoundaries(rect);
  if (showBuildings) drawBuildings(rect);
  drawLayer(rect, getRemainingSupply(), "#6aa6ff", 1);
  drawLayer(rect, getConfirmedUsed(), "#ff6b6b", 1);
  drawManualLayer(rect, getManualUsed(), "#b779ff");
  if (showRecommendations) drawRecommendationLayer(rect);
  drawPulses(rect);
  if (showIncendiary && hoverMapPoint) {
    drawIncendiaryRange(rect, hoverMapPoint.x, hoverMapPoint.y);
  }
  drawFrame(rect);
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
    ctx.font = `700 ${Math.max(10, Math.min(15, size * 0.26))}px ui-sans-serif, system-ui, sans-serif`;
    const paddingX = size * 0.16;
    const labelW = ctx.measureText(building.name).width + paddingX * 2;
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
    ctx.fillText(building.name, labelX + paddingX, labelY + labelH / 2);
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
    if (showLabels) drawCoordinateLabel(p.x, p.y, iconSize, note ? `${coord} 수기` : coord, color);
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
    if (showLabels) drawCoordinateLabel(p.x, p.y, iconSize, `${coord} 수기`, color);
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
    const label = `중심 ${item.target.x},${item.target.y}`;
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
    const maxRadius = Math.max(20, baseSize * 2.6);

    ctx.save();
    ctx.lineWidth = Math.max(2, baseSize * 0.13);
    for (let i = 0; i < 3; i += 1) {
      const phase = progress - i * 0.18;
      if (phase < 0 || phase > 1) continue;
      const ease = 1 - Math.pow(1 - phase, 2);
      const radius = baseSize * 0.55 + ease * maxRadius;
      ctx.globalAlpha = Math.max(0, 0.75 * (1 - phase));
      ctx.strokeStyle = pulse.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 0.45 * (1 - progress));
    ctx.fillStyle = pulse.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(4, baseSize * 0.4), 0, Math.PI * 2);
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
    () => setMessage(`${layerLabel(layerName)} 목록을 복사했습니다.`),
    () => setMessage("복사 권한이 막혔습니다."),
  );
}

async function loginAdmin() {
  const code = adminCodeInput.value.trim();
  if (!code) {
    setMessage("관리자 코드를 입력해 주세요.");
    adminCodeInput.focus();
    return;
  }

  try {
    const data = await apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    adminToken = data.token || "";
    sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    adminCodeInput.value = "";
    setAdminMode(true, "관리자 모드");
    refresh("관리자 모드로 전환되었습니다.");
    showToast("관리자 모드입니다.");
  } catch (error) {
    logoutAdmin("관리자 코드가 맞지 않습니다.");
  }
}

function logoutAdmin(text = "보기 전용 모드") {
  adminToken = "";
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  setAdminMode(false, text);
  renderList();
  draw();
  setMessage(text);
}

document.getElementById("pasteAddButton").addEventListener("click", () => pasteInto(addInput));
document.getElementById("addButton").addEventListener("click", () => addCoordinates(addInput.value));
document.getElementById("clearButton").addEventListener("click", () => {
  if (!confirm(`${activeLevel}단계 사용한 보급품 목록을 모두 비울까요?`)) return;
  mutateUsed({ clear: true }).then((ok) => {
    if (ok) setMessage(`${activeLevel}단계 사용한 보급품 목록을 모두 비웠습니다.`);
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
  setMessage(showBuildings ? "건물 표시를 켰습니다." : "건물 표시를 껐습니다.");
});
incendiaryToggle.addEventListener("click", () => {
  showIncendiary = !showIncendiary;
  localStorage.setItem(INCENDIARY_TOGGLE_KEY, showIncendiary ? "1" : "0");
  incendiaryToggle.setAttribute("aria-pressed", String(showIncendiary));
  incendiaryToggle.classList.toggle("is-active", showIncendiary);
  if (!showIncendiary) hoverMapPoint = null;
  draw();
  setMessage(
    showIncendiary
      ? "연소탄 미리보기 ON · 지도 위에 마우스를 올리거나(모바일에서는 손가락으로 터치/드래그) 9×9 범위를 확인하세요."
      : "연소탄 미리보기를 껐습니다.",
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
  setMessage(showRecommendations ? "연소탄 추천을 표시합니다." : "연소탄 추천을 숨겼습니다.");
});
document.getElementById("copySupplyButton").addEventListener("click", () => copyLayer("supply"));
document.getElementById("copyUsedButton").addEventListener("click", () => copyLayer("used"));
adminLoginButton.addEventListener("click", loginAdmin);
adminLogoutButton.addEventListener("click", () => logoutAdmin("보기 전용 모드"));
adminCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginAdmin();
});
searchInput.addEventListener("input", renderList);
supplyList.addEventListener("click", handleListAction);
usedList.addEventListener("click", handleListAction);
recommendationList.addEventListener("click", handleRecommendationAction);
levelTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-level]");
  if (!button) return;
  setActiveLevel(button.dataset.level);
});

canvas.addEventListener("mousemove", (event) => {
  const coord = screenToMap(canvasPoint(event));
  const key = keyOf(coord.x, coord.y);
  const tags = [];
  if (layers.used.has(key) && !layers.supply.has(key)) tags.push("수기 보정");
  else if (layers.used.has(key)) tags.push("사용");
  else if (layers.supply.has(key)) tags.push("보급품");
  hoverCoord.textContent = `좌표: ${coord.x},${coord.y}${tags.length ? ` · ${tags.join("/")}` : ""}`;
  const manual = findNearestVisibleCoordinate(getManualUsed(), canvasPoint(event));
  const building = showBuildings ? findNearestBuilding(canvasPoint(event)) : null;
  canvas.title = manual ? `${manual}: ${MANUAL_USED_NOTE}` : building ? `${building.type}. ${building.name}` : "";
  if (showIncendiary) {
    const prev = hoverMapPoint;
    hoverMapPoint = coord;
    if (!isDragging && (!prev || prev.x !== coord.x || prev.y !== coord.y)) draw();
  } else {
    hoverMapPoint = coord;
  }
  if (!isDragging) return;
  const point = canvasPoint(event);
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
  hoverCoord.textContent = "좌표: -";
  if (showIncendiary && hoverMapPoint) {
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
    if (!showIncendiary) applyMapClick(point);
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
      if (showIncendiary) {
        hoverMapPoint = screenToMap(point);
        hoverCoord.textContent = `좌표: ${hoverMapPoint.x},${hoverMapPoint.y}`;
        touchGesture = { type: "preview" };
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
      const coord = screenToMap(point);
      hoverCoord.textContent = `좌표: ${coord.x},${coord.y}`;
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
      hoverCoord.textContent = `좌표: ${coord.x},${coord.y}`;
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
      hoverCoord.textContent = `좌표: ${coord.x},${coord.y}`;
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
      !showIncendiary
    ) {
      applyMapClick(touchPoint(event.changedTouches[0]));
    }
    if (event.touches.length === 0) {
      touchGesture = null;
    } else if (event.touches.length === 1) {
      const point = touchPoint(event.touches[0]);
      if (showIncendiary) {
        touchGesture = { type: "preview" };
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
buildingToggle.setAttribute("aria-pressed", String(showBuildings));
buildingToggle.classList.toggle("is-active", showBuildings);
incendiaryToggle.setAttribute("aria-pressed", String(showIncendiary));
incendiaryToggle.classList.toggle("is-active", showIncendiary);
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
