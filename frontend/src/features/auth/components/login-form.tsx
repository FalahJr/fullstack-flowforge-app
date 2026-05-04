"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { login } from "@/services/auth.service";
import { setToken } from "@/services/auth-storage";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setToken(data.accessToken);
      localStorage.setItem("flowforge_tenant_id", data.user.tenantId);
      router.push("/workflows");
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message ?? "Gagal login");
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    mutation.mutate({ email, password });
  };

  return (
    <Card className="overflow-hidden p-0 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col justify-between bg-[linear-gradient(160deg,_#0f766e_0%,_#0f766e_42%,_#134e4a_100%)] p-8 text-white lg:flex">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50">
              FlowForge
            </div>
            <h1 className="mt-6 max-w-xs text-3xl font-semibold leading-tight">
              Masuk ke dashboard workflow yang rapi dan cepat.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/85">
              Pantau run, lihat log, dan kendalikan workflow dalam satu ruang kerja yang sederhana.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-emerald-50/90 backdrop-blur">
            Realtime updates, API terhubung, dan pesan UI sepenuhnya dalam Bahasa Indonesia.
          </div>
        </section>

        <form className="space-y-5 p-6 sm:p-8" onSubmit={onSubmit}>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Selamat datang
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">Masuk ke akun</h2>
            <p className="text-sm leading-6 text-slate-600">
              Gunakan email dan password yang sudah terdaftar untuk membuka dashboard.
            </p>
          </div>

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
            placeholder="Masukkan password"
            required
          />

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <Button className="w-full py-3 text-base" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
