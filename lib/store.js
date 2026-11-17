// Couche de stockage : PostgreSQL (production, DATABASE_URL) ou fichier JSON (développement local).
// En production sur Render, PostgreSQL est OBLIGATOIRE (le disque du service est éphémère).
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), last_login TIMESTAMPTZ)`,
  `CREATE TABLE IF NOT EXISTS saves (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at BIGINT NOT NULL, saved_at TIMESTAMPTZ DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS save_history (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, revision INTEGER, data JSONB, saved_at TIMESTAMPTZ DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS save_history_user ON save_history(user_id, revision DESC)`,
  `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ DEFAULT now())`,
];
const HISTORY_KEEP = 5;

class PgStore {
  constructor(url) { this.url = url; this.kind = 'postgres'; }
  async init() {
    const pg = (await import('pg')).default;
    // Schéma fixé à l'ouverture de CHAQUE connexion du pool, pas seulement sur la première.
    const schema = (process.env.DB_SCHEMA || 'ft26').replace(/[^a-z0-9_]/gi, '');
    this.pool = new pg.Pool({ connectionString: this.url, options: `-c search_path=${schema}`, ssl: /localhost|127\.0\.0\.1/.test(this.url) || process.env.PGSSL === 'off' || !/\./.test(new URL(this.url).hostname) ? false : { rejectUnauthorized: false }, max: 5 });
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await this.pool.query(`SET search_path TO ${schema}`);
    await this.pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())');
    const { rows } = await this.pool.query('SELECT COALESCE(MAX(version),0) AS v FROM schema_migrations');
    for (let i = rows[0].v; i < MIGRATIONS.length; i++) {
      await this.pool.query(MIGRATIONS[i]);
      await this.pool.query('INSERT INTO schema_migrations(version) VALUES ($1)', [i + 1]);
      console.log(JSON.stringify({ lvl: 'info', msg: 'migration appliquée', version: i + 1 }));
    }
  }
  q(sql, p) { return this.pool.query(sql, p); }
  async createUser(u, hash) { const r = await this.q('INSERT INTO users(username,pass) VALUES ($1,$2) ON CONFLICT (username) DO NOTHING RETURNING id', [u, hash]); return r.rows[0]?.id ?? null; }
  async getUser(u) { const r = await this.q('SELECT id, username, pass FROM users WHERE username=$1', [u]); return r.rows[0] || null; }
  async touchUser(id) { await this.q('UPDATE users SET last_login=now() WHERE id=$1', [id]); }
  async getSave(uid) { const r = await this.q('SELECT data, revision, updated_at FROM saves WHERE user_id=$1', [uid]); const x = r.rows[0]; return x ? { data: x.data, revision: x.revision, updatedAt: Number(x.updated_at) } : null; }
  async putSave(uid, data, base, force) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const cur = (await c.query('SELECT revision, updated_at FROM saves WHERE user_id=$1 FOR UPDATE', [uid])).rows[0];
      if (cur && !force && base != null && base !== cur.revision && Number(cur.updated_at) > (data.updatedAt || 0)) { await c.query('ROLLBACK'); return { conflict: true, revision: cur.revision, updatedAt: Number(cur.updated_at) }; }
      const rev = cur ? cur.revision + 1 : 1;
      await c.query('INSERT INTO saves(user_id,data,revision,updated_at,saved_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (user_id) DO UPDATE SET data=$2, revision=$3, updated_at=$4, saved_at=now()', [uid, data, rev, data.updatedAt || Date.now()]);
      await c.query('INSERT INTO save_history(user_id,revision,data) VALUES ($1,$2,$3)', [uid, rev, data]);
      await c.query('DELETE FROM save_history WHERE user_id=$1 AND revision <= $2', [uid, rev - HISTORY_KEEP]);
      await c.query('COMMIT');
      return { revision: rev };
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  }
  async history(uid) { const r = await this.q('SELECT revision, saved_at FROM save_history WHERE user_id=$1 ORDER BY revision DESC', [uid]); return r.rows; }
  async restoreRevision(uid, rev) { const r = await this.q('SELECT data FROM save_history WHERE user_id=$1 AND revision=$2', [uid, rev]); if (!r.rows[0]) return null; return this.putSave(uid, { ...r.rows[0].data, updatedAt: Date.now() }, null, true); }
  async getKV(k) { const r = await this.q('SELECT value FROM kv WHERE key=$1', [k]); return r.rows[0]?.value ?? null; }
  async setKV(k, v) { await this.q('INSERT INTO kv(key,value,updated_at) VALUES ($1,$2,now()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()', [k, JSON.stringify(v)]); }
  async stats() { const u = await this.q('SELECT COUNT(*)::int n FROM users'); const s = await this.q('SELECT COUNT(*)::int n FROM saves'); return { users: u.rows[0].n, saves: s.rows[0].n }; }
  async dump() { const users = (await this.q('SELECT id, username, pass, created_at FROM users')).rows; const saves = (await this.q('SELECT user_id, data, revision, updated_at FROM saves')).rows; const kv = (await this.q('SELECT key, value FROM kv')).rows; return { users, saves, kv, at: new Date().toISOString() }; }
  async restore(d) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      for (const u of d.users || []) await c.query('INSERT INTO users(id,username,pass,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET username=$2, pass=$3', [u.id, u.username, u.pass, u.created_at || new Date()]);
      await c.query("SELECT setval(pg_get_serial_sequence('users','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM users),1))");
      for (const s of d.saves || []) await c.query('INSERT INTO saves(user_id,data,revision,updated_at) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO UPDATE SET data=$2, revision=$3, updated_at=$4', [s.user_id, s.data, s.revision, s.updated_at]);
      for (const k of d.kv || []) await c.query('INSERT INTO kv(key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [k.key, JSON.stringify(k.value)]);
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
}

class FileStore {
  constructor(file) { this.file = file; this.kind = 'file'; }
  async init() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.d = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { seq: 0, users: [], saves: {}, history: {}, kv: {} };
  }
  flush() { const tmp = this.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(this.d)); fs.renameSync(tmp, this.file); }
  async createUser(u, hash) { if (this.d.users.some(x => x.username === u)) return null; const id = ++this.d.seq; this.d.users.push({ id, username: u, pass: hash, created_at: new Date().toISOString() }); this.flush(); return id; }
  async getUser(u) { return this.d.users.find(x => x.username === u) || null; }
  async touchUser() {}
  async getSave(uid) { return this.d.saves[uid] || null; }
  async putSave(uid, data, base, force) {
    const cur = this.d.saves[uid];
    if (cur && !force && base != null && base !== cur.revision && cur.updatedAt > (data.updatedAt || 0)) return { conflict: true, revision: cur.revision, updatedAt: cur.updatedAt };
    const rev = cur ? cur.revision + 1 : 1;
    this.d.saves[uid] = { data, revision: rev, updatedAt: data.updatedAt || Date.now() };
    (this.d.history[uid] = this.d.history[uid] || []).push({ revision: rev, data, saved_at: new Date().toISOString() });
    this.d.history[uid] = this.d.history[uid].slice(-HISTORY_KEEP);
    this.flush(); return { revision: rev };
  }
  async history(uid) { return (this.d.history[uid] || []).map(h => ({ revision: h.revision, saved_at: h.saved_at })).reverse(); }
  async restoreRevision(uid, rev) { const h = (this.d.history[uid] || []).find(x => x.revision === rev); if (!h) return null; return this.putSave(uid, { ...h.data, updatedAt: Date.now() }, null, true); }
  async getKV(k) { return this.d.kv[k] ?? null; }
  async setKV(k, v) { this.d.kv[k] = v; this.flush(); }
  async stats() { return { users: this.d.users.length, saves: Object.keys(this.d.saves).length }; }
  async dump() { return { users: this.d.users, saves: Object.entries(this.d.saves).map(([user_id, s]) => ({ user_id: Number(user_id), data: s.data, revision: s.revision, updated_at: s.updatedAt })), kv: Object.entries(this.d.kv).map(([key, value]) => ({ key, value })), at: new Date().toISOString() }; }
  async restore(d) { for (const u of d.users || []) { this.d.users = this.d.users.filter(x => x.id !== u.id); this.d.users.push(u); this.d.seq = Math.max(this.d.seq, u.id); } for (const s of d.saves || []) this.d.saves[s.user_id] = { data: s.data, revision: s.revision, updatedAt: Number(s.updated_at) }; for (const k of d.kv || []) this.d.kv[k.key] = k.value; this.flush(); }
}

export async function openStore() {
  const url = process.env.DATABASE_URL;
  const s = url ? new PgStore(url) : new FileStore(process.env.DATA_FILE || path.resolve('data/dev-db.json'));
  if (!url && process.env.NODE_ENV === 'production') console.warn(JSON.stringify({ lvl: 'warn', msg: 'DATABASE_URL absente : stockage fichier ÉPHÉMÈRE — les sauvegardes serveur seront perdues au redémarrage. Configurez PostgreSQL.' }));
  await s.init();
  return s;
}
