import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.provider';

@Injectable()
export class WalletsService {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly db: Knex,
  ) {}

  async getWallet(walletId: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        walletId,
      )
    ) {
      throw new BadRequestException('Invalid wallet ID');
    }

    const wallet = await this.db('wallets')
      .join('users', 'wallets.user_id', 'users.id')
      .select(
        'wallets.id',
        'wallets.user_id',
        'wallets.currency',
        'wallets.balance_kobo',
        'wallets.is_active',
        'users.is_blocked',
        'users.is_blacklisted',
      )
      .where('wallets.id', walletId)
      .first();

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    return wallet;
  }
}
