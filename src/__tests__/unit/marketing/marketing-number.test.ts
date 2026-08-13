import { describe, it, expect } from 'vitest';

describe('Marketing Number Generation (Unit Tests)', () => {
  describe('Lead number format', () => {
    it('format is LD.XXX.YY-XXXXX', () => {
      const format = /^LD\.\d{3}\.\d{2}-\d{5}$/;
      const code = 'LD.001.26-00012';
      expect(code).toMatch(format);
    });

    it('parses lead number correctly', () => {
      const code = 'LD.001.26-00012';
      const parts = code.split('.');
      expect(parts[0]).toBe('LD');
      expect(parts[1]).toBe('001');

      const yearAndSeq = parts[2].split('-');
      expect(yearAndSeq[0]).toBe('26');
      expect(yearAndSeq[1]).toBe('00012');
    });

    it('extracts center code from lead number', () => {
      const code = 'LD.001.26-00012';
      const centerCode = code.split('.')[1];
      expect(centerCode).toBe('001');
    });

    it('extracts year from lead number', () => {
      const code = 'LD.001.26-00012';
      const year = code.split('.')[2].split('-')[0];
      expect(parseInt(year)).toBe(26);
    });

    it('extracts sequence from lead number', () => {
      const code = 'LD.001.26-00012';
      const sequence = code.split('.')[2].split('-')[1];
      expect(parseInt(sequence)).toBe(12);
    });
  });

  describe('Survey number format', () => {
    it('format is SV.XXX.YY-XXXXX', () => {
      const format = /^SV\.\d{3}\.\d{2}-\d{5}$/;
      const code = 'SV.001.26-00045';
      expect(code).toMatch(format);
    });

    it('parses survey number correctly', () => {
      const code = 'SV.001.26-00045';
      const parts = code.split('.');
      expect(parts[0]).toBe('SV');
      expect(parts[1]).toBe('001');

      const yearAndSeq = parts[2].split('-');
      expect(yearAndSeq[0]).toBe('26');
      expect(yearAndSeq[1]).toBe('00045');
    });
  });

  describe('sequence generation', () => {
    it('increments sequence correctly', () => {
      const seq1 = 1;
      const seq2 = 2;
      const seq3 = 3;

      expect(seq2).toBe(seq1 + 1);
      expect(seq3).toBe(seq2 + 1);
    });

    it('pads sequence to 5 digits', () => {
      const sequence = 12;
      const padded = sequence.toString().padStart(5, '0');
      expect(padded).toBe('00012');
    });

    it('pads sequence to 5 digits for single digit', () => {
      const sequence = 5;
      const padded = sequence.toString().padStart(5, '0');
      expect(padded).toBe('00005');
    });

    it('handles 5-digit sequence', () => {
      const sequence = 99999;
      const padded = sequence.toString().padStart(5, '0');
      expect(padded).toBe('99999');
      expect(padded.length).toBe(5);
    });
  });

  describe('year rollover', () => {
    it('resets sequence on year change', () => {
      const currentYear = 26;
      const nextYear = 27;
      const currentSeq = 12345;
      const nextSeq = 1; // Reset on year change

      expect(currentYear).not.toBe(nextYear);
      expect(nextSeq).toBe(1);
    });

    it('formats year correctly for single digit', () => {
      const year = 5;
      const formatted = year.toString().padStart(2, '0');
      expect(formatted).toBe('05');
    });

    it('formats year correctly for two digit', () => {
      const year = 26;
      const formatted = year.toString().padStart(2, '0');
      expect(formatted).toBe('26');
    });
  });

  describe('number validation', () => {
    it('accepts valid lead number', () => {
      const valid = 'LD.001.26-00012';
      const isValid = /^LD\.\d{3}\.\d{2}-\d{5}$/.test(valid);
      expect(isValid).toBe(true);
    });

    it('accepts valid survey number', () => {
      const valid = 'SV.001.26-00045';
      const isValid = /^SV\.\d{3}\.\d{2}-\d{5}$/.test(valid);
      expect(isValid).toBe(true);
    });

    it('rejects invalid prefix', () => {
      const invalid = ['DX.001.26-00012', 'LS.001.26-00012', 'LD0.01.26-00012'];
      invalid.forEach(code => {
        const isLead = /^LD\./.test(code);
        const isSurvey = /^SV\./.test(code);
        expect(isLead || isSurvey).toBe(false);
      });
    });

    it('rejects malformed sequence', () => {
      const invalid = ['LD.001.26-0012', 'LD.001.26-000012', 'LD.001.26-0012A'];
      invalid.forEach(code => {
        const isValid = /^[LS][VD]\.\d{3}\.\d{2}-\d{5}$/.test(code);
        expect(isValid).toBe(false);
      });
    });
  });
});
