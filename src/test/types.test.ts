import { describe, it, expect } from 'vitest';
import { ENTITIES, STATUS_LIST } from '../types';

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
});
