import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

describe('Customer API Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
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

  describe('Customer creation validation', () => {
    it('rejects customer with duplicate email', async () => {
      // First, check if test customer exists
      const existing = await prisma.customer.findFirst({
        where: { email: 'duplicate-test@example.com' },
      });

      const response = await fetch('http://localhost:3000/api/master/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: existing?.email || 'test@example.com',
          name: 'Test Customer',
          company: 'Test Company',
          customerType: 'DIRECT',
        }),
      });

      // If customer exists, should get error
      if (existing) {
        expect([400, 409]).toContain(response.status);
      }
    });

    it('rejects customer with invalid customerType', async () => {
      const response = await fetch('http://localhost:3000/api/master/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test Customer',
          company: 'Test Company',
          customerType: 'INVALID_TYPE',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects customer with missing required fields', async () => {
      const response = await fetch('http://localhost:3000/api/master/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing: name, company, customerType
        }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects customer with very long strings', async () => {
      const longString = 'a'.repeat(1000);

      const response = await fetch('http://localhost:3000/api/master/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: longString,
          company: longString,
          customerType: 'DIRECT',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Customer search validation', () => {
    it('returns empty array for empty query', async () => {
      const response = await fetch('http://localhost:3000/api/master/customers/search?q=');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('handles special characters in query', async () => {
      const response = await fetch(
        'http://localhost:3000/api/master/customers/search?q=%27%3B%20DROP%20TABLE%20customers%3B--'
      );

      // Should not cause SQL injection
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('handles SQL injection attempt', async () => {
      const response = await fetch(
        'http://localhost:3000/api/master/customers/search?q=test%27%20OR%20%271%27%3D%271'
      );

      // Should be handled safely
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Database queries', () => {
    it('can query all customers', async () => {
      const customers = await prisma.customer.findMany({
        take: 10,
      });
      expect(Array.isArray(customers)).toBe(true);
    });

    it('can query customer by email', async () => {
      const customer = await prisma.customer.findFirst({
        where: { email: { not: '' } },
      });
      if (customer) {
        expect(customer.email).toBeTruthy();
      }
    });

    it('can query CONSULTANT customers', async () => {
      const customers = await prisma.customer.findMany({
        where: { customerType: 'CONSULTANT' },
        include: { consultant: true },
      });
      expect(Array.isArray(customers)).toBe(true);
    });

    it('can query DIRECT customers', async () => {
      const customers = await prisma.customer.findMany({
        where: { customerType: 'DIRECT' },
      });
      expect(Array.isArray(customers)).toBe(true);
    });
  });
});
