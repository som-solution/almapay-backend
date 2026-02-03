
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'nurkasim442@gmail.com';
    const newPassword = 'Nur@1234@ak';

    console.log(`🔍 Checking for AdminUser: ${email}`);

    try {
        const admin = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (admin) {
            console.log(`✅ AdminUser found: ${admin.id}`);
            console.log(`   Name: ${admin.name}`);

            // Reset Password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.adminUser.update({
                where: { email },
                data: { passwordHash: hashedPassword }
            });
            console.log(`✅ Password has been reset to: ${newPassword}`);
        } else {
            console.log(`❌ AdminUser NOT found.`);
            console.log(`✨ Creating AdminUser now...`);

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.adminUser.create({
                data: {
                    email,
                    name: 'Nur Kasim',
                    passwordHash: hashedPassword,
                    role: 'ADMIN'
                }
            });
            console.log(`✅ AdminUser created with password: ${newPassword}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
