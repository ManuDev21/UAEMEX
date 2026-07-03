import { registerEnumType } from '@nestjs/graphql';

export enum AssetStatus {
  ACTIVO = 'ACTIVO',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
  EN_REPARACION = 'EN_REPARACION',
  DADO_DE_BAJA = 'DADO_DE_BAJA',
  EXTRAVIADO = 'EXTRAVIADO',
}

registerEnumType(AssetStatus, {
  name: 'AssetStatus',
  description: 'Estado actual del bien institucional',
});
