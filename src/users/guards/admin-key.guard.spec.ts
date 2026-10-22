import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminKeyGuard } from './admin-key.guard';

describe('AdminKeyGuard', () => {
  const makeContext = (headers: Record<string, string | undefined>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  it('rejects requests without an admin key', () => {
    const config = {
      get: jest.fn().mockReturnValue('test-secret-key'),
    } as unknown as ConfigService;
    const guard = new AdminKeyGuard(config);

    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an incorrect admin key', () => {
    const config = {
      get: jest.fn().mockReturnValue('test-secret-key'),
    } as unknown as ConfigService;
    const guard = new AdminKeyGuard(config);

    expect(() =>
      guard.canActivate(makeContext({ 'x-admin-key': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
  });

  it('accepts the correct admin key', () => {
    const config = {
      get: jest.fn().mockReturnValue('test-secret-key'),
    } as unknown as ConfigService;
    const guard = new AdminKeyGuard(config);

    expect(
      guard.canActivate(
        makeContext({ 'x-admin-key': 'test-secret-key' }),
      ),
    ).toBe(true);
  });

  it('rejects requests when the server key is not configured', () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const guard = new AdminKeyGuard(config);

    expect(() =>
      guard.canActivate(makeContext({ 'x-admin-key': 'test-secret-key' })),
    ).toThrow(UnauthorizedException);
  });
});
