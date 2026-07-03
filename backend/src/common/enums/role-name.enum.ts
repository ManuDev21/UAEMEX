import { registerEnumType } from '@nestjs/graphql';

export enum RoleName {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  CONSULTA = 'CONSULTA',
}

registerEnumType(RoleName, {
  name: 'RoleName',
  description: 'Roles del sistema: ADMIN, SUPERVISOR, CONSULTA',
});
