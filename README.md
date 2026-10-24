# SC 234 Cabang Caringin — GitHub + Vercel
Web: `/`  Admin: `/admin`

1. Unggah folder ini ke GitHub (tanpa `.env`).
2. Vercel > Add New > Project > import repo > Deploy.
3. Project > Storage > Create/Connect **Upstash Redis** (Marketplace) — variabel KV_REST_API_* terisi otomatis.
4. Settings > Environment Variables: isi ADMIN_USER, ADMIN_PASS, SECRET (lihat `.env.example`), lalu Redeploy.
5. Domain: Settings > Domains > tambahkan dlonics.my.id.

Edit kode/konfigurasi di GitHub -> Vercel otomatis deploy ulang.
