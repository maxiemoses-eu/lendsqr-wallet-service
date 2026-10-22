import { BadRequestException } from '@nestjs/common';
import { TransfersService } from './transfers.service';

describe('TransfersService validation', () => {
  let service: TransfersService;
  let db: jest.Mock;

  beforeEach(() => {
    db = jest.fn();

    service = new TransfersService(db as never);
  });

  it('rejects an invalid source wallet ID', async () => {
    await expect(
      service.createTransfer(
        'not-a-uuid',
        'f508ec88-66da-4349-8683-9dd152e42469',
        1000,
        'test-invalid-source',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(db).not.toHaveBeenCalled();
  });

  it('rejects a transfer to the same wallet', async () => {
    const walletId = 'e7d1ce0d-4a48-40bc-8ec1-1b423c3cb0cd';

    await expect(
      service.createTransfer(
        walletId,
        walletId,
        1000,
        'test-same-wallet',
      ),
    ).rejects.toThrow('Source and destination wallets must be different');

    expect(db).not.toHaveBeenCalled();
  });

  it('rejects a zero transfer amount', async () => {
    await expect(
      service.createTransfer(
        'e7d1ce0d-4a48-40bc-8ec1-1b423c3cb0cd',
        'f508ec88-66da-4349-8683-9dd152e42469',
        0,
        'test-zero-amount',
      ),
    ).rejects.toThrow('amountKobo must be a positive safe integer');

    expect(db).not.toHaveBeenCalled();
  });

  it('rejects a missing idempotency key', async () => {
    await expect(
      service.createTransfer(
        'e7d1ce0d-4a48-40bc-8ec1-1b423c3cb0cd',
        'f508ec88-66da-4349-8683-9dd152e42469',
        1000,
        '',
      ),
    ).rejects.toThrow('A valid Idempotency-Key header is required');

    expect(db).not.toHaveBeenCalled();
  });
});
