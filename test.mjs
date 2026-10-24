import { handle } from './lib/core.js';
const H = new Map(), L = new Map(); const j = v => JSON.parse(JSON.stringify(v));
const redis = {
  hget: async (k, f) => H.get(k)?.has(f) ? j(H.get(k).get(f)) : null,
  hgetall: async k => H.get(k) ? Object.fromEntries([...H.get(k)].map(([f, v]) => [f, j(v)])) : null,
  hset: async (k, o) => { const m = H.get(k) ?? new Map(); for (const f in o) m.set(f, j(o[f])); H.set(k, m); },
  hsetnx: async (k, f, v) => { const m = H.get(k) ?? new Map(); if (m.has(f)) return 0; m.set(f, j(v)); H.set(k, m); return 1; },
  lpush: async (k, v) => { const l = L.get(k) ?? []; l.unshift(j(v)); L.set(k, l); },
  ltrim: async (k, s, e) => L.set(k, (L.get(k) ?? []).slice(s, e + 1)),
  lrange: async (k, s, e) => (L.get(k) ?? []).slice(s, e + 1).map(j),
};
process.env.ADMIN_USER = 'PAC CARINGIN'; process.env.ADMIN_PASS = 'x'; process.env.SECRET = 's';
const call = async (a, body, tk) => { const o = await handle(redis, { method: 'POST', a, body, auth: 'Bearer ' + (tk || '') }); return [o.code, o.body]; };
const ok = (c, m) => { if (!c) { console.error('GAGAL', m); process.exit(1); } console.log('ok', m); };
ok((await call('register', { username: 'budi', password: '1234', status: 'baru' }))[0] === 200, 'register');
ok((await call('register', { username: 'Budi', password: '1234', status: 'baru' }))[0] === 409, 'duplikat');
ok((await call('login', { username: 'budi', password: 'salah' }))[0] === 401, 'login salah');
const [, l] = await call('login', { username: 'budi', password: '1234' }); ok(l.token, 'login');
ok((await call('stats', {}, l.token))[1].total === 1, 'stats');
ok((await call('post', { image: 'data:x', desc: 'hai' }, l.token))[0] === 200, 'post');
ok((await call('activities', {}, l.token))[1].length === 1, 'activities');
ok((await call('photo', { photo: 'data:y' }, l.token))[0] === 200 && (await call('me', {}, l.token))[1].photo === 'data:y', 'photo/me');
const [, ad] = await call('login', { username: 'PAC CARINGIN', password: 'x' }); ok(ad.admin, 'login admin');
const [, dd] = await call('admin', {}, ad.token); ok(dd.users.length === 1 && !dd.users[0].pass && dd.log.length === 1, 'admin data');
ok((await call('admin', {}, l.token))[0] === 403, 'user bukan admin');
ok((await call('me', {}, l.token + 'x'))[0] === 401, 'token palsu');
