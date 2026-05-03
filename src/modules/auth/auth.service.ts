import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { comparePassword } from '../../utils/password';
import { signAccessToken } from '../../utils/jwt';
import { RecordStatus } from '@prisma/client';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      globalRole: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (user.status !== RecordStatus.ACTIVE) {
    throw new AppError(403, 'User is inactive');
  }

  const validPassword = await comparePassword(password, user.passwordHash);

  if (!validPassword) {
    throw new AppError(401, 'Invalid credentials');
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    globalRole: user.globalRole,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
      status: user.status,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      globalRole: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const memberships = await prisma.companyUser.findMany({
    where: {
      userId,
      status: RecordStatus.ACTIVE,
    },
    select: {
      role: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        include: {
          branchMemberships: {
            where: { status: RecordStatus.ACTIVE },
            select: {
              role: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                  companyId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const formattedMemberships = memberships.map((membership) => ({
    companyId: membership.company.id,
    companyName: membership.company.name,
    companyRole: membership.role,
    branches: membership.user.branchMemberships
      .filter((bm) => bm.branch.companyId === membership.company.id)
      .map((bm) => ({
        companyId: membership.company.id,
        branchId: bm.branch.id,
        branchName: bm.branch.name,
      })),
  }));

  return {
    ...user,
    memberships: formattedMemberships,
  };
}
