import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface JwtUserPayload {
  sub: number;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUserPayload | undefined, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    const user = request?.user as JwtUserPayload;
    return data ? user?.[data] : user;
  },
);
