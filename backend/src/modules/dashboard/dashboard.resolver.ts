import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { DashboardStats } from './dto/dashboard.types';
import { DashboardService } from './dashboard.service';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class DashboardResolver {
  constructor(private readonly service: DashboardService) {}

  @Query(() => DashboardStats, { name: 'dashboardStats' })
  stats(): Promise<DashboardStats> {
    return this.service.getStats();
  }
}
