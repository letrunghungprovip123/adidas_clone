// api-gateway/src/auth/admin.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log(request);
    if (!user) {
      throw new ForbiddenException('Không có thông tin người dùng');
    }

    if (!user.role) {
      throw new ForbiddenException('Chỉ admin mới có quyền truy cập');
    }

    return true;
  }
}
