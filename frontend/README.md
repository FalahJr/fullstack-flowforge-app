# FlowForge Frontend

Frontend dashboard untuk FlowForge menggunakan Next.js + TypeScript.

## Fitur yang sudah tersedia (MVP awal Prioritas 4)

- Login dan register
- Daftar workflow
- Buat, hapus, dan trigger workflow run
- Monitoring run hybrid:
  - Baseline data via REST (`/workflows/:id/runs`, `/workflows/:id/runs/:runId`)
  - Update realtime via WebSocket (`workflow.started`, `step.*`, `workflow.completed`)
- Menampilkan logs, error, dan AI hint

## Menjalankan lokal

1. Pastikan backend berjalan di `http://localhost:3000`
2. Salin env:

```bash
cp .env.example .env.local
```

3. Install dependency dan jalankan:

```bash
npm install
npm run dev
```

4. Buka `http://localhost:3001` jika port default frontend dipakai berbeda, atau cek output terminal.

## Build produksi

```bash
npm run build
npm run start
```

## Struktur utama

- `src/app/(auth)` halaman login/register
- `src/app/(dashboard)/workflows` halaman workflow list
- `src/app/(dashboard)/workflows/[id]/runs/[runId]` halaman monitor run
- `src/services` API client, workflow service, dan socket service
- `src/features` komponen auth dan workflows
