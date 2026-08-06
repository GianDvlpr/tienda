const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.admin_user.findMany({ take: 3 });
    console.log(JSON.stringify(users.map(u => ({ user_id: u.user_id, username: u.username, role: u.role })), null, 2));
}

main().finally(() => prisma.$disconnect());