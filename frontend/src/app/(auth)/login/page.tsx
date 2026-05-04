import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full space-y-4">
        <LoginForm />
        <p className="text-center text-sm text-slate-600">
          Belum punya akun? <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href="/register">Daftar di sini</Link>
        </p>
      </div>
    </main>
  );
}
