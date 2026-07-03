import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CountByLabel {
  @Field()
  label: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float)
  value: number;
}

@ObjectType()
export class MonthlyMovement {
  @Field()
  month: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class DashboardStats {
  @Field(() => Int)
  totalAssets: number;

  @Field(() => Int)
  activeAssets: number;

  @Field(() => Int)
  retiredAssets: number;

  @Field(() => Int)
  maintenanceAssets: number;

  @Field(() => Float)
  totalValue: number;

  @Field(() => Int)
  totalDepartments: number;

  @Field(() => Int)
  totalCategories: number;

  @Field(() => [CountByLabel])
  byDepartment: CountByLabel[];

  @Field(() => [CountByLabel])
  byCategory: CountByLabel[];

  @Field(() => [CountByLabel])
  byStatus: CountByLabel[];

  @Field(() => [MonthlyMovement])
  monthlyMovements: MonthlyMovement[];
}
