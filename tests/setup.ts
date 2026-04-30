import { after, beforeEach } from 'node:test';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers/db';

beforeEach(async () => {
  await cleanupDatabase();
});

after(async () => {
  await cleanupDatabase();
  await prisma.$disconnect();
});
