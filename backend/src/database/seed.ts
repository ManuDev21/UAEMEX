import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { Role } from '../modules/roles/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { Responsable } from '../modules/responsables/entities/responsable.entity';
import { Category } from '../modules/categories/entities/category.entity';
import { Asset } from '../modules/assets/entities/asset.entity';
import { RoleName } from '../common/enums/role-name.enum';
import { AssetStatus } from '../common/enums/asset-status.enum';

async function seed() {
  await AppDataSource.initialize();
  console.log('Conectado a la base de datos. Sembrando datos...');

  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);
  const depRepo = AppDataSource.getRepository(Department);
  const catRepo = AppDataSource.getRepository(Category);
  const respRepo = AppDataSource.getRepository(Responsable);
  const assetRepo = AppDataSource.getRepository(Asset);

  // Roles
  const rolesData = [
    { name: RoleName.ADMIN, description: 'Acceso total al sistema' },
    { name: RoleName.SUPERVISOR, description: 'Consulta y edicion de activos' },
    { name: RoleName.CONSULTA, description: 'Solo lectura' },
  ];
  for (const r of rolesData) {
    const exists = await roleRepo.findOne({ where: { name: r.name } });
    if (!exists) await roleRepo.save(roleRepo.create(r));
  }
  const adminRole = await roleRepo.findOne({ where: { name: RoleName.ADMIN } });
  const supRole = await roleRepo.findOne({
    where: { name: RoleName.SUPERVISOR },
  });
  const consultaRole = await roleRepo.findOne({
    where: { name: RoleName.CONSULTA },
  });

  // Users
  const usersData = [
    {
      fullName: 'Administrador General',
      email: 'admin@universidad.edu',
      password: 'Admin123',
      role: adminRole!,
    },
    {
      fullName: 'Supervisor de Inventario',
      email: 'supervisor@universidad.edu',
      password: 'Super123',
      role: supRole!,
    },
    {
      fullName: 'Usuario Consulta',
      email: 'consulta@universidad.edu',
      password: 'Consulta123',
      role: consultaRole!,
    },
  ];
  for (const u of usersData) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (!exists) {
      await userRepo.save(
        userRepo.create({
          fullName: u.fullName,
          email: u.email,
          password: await bcrypt.hash(u.password, 10),
          roleId: u.role.id,
        }),
      );
    }
  }

  // Departments
  const depData = [
    { name: 'Direccion de TI', code: 'TI', location: 'Edificio A - Piso 3' },
    { name: 'Biblioteca Central', code: 'BIB', location: 'Edificio Central' },
    { name: 'Laboratorio de Fisica', code: 'LAB-FIS', location: 'Edificio C' },
    { name: 'Rectoria', code: 'RECT', location: 'Edificio Administrativo' },
  ];
  const departments: Department[] = [];
  for (const d of depData) {
    let dep = await depRepo.findOne({ where: { code: d.code } });
    if (!dep) dep = await depRepo.save(depRepo.create(d));
    departments.push(dep);
  }

  // Categories
  const catData = [
    { name: 'Equipos de Computo', depreciationRate: 20 },
    { name: 'Mobiliario', depreciationRate: 10 },
    { name: 'Equipo de Laboratorio', depreciationRate: 15 },
    { name: 'Audiovisuales', depreciationRate: 25 },
  ];
  const categories: Category[] = [];
  for (const c of catData) {
    let cat = await catRepo.findOne({ where: { name: c.name } });
    if (!cat) cat = await catRepo.save(catRepo.create(c));
    categories.push(cat);
  }

  // Responsables
  const respData = [
    { fullName: 'Juan Perez', position: 'Jefe de TI' },
    { fullName: 'Maria Lopez', position: 'Bibliotecaria' },
    { fullName: 'Carlos Ramirez', position: 'Tecnico de Laboratorio' },
  ];
  const responsables: Responsable[] = [];
  for (const r of respData) {
    let resp = await respRepo.findOne({ where: { fullName: r.fullName } });
    if (!resp) resp = await respRepo.save(respRepo.create(r));
    responsables.push(resp);
  }

  // Assets
  const assetData = [
    {
      code: '750123456789',
      description: 'Laptop Dell Latitude 5420',
      brand: 'Dell',
      model: 'Latitude 5420',
      value: 18500,
      status: AssetStatus.ACTIVO,
      categoryId: categories[0].id,
      departmentId: departments[0].id,
      responsableId: responsables[0].id,
    },
    {
      code: '750987654321',
      description: 'Proyector Epson PowerLite',
      brand: 'Epson',
      model: 'PowerLite X49',
      value: 9200,
      status: AssetStatus.ACTIVO,
      categoryId: categories[3].id,
      departmentId: departments[1].id,
      responsableId: responsables[1].id,
    },
    {
      code: '750555555555',
      description: 'Microscopio Optico Binocular',
      brand: 'Olympus',
      model: 'CX23',
      value: 24000,
      status: AssetStatus.EN_MANTENIMIENTO,
      categoryId: categories[2].id,
      departmentId: departments[2].id,
      responsableId: responsables[2].id,
    },
    {
      code: '750111222333',
      description: 'Escritorio Ejecutivo de Madera',
      brand: 'OfficeMax',
      value: 4500,
      status: AssetStatus.ACTIVO,
      categoryId: categories[1].id,
      departmentId: departments[3].id,
    },
    {
      code: '750444333222',
      description: 'PC de Escritorio HP ProDesk',
      brand: 'HP',
      model: 'ProDesk 400',
      value: 12000,
      status: AssetStatus.DADO_DE_BAJA,
      categoryId: categories[0].id,
      departmentId: departments[0].id,
    },
  ];
  for (const a of assetData) {
    const exists = await assetRepo.findOne({ where: { code: a.code } });
    if (!exists) await assetRepo.save(assetRepo.create(a));
  }

  console.log('Seed completado.');
  console.log('Usuarios de prueba:');
  console.log('  admin@universidad.edu / Admin123 (ADMIN)');
  console.log('  supervisor@universidad.edu / Super123 (SUPERVISOR)');
  console.log('  consulta@universidad.edu / Consulta123 (CONSULTA)');

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
