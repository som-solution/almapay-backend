import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const result: any[] = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables found in database:');
    result.forEach(r => console.log(`- ${r.table_name}`));
    console.log(`Total: ${result.length}`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => prisma.$disconnect());
