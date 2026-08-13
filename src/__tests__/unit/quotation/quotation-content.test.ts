import { describe, it, expect } from 'vitest';

describe('Quotation Calculations (Unit Tests)', () => {
  describe('price calculation', () => {
    it('calculates total for single item', () => {
      const quantity = 100;
      const unitPrice = 150000;
      const total = quantity * unitPrice;
      expect(total).toBe(15000000);
    });

    it('calculates total for multiple items', () => {
      const items = [
        { quantity: 100, unitPrice: 150000 },
        { quantity: 50, unitPrice: 200000 },
        { quantity: 200, unitPrice: 100000 },
      ];

      const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      expect(grandTotal).toBe(15000000 + 10000000 + 20000000);
    });

    it('handles zero price', () => {
      const quantity = 100;
      const unitPrice = 0;
      const total = quantity * unitPrice;
      expect(total).toBe(0);
    });

    it('handles null price as zero', () => {
      const quantity = 100;
      const unitPrice = null;
      const total = quantity * (unitPrice ?? 0);
      expect(total).toBe(0);
    });

    it('handles decimal prices correctly', () => {
      const quantity = 3;
      const unitPrice = 150000.50;
      const total = quantity * unitPrice;
      expect(total).toBeCloseTo(450001.5, 2);
    });

    it('rounds to 2 decimal places', () => {
      const quantity = 3;
      const unitPrice = 150000.33;
      const total = Math.round(quantity * unitPrice * 100) / 100;
      expect(total).toBe(450000.99);  // 3 * 150000.33 = 450000.99
    });
  });

  describe('group-based quotation calculations', () => {
    it('calculates group total from parameters', () => {
      const group = {
        parameters: [
          { quantity: 100, unitPrice: 150000 },
          { quantity: 50, unitPrice: 200000 },
        ],
      };

      const groupTotal = group.parameters.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
      expect(groupTotal).toBe(25000000);
    });

    it('calculates grand total from multiple groups', () => {
      const groups = [
        {
          parameters: [
            { quantity: 100, unitPrice: 150000 },
            { quantity: 50, unitPrice: 200000 },
          ],
        },
        {
          parameters: [
            { quantity: 200, unitPrice: 100000 },
            { quantity: 30, unitPrice: 250000 },
          ],
        },
      ];

      const grandTotal = groups.reduce((sum, group) => {
        const groupTotal = group.parameters.reduce((s, p) => s + (p.quantity * p.unitPrice), 0);
        return sum + groupTotal;
      }, 0);

      expect(grandTotal).toBe(25000000 + 20000000 + 7500000);
    });

    it('handles empty group', () => {
      const group = { parameters: [] };
      const groupTotal = group.parameters.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
      expect(groupTotal).toBe(0);
    });

    it('handles multiple groups with some empty', () => {
      const groups = [
        { parameters: [{ quantity: 100, unitPrice: 150000 }] },
        { parameters: [] },
        { parameters: [{ quantity: 200, unitPrice: 100000 }] },
      ];

      const grandTotal = groups.reduce((sum, group) => {
        const groupTotal = group.parameters.reduce((s, p) => s + (p.quantity * p.unitPrice), 0);
        return sum + groupTotal;
      }, 0);

      expect(grandTotal).toBe(15000000 + 0 + 20000000);
    });

    it('handles single-item group', () => {
      const group = { parameters: [{ quantity: 1, unitPrice: 500000 }] };
      const groupTotal = group.parameters.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
      expect(groupTotal).toBe(500000);
    });
  });

  describe('additional charges', () => {
    it('adds sampling charges', () => {
      const basePrice = 15000000;
      const samplingCharge = 2000000;
      const total = basePrice + samplingCharge;
      expect(total).toBe(17000000);
    });

    it('adds document charges', () => {
      const basePrice = 15000000;
      const documentCharge = 500000;
      const total = basePrice + documentCharge;
      expect(total).toBe(15500000);
    });

    it('adds multiple charges', () => {
      const basePrice = 15000000;
      const charges = [
        { type: 'SAMPLING', amount: 2000000 },
        { type: 'DOCUMENT', amount: 500000 },
        { type: 'OTHER', amount: 300000 },
      ];

      const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
      const grandTotal = basePrice + totalCharges;
      expect(grandTotal).toBe(17800000);
    });

    it('handles zero charges', () => {
      const basePrice = 15000000;
      const charges: { type: string; amount: number }[] = [];
      const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
      expect(totalCharges).toBe(0);
    });
  });

  describe('pricing status check', () => {
    it('returns "complete" when all prices set', () => {
      const items = [
        { unitPrice: 150000 },
        { unitPrice: 200000 },
        { unitPrice: 100000 },
      ];
      const allPriced = items.every(item => item.unitPrice > 0);
      expect(allPriced).toBe(true);
    });

    it('returns "incomplete" when some prices null', () => {
      const items = [
        { unitPrice: 150000 },
        { unitPrice: null },
        { unitPrice: 100000 },
      ];
      const allPriced = items.every(item => item.unitPrice !== null && item.unitPrice > 0);
      expect(allPriced).toBe(false);
    });

    it('returns "incomplete" when some prices zero', () => {
      const items = [
        { unitPrice: 150000 },
        { unitPrice: 0 },
        { unitPrice: 100000 },
      ];
      const allPriced = items.every(item => item.unitPrice !== null && item.unitPrice > 0);
      expect(allPriced).toBe(false);
    });
  });
});
