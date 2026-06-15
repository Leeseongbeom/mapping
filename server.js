import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GEUMGO_SUPPLY_BY_LEVEL } from "./geumgo-data.js";
import { SUPPLY_BY_LEVEL } from "./supply-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4174);
const ADMIN_CODE = process.env.ADMIN_CODE || "change-me";
const SUPER_ADMIN_CODE = process.env.SUPER_ADMIN_CODE || "lastwar2185";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "used.json");
const HISTORY_FILE = path.join(DATA_DIR, "used-history.json");
const VISITS_FILE = path.join(DATA_DIR, "visits.json");
const ACTIVE_TTL_MS = 90 * 1000;
const HEARTBEAT_MAX_CLIENTS = 10000;
const activeClients = new Map();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "used_coordinates";
const SUPABASE_HISTORY_TABLE = process.env.SUPABASE_HISTORY_TABLE || "used_history";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPPLY_LEVEL_IDS = ["1", "2", "3", "4", "5", "6", "7"];
const EMPTY_SUPPLY_BY_LEVEL = Object.fromEntries(SUPPLY_LEVEL_IDS.map((level) => [level, ""]));
const SUPPLY_SOURCES = {
  cpt: SUPPLY_BY_LEVEL,
  geumgo: GEUMGO_SUPPLY_BY_LEVEL,
  untitled: EMPTY_SUPPLY_BY_LEVEL,
};
const SOURCE_KEYS = Object.keys(SUPPLY_SOURCES);
const DEFAULT_SOURCE = "cpt";
const LEVELS = [...new Set(SOURCE_KEYS.flatMap((source) => Object.keys(SUPPLY_SOURCES[source])))].sort(
  (a, b) => Number(a) - Number(b),
);
const DEFAULT_LEVEL = "3";
const SUPPLY_SETS = Object.fromEntries(
  SOURCE_KEYS.map((source) => [
    source,
    Object.fromEntries(
      LEVELS.map((level) => [
        level,
        new Set(parseCoordinates(SUPPLY_SOURCES[source][level] || "").map(([x, y]) => `${x},${y}`)),
      ]),
    ),
  ]),
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isCoordinate(value) {
  return typeof value === "string" && /^(?:[0-9]|[1-9][0-9]{1,2}),[0-9]{1,3}$/.test(value) && value.split(",").every((part) => Number(part) >= 0 && Number(part) <= 999);
}

function normalizeLevel(value) {
  const level = String(value || DEFAULT_LEVEL);
  return LEVELS.includes(level) ? level : DEFAULT_LEVEL;
}

function normalizeSource(value) {
  const source = String(value || DEFAULT_SOURCE);
  return SOURCE_KEYS.includes(source) ? source : DEFAULT_SOURCE;
}

function parseCoordinates(text) {
  const matches = text.match(/-?\d+/g) || [];
  const parsed = [];
  for (let i = 0; i < matches.length; i += 2) {
    if (matches[i + 1] === undefined) break;
    const x = Number(matches[i]);
    const y = Number(matches[i + 1]);
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x <= 999 && y >= 0 && y <= 999) {
      parsed.push([x, y]);
    }
  }
  return parsed;
}

function isSupplyCoordinate(value) {
  return SOURCE_KEYS.some((source) => LEVELS.some((level) => isCoordinate(value) && SUPPLY_SETS[source][level].has(value)));
}

function isUsedCoordinate(value) {
  return isCoordinate(value);
}

function emptyUsedByLevel() {
  return Object.fromEntries(LEVELS.map((level) => [level, []]));
}

function emptyUsedBySource() {
  return Object.fromEntries(SOURCE_KEYS.map((source) => [source, emptyUsedByLevel()]));
}

function emptyHiddenInitialBySource() {
  return emptyUsedBySource();
}

