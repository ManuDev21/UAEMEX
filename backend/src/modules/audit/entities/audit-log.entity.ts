import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../../../common/enums/audit-action.enum';
import { User } from '../../users/entities/user.entity';

@ObjectType()
@Entity('audit_logs')
export class AuditLog {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Field(() => AuditAction)
  @Index()
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 80, nullable: true })
  entity?: string;

  @Field({ nullable: true })
  @Column({ name: 'entity_id', type: 'varchar', length: 80, nullable: true })
  entityId?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  details?: string;

  @Field({ nullable: true })
  @Column({ name: 'ip_address', type: 'varchar', length: 60, nullable: true })
  ipAddress?: string;

  @Field()
  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
