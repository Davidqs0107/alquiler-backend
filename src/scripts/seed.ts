import { GlobalRole, RecordStatus, PricingType, CatalogItemType, MembershipRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import '../config/env';

async function main() {
  console.log('Starting seed...\n');

  await prisma.paymentReversal.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.ticketItem.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.ratePlanRule.deleteMany({});
  await prisma.ratePlan.deleteMany({});
  await prisma.rentalSession.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.resourceCategory.deleteMany({});
  await prisma.branchCategoryVisibility.deleteMany({});
  await prisma.saleCatalogItem.deleteMany({});
  await prisma.branchUser.deleteMany({});
  await prisma.companyUser.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned existing data\n');

  const passwordHash = await hashPassword('admin123');

  const superadmin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      globalRole: GlobalRole.SUPERADMIN,
      status: RecordStatus.ACTIVE,
    },
  });
  console.log('SUPERADMIN: admin@example.com');

  const company = await prisma.company.create({
    data: {
      name: 'Deportes Plus',
      slug: 'deportes-plus',
      status: RecordStatus.ACTIVE,
    },
  });
  console.log('Company: Deportes Plus');

  const centralBranch = await prisma.branch.create({
    data: { companyId: company.id, name: 'Central', status: RecordStatus.ACTIVE },
  });

  const norteBranch = await prisma.branch.create({
    data: { companyId: company.id, name: 'Norte', status: RecordStatus.ACTIVE },
  });
  console.log('Branches: Central, Norte');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@deportesplus.com',
      passwordHash,
      globalRole: GlobalRole.USER,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.companyUser.create({
    data: {
      companyId: company.id,
      userId: adminUser.id,
      role: MembershipRole.ADMIN_EMPRESA,
      status: RecordStatus.ACTIVE,
    },
  });
  console.log('ADMIN_EMPRESA: admin@deportesplus.com');

  const adminSedeUser = await prisma.user.create({
    data: {
      email: 'adminsede@deportesplus.com',
      passwordHash,
      globalRole: GlobalRole.USER,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.companyUser.create({
    data: {
      companyId: company.id,
      userId: adminSedeUser.id,
      role: MembershipRole.ADMIN_SEDE,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.branchUser.create({
    data: {
      branchId: centralBranch.id,
      userId: adminSedeUser.id,
      role: MembershipRole.ADMIN_SEDE,
      status: RecordStatus.ACTIVE,
    },
  });
  console.log('ADMIN_SEDE: adminsede@deportesplus.com (Central)');

  const cajeroUser = await prisma.user.create({
    data: {
      email: 'cajero@deportesplus.com',
      passwordHash,
      globalRole: GlobalRole.USER,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.companyUser.create({
    data: {
      companyId: company.id,
      userId: cajeroUser.id,
      role: MembershipRole.CAJERO,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.branchUser.create({
    data: {
      branchId: centralBranch.id,
      userId: cajeroUser.id,
      role: MembershipRole.CAJERO,
      status: RecordStatus.ACTIVE,
    },
  });
  console.log('CAJERO: cajero@deportesplus.com (Central)');

  const recepcionUser = await prisma.user.create({
    data: {
      email: 'recepcion@deportesplus.com',
      passwordHash,
      globalRole: GlobalRole.USER,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.companyUser.create({
    data: {
      companyId: company.id,
      userId: recepcionUser.id,
      role: MembershipRole.RECEPCION,
      status: RecordStatus.ACTIVE,
    },
  });
  await prisma.branchUser.create({
    data: {
      branchId: norteBranch.id,
      userId: recepcionUser.id,
      role: MembershipRole.RECEPCION,
      status: RecordStatus.ACTIVE,
    },
  });
  console.log('RECEPCION: recepcion@deportesplus.com (Norte)');

  const categories = ['Canchas de fútbol', 'Canchas de tennis', 'Gimnasio', 'Salones'];
  for (const name of categories) {
    const cat = await prisma.resourceCategory.create({
      data: { companyId: company.id, name, status: RecordStatus.ACTIVE },
    });
    await prisma.branchCategoryVisibility.createMany({
      data: [
        { companyId: company.id, branchId: centralBranch.id, resourceCategoryId: cat.id, isVisible: true },
        { companyId: company.id, branchId: norteBranch.id, resourceCategoryId: cat.id, isVisible: true },
      ],
    });
  }
  console.log('Categories:', categories.length);

  const resources = [
    { name: 'Cancha 1 - Fútbol 5', categoryName: 'Canchas de fútbol' },
    { name: 'Cancha 2 - Fútbol 5', categoryName: 'Canchas de fútbol' },
    { name: 'Cancha A - Tennis', categoryName: 'Canchas de tennis' },
    { name: 'Sector cardio', categoryName: 'Gimnasio' },
    { name: 'Salón events', categoryName: 'Salones' },
  ];

  for (const res of resources) {
    const cat = await prisma.resourceCategory.findUnique({
      where: { companyId_name: { companyId: company.id, name: res.categoryName } },
    });
    await prisma.resource.create({
      data: {
        companyId: company.id,
        branchId: centralBranch.id,
        resourceCategoryId: cat!.id,
        name: res.name,
        status: RecordStatus.ACTIVE,
      },
    });
  }
  console.log('Resources:', resources.length);

  const ratePlans = [
    { name: 'Fútbol 5 - 1 hora', basePrice: '1500', timeUnit: 60, categoryName: 'Canchas de fútbol' },
    { name: 'Tennis - 1 hora', basePrice: '2000', timeUnit: 60, categoryName: 'Canchas de tennis' },
    { name: 'Gimnasio - día', basePrice: '500', timeUnit: 60, categoryName: 'Gimnasio' },
  ];

  for (const rate of ratePlans) {
    const cat = await prisma.resourceCategory.findUnique({
      where: { companyId_name: { companyId: company.id, name: rate.categoryName } },
    });
    await prisma.ratePlan.create({
      data: {
        companyId: company.id,
        branchId: centralBranch.id,
        resourceCategoryId: cat!.id,
        name: rate.name,
        pricingType: PricingType.TIME_UNIT,
        basePrice: rate.basePrice,
        timeUnitMinutes: rate.timeUnit,
        status: RecordStatus.ACTIVE,
      },
    });
  }
  console.log('Rate plans:', ratePlans.length);

  const catalogItems = [
    { name: 'Bebida isotónica', price: '500', type: CatalogItemType.PRODUCT },
    { name: 'Entrenamiento 1hr', price: '3000', type: CatalogItemType.SERVICE },
  ];

  for (const item of catalogItems) {
    await prisma.saleCatalogItem.create({
      data: {
        companyId: company.id,
        branchId: centralBranch.id,
        name: item.name,
        price: item.price,
        type: item.type,
        status: RecordStatus.ACTIVE,
      },
    });
  }
  console.log('Catalog items:', catalogItems.length);

  console.log('\n=== Test Credentials ===');
  console.log('SUPERADMIN: admin@example.com / admin123');
  console.log('ADMIN_EMPRESA: admin@deportesplus.com / admin123');
  console.log('ADMIN_SEDE: adminsede@deportesplus.com / admin123 (Central)');
  console.log('CAJERO: cajero@deportesplus.com / admin123 (Central)');
  console.log('RECEPCION: recepcion@deportesplus.com / admin123 (Norte)');
  console.log('\nSeed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });