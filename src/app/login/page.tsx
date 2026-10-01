"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconTruck, IconArrowsExchange, IconBolt, IconMail, IconLock, IconMoon, IconSun, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";

const features = [
  { Icon: IconTruck, label: "Freight" },
  { Icon: IconArrowsExchange, label: "Compare" },
  { Icon: IconBolt, label: "Approve" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document === "undefined" ? false : document.documentElement.classList.contains("dark")
  );
  return (
    <button
      onClick={() => {
        const next = !dark;
        setDark(next);
        localStorage.setItem("qms-theme", next ? "dark" : "light");
        document.documentElement.classList.toggle("dark", next);
      }}
      aria-label="Toggle theme"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25"
    >
      {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}

export default function LoginPage() {
  const { signIn, resetPassword, session } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (session) { router.replace("/"); return null; }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await signIn(email, password);
    setLoading(false);
    if (r.error) setError(r.error);
    else router.replace("/");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0d3b66] via-[#1565c0] to-[#42a5f5] p-4 dark:from-[#060f1d] dark:via-[#0d3b66] dark:to-[#123a6d]">
      <span className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-white/[0.07]" />
      <span className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[440px] rounded-[28px] border border-white/40 bg-white/95 p-7 shadow-[0_40px_90px_-30px_rgba(4,30,70,0.7)] backdrop-blur-xl sm:p-9 dark:border-white/10 dark:bg-[#141c1a]/95">
        <div className="mb-6 flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1565c0] to-[#42a5f5] shadow-[0_14px_28px_-12px_rgba(25,118,210,0.9)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="QMS" className="h-8 w-8 brightness-0 invert" />
          </span>
          <span>
            <span className="block text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">QMS</span>
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#1976d2] dark:text-[#90caf9]">Quotation Manager</span>
          </span>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
        <p className="mb-6 text-sm text-slate-500">Sign in to manage freight quotations and approvals.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Email</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#1976d2]/10 text-[#1976d2]">
                <IconMail size={14} />
              </span>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="!pl-11" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Password</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#1976d2]/10 text-[#1976d2]">
                <IconLock size={14} />
              </span>
              <Input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="!pl-11 !pr-11" />
              <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1976d2]">
                {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={() => { setResetEmail(email); setSent(false); setForgot(true); }} className="rounded-full px-2 py-0.5 text-sm font-bold text-[#1976d2] hover:underline dark:text-[#90caf9]">Forgot password?</button>
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full text-[15px]">{loading ? "Signing in…" : "Sign in →"}</Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-5 border-t border-slate-100 pt-5 dark:border-white/10">
          {features.map((f) => (
            <span key={f.label} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1976d2]/10 text-[#1976d2] dark:text-[#90caf9]"><f.Icon size={14} /></span>
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {forgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onClick={() => setForgot(false)}>
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl dark:bg-[#171d1b]" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-lg font-extrabold tracking-tight dark:text-white">Reset password</p>
            <p className="mb-4 text-sm text-slate-500">We will email you a secure reset link.</p>
            {sent ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">If an account exists for <b>{resetEmail}</b>, a reset link was sent.</p> : (
              <form onSubmit={async (e) => { e.preventDefault(); const r = await resetPassword(resetEmail.trim()); if (!r.error) setSent(true); }} className="space-y-3">
                <Input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="you@company.com" />
                <Button type="submit" className="w-full">Send reset link</Button>
              </form>
            )}
            <div className="mt-3 text-right"><button onClick={() => setForgot(false)} className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
