// 로컬 SQLite — 전송 실패 시 보관 + 재시도용.
// better-sqlite3 (동기 API, pkg 빌드 호환).

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { DB_PATH, INSTALL_DIR } from "./config";
import type { PollResult } from "./poller";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(INSTALL_DIR)) fs.mkdirSync(INSTALL_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retry_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      msg TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function savePending(results: PollResult[]): void {
  const stmt = getDb().prepare("INSERT INTO pending_readings (payload) VALUES (?)");
  stmt.run(JSON.stringify(results));
}

export function getPending(): { id: number; payload: PollResult[]; retryCount: number }[] {
  const rows = getDb().prepare("SELECT id, payload, retry_count FROM pending_readings ORDER BY id ASC LIMIT 100").all() as any[];
  return rows.map((r) => ({ id: r.id, payload: JSON.parse(r.payload), retryCount: r.retry_count }));
}

export function deletePending(id: number): void {
  getDb().prepare("DELETE FROM pending_readings WHERE id = ?").run(id);
}

export function incrementRetry(id: number): void {
  getDb().prepare("UPDATE pending_readings SET retry_count = retry_count + 1 WHERE id = ?").run(id);
}

export function purgeOldPending(maxRetries = 5): void {
  // 5회 재시도 후 포기 — 관리자 알림은 heartbeat 가 처리
  getDb().prepare("DELETE FROM pending_readings WHERE retry_count >= ?").run(maxRetries);
}

export function appendLog(level: "info" | "warn" | "error", msg: string): void {
  try {
    getDb().prepare("INSERT INTO log (level, msg) VALUES (?, ?)").run(level, msg);
    // 콘솔에도 미러
    const ts = new Date().toISOString();
    if (level === "error") console.error(`[${ts}] [${level}] ${msg}`);
    else console.log(`[${ts}] [${level}] ${msg}`);
  } catch { /* */ }
}

export function getRecentLogs(limit = 50): { level: string; msg: string; createdAt: string }[] {
  const rows = getDb().prepare("SELECT level, msg, created_at as createdAt FROM log ORDER BY id DESC LIMIT ?").all(limit) as any[];
  return rows;
}

// 파일 로그도 추가 (디버깅용 — DB 망가질 때 대비)
export function fileLog(msg: string): void {
  try {
    if (!fs.existsSync(INSTALL_DIR)) fs.mkdirSync(INSTALL_DIR, { recursive: true });
    const dir = path.join(INSTALL_DIR, "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ym = new Date().toISOString().slice(0, 7);
    fs.appendFileSync(path.join(dir, `agent-${ym}.log`), `[${new Date().toISOString()}] ${msg}\n`, "utf8");
  } catch { /* */ }
}
