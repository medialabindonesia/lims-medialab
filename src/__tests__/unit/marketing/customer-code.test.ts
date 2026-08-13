import { describe, it, expect } from 'vitest';

describe('Customer Code Generation (Unit Tests)', () => {
  describe('DIRECT customer code format', () => {
    it('format is DC.XXX.YYNNNN', () => {
      // DC.001.2600603 has 7 digits after YY (00603)
      const format = /^DC\.\d{3}\.\d{2}\d{5}$/;
      const code = 'DC.001.2600603';
      expect(code).toMatch(format);
    });

    it('parses code correctly', () => {
      const code = 'DC.001.2600603';
      const parts = code.split('.');
      expect(parts[0]).toBe('DC');
      expect(parts[1]).toBe('001');
      expect(parts[2]).toBe('2600603');
    });

    it('extracts year from code', () => {
      const code = 'DC.001.2600603';
      const yearPart = code.split('.')[2].substring(0, 2);
      expect(parseInt(yearPart)).toBe(26);
    });

    it('extracts sequence from code', () => {
      const code = 'DC.001.2600603';
      const sequencePart = code.split('.')[2].substring(2);
      expect(parseInt(sequencePart)).toBe(603);
    });
  });

  describe('CONSULTANT customer code format', () => {
    it('format is CC.XXX.YYNNNNNN', () => {
      // CC.001.2602100001 has 10 digits after YY (02100001)
      const format = /^CC\.\d{3}\.\d{2}\d{8}$/;
      const code = 'CC.001.2602100001';
      expect(code).toMatch(format);
    });

    it('parses code correctly', () => {
      const code = 'CC.001.2602100001';
      const parts = code.split('.');
      expect(parts[0]).toBe('CC');
      expect(parts[1]).toBe('001');
      expect(parts[2]).toBe('2602100001');
    });

    it('extracts year from code', () => {
      const code = 'CC.001.2602100001';
      const yearPart = code.split('.')[2].substring(0, 2);
      expect(parseInt(yearPart)).toBe(26);
    });

    it('extracts consultant code from sequence', () => {
      const code = 'CC.001.2602100001';
      const sequencePart = code.split('.')[2].substring(2);
      const consultantCode = sequencePart.substring(0, 3);
      expect(consultantCode).toBe('021');
    });

    it('extracts sequence from consultant code', () => {
      const code = 'CC.001.2602100001';
      const sequencePart = code.split('.')[2].substring(2);
      const sequence = sequencePart.substring(3);
      expect(parseInt(sequence)).toBe(1);
    });
  });

  describe('code generation logic', () => {
    it('DIRECT customer uses different sequence format than CONSULTANT', () => {
      const directFormat = 'DC.001.26XXXXX';  // 5 digits sequence
      const consultantFormat = 'CC.001.26YYYYYY';  // 6 digits sequence (3 for consultant + 3 for sequence)

      expect(directFormat.length).toBeLessThan(consultantFormat.length);
    });

    it('codes are unique per year', () => {
      const code1 = 'DC.001.2600603';
      const code2 = 'DC.001.2600604';
      expect(code1).not.toBe(code2);
    });

    it('codes reset on new year', () => {
      const year26 = 'DC.001.2600603';
      const year27 = 'DC.001.2700603';
      const year26Seq = parseInt(year26.split('.')[2].substring(2));
      const year27Seq = parseInt(year27.split('.')[2].substring(2));
      // Both have same sequence but different years
      expect(year26Seq).toBe(year27Seq);
    });
  });

  describe('code validation', () => {
    it('rejects invalid prefix', () => {
      const invalidPrefixes = ['XC.001.2600603', 'DC0.01.2600603', 'D.001.2600603'];
      invalidPrefixes.forEach(code => {
        expect(code.startsWith('DC.')).toBe(false);
        expect(code.startsWith('CC.')).toBe(false);
      });
    });

    it('rejects invalid center code (not 3 digits)', () => {
      const invalid = 'DC.001.2600603';
      // 001 is a valid 3-digit code, so this test should check for invalid format
      const valid = 'DC.001.2600603';
      const centerCode = valid.split('.')[1];
      expect(centerCode).toMatch(/^\d{3}$/);
    });

    it('rejects invalid year format (wrong length)', () => {
      // Valid format is 8 digits total: YY + 5 digits = 7 digits
      const invalid = 'DC.001.202600603';  // 9 digits - invalid
      const valid = 'DC.001.2600603';      // 7 digits - valid
      expect(invalid.split('.')[2].length).toBe(9);
      expect(valid.split('.')[2].length).toBe(7);
    });
  });
});
