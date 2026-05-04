"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { register } from "@/services/auth.service";
import { setToken } from "@/services/auth-storage";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setToken(data.accessToken);
      localStorage.setItem("flowforge_tenant_id", data.user.tenantId);
      router.push("/workflows");
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message ?? "Gagal mendaftar");
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    mutation.mutate({ email, password, tenantName });
  };

  return (
    <Card className="overflow-hidden p-0 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden flex-col justify-between bg-[linear-gradient(160deg,_#115e59_0%,_#0f766e_45%,_#134e4a_100%)] p-8 text-white lg:flex">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50">
              FlowForge
            </div>
            <h1 className="mt-6 max-w-xs text-3xl font-semibold leading-tight">
              Buat tenant baru dan mulai kelola workflow dengan tenang.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/85">
              Setup cepat, tampilan bersih, dan monitoring realtime yang tetap mudah dibaca.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-emerald-50/90 backdrop-blur">
            Pesan API, error, dan status disajikan dalam Bahasa Indonesia.
          </div>
        </section>

        <form className="space-y-5 p-6 sm:p-8" onSubmit={onSubmit}>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Mulai dari sini
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">Daftar akun baru</h2>
            <p className="text-sm leading-6 text-slate-600">
              Tenant akan dibuat otomatis sebagai ruang kerja pertama kamu.
            </p>
          </div>

          <Input
            label="Nama tenant"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            placeholder="Contoh: Operasional"
            required
          />

          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="nama@perusahaan.com"
            required
          />

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            minLength={6}
            required
          />

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <Button className="w-full py-3 text-base" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Memproses..." : "Daftar"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