function decodeUsedEntry(value) {
  if (typeof value !== "string") return null;
  const geumgoMatch = value.match(/^G([1-7]):(.+)$/);
  const cptMatch = value.match(/^L([1-7]):(.+)$/);
  const untitledMatch = value.match(/^U([1-7]):(.+)$/);
  const source = geumgoMatch ? "geumgo" : untitledMatch ? "untitled" : DEFAULT_SOURCE;
  const level = geumgoMatch
    ? normalizeLevel(geumgoMatch[1])
    : untitledMatch
      ? normalizeLevel(untitledMatch[1])
      : cptMatch
        ? normalizeLevel(cptMatch[1])
        : DEFAULT_LEVEL;
  const coord = geumgoMatch ? geumgoMatch[2] : untitledMatch ? untitledMatch[2] : cptMatch ? cptMatch[2] : value;
  if (!isCoordinate(coord)) return null;
  return { source, level, coord };
}

function decodeHiddenInitialEntry(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^H:([CGU])([1-7]):(.+)$/);
  if (!match) return null;
  const source = match[1] === "G" ? "geumgo" : match[1] === "U" ? "untitled" : DEFAULT_SOURCE;
  const level = normalizeLevel(match[2]);
  const coord = match[3];
  if (!isCoordinate(coord)) return null;
  return { source, level, coord };
}

function encodeUsedEntry(source, level, coord) {
  const normalizedSource = normalizeSource(source);
  const normalizedLevel = normalizeLevel(level);
  if (normalizedSource === "geumgo") return `G${normalizedLevel}:${coord}`;
  if (normalizedSource === "untitled") return `U${normalizedLevel}:${coord}`;
  return normalizedLevel === DEFAULT_LEVEL ? coord : `L${normalizedLevel}:${coord}`;
}

function encodeHiddenInitialEntry(source, level, coord) {
  const normalizedSource = normalizeSource(source);
  const sourceCode = normalizedSource === "geumgo" ? "G" : normalizedSource === "untitled" ? "U" : "C";
  return `H:${sourceCode}${normalizeLevel(level)}:${coord}`;
}

function normalizeUsedByLevel(input) {
  const next = emptyUsedByLevel();
  if (!input || typeof input !== "object") return next;
  for (const level of LEVELS) {
    const seen = new Set();
    for (const coord of Array.isArray(input[level]) ? input[level] : []) {
      if (!isUsedCoordinate(coord) || seen.has(coord)) continue;
      seen.add(coord);
      next[level].push(coord);
    }
  }
  return next;
}

function normalizeUsedBySource(input) {
  const next = emptyUsedBySource();
  if (!input || typeof input !== "object") return next;
  for (const source of SOURCE_KEYS) next[source] = normalizeUsedByLevel(input[source]);
  return next;
}

function usedBySourceFromEntries(entries) {
  const next = emptyUsedBySource();
  const seenBySource = Object.fromEntries(SOURCE_KEYS.map((source) => [source, Object.fromEntries(LEVELS.map((level) => [level, new Set()]))]));
  for (const entry of Array.isArray(entries) ? entries : []) {
    const decoded = decodeUsedEntry(entry);
    if (!decoded || seenBySource[decoded.source][decoded.level].has(decoded.coord)) continue;
    seenBySource[decoded.source][decoded.level].add(decoded.coord);
    next[decoded.source][decoded.level].push(decoded.coord);
  }
  return next;
}

function hiddenInitialBySourceFromEntries(entries) {
  const next = emptyHiddenInitialBySource();
  const seenBySource = Object.fromEntries(SOURCE_KEYS.map((source) => [source, Object.fromEntries(LEVELS.map((level) => [level, new Set()]))]));
  for (const entry of Array.isArray(entries) ? entries : []) {
    const decoded = decodeHiddenInitialEntry(entry);
    if (!decoded || seenBySource[decoded.source][decoded.level].has(decoded.coord)) continue;
    seenBySource[decoded.source][decoded.level].add(decoded.coord);
    next[decoded.source][decoded.level].push(decoded.coord);
  }
  return next;
}

function entriesFromState(usedBySource, hiddenInitialBySource) {
  const normalized = normalizeUsedBySource(usedBySource);
  const normalizedHidden = normalizeUsedBySource(hiddenInitialBySource);
  const entries = [];
  for (const source of SOURCE_KEYS) {
    for (const level of LEVELS) {
      for (const coord of normalized[source][level]) entries.push(encodeUsedEntry(source, level, coord));
      for (const coord of normalizedHidden[source][level]) entries.push(encodeHiddenInitialEntry(source, level, coord));
    }
  }
  return entries;
}

