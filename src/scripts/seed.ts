import { GlobalRole, RecordStatus, PricingType, CatalogItemType, MembershipRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import '../config/env';

async function main() {
  console.log('🌱 Starting seed...\n');

  const superadminEmail = 'admin@example.com';
  const superadminPassword = 'admin123';

  let superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });

  if (!superadmin) {
    const passwordHash = await hashPassword(superadminPassword);
    superadmin = await prisma.user.create({
      data: {
        email: superadminEmail,
        passwordHash,
        globalRole: GlobalRole.SUPERADMIN,
        status: RecordStatus.ACTIVE,
      },
    });
    console.log('✅ Superadmin created:', superadminEmail);
  } else {
    console.log('ℹ️  Superadmin already exists:', superadminEmail);
  }

  const companyName = 'Deportes Plus';
  let company = await prisma.company.findUnique({ where: { slug: 'deportes-plus' } });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        slug: 'deportes-plus',
        status: RecordStatus.ACTIVE,
      },
    });
    console.log('✅ Company created:', companyName);
  } else {
    console.log('ℹ️  Company already exists:', companyName);
  }

  let mainBranch = await prisma.branch.findFirst({
    where: { companyId: company.id, name: 'Sede Central' },
  });

  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: 'Sede Central',
        status: RecordStatus.ACTIVE,
      },
    });
    console.log('✅ Branch created: Sede Central');
  } else {
    console.log('ℹ️  Branch already exists: Sede Central');
  }

  const adminEmail = 'admin@deportesplus.com';
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    const passwordHash = await hashPassword('admin123');
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        globalRole: GlobalRole.USER,
        status: RecordStatus.ACTIVE,
      },
    });
    console.log('✅ Admin user created:', adminEmail);
  }

  const companyUser = await prisma.companyUser.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: adminUser.id } },
  });

  if (!companyUser) {
    await prisma.companyUser.create({
      data: {
        companyId: company.id,
        userId: adminUser.id,
        role: MembershipRole.ADMIN_EMPRESA,
        status: RecordStatus.ACTIVE,
      },
    });
    console.log('✅ Company membership created');
  }

  const branchUser = await prisma.branchUser.findUnique({
    where: { branchId_userId: { branchId: mainBranch.id, userId: adminUser.id } },
  });

  if (!branchUser) {
    await prisma.branchUser.create({
      data: {
        branchId: mainBranch.id,
        userId: adminUser.id,
        role: MembershipRole.ADMIN_SEDE,
        status: RecordStatus.ACTIVE,
      },
    });
    console.log('✅ Branch membership created');
  }

  const categoriesData = [
    { name: 'Canchas de fútbol', description: 'Canchas de fútbol 5 y 7' },
    { name: 'Canchas de tennis', description: 'Canchas de tennis de arcilla' },
    { name: 'Gimnasio', description: 'Equipamiento de gym' },
    { name: 'Salones', description: 'Salones para eventos' },
  ];

  const categories: { id: string; name: string }[] = [];

  for (const cat of categoriesData) {
    let category = await prisma.resourceCategory.findUnique({
      where: { companyId_name: { companyId: company.id, name: cat.name } },
    });

    if (!category) {
      category = await prisma.resourceCategory.create({
        data: {
          companyId: company.id,
          name: cat.name,
          status: RecordStatus.ACTIVE,
        },
      });
      console.log(`✅ Category created: ${cat.name}`);
    } else {
      console.log(`ℹ️  Category already exists: ${cat.name}`);
    }
    categories.push(category);

    await prisma.branchCategoryVisibility.upsert({
      where: {
        branchId_resourceCategoryId: {
          branchId: mainBranch.id,
          resourceCategoryId: category.id,
        },
      },
      update: { isVisible: true },
      create: {
        companyId: company.id,
        branchId: mainBranch.id,
        resourceCategoryId: category.id,
        isVisible: true,
      },
    });
  }

  const resourcesData = [
    { name: 'Cancha 1 - Fútbol 5', categoryIdx: 0 },
    { name: 'Cancha 2 - Fútbol 5', categoryIdx: 0 },
    { name: 'Cancha 3 - Fútbol 7', categoryIdx: 0 },
    { name: 'Cancha A - Tennis', categoryIdx: 1 },
    { name: 'Cancha B - Tennis', categoryIdx: 1 },
    { name: 'Sector cardio', categoryIdx: 2 },
    { name: 'Sector pesas', categoryIdx: 2 },
    { name: 'Salón events grandes', categoryIdx: 3 },
  ];

  for (const res of resourcesData) {
    const resource = await prisma.resource.findUnique({
      where: { branchId_name: { branchId: mainBranch.id, name: res.name } },
    });

    if (!resource) {
      await prisma.resource.create({
        data: {
          companyId: company.id,
          branchId: mainBranch.id,
          resourceCategoryId: categories[res.categoryIdx].id,
          name: res.name,
          status: RecordStatus.ACTIVE,
        },
      });
      console.log(`✅ Resource created: ${res.name}`);
    } else {
      console.log(`ℹ️  Resource already exists: ${res.name}`);
    }
  }

  const ratePlansData = [
    { name: 'Fútbol 5 - 1 hora', categoryIdx: 0, basePrice: '1500', timeUnit: 60 },
    { name: 'Fútbol 5 - 2 horas', categoryIdx: 0, basePrice: '2800', timeUnit: 120 },
    { name: 'Tennis - 1 hora', categoryIdx: 1, basePrice: '2000', timeUnit: 60 },
    { name: 'Tennis - 2 horas', categoryIdx: 1, basePrice: '3800', timeUnit: 120 },
    { name: 'Gimnasio - día', categoryIdx: 2, basePrice: '500', timeUnit: 60 },
    { name: 'Salón - hora', categoryIdx: 3, basePrice: '3000', timeUnit: 60 },
  ];

  for (const rate of ratePlansData) {
    const existingRate = await prisma.ratePlan.findFirst({
      where: {
        branchId: mainBranch.id,
        name: rate.name,
      },
    });

    if (!existingRate) {
      await prisma.ratePlan.create({
        data: {
          companyId: company.id,
          branchId: mainBranch.id,
          resourceCategoryId: categories[rate.categoryIdx].id,
          name: rate.name,
          pricingType: PricingType.TIME_UNIT,
          basePrice: rate.basePrice,
          timeUnitMinutes: rate.timeUnit,
          status: RecordStatus.ACTIVE,
        },
      });
      console.log(`✅ Rate plan created: ${rate.name}`);
    } else {
      console.log(`ℹ️  Rate plan already exists: ${rate.name}`);
    }
  }

  const catalogItemsData = [
    { name: 'Bebida isotónica', price: '500', type: CatalogItemType.PRODUCT },
    { name: 'Bebida energética', price: '700', type: CatalogItemType.PRODUCT },
    { name: 'Snack deportivo', price: '800', type: CatalogItemType.PRODUCT },
    { name: 'Alquiler de pelotas tennis', price: '300', type: CatalogItemType.PRODUCT },
    { name: 'Entrenamiento personal 1hr', price: '3000', type: CatalogItemType.SERVICE },
    { name: 'Alquiler de equipo fútbol', price: '1000', type: CatalogItemType.PRODUCT },
  ];

  for (const item of catalogItemsData) {
    const existingItem = await prisma.saleCatalogItem.findFirst({
      where: { companyId: company.id, name: item.name },
    });

    if (!existingItem) {
      await prisma.saleCatalogItem.create({
        data: {
          companyId: company.id,
          branchId: mainBranch.id,
          name: item.name,
          price: item.price,
          type: item.type,
          status: RecordStatus.ACTIVE,
        },
      });
      console.log(`✅ Catalog item created: ${item.name}`);
    } else {
      console.log(`ℹ️  Catalog item already exists: ${item.name}`);
    }
  }

  console.log('\n🎉 Seed completed!\n');
  console.log('Test credentials:');
  console.log('  Superadmin: admin@example.com / admin123');
  console.log('  Admin empresa: admin@deportesplus.com / admin123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });