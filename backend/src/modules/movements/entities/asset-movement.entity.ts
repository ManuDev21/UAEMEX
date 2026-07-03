import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../users/entities/user.entity';

@ObjectType()
@Entity('asset_movements')
export class AssetMovement {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Asset, (asset) => asset.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Field(() => ID)
  @Column({ name: 'asset_id' })
  assetId: number;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Field()
  @Column({ type: 'varchar', length: 60 })
  field: string;

  @Field({ nullable: true })
  @Column({ name: 'old_value', type: 'varchar', length: 500, nullable: true })
  oldValue?: string;

  @Field({ nullable: true })
  @Column({ name: 'new_value', type: 'varchar', length: 500, nullable: true })
  newValue?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
