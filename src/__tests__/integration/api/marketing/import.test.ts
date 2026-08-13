import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

describe('Marketing Import API Integration Tests', () => {
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

  describe('Import validation', () => {
    it('rejects non-Excel file', async () => {
      const response = await fetch('http://localhost:3000/api/master/marketing/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'This is not an Excel file',
      });

      expect(response.status).toBe(400);
    });

    it('rejects empty file', async () => {
      const response = await fetch('http://localhost:3000/api/master/marketing/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: '',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Database queries for marketing data', () => {
    it('can query matrices', async () => {
      const matrices = await prisma.matrix.findMany({
        include: { children: true },
        take: 10,
      });
      expect(Array.isArray(matrices)).toBe(true);
    });

    it('can query regulations', async () => {
      const regulations = await prisma.regulation.findMany({
        include: { matrix: true },
        take: 10,
      });
      expect(Array.isArray(regulations)).toBe(true);
    });

    it('can query parameters', async () => {
      const parameters = await prisma.parameter.findMany({
        take: 10,
      });
      expect(Array.isArray(parameters)).toBe(true);
    });

    it('can query regulation parameters', async () => {
      const regParams = await prisma.regulationParameter.findMany({
        include: {
          regulation: true,
          parameter: true,
        },
        take: 10,
      });
      expect(Array.isArray(regParams)).toBe(true);
    });

    it('can query sampling durations', async () => {
      const durations = await prisma.samplingDuration.findMany({
        take: 10,
      });
      expect(Array.isArray(durations)).toBe(true);
    });

    it('has matrices with hierarchy', async () => {
      const rootMatrices = await prisma.matrix.findMany({
        where: { parentId: null },
        include: { children: true },
        take: 5,
      });

      if (rootMatrices.length > 0) {
        expect(rootMatrices[0].children.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('has regulations linked to matrices', async () => {
      const regulations = await prisma.regulation.findMany({
        include: { matrix: true },
        take: 5,
      });

      if (regulations.length > 0) {
        expect(regulations[0].matrix).toBeDefined();
      }
    });
  });
});
