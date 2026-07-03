import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';

@Resolver(() => AuditLog)
@UseGuards(GqlJwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => [AuditLog], { name: 'auditLogs' })
  findAll(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 200 })
    limit: number,
  ): Promise<AuditLog[]> {
    return this.auditService.findAll(limit);
  }
}
