import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Category> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Categoria ${id} no encontrada`);
    }
    return item;
  }

  async findByName(name: string): Promise<Category | null> {
    return this.repo.findOne({ where: { name } });
  }

  create(input: CreateCategoryInput): Promise<Category> {
    return this.repo.save(this.repo.create(input));
  }

  async update(input: UpdateCategoryInput): Promise<Category> {
    const item = await this.findOne(input.id);
    Object.assign(item, input);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
