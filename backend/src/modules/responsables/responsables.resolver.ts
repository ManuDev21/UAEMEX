import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { Responsable } from './entities/responsable.entity';
import { ResponsablesService } from './responsables.service';
import { CreateResponsableInput } from './dto/create-responsable.input';
import { UpdateResponsableInput } from './dto/update-responsable.input';

@Resolver(() => Responsable)
@UseGuards(GqlJwtAuthGuard, RolesGuard)
export class ResponsablesResolver {
  constructor(private readonly service: ResponsablesService) {}

  @Query(() => [Responsable], { name: 'responsables' })
  findAll(): Promise<Responsable[]> {
    return this.service.findAll();
  }

  @Query(() => Responsable, { name: 'responsable' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Responsable> {
    return this.service.findOne(id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @Mutation(() => Responsable)
  createResponsable(
    @Args('input') input: CreateResponsableInput,
  ): Promise<Responsable> {
    return this.service.create(input);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @Mutation(() => Responsable)
  updateResponsable(
    @Args('input') input: UpdateResponsableInput,
  ): Promise<Responsable> {
    return this.service.update(input);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Boolean)
  removeResponsable(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<boolean> {
    return this.service.remove(id);
  }
}
