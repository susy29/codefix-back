const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateToAdmin(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`❌ Usuario con email ${email} no encontrado`);
      return;
    }

    console.log('Usuario actual:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });

    if (user.role === 'ADMIN') {
      console.log('✅ El usuario ya es ADMIN');
      return;
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });

    console.log('✅ Usuario actualizado a ADMIN:', {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      role: updated.role
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Cambiar este email por el que quieras convertir en admin
const emailToUpdate = 'tu-email@ejemplo.com'; // <-- CAMBIA ESTO
updateToAdmin(emailToUpdate);