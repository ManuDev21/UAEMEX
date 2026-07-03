import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentInput } from './dto/create-department.input';
import { UpdateDepartmentInput } from './dto/update-department.input';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>,
  ) {}

  findAll(): Promise<Department[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Department> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Departamento ${id} no encontrado`);
    }
    return item;
  }

  async findByName(name: string): Promise<Department | null> {
    return this.repo.findOne({ where: { name } });
  }

  create(input: CreateDepartmentInput): Promise<Department> {
    return this.repo.save(this.repo.create(input));
  }

  async update(input: UpdateDepartmentInput): Promise<Department> {
    const item = await this.findOne(input.id);
    Object.assign(item, input);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
