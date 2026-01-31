import {
  getString,
  getNumber,
  getId,
  isRecord,
} from '@/lib/api/utils/normalize';

describe('normalize utils', () => {
  it('getString returns fallback when not string', () => {
    expect(getString(undefined, 'fallback')).toBe('fallback');
    expect(getString('value', 'fallback')).toBe('value');
  });

  it('getNumber returns finite numbers only', () => {
    expect(getNumber(42)).toBe(42);
    expect(getNumber(NaN)).toBeUndefined();
    expect(getNumber(Infinity)).toBeUndefined();
    expect(getNumber('7')).toBeUndefined();
  });

  it('getId stringifies numbers and ignores other types', () => {
    expect(getId('abc')).toBe('abc');
    expect(getId(123)).toBe('123');
    expect(getId(null)).toBe('');
  });

  it('isRecord guards objects', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('nope')).toBe(false);
  });
});
