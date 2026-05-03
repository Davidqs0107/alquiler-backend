import { GlobalRole, PricingType, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { ensureBranchInCompany, ensureCompanyAccess, ensureCompanyMemberAccess } from '../companies/companies.access';

type CreateCategoryInput = {
  name: string;
};

type CreateResourceInput = {
  name: string;
  resourceCategoryId: string;
};

type CreateRatePlanInput = {
  name: string;
  pricingType: PricingType;
  basePrice: number;
  timeUnitMinutes?: number;
  resourceCategoryId?: string;
  resourceId?: string;
};

async function ensureCategoryInCompany(companyId: string, categoryId: string) {
  const category = await prisma.resourceCategory.findFirst({
    where: {
      id: categoryId,
      companyId,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      status: true,
    },
  });

  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  return category;
}

async function ensureResourceInBranch(companyId: string, branchId: string, resourceId: string) {
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      companyId,
      branchId,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      name: true,
    },
  });

  if (!resource) {
    throw new AppError(404, 'Resource not found');
  }

  return resource;
}

async function ensureCategoryVisibleInBranch(companyId: string, branchId: string, categoryId: string) {
  const hiddenOverride = await prisma.branchCategoryVisibility.findFirst({
    where: {
      companyId,
      branchId,
      resourceCategoryId: categoryId,
      isVisible: false,
    },
    select: { id: true },
  });

  if (hiddenOverride) {
    throw new AppError(409, 'Category is hidden in this branch');
  }
}

export async function createCategory(companyId: string, userId: string, globalRole: GlobalRole, input: CreateCategoryInput) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  const existingCategory = await prisma.resourceCategory.findFirst({
    where: {
      companyId,
      name: input.name,
    },
    select: { id: true },
  });

  if (existingCategory) {
    throw new AppError(409, 'Category name already exists in this company');
  }

  return prisma.resourceCategory.create({
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
      updatedAt: true,
    },
  });
}

type ListQueryOptions = {
  limit?: number;
  offset?: number;
};

