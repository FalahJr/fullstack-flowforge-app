# Workflow Engine Design — FlowForge

## Overview

Workflow engine bertanggung jawab untuk mengeksekusi workflow yang didefinisikan sebagai **Directed Acyclic Graph (DAG)**.

Setiap workflow terdiri dari beberapa step yang saling terhubung berdasarkan dependency.

Engine akan:

- membaca definisi workflow
- menentukan urutan eksekusi
- menjalankan step secara async
- menangani retry dan error

---

## Workflow Structure

Contoh sederhana:

```json
{
  "steps": [
    { "id": "A", "type": "http", "next": ["B", "C"] },
    { "id": "B", "type": "delay", "next": ["D"] },
    { "id": "C", "type": "http", "next": ["D"] },
    { "id": "D", "type": "http", "next": [] }
  ]
}
```

### Penjelasan

- A → step pertama
- B & C → jalan paralel
- D → menunggu B dan C selesai

---

## Core Concepts

### 1. Step

Setiap node dalam workflow:

```ts
type Step = {
  id: string;
  type: "http" | "delay";
  next: string[];
};
```

---

### 2. Dependency

Dependency ditentukan dari relasi antar step.

Contoh:

- D bergantung pada B dan C
- artinya D tidak bisa jalan sebelum B & C selesai

---

### 3. Execution State

Setiap step memiliki status:

- pending
- running
- success
- failed

---

## Execution Flow

### High-level flow:

1. User trigger workflow
2. Load workflow version
3. Parse DAG
4. Validasi DAG (tidak boleh ada cycle)
5. Cari step tanpa dependency (root)
6. Push step ke queue
7. Worker eksekusi step
8. Update status
9. Trigger next step jika dependency terpenuhi
10. Selesai jika semua step selesai

---

## DAG Validation

Validasi dilakukan sebelum eksekusi:

- tidak boleh ada cycle
- semua step ID harus unik
- semua reference `next` harus valid

Gunakan pendekatan:

- graph traversal / topological check
- atau library seperti graphlib

---

## Execution Strategy

### 1. Initial Steps

Step yang tidak memiliki dependency langsung dieksekusi.

---

### 2. Parallel Execution

Jika beberapa step tidak saling bergantung:

- jalankan secara paralel (via queue)

---

### 3. Dependency Check

Sebelum menjalankan step:

```ts
function canRun(step) {
  return dependencies[step.id].every((dep) => dep.status === "success");
}
```

---

## Queue Integration (BullMQ)

Setiap step dijalankan sebagai job:

```ts
queue.add("execute-step", {
  workflowRunId,
  stepId,
});
```

---

## Worker Logic

Worker bertanggung jawab:

1. Ambil job
2. Jalankan step
3. Update status
4. Emit event
5. Trigger next steps

---

## Step Execution

Contoh sederhana:

```ts
async function executeStep(step) {
  if (step.type === "http") {
    return axios.get("https://example.com");
  }

  if (step.type === "delay") {
    await sleep(2000);
    return true;
  }
}
```

---

## Retry Mechanism

Jika step gagal:

- retry maksimal 3x
- gunakan exponential backoff

Contoh:

- retry 1 → 2s
- retry 2 → 4s
- retry 3 → 8s

Jika tetap gagal:

- tandai step sebagai failed
- workflow bisa:
  - berhenti
  - atau lanjut (opsional, simple: stop)

---

## Failure Handling

Saat step gagal:

- simpan error ke database
- emit event `step.failed`
- kirim ke AI (opsional)

---

## Next Step Trigger

Setelah step sukses:

1. Ambil semua step berikutnya
2. Cek dependency
3. Jika semua dependency selesai → push ke queue

---

## Workflow Completion

Workflow selesai jika:

- semua step status = success
- atau ada step gagal (depending strategy)

---

## Real-time Events

Event yang dikirim:

- workflow.started
- step.started
- step.success
- step.failed
- workflow.completed

---

## Data Persistence

Data yang disimpan:

### WorkflowRun

- id
- workflowId
- status
- startedAt
- finishedAt

### StepRun

- stepId
- status
- logs
- timestamps

---

## Minimal Implementation Strategy

Untuk awal:

1. Implement sequential execution dulu
2. Tambahkan dependency handling
3. Tambahkan parallel execution
4. Integrasi queue
5. Tambahkan retry

---

## Common Pitfalls

- tidak validasi DAG → bisa infinite loop
- dependency tidak dicek → step jalan terlalu cepat
- tidak async → blocking
- retry terlalu kompleks

---

## Notes

- Fokus ke working system dulu
- Tidak perlu terlalu banyak abstraction
- Simpel tapi jelas lebih baik
