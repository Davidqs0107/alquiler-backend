import { prisma } from '../../src/lib/prisma';

export async function cleanupDatabase() {
  await prisma.$transaction([
    prisma.paymentReversal.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.rentalSession.deleteMany(),
    prisma.ticketItem.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.ratePlanRule.deleteMany(),
    prisma.ratePlan.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.branchCategoryVisibility.deleteMany(),
    prisma.resourceCategory.deleteMany(),
    prisma.saleCatalogItem.deleteMany(),
    prisma.branchUser.deleteMany(),
    prisma.companyUser.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.company.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
