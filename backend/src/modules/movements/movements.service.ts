import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetMovement } from './entities/asset-movement.entity';

export interface MovementInput {
  assetId: number;
  userId?: number | null;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string;
}

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(AssetMovement)
    private readonly repo: Repository<AssetMovement>,
  ) {}

  async record(input: MovementInput): Promise<AssetMovement> {
    const movement = this.repo.create({
      assetId: input.assetId,
      field: input.field,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      note: input.note,
      user: input.userId ? ({ id: input.userId } as any) : undefined,
    });
    return this.repo.save(movement);
  }

  findByAsset(assetId: number): Promise<AssetMovement[]> {
    return this.repo.find({
      where: { assetId },
      order: { createdAt: 'DESC' },
    });
  }

  findRecent(limit = 10): Promise<AssetMovement[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { asset: true },
    });
  }
}
