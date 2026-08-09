import { useState, useCallback } from 'react';
import type { Forwarder } from '../types';
import { ADMIN_EMAIL } from '../types';
import { useAuth } from '../auth';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Avatar, IconButton, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useMediaQuery, useTheme,
} from '@mui/material';
import Mail from '@mui/icons-material/Mail';
import Phone from '@mui/icons-material/Phone';
import Edit from '@mui/icons-material/Edit';
import Close from '@mui/icons-material/Close';
import Add from '@mui/icons-material/Add';
import LocalShipping from '@mui/icons-material/LocalShipping';

interface ForwardersProps {
  forwarders: Forwarder[];
  onAdd: (data: Omit<Forwarder, 'id'>) => Promise<void>;
  onEdit: (id: number, data: Omit<Forwarder, 'id'>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function Forwarders({ forwarders, onAdd, onEdit, onDelete }: ForwardersProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { user } = useAuth();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName(''); setContactPerson(''); setEmail(''); setPhone('');
    setShowForm(false); setEditingId(null);
  }, []);

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return;
    }
    if (phone.trim() && phone.trim().length < 7) {
      return;
    }
    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), contactPerson: contactPerson.trim(), email: email.trim(), phone: phone.trim() });
      resetForm();
    } catch { /* handled by caller */ } finally { setSubmitting(false); }
  }, [name, contactPerson, email, phone, onAdd, resetForm]);

  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || editingId === null) return;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return;
    }
    if (phone.trim() && phone.trim().length < 7) {
      return;
    }
    setSubmitting(true);
    try {
      await onEdit(editingId, { name: name.trim(), contactPerson: contactPerson.trim(), email: email.trim(), phone: phone.trim() });
      resetForm();
    } catch { /* handled by caller */ } finally { setSubmitting(false); }
  }, [name, contactPerson, email, phone, editingId, onEdit, resetForm]);

  const startEdit = useCallback((f: Forwarder) => {
    setName(f.name); setContactPerson(f.contactPerson);
    setEmail(f.email); setPhone(f.phone);
    setEditingId(f.id); setShowForm(true);
  }, []);

  const isEditing = editingId !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: { sm: 'space-between' },
        alignItems: { sm: 'center' },
        gap: 1.5,
      }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Forwarders</Typography>
          <Typography variant="body2" color="text.secondary">{forwarders.length} partner{forwarders.length !== 1 ? 's' : ''} registered</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); setEditingId(null); } }}
          startIcon={showForm ? <Close /> : <Add />}
        >
          {showForm ? 'Cancel' : 'Add forwarder'}
        </Button>
      </Box>

      {showForm && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>{isEditing ? 'Edit Forwarder' : 'New Forwarder'}</Typography>
            <Box component="form" onSubmit={isEditing ? handleEditSubmit : handleAddSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField label="Company Name *" placeholder="e.g. DHL, Agility"
                    value={name} onChange={e => setName(e.target.value)} required fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField label="Contact Person" placeholder="e.g. John Smith"
                    value={contactPerson} onChange={e => setContactPerson(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField label="Email" type="email" placeholder="e.g. john@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField label="Phone" placeholder="e.g. +971 50 123 4567"
                    value={phone} onChange={e => setPhone(e.target.value)} fullWidth size="small" />
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button variant="outlined" onClick={resetForm}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Forwarder')}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {forwarders.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <LocalShipping sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No forwarders yet</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Add your first forwarder to get started.</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setShowForm(true)}>Add Forwarder</Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Mobile card view */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {forwarders.map(f => (
            <Card key={f.id} variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 }, py: 2, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.selected', color: 'primary.main', fontWeight: 800, borderRadius: 1.5, fontSize: '0.875rem' }}>
                    {f.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body1" fontWeight={700} noWrap>{f.name}</Typography>
                    {f.contactPerson && (
                      <Typography variant="caption" color="text.secondary">{f.contactPerson}</Typography>
                    )}
                  </Box>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" color="primary" onClick={() => startEdit(f)} sx={{ minWidth: 40, minHeight: 40 }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDelete(f.id)} sx={{ minWidth: 40, minHeight: 40 }}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {f.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Mail fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>{f.email}</Typography>
                    </Box>
                  )}
                  {f.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary" noWrap>{f.phone}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        /* Desktop table view */
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>Company</TableCell>
                <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>Phone</TableCell>
                {isAdmin && <TableCell align="right" sx={{ bgcolor: 'action.hover', fontWeight: 700, width: 96 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {forwarders.map(f => (
                <TableRow key={f.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: 'action.selected', color: 'primary.main', fontWeight: 800, borderRadius: 1, fontSize: '0.875rem' }}>
                        {f.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={700} noWrap>{f.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={f.contactPerson ? 'text.primary' : 'text.disabled'} noWrap>
                      {f.contactPerson || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {f.email ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Mail fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" noWrap>{f.email}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {f.phone ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" noWrap>{f.phone}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">-</Typography>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <IconButton size="small" color="primary" onClick={() => startEdit(f)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => onDelete(f.id)}>
                        <Close fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
