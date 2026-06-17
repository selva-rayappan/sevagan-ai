import { normalizePhone } from './phone.utils';

describe('Phone Utils', () => {
  describe('normalizePhone', () => {
    it('should format a 10-digit number with 91 prefix', () => {
      expect(normalizePhone('9876543210')).toBe('919876543210');
    });

    it('should strip leading 0 and prefix with 91 for 11-digit numbers starting with 0', () => {
      expect(normalizePhone('09876543210')).toBe('919876543210');
    });

    it('should preserve numbers already prefixed with 91', () => {
      expect(normalizePhone('919876543210')).toBe('919876543210');
    });

    it('should strip spaces, dashes, and plus signs', () => {
      expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
      expect(normalizePhone('+91-98765-43210')).toBe('919876543210');
    });

    it('should return empty string if no digits are found', () => {
      expect(normalizePhone('abc')).toBe('');
    });
  });
});
