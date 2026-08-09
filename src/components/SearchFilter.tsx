import { useCallback } from 'react';
import { ENTITIES, STATUS_LIST } from '../types';
import type { Filters } from '../types';
import {
  Box, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, InputAdornment, IconButton,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';

interface SearchFilterProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  resultCount?: number;
  totalCount?: number;
}

const ENTITY_CHIP_COLORS: Record<string, string> = {
  UAE: '#7c3aed',
  Qatar: '#2563eb',
  Oman: '#059669',
};

export default function SearchFilter({ filters, onFilterChange, resultCount, totalCount }: SearchFilterProps) {
  const handleChange = useCallback((key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const hasActiveFilters = filters.search || filters.entity || filters.status;

  return (
    <Box sx={{
      display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center',
      borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper', p: 1.5, position: 'relative', overflow: 'hidden',
      borderLeft: '4px solid',
      borderLeftColor: '#6366f1',
    }}>
      <TextField
        placeholder="Search supplier, PO, forwarder, mode, origin..."
        value={filters.search}
        onChange={(e) => handleChange('search', e.target.value)}
        size="small"
        sx={{ flex: '1 1 240px', '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment>,
          endAdornment: filters.search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => handleChange('search', '')}>
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Entity</InputLabel>
        <Select
          value={filters.entity || 'all'}
          label="Entity"
          onChange={(e) => handleChange('entity', e.target.value === 'all' ? '' : e.target.value)}
        >
          <MenuItem value="all">All Entities</MenuItem>
          {ENTITIES.map(e => (
            <MenuItem key={e} value={e}>
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ENTITY_CHIP_COLORS[e] }} />
                {e}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || 'all'}
          label="Status"
          onChange={(e) => handleChange('status', e.target.value === 'all' ? '' : e.target.value)}
        >
          <MenuItem value="all">All Status</MenuItem>
          {STATUS_LIST.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>
      <Chip
        label={resultCount !== undefined && totalCount !== undefined
          ? resultCount === totalCount ? `${totalCount} total` : `${resultCount} of ${totalCount}`
          : 'All quotations'}
        variant={hasActiveFilters ? 'filled' : 'outlined'}
        size="small"
        sx={{ height: 36, fontWeight: 600 }}
      />
    </Box>
  );
}
