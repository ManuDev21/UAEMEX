import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  userId?: number | null;
  action: AuditAction;
  entity?: string;
  entityId?: string | number;
  details?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    const record = this.auditRepository.create({
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId != null ? String(entry.entityId) : undefined,
      details: entry.details,
      ipAddress: entry.ipAddress,
      user: entry.userId ? ({ id: entry.userId } as any) : undefined,
    });
    await this.auditRepository.save(record);
  }

  findAll(limit = 200): Promise<AuditLog[]> {
    return this.auditRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
