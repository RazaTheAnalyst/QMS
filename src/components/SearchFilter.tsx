import { useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { ENTITIES, STATUS_LIST } from '../types';
import type { Filters } from '../types';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface SearchFilterProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  resultCount?: number;
  totalCount?: number;
}

export default function SearchFilter({ filters, onFilterChange, resultCount, totalCount }: SearchFilterProps) {
  const handleChange = useCallback((key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const hasActiveFilters = filters.search || filters.entity || filters.status;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search supplier, PO, forwarder, mode, origin..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          className="pl-10 pr-10"
        />
        {filters.search && (
          <button
            onClick={() => handleChange('search', '')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Select
        value={filters.entity || 'all'}
        onValueChange={(value) => handleChange('entity', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Entities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          {ENTITIES.map(e => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => handleChange('status', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUS_LIST.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && resultCount !== undefined && totalCount !== undefined && (
        <Badge variant="secondary">
          {resultCount === totalCount ? `${totalCount} total` : `${resultCount} of ${totalCount} found`}
        </Badge>
      )}
    </div>
  );
}
