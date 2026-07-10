import { describe, it, expect } from 'vitest';
import { calculateAwardSavings, ENTITIES, STATUS_LIST } from '../types';

describe('Types constants', () => {
  it('has correct entities', () => {
    expect(ENTITIES).toEqual(['UAE', 'Qatar', 'Oman']);
  });

  it('has correct status list', () => {
    expect(STATUS_LIST).toContain('Pending');
    expect(STATUS_LIST).toContain('Delivered');
    expect(STATUS_LIST).toContain('Awaiting Approval');
    expect(STATUS_LIST).toContain('Rejected');
    expect(STATUS_LIST.length).toBe(9);
  });

  it('returns negative savings when the awarded quote is higher than the lowest quote', () => {
    expect(calculateAwardSavings([
      { forwarder: 'BDP', quotedAmount: 66740, currency: 'AED' },
      { forwarder: 'Expeditors', quotedAmount: 66742, currency: 'AED' },
    ], 'AED', 'Expeditors')).toBe(-2);
  });

  it('returns positive savings when the lowest quote is awarded', () => {
    expect(calculateAwardSavings([
      { forwarder: 'BDP', quotedAmount: 66740, currency: 'AED' },
      { forwarder: 'Expeditors', quotedAmount: 66742, currency: 'AED' },
    ], 'AED', 'BDP')).toBe(2);
  });

  it('does not show final savings before an award is selected', () => {
    expect(calculateAwardSavings([
      { forwarder: 'BDP', quotedAmount: 66740, currency: 'AED' },
      { forwarder: 'Expeditors', quotedAmount: 66742, currency: 'AED' },
    ], 'AED', '')).toBeNull();
  });
});