function stateResponse(usedBySource, updatedAt, hiddenInitialBySource = emptyHiddenInitialBySource()) {
  const normalized = normalizeUsedBySource(usedBySource);
  const normalizedHidden = normalizeUsedBySource(hiddenInitialBySource);
  return {
    used: normalized[DEFAULT_SOURCE][DEFAULT_LEVEL],
    usedByLevel: normalized[DEFAULT_SOURCE],
    usedBySource: normalized,
    hiddenInitialBySource: normalizedHidden,
    updatedAt,
  };
}

function snapshotState(usedBySource, hiddenInitialBySource = emptyHiddenInitialBySource()) {
  return {
    usedBySource: normalizeUsedBySource(usedBySource),
    hiddenInitialBySource: normalizeUsedBySource(hiddenInitialBySource),
  };
}

function countSourceLevelItems(collection) {
  let total = 0;
  for (const source of SOURCE_KEYS) {
    for (const level of LEVELS) total += collection?.[source]?.[level]?.length || 0;
  }
  return total;
}

function sourceLevelDiff(beforeItems = [], afterItems = []) {
  const before = new Set(Array.isArray(beforeItems) ? beforeItems : []);
  const after = new Set(Array.isArray(afterItems) ? afterItems : []);
  return {
    added: [...after].filter((coord) => !before.has(coord)),
    removed: [...before].filter((coord) => !after.has(coord)),
  };
}

function buildHistoryEntry(beforeState, afterState, meta = {}) {
  const source = normalizeSource(meta.source);
  const level = normalizeLevel(meta.level);
  const usedDiff = sourceLevelDiff(beforeState.usedBySource[source][level], afterState.usedBySource[source][level]);
  const hiddenDiff = sourceLevelDiff(beforeState.hiddenInitialBySource[source][level], afterState.hiddenInitialBySource[source][level]);
  const changedCount = usedDiff.added.length + usedDiff.removed.length + hiddenDiff.added.length + hiddenDiff.removed.length;
  if (changedCount === 0) return null;

  const summaryParts = [];
  if (usedDiff.added.length) summaryParts.push(`사용 추가 ${usedDiff.added.length}개`);
  if (usedDiff.removed.length) summaryParts.push(`사용 취소 ${usedDiff.removed.length}개`);
  if (hiddenDiff.added.length) summaryParts.push(`원본 사용 숨김 ${hiddenDiff.added.length}개`);
  if (hiddenDiff.removed.length) summaryParts.push(`원본 사용 복구 ${hiddenDiff.removed.length}개`);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source,
    level,
    action: meta.action || "update",
    summary: summaryParts.join(", "),
    totalsBefore: {
      used: countSourceLevelItems(beforeState.usedBySource),
      hiddenInitial: countSourceLevelItems(beforeState.hiddenInitialBySource),
    },
    totalsAfter: {
      used: countSourceLevelItems(afterState.usedBySource),
      hiddenInitial: countSourceLevelItems(afterState.hiddenInitialBySource),
    },
    diff: {
      used: usedDiff,
      hiddenInitial: hiddenDiff,
    },
    beforeState,
    afterState,
  };
}

function buildSnapshotHistoryEntry(state, meta = {}) {
  const normalizedState = snapshotState(state.usedBySource, state.hiddenInitialBySource);
  const source = normalizeSource(meta.source);
  const level = normalizeLevel(meta.level);
  const usedTotal = normalizedState.usedBySource[source][level]?.length || 0;
  const hiddenTotal = normalizedState.hiddenInitialBySource[source][level]?.length || 0;
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source,
    level,
    scope: "source-level",
    action: "snapshot",
    summary: `기록 시작 스냅샷: ${source} ${level}단계 사용 ${usedTotal}개, 원본 숨김 ${hiddenTotal}개`,
    totalsBefore: {
      used: usedTotal,
      hiddenInitial: hiddenTotal,
    },
    totalsAfter: {
      used: usedTotal,
      hiddenInitial: hiddenTotal,
    },
    diff: {
      used: { added: [], removed: [] },
      hiddenInitial: { added: [], removed: [] },
    },
    beforeState: normalizedState,
    afterState: normalizedState,
  };
}

