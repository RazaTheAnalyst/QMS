import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import SearchFilter from '../components/SearchFilter';
import type { Filters } from '../types';

describe('SearchFilter', () => {
  const mockOnChange = vi.fn();
  const defaultFilters: Filters = { search: '', entity: '', status: '', mode: '', forwarder: '', dateFrom: '', dateTo: '' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<SearchFilter filters={defaultFilters} onFilterChange={mockOnChange} />);
    expect(screen.getByPlaceholderText(/Search supplier, PO, forwarder/)).toBeInTheDocument();
  });

  it('renders entity dropdown with options', async () => {
    const user = userEvent.setup();
    render(<SearchFilter filters={defaultFilters} onFilterChange={mockOnChange} />);
    const select = screen.getAllByRole('combobox')[0]!;
    expect(select).toBeInTheDocument();
    expect(screen.getByText('All Entities')).toBeInTheDocument();
    await user.click(select);
    expect(screen.getByRole('option', { name: 'UAE' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Qatar' })).toBeInTheDocument();
  });

  it('renders status dropdown with options', async () => {
    const user = userEvent.setup();
    render(<SearchFilter filters={defaultFilters} onFilterChange={mockOnChange} />);
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects[1]!;
    expect(statusSelect).toBeInTheDocument();
    await user.click(statusSelect);
    expect(screen.getByRole('option', { name: 'Sent for quotation' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Delivered' })).toBeInTheDocument();
  });

  it('calls onFilterChange when search input changes', async () => {
    const user = userEvent.setup();
    render(<SearchFilter filters={defaultFilters} onFilterChange={mockOnChange} />);
    await user.type(screen.getByPlaceholderText(/Search supplier, PO, forwarder/), 'test');
    expect(mockOnChange).toHaveBeenCalled();
  });
});
