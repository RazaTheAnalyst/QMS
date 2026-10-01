"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else { setDone(true); setTimeout(() => router.replace("/login"), 1500); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e9edf3] p-4">
      <Card className="w-full max-w-sm">
        <CardContent>
          <p className="mb-1 text-lg font-extrabold">Set new password</p>
          <p className="mb-4 text-sm text-slate-500">Enter your new password below.</p>
          {done ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Password updated. Redirecting…</p> : (
            <form onSubmit={submit} className="space-y-3">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <Button type="submit" className="w-full">Update password</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