function mergeSnapshotScope(baseState, snapshot, source, level) {
  const scopedSource = normalizeSource(source);
  const scopedLevel = normalizeLevel(level);
  const merged = snapshotState(baseState.usedBySource, baseState.hiddenInitialBySource);
  const scopedSnapshot = snapshotState(snapshot.usedBySource, snapshot.hiddenInitialBySource);
  merged.usedBySource[scopedSource][scopedLevel] = [...(scopedSnapshot.usedBySource[scopedSource][scopedLevel] || [])];
  merged.hiddenInitialBySource[scopedSource][scopedLevel] = [
    ...(scopedSnapshot.hiddenInitialBySource[scopedSource][scopedLevel] || []),
  ];
  return merged;
}

function historyTableUrl(search = "") {
  const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  return `${base}/rest/v1/${SUPABASE_HISTORY_TABLE}${search}`;
}

async function appendHistoryLocal(entry) {
  if (!entry) return;
  let history = [];
  try {
    const data = JSON.parse(await fs.readFile(HISTORY_FILE, "utf8"));
    if (Array.isArray(data)) history = data;
  } catch {}
  history.push(entry);
  history = history.slice(-1000);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
}

async function appendHistorySupabase(entry) {
  if (!entry) return;
  await supabaseRequest(historyTableUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: entry.id,
      created_at: entry.createdAt,
      source: entry.source,
      level: entry.level,
      action: entry.action,
      summary: entry.summary,
      payload: entry,
    }),
  });
}

async function appendHistory(entry, options = {}) {
  if (!entry) return;
  try {
    if (USE_SUPABASE) await appendHistorySupabase(entry);
    else await appendHistoryLocal(entry);
    return true;
  } catch (error) {
    console.warn("appendHistory failed:", error.message);
    if (options.required) throw error;
    return false;
  }
}

function compactHistoryEntry(entry, includeSnapshots = false) {
  const payload = entry.payload && typeof entry.payload === "object" ? entry.payload : entry;
  const compact = {
    id: payload.id || entry.id,
    createdAt: payload.createdAt || entry.created_at || entry.createdAt,
    source: normalizeSource(payload.source || entry.source),
    level: normalizeLevel(payload.level || entry.level),
    action: payload.action || entry.action || "update",
    summary: payload.summary || entry.summary || "",
    scope: payload.scope || entry.scope || "source-level",
    totalsBefore: payload.totalsBefore || null,
    totalsAfter: payload.totalsAfter || null,
    diff: payload.diff || { used: { added: [], removed: [] }, hiddenInitial: { added: [], removed: [] } },
  };
  if (includeSnapshots) {
    compact.beforeState = payload.beforeState || null;
    compact.afterState = payload.afterState || null;
  }
  return compact;
}

async function loadHistoryLocal(limit = 100, includeSnapshots = false) {
  try {
    const data = JSON.parse(await fs.readFile(HISTORY_FILE, "utf8"));
    const entries = Array.isArray(data) ? data : [];
    return entries.slice(-limit).reverse().map((entry) => compactHistoryEntry(entry, includeSnapshots));
  } catch {
    return [];
  }
}

async function loadHistorySupabase(limit = 100, includeSnapshots = false) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const rows = await supabaseRequest(
    historyTableUrl(`?select=id,created_at,source,level,action,summary,payload&order=created_at.desc&limit=${safeLimit}`),
  );
  return (Array.isArray(rows) ? rows : []).map((entry) => compactHistoryEntry(entry, includeSnapshots));
}

async function loadHistory(limit = 100, includeSnapshots = false) {
  if (USE_SUPABASE) return await loadHistorySupabase(limit, includeSnapshots);
  return await loadHistoryLocal(limit, includeSnapshots);
}

async function tryLoadHistory(limit = 100, includeSnapshots = false) {
  try {
    return { history: await loadHistory(limit, includeSnapshots), error: null };
  } catch (error) {
    console.warn("loadHistory failed:", error.message);
    return { history: [], error: error.message || "history load failed" };
  }
}

