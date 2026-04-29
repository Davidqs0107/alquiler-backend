import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { GlobalRole, RecordStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import '../config/env';

async function askCredentials() {
  const rl = createInterface({ input, output });

  try {
    const email = (await rl.question('Superadmin email: ')).trim().toLowerCase();
    const password = (await rl.question('Superadmin password: ')).trim();

    return { email, password };
  } finally {
    rl.close();
  }
}

async function main() {
  const { email, password } = await askCredentials();

  if (!email || !password || password.length < 6) {
    throw new Error('Email and password with at least 6 characters are required');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new Error(`User with email ${email} already exists`);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      globalRole: GlobalRole.SUPERADMIN,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      email: true,
      globalRole: true,
    },
  });

  console.log('SUPERADMIN created:', user);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
