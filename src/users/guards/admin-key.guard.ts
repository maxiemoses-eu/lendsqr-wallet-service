import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configuredKey = this.configService.get<string>('ADMIN_API_KEY');
    const request = context.switchToHttp().getRequest<Request>();
    const suppliedKey = request.headers['x-admin-key'];

    if (
      !configuredKey ||
      typeof suppliedKey !== 'string' ||
      suppliedKey.length !== configuredKey.length
    ) {
      throw new UnauthorizedException('Invalid or missing admin key');
    }

    const suppliedBuffer = Buffer.from(suppliedKey);
    const configuredBuffer = Buffer.from(configuredKey);

    if (!timingSafeEqual(suppliedBuffer, configuredBuffer)) {
      throw new UnauthorizedException('Invalid or missing admin key');
    }

    return true;
  }
}