async function loadState() {
  if (USE_SUPABASE) return await loadUsedFromSupabase();

  try {
    const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    const usedBySource = data.usedBySource
      ? normalizeUsedBySource(data.usedBySource)
      : usedBySourceFromEntries(Array.isArray(data.used) ? data.used : []);
    const hiddenInitialBySource = data.hiddenInitialBySource
      ? normalizeUsedBySource(data.hiddenInitialBySource)
      : hiddenInitialBySourceFromEntries(Array.isArray(data.used) ? data.used : []);
    if (!data.usedBySource && data.usedByLevel) usedBySource[DEFAULT_SOURCE] = normalizeUsedByLevel(data.usedByLevel);
    return stateResponse(usedBySource, typeof data.updatedAt === "string" ? data.updatedAt : null, hiddenInitialBySource);
  } catch {
    return stateResponse(emptyUsedBySource(), null);
  }
}

async function saveState(usedBySource, hiddenInitialBySource = emptyHiddenInitialBySource()) {
  if (USE_SUPABASE) return await saveUsedToSupabase(usedBySource, hiddenInitialBySource);

  const clean = normalizeUsedBySource(usedBySource);
  const hidden = normalizeUsedBySource(hiddenInitialBySource);
  const updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ used: clean[DEFAULT_SOURCE][DEFAULT_LEVEL], usedByLevel: clean[DEFAULT_SOURCE], usedBySource: clean, hiddenInitialBySource: hidden, updatedAt }, null, 2), "utf8");
  return stateResponse(clean, updatedAt, hidden);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function supabaseTableUrl(search = "") {
  const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  return `${base}/rest/v1/${SUPABASE_TABLE}${search}`;
}

async function supabaseRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: supabaseHeaders(options.headers || {}),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function loadUsedFromSupabase() {
  const rows = await supabaseRequest(
    supabaseTableUrl("?select=coord,updated_at&order=position.asc"),
  );
  const entries = Array.isArray(rows) ? rows.map((row) => row.coord) : [];
  const usedBySource = usedBySourceFromEntries(entries);
  const hiddenInitialBySource = hiddenInitialBySourceFromEntries(entries);
  const updatedAt = Array.isArray(rows)
    ? rows.reduce((latest, row) => {
        if (typeof row.updated_at !== "string") return latest;
        if (!latest || row.updated_at > latest) return row.updated_at;
        return latest;
      }, null)
    : null;
  return stateResponse(usedBySource, updatedAt, hiddenInitialBySource);
}

