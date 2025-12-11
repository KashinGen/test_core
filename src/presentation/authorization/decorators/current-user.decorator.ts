import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../interfaces/request-user.interface';
import { REQUEST_USER_KEY } from '../guards/roles.guard';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<Request & { [REQUEST_USER_KEY]?: RequestUser }>();
    const user = request[REQUEST_USER_KEY];
    
    if (!user) {
      throw new Error('User not found in request. Make sure RolesGuard is applied.');
    }
    
    return user;
  },
);






