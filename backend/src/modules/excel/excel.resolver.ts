import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { ExcelImport } from './entities/excel-import.entity';
import { ExcelService } from './excel.service';

@Resolver(() => ExcelImport)
@UseGuards(GqlJwtAuthGuard)
export class ExcelResolver {
  constructor(private readonly service: ExcelService) {}

  @Query(() => [ExcelImport], { name: 'recentImports' })
  recent(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 })
    limit: number,
  ): Promise<ExcelImport[]> {
    return this.service.recentImports(limit);
  }
}