async function saveUsedToSupabase(usedBySource, hiddenInitialBySource = emptyHiddenInitialBySource()) {
  const clean = normalizeUsedBySource(usedBySource);
  const hidden = normalizeUsedBySource(hiddenInitialBySource);
  const entries = entriesFromState(clean, hidden);
  const updatedAt = new Date().toISOString();
  await supabaseRequest(supabaseTableUrl("?coord=not.is.null"), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  if (!entries.length) return stateResponse(clean, updatedAt, hidden);

  const rows = entries.map((coord, index) => ({ coord, position: index, updated_at: updatedAt }));
  await supabaseRequest(supabaseTableUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  return stateResponse(clean, updatedAt, hidden);
}

function pruneActiveClients(now = Date.now()) {
  const cutoff = now - ACTIVE_TTL_MS;
  for (const [id, ts] of activeClients) {
    if (ts < cutoff) activeClients.delete(id);
  }
}

function recordHeartbeat(clientId) {
  if (typeof clientId !== "string" || !clientId || clientId.length > 80) return;
  if (activeClients.size > HEARTBEAT_MAX_CLIENTS) pruneActiveClients();
  activeClients.set(clientId, Date.now());
}

function activeCount() {
  pruneActiveClients();
  return activeClients.size;
}

function todayUtcDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function loadVisitsLocal() {
  try {
    const data = JSON.parse(await fs.readFile(VISITS_FILE, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function recordVisitLocal() {
  const today = todayUtcDateString();
  const visits = await loadVisitsLocal();
  visits[today] = (Number(visits[today]) || 0) + 1;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(VISITS_FILE, JSON.stringify(visits), "utf8");
}

async function loadVisitStatsLocal() {
  const visits = await loadVisitsLocal();
  const today = todayUtcDateString();
  let total = 0;
  for (const value of Object.values(visits)) total += Number(value) || 0;
  return { today: Number(visits[today]) || 0, total };
}

async function supabaseRpcUrl(name) {
  const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  return `${base}/rest/v1/rpc/${name}`;
}

async function supabaseVisitsUrl(search = "") {
  const base = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
  return `${base}/rest/v1/visits${search}`;
}

async function recordVisitSupabase() {
  await supabaseRequest(await supabaseRpcUrl("increment_visit"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ target_date: todayUtcDateString() }),
  });
}

async function loadVisitStatsSupabase() {
  const rows = await supabaseRequest(await supabaseVisitsUrl("?select=visit_date,count"));
  const today = todayUtcDateString();
  let total = 0;
  let todayCount = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const n = Number(row.count) || 0;
    total += n;
    if (row.visit_date === today) todayCount = n;
  }
  return { today: todayCount, total };
}

async function recordVisit() {
  try {
    if (USE_SUPABASE) await recordVisitSupabase();
    else await recordVisitLocal();
    return true;
  } catch (error) {
    console.warn("recordVisit failed:", error.message);
    return false;
  }
}

async function loadVisitStats() {
  try {
    if (USE_SUPABASE) return await loadVisitStatsSupabase();
    return await loadVisitStatsLocal();
  } catch (error) {
    console.warn("loadVisitStats failed:", error.message);
    return { today: 0, total: 0 };
  }
}

function sign(payload) {
  return crypto.createHmac("sha256", ADMIN_CODE).update(payload).digest("base64url");
}

function createToken(role = "admin") {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS, role })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function tokenPayload(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Number(parsed.exp) <= Date.now()) return null;
    return { ...parsed, role: parsed.role === "super" ? "super" : "admin" };
  } catch {
    return null;
  }
}

function verifyToken(req) {
  return Boolean(tokenPayload(req));
}

