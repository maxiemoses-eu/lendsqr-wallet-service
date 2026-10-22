import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.provider';

@Injectable()
export class UsersService {
  constructor(
    @Inject(KNEX_CONNECTION)
    private readonly db: Knex,
  ) {}

  async createUser(name: string, email: string) {
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      throw new BadRequestException('Name and email are required');
    }

    if (
      normalizedName.length > 120 ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new BadRequestException('Please provide a valid name and email');
    }

    try {
      return await this.db.transaction(async (trx) => {
        const [user] = await trx('users')
          .insert({
            name: normalizedName,
            email: normalizedEmail,
          })
          .returning(['id', 'name', 'email', 'is_blocked', 'created_at']);

        const [wallet] = await trx('wallets')
          .insert({
            user_id: user.id,
            currency: 'NGN',
            balance_kobo: 0,
          })
          .returning(['id', 'user_id', 'currency', 'balance_kobo']);

        return { user, wallet };
      });
    } catch (error: unknown) {
      const databaseError = error as { code?: string };

      if (databaseError.code === '23505') {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  async getUser(userId: string) {
    const user = await this.db('users')
      .select('id', 'name', 'email', 'is_blocked', 'is_blacklisted', 'created_at')
      .where({ id: userId })
      .first();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const wallets = await this.db('wallets')
      .select('id', 'currency', 'balance_kobo', 'is_active')
      .where({ user_id: userId });

    return { ...user, wallets };
  }
}
