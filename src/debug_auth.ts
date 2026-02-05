
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'nurkasim442@gmail.com';
    const newPassword = 'Nur@1234@ak';

    console.log(`🔍 Checking for AdminUser: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            console.log(`✅ User found: ${user.id}`);
            console.log(`   Name: ${user.firstName}`);

            // Reset Password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword, role: 'SUPER_ADMIN' }
            });
            console.log(`✅ Password reset and promoted to SUPER_ADMIN: ${newPassword}`);
        } else {
            console.log(`❌ User NOT found.`);
            console.log(`✨ Creating Admin User now...`);

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.create({
                data: {
                    email,
                    firstName: 'Nur',
                    lastName: 'Kasim',
                    password: hashedPassword,
                    role: 'SUPER_ADMIN'
                }
            });
            console.log(`✅ User created with password: ${newPassword}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
