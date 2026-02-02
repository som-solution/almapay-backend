import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Admin
    const adminEmail = 'nurkasim442@gmail.com';
    const admin = await prisma.adminUser.upsert({
        where: { email: adminEmail },
        update: {
            passwordHash: await bcrypt.hash('Nur@1234@ak', 10)
        },
        create: {
            email: adminEmail,
            name: 'Nur Kasim',
            passwordHash: await bcrypt.hash('Nur@1234@ak', 10),
            role: 'ADMIN',
        },
    });
    console.log({ admin });

    // 2. Create Sandbox Wallets (Recipients)
    const phones = [
        '+254700000000', // Default fallback number
        '+254700000001',
        '+254700000002',
        '+254722000000', // Additional test number
        '+252615000000'
    ];
    for (const phone of phones) {
        await prisma.sandboxWallet.upsert({
            where: { phoneNumber: phone },
            update: {},
            create: {
                phoneNumber: phone,
                currency: 'KES',
                balance: 5000.00,
            },
        });
    }
    console.log('Sandbox wallets seeded.');

    // 3. Create Test User
    const userEmail = 'user@test.com';
    const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {
            passwordHash: await bcrypt.hash('password', 10)
        },
        create: {
            email: userEmail,
            name: 'Test Sender',
            phoneNumber: '+44700000000',
            passwordHash: await bcrypt.hash('password', 10),
        },
    });
    console.log({ user });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
