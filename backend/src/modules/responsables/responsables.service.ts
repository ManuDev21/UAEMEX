import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Responsable } from './entities/responsable.entity';
import { CreateResponsableInput } from './dto/create-responsable.input';
import { UpdateResponsableInput } from './dto/update-responsable.input';

@Injectable()
export class ResponsablesService {
  constructor(
    @InjectRepository(Responsable)
    private readonly repo: Repository<Responsable>,
  ) {}

  findAll(): Promise<Responsable[]> {
    return this.repo.find({ order: { fullName: 'ASC' } });
  }

  async findOne(id: number): Promise<Responsable> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Responsable ${id} no encontrado`);
    }
    return item;
  }

  async findByName(fullName: string): Promise<Responsable | null> {
    return this.repo.findOne({ where: { fullName } });
  }

  create(input: CreateResponsableInput): Promise<Responsable> {
    return this.repo.save(this.repo.create(input));
  }

  async update(input: UpdateResponsableInput): Promise<Responsable> {
    const item = await this.findOne(input.id);
    Object.assign(item, input);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
