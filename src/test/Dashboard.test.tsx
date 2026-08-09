import { describe, it, expect, vi } from 'vitest';
import { render, screen } from './test-utils';
import Dashboard from '../components/Dashboard';
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
    remarks: '',
    percentage: 15,
    etd: '',
    eta: '',
    status: 'Delivered',
    savings: 5000,
  },
  {
    id: 2,
    entity: 'Qatar',
    supplierName: 'Test Supplier 2',
    supplierPO: 'P002',
    poValue: 200000,
    origin: 'Shanghai',
    destination: 'Doha',
    mode: 'SEA FCL',
    size: '1 x 40ft',
    transitTime: '30 days',
    incoterms: 'CIF',
    quotes: [{ forwarder: 'ECU', quotedAmount: 30000 }],
    awardedTo: '',
    remarks: '',
    percentage: 15,
    etd: '',
    eta: '',
    status: 'Sent for quotation',
    savings: 0,
  },
];

describe('Dashboard', () => {
  it('renders total POs count', () => {
    render(<Dashboard quotations={mockQuotations} forwarders={mockForwarders} displayCurrency="AED" onCurrencyChange={() => {}} />);
    expect(screen.getByText('Total POs')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders savings card', () => {
    render(<Dashboard quotations={mockQuotations} forwarders={mockForwarders} displayCurrency="AED" onCurrencyChange={() => {}} />);
    expect(screen.getByText('Total Savings')).toBeInTheDocument();
  });

  it('renders forwarder stats', () => {
    render(<Dashboard quotations={mockQuotations} forwarders={mockForwarders} displayCurrency="AED" onCurrencyChange={() => {}} />);
    expect(screen.getByText('Forwarder Performance')).toBeInTheDocument();
    expect(screen.getByText('BDP')).toBeInTheDocument();
    expect(screen.getByText('ECU')).toBeInTheDocument();
  });

  it('renders entity stats', () => {
    render(<Dashboard quotations={mockQuotations} forwarders={mockForwarders} displayCurrency="AED" onCurrencyChange={() => {}} />);
    expect(screen.getByText('Entity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('UAE')).toBeInTheDocument();
    expect(screen.getByText('Qatar')).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    render(<Dashboard quotations={mockQuotations} forwarders={mockForwarders} displayCurrency="AED" onCurrencyChange={() => {}} />);
    expect(screen.getByText('300,000.00')).toBeInTheDocument();
  });
});
