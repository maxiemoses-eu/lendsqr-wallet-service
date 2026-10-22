import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.provider';

@Injectable()
export class TransfersService {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly db: Knex,
  ) {}

  async createTransfer(
    fromWalletId: string,
    toWalletId: string,
    amountKobo: number,
    idempotencyKey: string,
  ) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
      !uuidPattern.test(fromWalletId) ||
      !uuidPattern.test(toWalletId)
    ) {
      throw new BadRequestException('Both wallet IDs must be valid UUIDs');
    }

    if (fromWalletId === toWalletId) {
      throw new BadRequestException(
        'Source and destination wallets must be different',
      );
    }

    if (
      !Number.isSafeInteger(amountKobo) ||
      amountKobo <= 0
    ) {
      throw new BadRequestException(
        'amountKobo must be a positive safe integer',
      );
    }

    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length === 0 ||
      idempotencyKey.length > 128
    ) {
      throw new BadRequestException(
        'A valid Idempotency-Key header is required (maximum 128 characters)',
      );
    }

    const key = idempotencyKey.trim();

    try {
      return await this.db.transaction(async (trx) => {
        const existing = await trx('transfers')
          .where({ idempotency_key: key })
          .first();

        if (existing) {
          if (
            existing.from_wallet_id !== fromWalletId ||
            existing.to_wallet_id !== toWalletId ||
            Number(existing.amount_kobo) !== amountKobo
          ) {
            throw new ConflictException(
              'This idempotency key was already used for a different transfer',
            );
          }

          return existing;
        }

        // Lock both wallets in a consistent order to reduce deadlocks.
        const walletIds = [fromWalletId, toWalletId].sort();

        const wallets = await trx('wallets')
          .whereIn('id', walletIds)
          .orderBy('id')
          .forUpdate();

        if (wallets.length !== 2) {
          throw new NotFoundException('Source or destination wallet not found');
        }

        const walletById = new Map(
          wallets.map((wallet) => [wallet.id, wallet]),
        );
        const source = walletById.get(fromWalletId);
        const destination = walletById.get(toWalletId);

        if (!source || !destination) {
          throw new NotFoundException('Source or destination wallet not found');
        }

        if (!source.is_active || !destination.is_active) {
          throw new ForbiddenException('Both wallets must be active');
        }

        if (source.currency !== destination.currency) {
          throw new BadRequestException(
            'Both wallets must use the same currency',
          );
        }

        const userIds = [source.user_id, destination.user_id];

        const users = await trx('users')
          .select('id', 'is_blocked', 'is_blacklisted')
          .whereIn('id', userIds);

        const userById = new Map(users.map((user) => [user.id, user]));
        const sourceUser = userById.get(source.user_id);
        const destinationUser = userById.get(destination.user_id);

        if (
          !sourceUser ||
          !destinationUser ||
          sourceUser.is_blocked ||
          destinationUser.is_blocked
        ) {
          throw new ForbiddenException(
            'Transfers are not allowed for blocked users',
          );
        }

        if (
          sourceUser.is_blacklisted ||
          destinationUser.is_blacklisted
        ) {
          throw new ForbiddenException(
            'Transfers are not allowed for blacklisted users',
          );
        }

        const sourceBalance = BigInt(source.balance_kobo);
        const amount = BigInt(amountKobo);

        if (sourceBalance < amount) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        const destinationBalance = BigInt(destination.balance_kobo);
        const updatedDestinationBalance = destinationBalance + amount;

        // PostgreSQL bigint values are returned as strings by node-postgres.
        // BigInt keeps arithmetic exact; store the result as a decimal string.
        await trx('wallets')
          .where({ id: fromWalletId })
          .update({
            balance_kobo: (sourceBalance - amount).toString(),
          });

        await trx('wallets')
          .where({ id: toWalletId })
          .update({
            balance_kobo: updatedDestinationBalance.toString(),
          });

        const [transfer] = await trx('transfers')
          .insert({
            from_wallet_id: fromWalletId,
            to_wallet_id: toWalletId,
            amount_kobo: amountKobo.toString(),
            currency: source.currency,
            idempotency_key: key,
            status: 'completed',
          })
          .returning('*');

        return transfer;
      });
    } catch (error: unknown) {
      const databaseError = error as { code?: string };

      if (databaseError.code === '23505') {
        // Another request may have completed with the same key concurrently.
        const existing = await this.db('transfers')
          .where({ idempotency_key: key })
          .first();

        if (existing) {
          if (
            existing.from_wallet_id === fromWalletId &&
            existing.to_wallet_id === toWalletId &&
            Number(existing.amount_kobo) === amountKobo
          ) {
            return existing;
          }

          throw new ConflictException(
            'This idempotency key was already used for a different transfer',
          );
        }
      }

      throw error;
    }
  }
}
