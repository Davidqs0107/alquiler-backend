import { GlobalRole, MembershipRole, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { hashPassword } from '../../utils/password';
import { ensureBranchInCompany, ensureCompanyAccess, ensureCompanyMemberAccess } from './companies.access';

type CreateCompanyInput = {
  company: {
    name: string;
    slug: string;
  };
  branch: {
    name: string;
  };
  admin: {
    email: string;
    password: string;
  };
};

type CreateCompanyMemberInput = {
  email: string;
  password: string;
  role: 'ADMIN_EMPRESA' | 'CAJERO' | 'RECEPCION';
};

type CreateBranchMemberInput = {
  email: string;
  password: string;
  companyRole: 'ADMIN_EMPRESA' | 'CAJERO' | 'RECEPCION';
  branchRole: 'ADMIN_SEDE' | 'CAJERO' | 'RECEPCION';
};

export async function createCompany(input: CreateCompanyInput) {
  const slug = input.company.slug.toLowerCase();
  const adminEmail = input.admin.email.toLowerCase();

  const [existingCompany, existingUser] = await Promise.all([
    prisma.company.findUnique({ where: { slug }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }),
  ]);

  if (existingCompany) {
    throw new AppError(409, 'Company slug already exists');
  }

  if (existingUser) {
    throw new AppError(409, 'Admin email already exists');
  }

  const passwordHash = await hashPassword(input.admin.password);

  return prisma.$transaction(async (tx) => {
    const adminUser = await tx.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        globalRole: GlobalRole.USER,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        globalRole: true,
        status: true,
      },
    });

    const company = await tx.company.create({
      data: {
        name: input.company.name,
        slug,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    const mainBranch = await tx.branch.create({
      data: {
        companyId: company.id,
        name: input.branch.name,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    await tx.companyUser.create({
      data: {
        companyId: company.id,
        userId: adminUser.id,
        role: MembershipRole.ADMIN_EMPRESA,
        status: RecordStatus.ACTIVE,
      },
    });

    return {
      company,
      mainBranch,
      adminUser,
    };
  });
}

export async function createBranch(companyId: string, userId: string, globalRole: GlobalRole, input: { name: string }) {
  await ensureCompanyAccess(companyId, userId, globalRole);

  const existingBranch = await prisma.branch.findFirst({
    where: { companyId, name: input.name },
    select: { id: true },
  });

  if (existingBranch) {
    throw new AppError(409, 'Branch name already exists in this company');
  }

  return prisma.branch.create({
    data: {
      companyId,
      name: input.name,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function listCompanies(userId: string, globalRole: GlobalRole) {
  if (globalRole === GlobalRole.SUPERADMIN) {
    return prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  const memberships = await prisma.companyUser.findMany({
    where: {
      userId,
      status: RecordStatus.ACTIVE,
    },
    orderBy: {
      company: { createdAt: 'desc' },
    },
    select: {
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    ...membership.company,
    membershipRole: membership.role,
  }));
}

export async function getCompanyById(companyId: string, userId: string, globalRole: GlobalRole) {
  const existingCompany = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!existingCompany) {
    throw new AppError(404, 'Company not found');
  }

  if (globalRole !== GlobalRole.SUPERADMIN) {
    const membership = await prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        status: RecordStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new AppError(403, 'Insufficient permissions');
    }
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      branches: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      users: {
        select: {
          id: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              globalRole: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!company) {
    throw new AppError(404, 'Company not found');
  }

  return company;
}

export async function createCompanyMember(
  companyId: string,
  actorUserId: string,
  actorGlobalRole: GlobalRole,
  input: CreateCompanyMemberInput,
) {
  await ensureCompanyAccess(companyId, actorUserId, actorGlobalRole);

  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(409, 'User email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        globalRole: GlobalRole.USER,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        globalRole: true,
        status: true,
        createdAt: true,
      },
    });

    const membership = await tx.companyUser.create({
      data: {
        companyId,
        userId: user.id,
        role: input.role,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        companyId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return { user, companyMembership: membership };
  });
}

export async function createBranchMember(
  companyId: string,
  branchId: string,
  actorUserId: string,
  actorGlobalRole: GlobalRole,
  input: CreateBranchMemberInput,
) {
  await ensureCompanyAccess(companyId, actorUserId, actorGlobalRole);
  await ensureBranchInCompany(companyId, branchId);

  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(409, 'User email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        globalRole: GlobalRole.USER,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        globalRole: true,
        status: true,
        createdAt: true,
      },
    });

    const companyMembership = await tx.companyUser.create({
      data: {
        companyId,
        userId: user.id,
        role: input.companyRole,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        companyId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const branchMembership = await tx.branchUser.create({
      data: {
        branchId,
        userId: user.id,
        role: input.branchRole,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
        branchId: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return { user, companyMembership, branchMembership };
  });
}

export async function listCompanyMembers(companyId: string, actorUserId: string, actorGlobalRole: GlobalRole) {
  await ensureCompanyAccess(companyId, actorUserId, actorGlobalRole);

  return prisma.companyUser.findMany({
    where: {
      companyId,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          globalRole: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function listBranchMembers(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  return prisma.branchUser.findMany({
    where: {
      branchId,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          globalRole: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function listBranches(companyId: string, userId: string, globalRole: GlobalRole) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  return prisma.branch.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      companyId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

type UpdateCompanyInput = {
  name?: string;
  slug?: string;
  status?: RecordStatus;
};

export async function updateCompany(
  companyId: string,
  actorUserId: string,
  actorGlobalRole: GlobalRole,
  input: UpdateCompanyInput,
) {
  if (actorGlobalRole !== GlobalRole.SUPERADMIN) {
    throw new AppError(403, 'Only SUPERADMIN can update company');
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, slug: true },
  });

  if (!company) {
    throw new AppError(404, 'Company not found');
  }

  if (input.slug && input.slug !== company.slug) {
    const existing = await prisma.company.findFirst({
      where: { slug: input.slug, id: { not: companyId } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'Company slug already exists');
    }
  }

  return prisma.company.update({
    where: { id: companyId },
    data: input,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

type UpdateBranchInput = {
  name?: string;
  status?: RecordStatus;
};

export async function updateBranch(
  companyId: string,
  branchId: string,
  actorUserId: string,
  actorGlobalRole: GlobalRole,
  input: UpdateBranchInput,
) {
  await ensureCompanyAccess(companyId, actorUserId, actorGlobalRole);
  await ensureBranchInCompany(companyId, branchId);

  if (input.name) {
    const existing = await prisma.branch.findFirst({
      where: { companyId, name: input.name, id: { not: branchId } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'Branch name already exists in this company');
    }
  }

  return prisma.branch.update({
    where: { id: branchId },
    data: input,
    select: {
      id: true,
      companyId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

type UpdateCompanyMemberInput = {
  role?: MembershipRole;
  status?: RecordStatus;
};

export async function updateCompanyMember(
  companyId: string,
  membershipId: string,
  actorUserId: string,
  actorGlobalRole: GlobalRole,
  input: UpdateCompanyMemberInput,
) {
  await ensureCompanyAccess(companyId, actorUserId, actorGlobalRole);

  const membership = await prisma.companyUser.findFirst({
    where: { id: membershipId, companyId },
    select: { id: true, userId: true },
  });

  if (!membership) {
    throw new AppError(404, 'Membership not found');
  }

  return prisma.companyUser.update({
    where: { id: membershipId },
    data: input,
    select: {
      id: true,
      companyId: true,
      userId: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

type UpdateBranchMemberInput = {
  role?: MembershipRole;
  status?: RecordStatus;
  branchId?: string;
};

export async function updateBranchMember(
  companyId: string,
  branchId: string,
  membershipId: string,
  actorUserId: string,
  actorGlobalRole: GlobalRole,
  input: UpdateBranchMemberInput,
) {
  await ensureCompanyAccess(companyId, actorUserId, actorGlobalRole);
  await ensureBranchInCompany(companyId, branchId);

  const membership = await prisma.branchUser.findFirst({
    where: { id: membershipId, branchId },
    select: { id: true, userId: true },
  });

  if (!membership) {
    throw new AppError(404, 'Membership not found');
  }

  if (input.branchId && input.branchId !== branchId) {
    await ensureBranchInCompany(companyId, input.branchId);

    const existingInTarget = await prisma.branchUser.findFirst({
      where: { userId: membership.userId, branchId: input.branchId, status: RecordStatus.ACTIVE },
      select: { id: true },
    });
    if (existingInTarget) {
      throw new AppError(409, 'User already has a membership in target branch');
    }
  }

  if (input.branchId && input.branchId !== branchId) {
    return prisma.$transaction(async (tx) => {
      await tx.branchUser.update({
        where: { id: membershipId },
        data: { status: RecordStatus.INACTIVE },
      });

      return tx.branchUser.create({
        data: {
          userId: membership.userId,
          branchId: input.branchId!,
          role: input.role || MembershipRole.RECEPCION,
          status: RecordStatus.ACTIVE,
        },
        select: {
          id: true,
          branchId: true,
          userId: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  }

  return prisma.branchUser.update({
    where: { id: membershipId },
    data: {
      ...(input.role !== undefined && { role: input.role }),
      ...(input.status !== undefined && { status: input.status }),
    },
    select: {
      id: true,
      branchId: true,
      userId: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
