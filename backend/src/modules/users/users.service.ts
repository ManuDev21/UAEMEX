import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        isActive: true,
        roleId: true,
      },
      relations: { role: true },
    });
  }

  async create(input: CreateUserInput): Promise<User> {
    const exists = await this.usersRepository.findOne({
      where: { email: input.email },
    });
    if (exists) {
      throw new BadRequestException('El correo ya esta registrado');
    }
    const password = await bcrypt.hash(input.password, 10);
    const user = this.usersRepository.create({ ...input, password });
    return this.usersRepository.save(user);
  }

  async update(input: UpdateUserInput): Promise<User> {
    const user = await this.findOne(input.id);
    const { id, password, ...rest } = input;
    Object.assign(user, rest);
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.usersRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async setRefreshToken(id: number, token: string | null): Promise<void> {
    const hash = token ? await bcrypt.hash(token, 10) : null;
    await this.usersRepository.update(id, { refreshTokenHash: hash });
  }

  async getWithRefreshToken(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        roleId: true,
        refreshTokenHash: true,
        isActive: true,
      },
      relations: { role: true },
    });
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }
}
