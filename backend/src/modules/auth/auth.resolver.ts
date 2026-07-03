import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response.type';
import { LoginInput } from './dto/login.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  JwtUserPayload,
} from '../../common/decorators/current-user.decorator';
import { GqlJwtAuthGuard } from '../../common/guards/gql-jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Mutation(() => AuthResponse)
  login(
    @Args('input') input: LoginInput,
    @Context() ctx: any,
  ): Promise<AuthResponse> {
    const ip = ctx?.req?.ip ?? ctx?.req?.headers?.['x-forwarded-for'];
    return this.authService.login(input, ip);
  }

  @Public()
  @Mutation(() => AuthResponse)
  refreshToken(
    @Args('input') input: RefreshTokenInput,
  ): Promise<AuthResponse> {
    return this.authService.refresh(input.refreshToken);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Mutation(() => Boolean)
  logout(@CurrentUser() user: JwtUserPayload): Promise<boolean> {
    return this.authService.logout(user.sub);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => User, { name: 'me' })
  me(@CurrentUser() user: JwtUserPayload): Promise<User> {
    return this.usersService.findOne(user.sub);
  }
}
