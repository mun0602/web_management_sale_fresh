import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        phone: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log('--- DANH SÁCH USER TRONG DATABASE ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('------------------------------------');
  } catch (error) {
    console.error('Lỗi khi truy vấn database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
