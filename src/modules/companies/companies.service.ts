import { GlobalRole, MembershipRole, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { hashPassword } from '../../utils/password';

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

  const result = await prisma.$transaction(async (tx) => {
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

  return result;
}

export async function createBranch(companyId: string, userId: string, globalRole: GlobalRole, input: { name: string }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, status: true },
  });

  if (!company || company.status !== RecordStatus.ACTIVE) {
    throw new AppError(404, 'Company not found');
  }

  if (globalRole !== GlobalRole.SUPERADMIN) {
    const membership = await prisma.companyUser.findFirst({
      where: {
        companyId,
        userId,
        role: MembershipRole.ADMIN_EMPRESA,
        status: RecordStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new AppError(403, 'Insufficient permissions');
    }
  }

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
        role: MembershipRole.ADMIN_EMPRESA,
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
        where: { status: RecordStatus.ACTIVE },
        select: {
          role: true,
          status: true,
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
