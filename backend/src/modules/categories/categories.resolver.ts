import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role-name.enum';
import { Category } from './entities/category.entity';
import { CategoriesService } from './categories.service';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';

@Resolver(() => Category)
@UseGuards(GqlJwtAuthGuard, RolesGuard)
export class CategoriesResolver {
  constructor(private readonly service: CategoriesService) {}

  @Query(() => [Category], { name: 'categories' })
  findAll(): Promise<Category[]> {
    return this.service.findAll();
  }

  @Query(() => Category, { name: 'category' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Category> {
    return this.service.findOne(id);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Category)
  createCategory(
    @Args('input') input: CreateCategoryInput,
  ): Promise<Category> {
    return this.service.create(input);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Category)
  updateCategory(
    @Args('input') input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.service.update(input);
  }

  @Roles(RoleName.ADMIN)
  @Mutation(() => Boolean)
  removeCategory(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<boolean> {
    return this.service.remove(id);
  }
}
