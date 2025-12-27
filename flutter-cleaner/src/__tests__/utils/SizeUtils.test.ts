import {
  format,
  formatFull,
  parse,
  getUnit,
  toUnit,
} from '../../utils/SizeUtils';

describe('SizeUtils', () => {
  describe('format', () => {
    it('should format bytes', () => {
      expect(format(0)).toBe('0 B');
      expect(format(500)).toBe('500 B');
      expect(format(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(format(1024)).toBe('1 KB');
      expect(format(1536)).toBe('1.5 KB');
      expect(format(1024 * 10)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(format(1024 * 1024)).toBe('1 MB');
      expect(format(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(format(1024 * 1024 * 1024)).toBe('1 GB');
      expect(format(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should handle custom decimal places', () => {
      expect(format(1536, 0)).toBe('2 KB');
      expect(format(1536, 3)).toBe('1.5 KB');
    });
  });

  describe('formatFull', () => {
    it('should format with full unit names', () => {
      expect(formatFull(0)).toBe('0 Bytes');
      expect(formatFull(1024)).toBe('1 Kilobytes');
      expect(formatFull(1024 * 1024)).toBe('1 Megabytes');
    });
  });

  describe('parse', () => {
    it('should parse size strings', () => {
      expect(parse('500 B')).toBe(500);
      expect(parse('1 KB')).toBe(1024);
      expect(parse('1 MB')).toBe(1024 * 1024);
      expect(parse('1 GB')).toBe(1024 * 1024 * 1024);
    });

    it('should handle spaces', () => {
      expect(parse('1KB')).toBe(1024);
      expect(parse('1.5 MB')).toBe(Math.round(1.5 * 1024 * 1024));
    });

    it('should throw for invalid strings', () => {
      expect(() => parse('invalid')).toThrow();
      expect(() => parse('')).toThrow();
    });
  });

  describe('getUnit', () => {
    it('should return correct unit', () => {
      expect(getUnit(500)).toBe('B');
      expect(getUnit(1024)).toBe('KB');
      expect(getUnit(1024 * 1024)).toBe('MB');
      expect(getUnit(1024 * 1024 * 1024)).toBe('GB');
    });
  });

  describe('toUnit', () => {
    it('should convert to specified unit', () => {
      expect(toUnit(1024, 'KB')).toBe(1);
      expect(toUnit(1024 * 1024, 'MB')).toBe(1);
      expect(toUnit(1024 * 1024 * 1024, 'GB')).toBe(1);
    });

    it('should throw for unknown units', () => {
      expect(() => toUnit(1024, 'EX')).toThrow();
    });
  });
});
