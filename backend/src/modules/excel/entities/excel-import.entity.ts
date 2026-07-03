import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@ObjectType()
@Entity('excel_imports')
export class ExcelImport {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Field(() => Int)
  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  inserted: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  updated: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  skipped: number;

  @Field(() => Int)
  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  errors?: string;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
