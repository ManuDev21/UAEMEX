import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

@Resolver(() => Role)
@UseGuards(GqlJwtAuthGuard)
export class RolesResolver {
  constructor(private readonly rolesService: RolesService) {}

  @Query(() => [Role], { name: 'roles' })
  findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }
}
