"use client";

import { useState } from "react";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
import { useQmsData } from "@/hooks/use-qms";
import { APP_MODULES, USER_ROLES, type AppModule, type AppUser, type AppUserInput, type UserRole } from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";

const defaults: Record<UserRole, AppModule[]> = {
  Admin: ["dashboard", "quotations", "forwarders", "users"],
  Logistics: ["dashboard", "quotations", "forwarders"],
  Sales: ["dashboard", "quotations"],
};

export default function UsersPage() {
  const { appUsers, addAppUser, updateAppUser, deleteAppUser } = useQmsData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<AppUserInput>({ name: "", email: "", role: "Sales", modules: [...defaults.Sales], active: true });
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required."); return; }
    if (form.modules.length === 0) { setError("Assign at least one module."); return; }
    try {
      if (editing) await updateAppUser(editing.id, { ...form, email: form.email.trim().toLowerCase() });
      else await addAppUser({ ...form, email: form.email.trim().toLowerCase() });
      setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save."); }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <Card>
        <CardContent className="flex flex-col justify-between gap-3 !p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Users</h2>
            <p className="text-sm text-slate-500">Manage app roles and module access.</p>
          </div>
          <Button onClick={() => { setEditing(null); setForm({ name: "", email: "", role: "Sales", modules: [...defaults.Sales], active: true }); setError(""); setOpen(true); }}><IconPlus size={16} /> Add user</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...appUsers].sort((a, b) => a.name.localeCompare(b.name)).map((u) => (
          <Card key={u.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-extrabold">{u.name}</p><p className="truncate text-sm text-slate-500">{u.email}</p></div>
                <span className={`rounded-lg px-2 py-1 text-xs font-bold ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{u.active ? "Active" : "Disabled"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-lg bg-[#1976d2]/10 px-2 py-1 text-xs font-bold text-[#1976d2]">{u.role}</span>
                {u.modules.map((m) => <span key={m} className="rounded-lg border border-[#e6ebf2] px-2 py-1 text-xs font-semibold">{APP_MODULES.find((x) => x.key === m)?.label ?? m}</span>)}
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="default" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, role: u.role, modules: [...u.modules], active: u.active }); setError(""); setOpen(true); }}><IconPencil size={14} /> Edit</Button>
                <Button size="sm" variant="dangerOutline" onClick={() => { if (confirm("Delete user?")) deleteAppUser(u.id); }}><IconTrash size={14} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 dark:bg-[#171d1b]" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-lg font-extrabold">{editing ? "Edit User" : "Add User"}</p>
            {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Role</Label><select value={form.role} onChange={(e) => { const r = e.target.value as UserRole; setForm({ ...form, role: r, modules: [...defaults[r]] }); }} className="h-10 w-full rounded-[10px] border px-2 text-sm">{USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
              <div>
                <Label>Modules</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {APP_MODULES.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 rounded-xl border border-[#e6ebf2] px-3 py-2 text-sm font-semibold">
                      <input type="checkbox" checked={form.modules.includes(m.key)} onChange={() => setForm({ ...form, modules: form.modules.includes(m.key) ? form.modules.filter((x) => x !== m.key) : [...form.modules, m.key] })} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active user</label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save user</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
