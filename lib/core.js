// SC 234 Cabang Caringin — API (Vercel Function + Upstash Redis)
import crypto from 'node:crypto';

export async function handle(r, { method, a, body, auth }) {
  const ADMIN_USER = process.env.ADMIN_USER, ADMIN_PASS = process.env.ADMIN_PASS, SECRET = process.env.SECRET;
  const out = (code, body) => ({ code, body });
  const err = (c, m) => out(c, { error: m });
  if (!ADMIN_USER || !ADMIN_PASS || !SECRET) return err(500, 'Server belum dikonfigurasi (ADMIN_USER, ADMIN_PASS, SECRET).');
  if (method !== 'POST') return err(405, 'Gunakan POST.');

  const b = body && typeof body === 'object' ? body : {};
  const hash = p => crypto.createHash('sha256').update(p + SECRET).digest('hex');
  const sign = u => u + '.' + crypto.createHmac('sha256', SECRET).update(u).digest('hex');
  const safeEq = (x, y) => { const p = Buffer.from(String(x)), q = Buffer.from(String(y)); return p.length === q.length && crypto.timingSafeEqual(p, q); };
  const verify = tk => { if (!tk) return null; const i = tk.lastIndexOf('.'); const u = tk.slice(0, i); return u && safeEq(sign(u), tk) ? u : null; };
  const pub = ({ pass, ...x }) => x;
  const me = verify((auth || '').replace('Bearer ', ''));
  const isAdmin = me === '__admin__';
  const allUsers = async () => Object.values((await r.hgetall('users')) || {});

  if (a === 'register') {
    const u = String(b.username || '').trim(), k = u.toLowerCase();
    if (u.length < 3 || !b.password || b.password.length < 4) return err(400, 'Username min 3 & password min 4 karakter.');
    if (!['lama', 'baru'].includes(b.status)) return err(400, 'Pilih anggota lama atau baru.');
    if (k === ADMIN_USER.toLowerCase()) return err(409, 'Username sudah dipakai.');
    const created = await r.hsetnx('users', k, { username: u, status: b.status, pass: hash(b.password), photo: '', created: Date.now(), lastSeen: 0, lastLogin: 0, logins: 0 });
    if (!created) return err(409, 'Username sudah dipakai.');
    return out(200, { ok: true });
  }
  if (a === 'login') {
    const u = String(b.username || '').trim();
    if (u === ADMIN_USER && safeEq(b.password || '', ADMIN_PASS)) return out(200, { token: sign('__admin__'), admin: true });
    const d = await r.hget('users', u.toLowerCase());
    if (!d || !safeEq(d.pass, hash(b.password || ''))) return err(401, 'Username atau password salah.');
    d.lastLogin = d.lastSeen = Date.now(); d.logins++;
    await r.hset('users', { [u.toLowerCase()]: d });
    await r.lpush('logs', { u: d.username, status: d.status, t: Date.now() });
    await r.ltrim('logs', 0, 199);
    return out(200, { token: sign(u.toLowerCase()) });
  }
  if (!me) return err(401, 'Belum login.');

  if (a === 'admin') {
    if (!isAdmin) return err(403, 'Bukan admin.');
    return out(200, { users: (await allUsers()).map(pub), log: await r.lrange('logs', 0, 99) });
  }
  if (isAdmin) return err(403, 'Gunakan /admin.');
  const d = await r.hget('users', me);
  if (!d) return err(401, 'Akun tidak ditemukan.');
  d.lastSeen = Date.now();
  const saveMe = () => r.hset('users', { [me]: d });

  if (a === 'stats') {
    await saveMe();
    const all = await allUsers();
    return out(200, { total: all.length, online: all.filter(x => Date.now() - x.lastSeen < 120000).length, lama: all.filter(x => x.status === 'lama').length, baru: all.filter(x => x.status === 'baru').length });
  }
  if (a === 'me') { await saveMe(); return out(200, pub(d)); }
  if (a === 'photo') {
    if (!b.photo || b.photo.length > 300000) return err(400, 'Foto terlalu besar.');
    d.photo = b.photo; await saveMe(); return out(200, { ok: true });
  }
  if (a === 'activities') { await saveMe(); return out(200, await r.lrange('acts', 0, 49)); }
  if (a === 'post') {
    if (!b.desc || !b.image || b.image.length > 400000) return err(400, 'Gambar & deskripsi wajib (gambar maks ~300KB).');
    await r.lpush('acts', { u: d.username, status: d.status, desc: String(b.desc).slice(0, 500), image: b.image, t: Date.now() });
    await r.ltrim('acts', 0, 99);
    await saveMe();
    return out(200, { ok: true });
  }
  return err(404, 'Aksi tidak dikenal.');
}
