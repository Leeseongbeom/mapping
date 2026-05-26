import { INITIAL_SUPPLY } from "./supply-data.js";

const MAP_SIZE = 1000;
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
const bulkAddSection = document.getElementById("bulkAddSection");
const buildingToggle = document.getElementById("buildingToggle");

const layers = {
  supply: new Set(),
  used: new Set(),
};
const buildings = createBuildings();
const STORAGE_KEY = "lastwar-coordinate-map-v2";
const LEGACY_STORAGE_KEY = "lastwar-coordinate-map-v1";
const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:4174" : "";
const ADMIN_TOKEN_KEY = "lastwar-admin-token";
const BUILDING_TOGGLE_KEY = "lastwar-show-buildings";

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

function keyOf(x, y) {
  return `${x},${y}`;
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
  for (const [x, y] of parseCoordinates(INITIAL_SUPPLY).parsed) layers.supply.add(keyOf(x, y));

  setAdminMode(isAdmin, isAdmin ? "관리자 모드" : "보기 전용 모드");

  try {
    const data = await apiFetch("/api/state");
    layers.used = new Set(Array.isArray(data.used) ? data.used : []);
    latestUpdatedAt = data.updatedAt || "";
    refresh("서버의 사용 목록을 불러왔습니다.");
    return;
  } catch {
    setMessage("서버 연결이 없어 임시 로컬 데이터로 표시합니다.");
  }

  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      layers.used = new Set(Array.isArray(parsed.used) ? parsed.used : []);
      latestUpdatedAt = parsed.updatedAt || "";
      refresh("저장된 좌표를 불러왔습니다.");
      return;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  for (const [x, y] of parseCoordinates(INITIAL_USED).parsed) layers.used.add(keyOf(x, y));
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
  adminState.textContent = text || (isAdmin ? "관리자 모드" : "보기 전용 모드");
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
  saveLocalFallback();
  setMessage(text);
  renderList();
  draw();
}

function saveLocalFallback() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      used: Array.from(layers.used),
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
      body: JSON.stringify(payload),
    });
    layers.used = new Set(Array.isArray(data.used) ? data.used : []);
    latestUpdatedAt = data.updatedAt || new Date().toISOString();
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
    setMessage("관리자 코드 입력 후 수정할 수 있습니다.");
    return;
  }

  const used = findNearestVisibleCoordinate(layers.used, point);
  if (used) {
    await mutateUsed({ remove: [used] });
    setMessage(`${used} 사용 표시를 취소했습니다.`);
    return;
  }

  const supply = findNearestVisibleCoordinate(getRemainingSupply(), point);
  if (supply) {
    await mutateUsed({ add: [supply] });
    setMessage(`${supply} 보급품을 사용한 것으로 표시했습니다.`);
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
  const [x, y] = coordText.split(",").map(Number);
  view.size = Math.min(view.size, 80);
  view.x = x - view.size / 2;
  view.y = y - view.size / 2;
  clampView();
  draw();
  setMessage(`${coordText} 위치로 이동했습니다.`);
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
    await mutateUsed({ add: [coord] });
    setMessage(`${coord} 사용한 보급품으로 표시했습니다.`);
    return;
  }
  if (action === "remove") {
    await mutateUsed({ remove: [coord] });
    setMessage(`${coord} 사용 표시를 취소했습니다.`);
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
  drawFrame(rect);
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
  const coordinates = Array.from(layers[layerName]);
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
  if (!confirm("사용한 보급품 목록을 모두 비울까요?")) return;
  mutateUsed({ clear: true }).then((ok) => {
    if (ok) setMessage("사용한 보급품 목록을 모두 비웠습니다.");
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
document.getElementById("copyUsedButton").addEventListener("click", () => copyLayer("used"));
adminLoginButton.addEventListener("click", loginAdmin);
adminLogoutButton.addEventListener("click", () => logoutAdmin("보기 전용 모드"));
adminCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginAdmin();
});
searchInput.addEventListener("input", renderList);
supplyList.addEventListener("click", handleListAction);
usedList.addEventListener("click", handleListAction);

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
    applyMapClick(point);
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

    if (event.touches.length === 1 && touchGesture.type === "pan") {
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
    if (touchGesture?.type === "pan" && !touchGesture.didDrag && event.changedTouches.length === 1) {
      applyMapClick(touchPoint(event.changedTouches[0]));
    }
    if (event.touches.length === 0) {
      touchGesture = null;
    } else if (event.touches.length === 1) {
      const point = touchPoint(event.touches[0]);
      touchGesture = { type: "pan", ...point, viewX: view.x, viewY: view.y, didDrag: true };
    }
    event.preventDefault();
  },
  { passive: false },
);
window.addEventListener("resize", draw);

canvas.style.cursor = "grab";
buildingToggle.setAttribute("aria-pressed", String(showBuildings));
buildingToggle.classList.toggle("is-active", showBuildings);
loadInitialData();
