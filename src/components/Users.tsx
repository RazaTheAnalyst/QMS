import { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select,
  Switch, TextField, Typography, Checkbox, Alert, Grid,
} from '@mui/material';
import { Add, Delete, Edit, PeopleAlt, ShieldOutlined } from '@mui/icons-material';
import { APP_MODULES, USER_ROLES } from '../types';
import type { AppModule, AppUser, AppUserInput, UserRole } from '../types';

const roleColors: Record<UserRole, 'primary' | 'info' | 'warning'> = {
  Admin: 'primary',
  Logistics: 'info',
  Sales: 'warning',
};

const moduleDefaults: Record<UserRole, AppModule[]> = {
  Admin: ['dashboard', 'quotations', 'forwarders', 'users'],
  Logistics: ['dashboard', 'quotations', 'forwarders'],
  Sales: ['dashboard', 'quotations'],
};

const emptyForm: AppUserInput = {
  name: '',
  email: '',
  role: 'Sales',
  modules: [...moduleDefaults.Sales],
  active: true,
};

interface UsersProps {
  users: AppUser[];
  onAdd: (data: AppUserInput) => Promise<void>;
  onEdit: (id: number, data: AppUserInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function Users({ users, onAdd, onEdit, onDelete }: UsersProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<AppUserInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedUsers = useMemo(() =>
    [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, modules: [...emptyForm.modules] });
    setError('');
    setOpen(true);
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      modules: [...user.modules],
      active: user.active,
    });
    setError('');
    setOpen(true);
  };

  const updateRole = (role: UserRole) => {
    setForm(prev => ({ ...prev, role, modules: [...moduleDefaults[role]] }));
  };

  const toggleModule = (module: AppModule) => {
    setForm(prev => {
      const exists = prev.modules.includes(module);
      const modules = exists
        ? prev.modules.filter(item => item !== module)
        : [...prev.modules, module];
      return { ...prev, modules };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (form.modules.length === 0) {
      setError('Assign at least one module.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
    };
    try {
      if (editing) {
        await onEdit(editing.id, payload);
      } else {
        await onAdd(payload);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{
        display: 'flex',
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1.5,
      }}>
        <Box>
          <Typography variant="h5" fontWeight={850}>Users</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage app roles and module access for your team.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add user
        </Button>
      </Box>

      <Alert severity="info" sx={{ borderRadius: 1.5 }}>
        Add or edit app access here. The email must match a Supabase Auth user for login.
      </Alert>

      <Grid container spacing={1.5}>
        {sortedUsers.map(user => (
          <Grid item xs={12} md={6} lg={4} key={user.id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} noWrap>{user.name}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
                  </Box>
                  <Chip label={user.active ? 'Active' : 'Disabled'} size="small" color={user.active ? 'success' : 'default'} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip icon={<ShieldOutlined />} label={user.role} color={roleColors[user.role]} size="small" sx={{ fontWeight: 700 }} />
                  {user.modules.map(module => (
                    <Chip key={module} label={APP_MODULES.find(item => item.key === module)?.label ?? module} size="small" variant="outlined" />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto' }}>
                  <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => openEdit(user)}>Edit</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => onDelete(user.id)}>Delete</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {sortedUsers.length === 0 && (
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ textAlign: 'center', py: 7 }}>
              <PeopleAlt sx={{ fontSize: 42, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" fontWeight={700}>No app users yet</Typography>
              <Typography variant="body2" color="text.secondary">Create profiles to assign roles and module access.</Typography>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={800}>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Name"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            fullWidth
            size="small"
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={form.role} onChange={e => updateRole(e.target.value as UserRole)}>
              {USER_ROLES.map(role => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </Select>
          </FormControl>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={800}>Modules</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5, mt: 0.75 }}>
              {APP_MODULES.map(module => (
                <FormControlLabel
                  key={module.key}
                  control={<Checkbox checked={form.modules.includes(module.key)} onChange={() => toggleModule(module.key)} />}
                  label={module.label}
                />
              ))}
            </Box>
          </Box>
          <FormControlLabel
            control={<Switch checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} />}
            label="Active user"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save user'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
