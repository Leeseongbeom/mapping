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
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "used.json");
const VISITS_FILE = path.join(DATA_DIR, "visits.json");
const ACTIVE_TTL_MS = 90 * 1000;
const HEARTBEAT_MAX_CLIENTS = 10000;
const activeClients = new Map();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "used_coordinates";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPPLY_SOURCES = {
  cpt: SUPPLY_BY_LEVEL,
  geumgo: GEUMGO_SUPPLY_BY_LEVEL,
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

function decodeUsedEntry(value) {
  if (typeof value !== "string") return null;
  const geumgoMatch = value.match(/^G([1-7]):(.+)$/);
  const cptMatch = value.match(/^L([1-7]):(.+)$/);
  const source = geumgoMatch ? "geumgo" : DEFAULT_SOURCE;
  const level = geumgoMatch ? normalizeLevel(geumgoMatch[1]) : cptMatch ? normalizeLevel(cptMatch[1]) : DEFAULT_LEVEL;
  const coord = geumgoMatch ? geumgoMatch[2] : cptMatch ? cptMatch[2] : value;
  if (!isCoordinate(coord)) return null;
  return { source, level, coord };
}

function encodeUsedEntry(source, level, coord) {
  const normalizedSource = normalizeSource(source);
  const normalizedLevel = normalizeLevel(level);
  if (normalizedSource === "geumgo") return `G${normalizedLevel}:${coord}`;
  return normalizedLevel === DEFAULT_LEVEL ? coord : `L${normalizedLevel}:${coord}`;
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

function entriesFromUsedBySource(usedBySource) {
  const normalized = normalizeUsedBySource(usedBySource);
  const entries = [];
  for (const source of SOURCE_KEYS) {
    for (const level of LEVELS) {
      for (const coord of normalized[source][level]) entries.push(encodeUsedEntry(source, level, coord));
    }
  }
  return entries;
}

function stateResponse(usedBySource, updatedAt) {
  const normalized = normalizeUsedBySource(usedBySource);
  return {
    used: normalized[DEFAULT_SOURCE][DEFAULT_LEVEL],
    usedByLevel: normalized[DEFAULT_SOURCE],
    usedBySource: normalized,
    updatedAt,
  };
}

async function loadState() {
  if (USE_SUPABASE) return await loadUsedFromSupabase();

  try {
    const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    const usedBySource = data.usedBySource
      ? normalizeUsedBySource(data.usedBySource)
      : usedBySourceFromEntries(Array.isArray(data.used) ? data.used : []);
    if (!data.usedBySource && data.usedByLevel) usedBySource[DEFAULT_SOURCE] = normalizeUsedByLevel(data.usedByLevel);
    return stateResponse(usedBySource, typeof data.updatedAt === "string" ? data.updatedAt : null);
  } catch {
    return stateResponse(emptyUsedBySource(), null);
  }
}

async function saveState(usedBySource) {
  if (USE_SUPABASE) return await saveUsedToSupabase(usedBySource);

  const clean = normalizeUsedBySource(usedBySource);
  const updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ used: clean[DEFAULT_SOURCE][DEFAULT_LEVEL], usedByLevel: clean[DEFAULT_SOURCE], usedBySource: clean, updatedAt }, null, 2), "utf8");
  return stateResponse(clean, updatedAt);
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
  const usedBySource = usedBySourceFromEntries(Array.isArray(rows) ? rows.map((row) => row.coord) : []);
  const updatedAt = Array.isArray(rows)
    ? rows.reduce((latest, row) => {
        if (typeof row.updated_at !== "string") return latest;
        if (!latest || row.updated_at > latest) return row.updated_at;
        return latest;
      }, null)
    : null;
  return stateResponse(usedBySource, updatedAt);
}

async function saveUsedToSupabase(usedBySource) {
  const clean = normalizeUsedBySource(usedBySource);
  const entries = entriesFromUsedBySource(clean);
  const updatedAt = new Date().toISOString();
  await supabaseRequest(supabaseTableUrl("?coord=not.is.null"), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  if (!entries.length) return stateResponse(clean, updatedAt);

  const rows = entries.map((coord, index) => ({ coord, position: index, updated_at: updatedAt }));
  await supabaseRequest(supabaseTableUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  return stateResponse(clean, updatedAt);
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

function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return json(res, 204, {});

  if (req.method === "GET" && url.pathname === "/api/state") {
    return json(res, 200, await loadState());
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    if (body.code === ADMIN_CODE) return json(res, 200, { token: createToken() });
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

  if (req.method === "POST" && url.pathname === "/api/used") {
    if (!verifyToken(req)) return json(res, 401, { error: "admin required" });
    const body = await readBody(req);
    const state = await loadState();
    const usedBySource = normalizeUsedBySource(state.usedBySource);
    const source = normalizeSource(body.source);
    const level = normalizeLevel(body.level);
    let used = usedBySource[source][level];
    if (body.clear === true) used = [];
    for (const coord of Array.isArray(body.add) ? body.add : []) {
      if (isUsedCoordinate(coord) && !used.includes(coord)) used.push(coord);
    }
    const remove = new Set((Array.isArray(body.remove) ? body.remove : []).filter(isUsedCoordinate));
    if (remove.size) used = used.filter((coord) => !remove.has(coord));
    usedBySource[source][level] = used;
    return json(res, 200, await saveState(usedBySource));
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
