"use client";

import { useState } from "react";
import { IconPlus, IconX, IconPencil, IconTrash, IconTruck } from "@tabler/icons-react";
import { useQmsData } from "@/hooks/use-qms";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_EMAIL } from "@/lib/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";

export default function ForwardersPage() {
  const { user } = useAuth();
  const { forwarders, loading, addForwarder, updateForwarder, deleteForwarder } = useQmsData();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const reset = () => { setName(""); setContact(""); setEmail(""); setPhone(""); setOpen(false); setEditingId(null); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId !== null) await updateForwarder(editingId, { name: name.trim(), contactPerson: contact.trim(), email: email.trim(), phone: phone.trim() });
    else await addForwarder({ name: name.trim(), contactPerson: contact.trim(), email: email.trim(), phone: phone.trim() });
    reset();
  };

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <Card>
        <CardContent className="flex flex-col justify-between gap-3 !p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Forwarders</h2>
            <p className="text-sm text-slate-500">{forwarders.length} partners registered</p>
          </div>
          <Button onClick={() => (open ? reset() : setOpen(true))}>{open ? <><IconX size={16} /> Cancel</> : <><IconPlus size={16} /> Add forwarder</>}</Button>
        </CardContent>
      </Card>

      {open && (
        <Card>
          <CardContent>
            <p className="mb-4 font-extrabold">{editingId !== null ? "Edit Forwarder" : "New Forwarder"}</p>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
              <div><Label>Company *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="DHL, Agility" /></div>
              <div><Label>Contact</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="John Smith" /></div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 123 4567" /></div>
              <div className="flex justify-end gap-2 sm:col-span-4">
                <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
                <Button type="submit">{editingId !== null ? "Save changes" : "Add forwarder"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {forwarders.length === 0 ? (
        <Card><CardContent className="py-14 text-center"><IconTruck size={42} className="mx-auto mb-2 text-slate-300" /><p className="font-bold">No forwarders yet</p><p className="text-sm text-slate-500">Add your first forwarder to get started.</p></CardContent></Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">{["Company", "Contact", "Email", "Phone", isAdmin ? "Actions" : ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {forwarders.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-bold">{f.name}</td>
                    <td className="px-4 py-3">{f.contactPerson || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{f.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{f.phone || "-"}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setName(f.name); setContact(f.contactPerson); setEmail(f.email); setPhone(f.phone); setEditingId(f.id); setOpen(true); }} className="mr-1 rounded-lg p-2 text-[#1976d2] hover:bg-[#1976d2]/10"><IconPencil size={16} /></button>
                        <button onClick={() => { if (confirm("Delete forwarder?")) deleteForwarder(f.id); }} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><IconTrash size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
