const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔍 Buscando usuario admin existente...');
    
    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin encontrado:', {
        id: existingAdmin.id,
        email: existingAdmin.email,
        username: existingAdmin.username,
        role: existingAdmin.role
      });
      
      // Actualizar el role a ADMIN si no lo es
      if (existingAdmin.role !== 'ADMIN') {
        const updated = await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'ADMIN' }
        });
        console.log('🔄 Role actualizado a ADMIN');
      }
      return;
    }

    console.log('📝 Creando nuevo usuario admin...');
    
    // Crear el hash del password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Crear el admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@admin.com',
        username: 'Admin',
        passwordHash: passwordHash,
        role: 'ADMIN', // Usando el enum UserRole
        xp: 0
      }
    });

    console.log('✅ Admin creado exitosamente:', {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      password: 'admin123' // Solo para referencia
    });

  } catch (error) {
    console.error('❌ Error creando admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Verificar todos los usuarios existentes
async function listUsers() {
  try {
    console.log('\n📋 Lista de todos los usuarios:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        xp: true
      }
    });

    if (users.length === 0) {
      console.log('No hay usuarios en la base de datos');
    } else {
      console.table(users);
    }
  } catch (error) {
    console.error('Error listando usuarios:', error);
  }
}

// Ejecutar
async function main() {
  await createAdmin();
  await listUsers();
  await prisma.$disconnect();
}

main().catch(console.error);