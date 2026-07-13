import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import configuration from '../config/configuration';
import { Role } from '../modules/roles/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { Responsable } from '../modules/responsables/entities/responsable.entity';
import { Category } from '../modules/categories/entities/category.entity';
import { Asset } from '../modules/assets/entities/asset.entity';
import { AssetMovement } from '../modules/movements/entities/asset-movement.entity';
import { ExcelImport } from '../modules/excel/entities/excel-import.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';

dotenv.config();

const config = configuration();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: true,
  logging: false,
  entities: [
    Role,
    User,
    Department,
    Responsable,
    Category,
    Asset,
    AssetMovement,
    ExcelImport,
    AuditLog,
  ],
});
