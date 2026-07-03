import { registerEnumType } from '@nestjs/graphql';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

registerEnumType(AuditAction, {
  name: 'AuditAction',
  description: 'Acciones registradas en la auditoria del sistema',
});
