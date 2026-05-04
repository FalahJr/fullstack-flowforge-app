import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center gap-6 py-6 lg:py-12">
          <Badge variant="brand" className="w-fit">
            FlowForge
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Dashboard workflow yang sederhana, elegan, dan siap dipakai.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Kelola workflow, trigger run, dan pantau realtime status dalam
              tampilan yang tenang dan mudah dibaca.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Daftar
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Realtime", "Monitoring event workflow langsung"],
              ["Hybrid", "REST baseline + WebSocket live"],
              ["Sederhana", "UI rapi dan tidak ramai"],
            ].map(([title, description]) => (
              <Card key={title} className="p-4">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="flex flex-col justify-between overflow-hidden p-0 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.3)]">
          <div className="bg-[linear-gradient(160deg,_#0f766e_0%,_#0f766e_40%,_#134e4a_100%)] p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-50/80">
              Preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Monitoring yang bersih dan fokus.
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50/85">
              Run history, step logs, dan AI hint disusun agar cepat dipindai
              tanpa visual noise.
            </p>
          </div>
          <div className="space-y-3 p-6">
            {[
              ["Auth", "Login / register dengan password toggle"],
              ["Workflow", "CRUD dan editor JSON sederhana"],
              ["Monitor", "Realtime status dan logs"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