export async function listCategories(
  companyId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListQueryOptions = {},
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);

  const [categories, total] = await Promise.all([
    prisma.resourceCategory.findMany({
      where: {
        companyId,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        companyId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        visibilityOverrides: {
          select: {
            branchId: true,
            isVisible: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.resourceCategory.count({
      where: {
        companyId,
      },
    }),
  ]);

  return {
    data: categories,
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

export async function updateCategoryVisibility(
  companyId: string,
  categoryId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  isVisible: boolean,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);
  await ensureCategoryInCompany(companyId, categoryId);

  return prisma.branchCategoryVisibility.upsert({
    where: {
      branchId_resourceCategoryId: {
        branchId,
        resourceCategoryId: categoryId,
      },
    },
    update: {
      isVisible,
    },
    create: {
      companyId,
      branchId,
      resourceCategoryId: categoryId,
      isVisible,
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      isVisible: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

type UpdateCategoryInput = {
  name?: string;
  description?: string | null;
};

export async function updateCategory(
  companyId: string,
  categoryId: string,
  userId: string,
  globalRole: GlobalRole,
  input: UpdateCategoryInput,
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);
  const category = await ensureCategoryInCompany(companyId, categoryId);

  if (input.name && input.name !== category.name) {
    const existing = await prisma.resourceCategory.findFirst({
      where: { companyId, name: input.name, id: { not: categoryId } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'Category name already exists in this company');
    }
  }

  return prisma.resourceCategory.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createResource(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreateResourceInput,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);
  await ensureCategoryInCompany(companyId, input.resourceCategoryId);
  await ensureCategoryVisibleInBranch(companyId, branchId, input.resourceCategoryId);

  const existingResource = await prisma.resource.findFirst({
    where: {
      branchId,
      name: input.name,
    },
    select: { id: true },
  });

  if (existingResource) {
    throw new AppError(409, 'Resource name already exists in this branch');
  }

  return prisma.resource.create({
    data: {
      companyId,
      branchId,
      resourceCategoryId: input.resourceCategoryId,
      name: input.name,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listResources(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListQueryOptions = {},
) {
  await ensureCompanyMemberAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  const where = {
    companyId,
    branchId,
    category: {
      status: RecordStatus.ACTIVE,
      visibilityOverrides: {
        none: {
          branchId,
          isVisible: false,
        },
      },
    },
  };

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        resourceCategoryId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.resource.count({ where }),
  ]);

  return {
    data: resources,
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

export async function createRatePlan(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  input: CreateRatePlanInput,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  if (input.pricingType === PricingType.TIME_UNIT && !input.timeUnitMinutes) {
    throw new AppError(409, 'timeUnitMinutes is required for TIME_UNIT pricing');
  }

  if (input.pricingType === PricingType.BLOCK && input.timeUnitMinutes) {
    throw new AppError(409, 'timeUnitMinutes is not allowed for BLOCK pricing');
  }

  if (input.resourceCategoryId) {
    await ensureCategoryInCompany(companyId, input.resourceCategoryId);
    await ensureCategoryVisibleInBranch(companyId, branchId, input.resourceCategoryId);
  }

  if (input.resourceId) {
    const resource = await ensureResourceInBranch(companyId, branchId, input.resourceId);
    await ensureCategoryVisibleInBranch(companyId, branchId, resource.resourceCategoryId);
  }

  return prisma.ratePlan.create({
    data: {
      companyId,
      branchId,
      resourceCategoryId: input.resourceCategoryId,
      resourceId: input.resourceId,
      name: input.name,
      pricingType: input.pricingType,
      basePrice: input.basePrice,
      timeUnitMinutes: input.timeUnitMinutes,
      status: RecordStatus.ACTIVE,
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      resourceId: true,
      name: true,
      pricingType: true,
      basePrice: true,
      timeUnitMinutes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listRatePlans(
  companyId: string,
  branchId: string,
  userId: string,
  globalRole: GlobalRole,
  query: ListQueryOptions = {},
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  const where = {
    companyId,
    branchId,
  };

  const [ratePlans, total] = await Promise.all([
    prisma.ratePlan.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        resourceCategoryId: true,
        resourceId: true,
        name: true,
        pricingType: true,
        basePrice: true,
        timeUnitMinutes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        resourceCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.ratePlan.count({ where }),
  ]);

  return {
    data: ratePlans,
    total,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
}

type UpdateResourceInput = {
  name?: string;
  description?: string | null;
  resourceCategoryId?: string;
};

export async function updateResource(
  companyId: string,
  branchId: string,
  resourceId: string,
  userId: string,
  globalRole: GlobalRole,
  input: UpdateResourceInput,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);
  const resource = await ensureResourceInBranch(companyId, branchId, resourceId);

  if (input.resourceCategoryId && input.resourceCategoryId !== resource.resourceCategoryId) {
    await ensureCategoryInCompany(companyId, input.resourceCategoryId);
  }

  if (input.name && input.name !== resource.name) {
    const existing = await prisma.resource.findFirst({
      where: { branchId, name: input.name, id: { not: resourceId } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(409, 'Resource name already exists in this branch');
    }
  }

  return prisma.resource.update({
    where: { id: resourceId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.resourceCategoryId !== undefined && { resourceCategoryId: input.resourceCategoryId }),
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateResourceStatus(
  companyId: string,
  branchId: string,
  resourceId: string,
  userId: string,
  globalRole: GlobalRole,
  status: RecordStatus,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      companyId,
      branchId,
    },
    select: { id: true },
  });

  if (!resource) {
    throw new AppError(404, 'Resource not found');
  }

  return prisma.resource.update({
    where: { id: resourceId },
    data: { status },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateRatePlanStatus(
  companyId: string,
  branchId: string,
  ratePlanId: string,
  userId: string,
  globalRole: GlobalRole,
  status: RecordStatus,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  const ratePlan = await prisma.ratePlan.findFirst({
    where: {
      id: ratePlanId,
      companyId,
      branchId,
    },
    select: { id: true },
  });

  if (!ratePlan) {
    throw new AppError(404, 'Rate plan not found');
  }

  return prisma.ratePlan.update({
    where: { id: ratePlanId },
    data: { status },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      resourceCategoryId: true,
      resourceId: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

type UpdateRatePlanInput = {
  name?: string;
  pricingType?: PricingType;
  basePrice?: number;
  timeUnitMinutes?: number;
  resourceId?: string | null;
  categoryId?: string | null;
};

export async function updateRatePlan(
  companyId: string,
  branchId: string,
  ratePlanId: string,
  userId: string,
  globalRole: GlobalRole,
  input: UpdateRatePlanInput,
) {
  await ensureCompanyAccess(companyId, userId, globalRole);
  await ensureBranchInCompany(companyId, branchId);

  const ratePlan = await prisma.ratePlan.findFirst({
    where: { id: ratePlanId, companyId, branchId },
    select: { id: true, resourceId: true, resourceCategoryId: true },
  });

  if (!ratePlan) {
    throw new AppError(404, 'Rate plan not found');
  }

  if (input.resourceId) {
    const resource = await prisma.resource.findFirst({
      where: { id: input.resourceId, branchId, status: RecordStatus.ACTIVE },
      select: { id: true },
    });
    if (!resource) {
      throw new AppError(400, 'Resource not found or inactive');
    }
  }

  if (input.categoryId) {
    const category = await prisma.resourceCategory.findFirst({
      where: { id: input.categoryId, companyId, status: RecordStatus.ACTIVE },
      select: { id: true },
    });
    if (!category) {
      throw new AppError(400, 'Category not found or inactive');
    }
  }

  return prisma.ratePlan.update({
    where: { id: ratePlanId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.pricingType !== undefined && { pricingType: input.pricingType }),
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.timeUnitMinutes !== undefined && { timeUnitMinutes: input.timeUnitMinutes }),
      ...(input.resourceId !== undefined && { resourceId: input.resourceId }),
      ...(input.categoryId !== undefined && { resourceCategoryId: input.categoryId }),
    },
    select: {
      id: true,
      branchId: true,
      resourceId: true,
      resourceCategoryId: true,
      name: true,
      pricingType: true,
      basePrice: true,
      timeUnitMinutes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      resource: { select: { id: true, name: true } },
      resourceCategory: { select: { id: true, name: true } },
    },
  });
}
