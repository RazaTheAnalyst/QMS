import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuotationTable from '../components/QuotationTable';
import type { Quotation, Forwarder } from '../types';

vi.mock('../auth', () => ({
  useAuth: () => ({
    user: { email: 'admin@netceedmea.com' },
    session: {},
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const mockForwarders: Forwarder[] = [
  { id: 1, name: 'BDP', contactPerson: '', email: '', phone: '' },
  { id: 2, name: 'ECU', contactPerson: '', email: '', phone: '' },
];

const mockQuotations: Quotation[] = [
  {
    id: 1,
    entity: 'UAE',
    supplierName: 'Test Supplier',
    supplierPO: 'P001',
    poValue: 100000,
    origin: 'Dubai',
    destination: 'Abu Dhabi',
    mode: 'Road',
    size: '1 Truck',
    transitTime: '2 days',
    incoterms: 'FOB',
    quotes: [{ forwarder: 'BDP', quotedAmount: 15000 }],
    awardedTo: 'BDP',
    remarks: 'Test remark',
    percentage: 15,
    etd: '',
    eta: '',
    status: 'Delivered',
    savings: 5000,
  },
];

const pendingQuotation: Quotation = {
  id: 2,
  entity: 'UAE',
  supplierName: 'Test Supplier',
  supplierPO: 'P001',
  poValue: 100000,
  origin: 'Dubai',
  destination: 'Abu Dhabi',
  mode: 'Road',
  size: '1 Truck',
  transitTime: '2 days',
  incoterms: 'FOB',
  quotes: [{ forwarder: 'BDP', quotedAmount: 15000 }],
  awardedTo: '',
  remarks: 'Test remark',
  percentage: 15,
  etd: '',
  eta: '',
  status: 'Sent for quotation',
  savings: 0,
};

describe('QuotationTable', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnAward = vi.fn();
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table headers', () => {
    render(
      <QuotationTable
        quotations={mockQuotations}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Supplier')).toBeInTheDocument();
    expect(screen.getByText('PO Value')).toBeInTheDocument();
  });

  it('renders quotation data in desktop table', () => {
    render(
      <QuotationTable
        quotations={mockQuotations}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    const desktopTable = document.querySelector('.rounded-xl.border.bg-card');
    expect(desktopTable).toBeTruthy();
    expect(screen.getAllByText('Test Supplier').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('P001').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no quotations', () => {
    render(
      <QuotationTable
        quotations={[]}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    expect(screen.getAllByText('No quotations found').length).toBe(2);
  });

  it('calls onEdit when edit button is clicked in modal', async () => {
    const user = userEvent.setup();
    render(
      <QuotationTable
        quotations={mockQuotations}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    const row = document.querySelector('.quote-row')!;
    await user.click(row);
    const modal = document.querySelector('.modal-overlay')!;
    const editButton = within(modal as HTMLElement).getByRole('button', { name: /edit/i });
    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockQuotations[0]);
  });

  it('calls onDelete when delete button is clicked in modal', async () => {
    const user = userEvent.setup();
    render(
      <QuotationTable
        quotations={mockQuotations}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    const row = document.querySelector('.quote-row')!;
    await user.click(row);
    const modal = document.querySelector('.modal-overlay')!;
    const deleteButton = within(modal as HTMLElement).getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('shows forwarder quotes in modal', async () => {
    const user = userEvent.setup();
    render(
      <QuotationTable
        quotations={mockQuotations}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    const row = document.querySelector('.quote-row')!;
    await user.click(row);
    expect(screen.getAllByText('BDP').length).toBeGreaterThanOrEqual(1);
  });

  it('shows pending badge for non-awarded quotations', () => {
    render(
      <QuotationTable
        quotations={[pendingQuotation]}
        forwarders={mockForwarders}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onAward={mockOnAward}
        onStatusChange={mockOnStatusChange}
      />
    );
    expect(screen.getAllByText('Sent for quotation').length).toBeGreaterThanOrEqual(1);
  });
});
