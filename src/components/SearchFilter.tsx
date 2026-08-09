import { useCallback } from 'react';
import { ENTITIES, STATUS_LIST } from '../types';
import type { Filters, Forwarder } from '../types';
import { MODES_LIST } from '../locations';
import { getEntityColor } from '../entityColors';
import {
  Box, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import FilterListOff from '@mui/icons-material/FilterListOff';

interface SearchFilterProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  resultCount?: number;
  totalCount?: number;
  forwarders?: Forwarder[];
}

export default function SearchFilter({ filters, onFilterChange, resultCount, totalCount, forwarders = [] }: SearchFilterProps) {
  const handleChange = useCallback((key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const hasActiveFilters = filters.search || filters.entity || filters.status || filters.mode || filters.forwarder || filters.dateFrom || filters.dateTo;

  const handleClearAll = useCallback(() => {
    onFilterChange({ search: '', entity: '', status: '', mode: '', forwarder: '', dateFrom: '', dateTo: '' });
  }, [onFilterChange]);

  const uniqueModes = MODES_LIST.map(m => m.value);

  return (
    <Box sx={{
      display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center',
      borderRadius: 1, border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper', p: 1.5, position: 'relative', overflow: 'hidden',
      borderLeft: '4px solid',
      borderLeftColor: 'primary.main',
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
              <IconButton size="small" onClick={() => handleChange('search', '')} aria-label="Clear search">
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
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getEntityColor(e).main }} />
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
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Mode</InputLabel>
        <Select
          value={filters.mode || 'all'}
          label="Mode"
          onChange={(e) => handleChange('mode', e.target.value === 'all' ? '' : e.target.value)}
        >
          <MenuItem value="all">All Modes</MenuItem>
          {uniqueModes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </Select>
      </FormControl>
      {forwarders.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Forwarder</InputLabel>
          <Select
            value={filters.forwarder || 'all'}
            label="Forwarder"
            onChange={(e) => handleChange('forwarder', e.target.value === 'all' ? '' : e.target.value)}
          >
            <MenuItem value="all">All Forwarders</MenuItem>
            {forwarders.map(f => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)}
          </Select>
        </FormControl>
      )}
      <TextField
        type="date"
        size="small"
        label="From"
        value={filters.dateFrom}
        onChange={(e) => handleChange('dateFrom', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 140 }}
      />
      <TextField
        type="date"
        size="small"
        label="To"
        value={filters.dateTo}
        onChange={(e) => handleChange('dateTo', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 140 }}
      />
      {hasActiveFilters && (
        <Tooltip title="Clear all filters">
          <IconButton size="small" onClick={handleClearAll} color="default" aria-label="Clear all filters"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <FilterListOff fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
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
