import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full space-y-4">
        <RegisterForm />
        <p className="text-center text-sm text-slate-600">
          Sudah punya akun? <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href="/login">Masuk</Link>
        </p>
      </div>
    </main>
  );
}
