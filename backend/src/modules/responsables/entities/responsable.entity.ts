import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';

@ObjectType()
@Entity('responsables')
export class Responsable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  position?: string;

  @Field()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Asset, (asset) => asset.responsable)
  assets: Asset[];

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
