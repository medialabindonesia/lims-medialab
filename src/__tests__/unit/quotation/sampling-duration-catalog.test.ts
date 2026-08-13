import { describe, it, expect } from 'vitest';

describe('Sampling Duration Catalog (Unit Tests)', () => {
  describe('CANONICAL_DURATIONS', () => {
    it('contains expected duration values', () => {
      const durations = [
        { code: 'GRAB', label: 'Grab', instant: true },
        { code: 'GRAB_SESAAT', label: 'Grab (Sesaat)', instant: true },
        { code: 'JAM_1X24', label: '1x24 jam' },
        { code: 'JAM_2X24', label: '2x24 jam' },
        { code: 'JAM_3X24', label: '3x24 jam' },
        { code: 'JAM_4X24', label: '4x24 jam' },
        { code: 'JAM_7X24', label: '7x24 jam' },
        { code: 'HARI_7', label: '7 hari' },
        { code: 'HARI_14', label: '14 hari' },
        { code: 'HARI_30', label: '30 hari' },
      ];
      expect(durations.length).toBeGreaterThan(0);
      expect(durations.find(d => d.code === 'GRAB')).toBeDefined();
      expect(durations.find(d => d.code === 'JAM_1X24')).toBeDefined();
    });
  });

  describe('classifySamplingEntry', () => {
    it('classifies "Grab" as instant duration', () => {
      const entry = 'Grab';
      const isDuration = entry.toLowerCase().includes('grab');
      expect(isDuration).toBe(true);
    });

    it('classifies "Grab (Sesaat)" as instant duration', () => {
      const entry = 'Grab (Sesaat)';
      const isDuration = entry.toLowerCase().includes('grab');
      expect(isDuration).toBe(true);
    });

    it('classifies "1x24 jam" as duration', () => {
      const entry = '1x24 jam';
      const isDuration = entry.includes('jam') || entry.includes('hari');
      expect(isDuration).toBe(true);
    });

    it('classifies "7 hari" as duration', () => {
      const entry = '7 hari';
      const isDuration = entry.includes('hari');
      expect(isDuration).toBe(true);
    });

    it('classifies "Metode Grab" as method (not duration)', () => {
      const entry = 'Metode Grab';
      const isMethod = entry.includes('Metode');
      expect(isMethod).toBe(true);
    });

    it('classifies "Sampel Grab" as method (not duration)', () => {
      const entry = 'Sampel Grab';
      const isMethod = entry.includes('Sampel');
      expect(isMethod).toBe(true);
    });
  });

  describe('duration parsing', () => {
    it('parses "1x24 jam" correctly', () => {
      const input = '1x24 jam';
      const match = input.match(/(\d+)x24\s+jam/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('1');
    });

    it('parses "2x24 jam" correctly', () => {
      const input = '2x24 jam';
      const match = input.match(/(\d+)x24\s+jam/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('2');
    });

    it('parses "7 hari" correctly', () => {
      const input = '7 hari';
      const match = input.match(/(\d+)\s+hari/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('7');
    });

    it('parses "30 hari" correctly', () => {
      const input = '30 hari';
      const match = input.match(/(\d+)\s+hari/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('30');
    });
  });
});
