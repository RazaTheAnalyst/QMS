import React, { useState, useCallback } from 'react';
import { Mail, Phone, Pencil, X, Plus, Truck } from 'lucide-react';
import type { Forwarder } from '../types';
import { ADMIN_EMAIL } from '../types';
import { useAuth } from '../auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';

interface ForwardersProps {
  forwarders: Forwarder[];
  onAdd: (data: Omit<Forwarder, 'id'>) => Promise<void>;
  onEdit: (id: number, data: Omit<Forwarder, 'id'>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const Forwarders = React.memo(function Forwarders({ forwarders, onAdd, onEdit, onDelete }: ForwardersProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setShowForm(false);
    setEditingId(null);
  }, []);

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), contactPerson: contactPerson.trim(), email: email.trim(), phone: phone.trim() });
      resetForm();
    } catch (err) {
      console.error('Failed to add forwarder:', err);
    } finally {
      setSubmitting(false);
    }
  }, [name, contactPerson, email, phone, onAdd, resetForm]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || editingId === null) return;
    setSubmitting(true);
    try {
      await onEdit(editingId, { name: name.trim(), contactPerson: contactPerson.trim(), email: email.trim(), phone: phone.trim() });
      resetForm();
    } catch (err) {
      console.error('Failed to update forwarder:', err);
    } finally {
      setSubmitting(false);
    }
  }, [name, contactPerson, email, phone, editingId, onEdit, resetForm]);

  const startEdit = useCallback((f: Forwarder) => {
    setName(f.name);
    setContactPerson(f.contactPerson);
    setEmail(f.email);
    setPhone(f.phone);
    setEditingId(f.id);
    setShowForm(true);
  }, []);

  const isEditing = editingId !== null;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero Banner */}
      <div className="relative flex justify-between items-center rounded-xl px-8 py-7 text-white overflow-hidden bg-gradient-to-br from-[#312e81] via-[#4338ca] to-[#6366f1]">
        <div className="absolute -top-1/2 -right-[10%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1"><Truck className="inline h-6 w-6 mr-2" /> Forwarders</h2>
          <p className="text-sm text-white/70">Manage your logistics forwarder partners</p>
        </div>
        <Button
          variant="secondary"
          className="bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30"
          onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); setEditingId(null); } }}
        >
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Forwarder</>}
        </Button>
      </div>

      {/* Add/Edit Forwarder Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isEditing ? 'Edit Forwarder' : 'New Forwarder'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={isEditing ? handleEditSubmit : handleAddSubmit}>
              <div className="grid grid-cols-4 gap-4 max-[1200px]:grid-cols-2 max-[900px]:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fwd-name">Company Name *</Label>
                  <Input
                    id="fwd-name"
                    placeholder="e.g. DHL, Agility"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fwd-contact">Contact Person</Label>
                  <Input
                    id="fwd-contact"
                    placeholder="e.g. John Smith"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fwd-email">Email</Label>
                  <Input
                    id="fwd-email"
                    type="email"
                    placeholder="e.g. john@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fwd-phone">Phone</Label>
                  <Input
                    id="fwd-phone"
                    placeholder="e.g. +971 50 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2.5 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Forwarder')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Forwarders Grid / Empty State */}
      {forwarders.length === 0 ? (
        <Card className="p-[60px_20px] text-center">
          <CardContent>
            <Truck className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-1">No forwarders yet</h3>
            <p className="text-sm text-muted-foreground">Add your first forwarder to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-[1200px]:grid-cols-2 max-[900px]:grid-cols-1">
          {forwarders.map((f) => (
            <Card key={f.id} className="relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-start gap-3.5 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-cyan-400 text-white text-xl font-bold rounded-[14px]">
                      {f.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-bold tracking-tight mb-0.5">{f.name}</h3>
                    {f.contactPerson && <p className="text-[13px] text-muted-foreground">{f.contactPerson}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Edit forwarder"
                        aria-label={`Edit ${f.name}`}
                        onClick={() => startEdit(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete forwarder"
                        aria-label={`Delete ${f.name}`}
                        onClick={() => onDelete(f.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-3.5 border-t border-border">
                  {f.email && (
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{f.email}</span>
                    </div>
                  )}
                  {f.phone && (
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{f.phone}</span>
                    </div>
                  )}
                  {!f.email && !f.phone && (
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground italic">
                      No contact details
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="text-center text-xs text-muted-foreground py-2">
        {forwarders.length} forwarder{forwarders.length !== 1 ? 's' : ''} registered
      </div>
    </div>
  );
});

export default Forwarders;
