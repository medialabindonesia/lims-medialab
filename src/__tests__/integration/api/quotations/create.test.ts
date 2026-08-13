import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Integration test for Quotation API
// This test requires a running database

describe('Quotation API Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Connect to test database
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not set');
    }

    const url = new URL(databaseUrl);
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
      connectionLimit: 5,
    });

    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Customer validation', () => {
    it('rejects quotation with non-existent customer', async () => {
      const response = await fetch('http://localhost:3000/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'non-existent-id',
          groups: [],
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('customer');
    });

    it('rejects quotation with empty groups', async () => {
      const response = await fetch('http://localhost:3000/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'valid-customer-id',
          groups: [],
        }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects quotation with missing required fields', async () => {
      const response = await fetch('http://localhost:3000/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing customerId, groups, etc.
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Draft API validation', () => {
    it('rejects draft with payload exceeding 512KB', async () => {
      const largePayload = 'x'.repeat(513 * 1024); // 513KB

      const response = await fetch('http://localhost:3000/api/quotations/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'test',
          payload: largePayload,
        }),
      });

      expect(response.status).toBe(413);
    });

    it('rejects draft with invalid JSON', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {{{',
      });

      expect(response.status).toBe(400);
    });

    it('rejects draft without session', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/drafts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Verify API validation', () => {
    it('rejects verify for non-existent quotation', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/non-existent/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(404);
    });

    it('rejects verify for already verified quotation', async () => {
      // Would need a pre-existing VERIFIED quotation in test DB
      const response = await fetch('http://localhost:3000/api/quotations/already-verified/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Approve API validation', () => {
    it('rejects approve with null prices', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/quotation-with-null-prices/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(400);
    });

    it('rejects approve for non-VERIFIED quotation', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/requested-quotation/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Reject API validation', () => {
    it('rejects rejection without reason', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/some-quotation/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing reason
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Email API validation', () => {
    it('rejects email send with invalid email', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/quotation-id/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'invalid-email',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects email send for non-existent quotation', async () => {
      const response = await fetch('http://localhost:3000/api/quotations/non-existent/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Database operations', () => {
    it('can query customers', async () => {
      const customers = await prisma.customer.findMany({
        take: 10,
      });
      expect(Array.isArray(customers)).toBe(true);
    });

    it('can query quotations', async () => {
      const quotations = await prisma.quotation.findMany({
        take: 10,
      });
      expect(Array.isArray(quotations)).toBe(true);
    });

    it('can count quotation drafts', async () => {
      const count = await prisma.quotationDraft.count();
      expect(typeof count).toBe('number');
    });

    it('can query matrices', async () => {
      const matrices = await prisma.matrix.findMany({
        take: 10,
      });
      expect(Array.isArray(matrices)).toBe(true);
    });

    it('can query regulations', async () => {
      const regulations = await prisma.regulation.findMany({
        take: 10,
      });
      expect(Array.isArray(regulations)).toBe(true);
    });
  });
});
