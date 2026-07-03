import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssetStatus } from '../../../common/enums/asset-status.enum';
import { Category } from '../../categories/entities/category.entity';
import { Department } from '../../departments/entities/department.entity';
import { Responsable } from '../../responsables/entities/responsable.entity';
import { AssetMovement } from '../../movements/entities/asset-movement.entity';

@ObjectType()
@Entity('assets')
export class Asset {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ type: 'varchar', length: 80, unique: true })
  code: string;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  brand?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  model?: string;

  @Field({ nullable: true })
  @Column({ name: 'serial_number', type: 'varchar', length: 120, nullable: true })
  serialNumber?: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value: number;

  @Field({ nullable: true })
  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate?: Date;

  @Field(() => AssetStatus)
  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVO })
  status: AssetStatus;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  observations?: string;

  @Field(() => Category, { nullable: true })
  @ManyToOne(() => Category, (category) => category.assets, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'category_id', nullable: true })
  categoryId?: number;

  @Field(() => Department, { nullable: true })
  @ManyToOne(() => Department, (department) => department.assets, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'department_id', nullable: true })
  departmentId?: number;

  @Field(() => Responsable, { nullable: true })
  @ManyToOne(() => Responsable, (responsable) => responsable.assets, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'responsable_id' })
  responsable?: Responsable;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'responsable_id', nullable: true })
  responsableId?: number;

  @OneToMany(() => AssetMovement, (movement) => movement.asset)
  movements: AssetMovement[];

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
