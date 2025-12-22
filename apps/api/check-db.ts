import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const adminUserId = '00000000-0000-0000-0000-000000000001';
  
  console.log('=== UserSiteOwnerAccess for Admin ===');
  const ownerAccess = await prisma.userSiteOwnerAccess.findMany({
    where: { userId: adminUserId },
    include: { siteOwner: true }
  });
  console.log(JSON.stringify(ownerAccess, null, 2));
  
  console.log('\n=== Sites ===');
  const sites = await prisma.site.findMany({
    where: { companyId: '11111111-1111-1111-1111-111111111111' },
    select: { id: true, name: true, code: true, siteOwnerId: true },
    take: 10
  });
  console.log(JSON.stringify(sites, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
