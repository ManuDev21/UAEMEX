import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { Department } from './entities/department.entity';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentInput } from './dto/create-department.input';
import { UpdateDepartmentInput } from './dto/update-department.input';

@Resolver(() => Department)
@UseGuards(GqlJwtAuthGuard, RolesGuard)
export class DepartmentsResolver {
  constructor(private readonly service: DepartmentsService) {}

  @Query(() => [Department], { name: 'departments' })
  findAll(): Promise<Department[]> {
    return this.service.findAll();
  }

  @Query(() => Department, { name: 'department' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Department> {
    return this.service.findOne(id);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Department)
  createDepartment(
    @Args('input') input: CreateDepartmentInput,
  ): Promise<Department> {
    return this.service.create(input);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Department)
  updateDepartment(
    @Args('input') input: UpdateDepartmentInput,
  ): Promise<Department> {
    return this.service.update(input);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Boolean)
  removeDepartment(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<boolean> {
    return this.service.remove(id);
  }
}