function verifySuperToken(req) {
  return tokenPayload(req)?.role === "super";
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return json(res, 204, {});

  if (req.method === "GET" && url.pathname === "/api/state") {
    return json(res, 200, await loadState());
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    if (body.code === SUPER_ADMIN_CODE) return json(res, 200, { token: createToken("super"), role: "super" });
    if (body.code === ADMIN_CODE) return json(res, 200, { token: createToken("admin"), role: "admin" });
    return json(res, 401, { error: "invalid admin code" });
  }

  if (req.method === "POST" && url.pathname === "/api/heartbeat") {
    const body = await readBody(req).catch(() => ({}));
    recordHeartbeat(typeof body.clientId === "string" ? body.clientId : "");
    return json(res, 200, { active: activeCount() });
  }

  if (req.method === "POST" && url.pathname === "/api/visit") {
    const body = await readBody(req).catch(() => ({}));
    if (typeof body.clientId === "string" && body.clientId) {
      recordHeartbeat(body.clientId);
    }
    await recordVisit();
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/stats") {
    if (!verifyToken(req)) return json(res, 401, { error: "admin required" });
    const stats = await loadVisitStats();
    return json(res, 200, { active: activeCount(), today: stats.today, total: stats.total });
  }

  if (req.method === "GET" && url.pathname === "/api/history") {
    if (!verifySuperToken(req)) return json(res, 401, { error: "super admin required" });
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 100));
    const result = await tryLoadHistory(limit, true);
    if (result.error) return json(res, 500, { error: result.error, history: [] });
    return json(res, 200, { history: result.history });
  }

  if (req.method === "POST" && url.pathname === "/api/history/snapshot") {
    if (!verifySuperToken(req)) return json(res, 401, { error: "super admin required" });
    const body = await readBody(req).catch(() => ({}));
    const current = await loadState();
    const entry = buildSnapshotHistoryEntry(snapshotState(current.usedBySource, current.hiddenInitialBySource), {
      source: body.source,
      level: body.level,
    });
    await appendHistory(entry, { required: true });
    return json(res, 200, { history: compactHistoryEntry(entry, true) });
  }

  if (req.method === "POST" && url.pathname === "/api/history/restore") {
    if (!verifySuperToken(req)) return json(res, 401, { error: "super admin required" });
    const body = await readBody(req);
    const history = await loadHistory(500, true);
    const entry = history.find((item) => item.id === body.historyId);
    if (!entry) return json(res, 404, { error: "history not found" });
    const snapshotName = body.snapshot === "before" ? "beforeState" : "afterState";
    const snapshot = entry[snapshotName];
    if (!snapshot?.usedBySource || !snapshot?.hiddenInitialBySource) {
      return json(res, 400, { error: "history snapshot is not available" });
    }

    const current = await loadState();
    const restoredState = mergeSnapshotScope(current, snapshot, entry.source, entry.level);
    if (body.publish !== true) {
      return json(res, 200, {
        preview: true,
        history: entry,
        state: stateResponse(restoredState.usedBySource, entry.createdAt, restoredState.hiddenInitialBySource),
      });
    }

    const beforeState = snapshotState(current.usedBySource, current.hiddenInitialBySource);
    const saved = await saveState(restoredState.usedBySource, restoredState.hiddenInitialBySource);
    const afterState = snapshotState(saved.usedBySource, saved.hiddenInitialBySource);
    const restoreEntry = buildHistoryEntry(beforeState, afterState, {
      source: entry.source,
      level: entry.level,
      action: "restore",
    });
    if (restoreEntry) {
      restoreEntry.summary = `버전 반영: ${entry.summary || "변경 로그"}`;
      await appendHistory(restoreEntry);
    }
    return json(res, 200, { preview: false, history: entry, state: saved });
  }

  if (req.method === "POST" && url.pathname === "/api/used") {
    if (!verifyToken(req)) return json(res, 401, { error: "admin required" });
    const body = await readBody(req);
    const state = await loadState();
    const usedBySource = normalizeUsedBySource(state.usedBySource);
    const hiddenInitialBySource = normalizeUsedBySource(state.hiddenInitialBySource);
    const source = normalizeSource(body.source);
    const level = normalizeLevel(body.level);
    const beforeState = snapshotState(usedBySource, hiddenInitialBySource);
    let used = usedBySource[source][level];
    let hiddenInitial = hiddenInitialBySource[source][level];
    if (body.clear === true) {
      used = [];
      hiddenInitial = [];
    }
    for (const coord of Array.isArray(body.add) ? body.add : []) {
      if (isUsedCoordinate(coord) && !used.includes(coord)) used.push(coord);
      hiddenInitial = hiddenInitial.filter((item) => item !== coord);
    }
    for (const coord of Array.isArray(body.hideInitial) ? body.hideInitial : []) {
      if (isUsedCoordinate(coord) && !hiddenInitial.includes(coord)) hiddenInitial.push(coord);
      used = used.filter((item) => item !== coord);
    }
    const remove = new Set((Array.isArray(body.remove) ? body.remove : []).filter(isUsedCoordinate));
    if (remove.size) used = used.filter((coord) => !remove.has(coord));
    const unhide = new Set((Array.isArray(body.unhideInitial) ? body.unhideInitial : []).filter(isUsedCoordinate));
    if (unhide.size) hiddenInitial = hiddenInitial.filter((coord) => !unhide.has(coord));
    usedBySource[source][level] = used;
    hiddenInitialBySource[source][level] = hiddenInitial;
    const saved = await saveState(usedBySource, hiddenInitialBySource);
    const afterState = snapshotState(saved.usedBySource, saved.hiddenInitialBySource);
    const action = body.clear === true ? "clear" : Array.isArray(body.add) && body.add.length ? "add" : Array.isArray(body.remove) && body.remove.length ? "remove" : "update";
    await appendHistory(buildHistoryEntry(beforeState, afterState, { source, level, action }));
    return json(res, 200, saved);
  }

  return json(res, 404, { error: "not found" });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.join(__dirname, requested);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    return json(res, 500, { error: error.message || "server error" });
  }
});

server.listen(PORT, () => {
  console.log(`LastWar map server running on http://127.0.0.1:${PORT}`);
  console.log(`Storage: ${USE_SUPABASE ? "Supabase" : "local file"}`);
  if (ADMIN_CODE === "change-me") console.log("Set ADMIN_CODE before deployment.");
});
