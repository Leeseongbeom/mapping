import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INITIAL_SUPPLY } from "./supply-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4174);
const ADMIN_CODE = process.env.ADMIN_CODE || "change-me";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "used.json");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "used_coordinates";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPPLY_SET = new Set(parseCoordinates(INITIAL_SUPPLY).map(([x, y]) => `${x},${y}`));

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
  return isCoordinate(value) && SUPPLY_SET.has(value);
}

async function loadUsed() {
  if (USE_SUPABASE) return await loadUsedFromSupabase();

  try {
    const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    return Array.isArray(data.used) ? data.used.filter(isSupplyCoordinate) : [];
  } catch {
    return [];
  }
}

async function saveUsed(used) {
  if (USE_SUPABASE) return await saveUsedToSupabase(used);

  const clean = Array.from(new Set(used.filter(isSupplyCoordinate)));
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ used: clean }, null, 2), "utf8");
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
    supabaseTableUrl("?select=coord&order=position.asc"),
  );
  return Array.isArray(rows) ? rows.map((row) => row.coord).filter(isSupplyCoordinate) : [];
}

async function saveUsedToSupabase(used) {
  const clean = Array.from(new Set(used.filter(isSupplyCoordinate)));
  await supabaseRequest(supabaseTableUrl("?coord=not.is.null"), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  if (!clean.length) return;

  const rows = clean.map((coord, index) => ({ coord, position: index }));
  await supabaseRequest(supabaseTableUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
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
    return json(res, 200, { used: await loadUsed() });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    if (body.code === ADMIN_CODE) return json(res, 200, { token: createToken() });
    return json(res, 401, { error: "invalid admin code" });
  }

  if (req.method === "POST" && url.pathname === "/api/used") {
    if (!verifyToken(req)) return json(res, 401, { error: "admin required" });
    const body = await readBody(req);
    let used = await loadUsed();
    if (body.clear === true) used = [];
    for (const coord of Array.isArray(body.add) ? body.add : []) {
      if (isSupplyCoordinate(coord) && !used.includes(coord)) used.push(coord);
    }
    const remove = new Set((Array.isArray(body.remove) ? body.remove : []).filter(isSupplyCoordinate));
    if (remove.size) used = used.filter((coord) => !remove.has(coord));
    await saveUsed(used);
    return json(res, 200, { used });
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
