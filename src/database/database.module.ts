import { Module } from '@nestjs/common';
import { databaseProvider, KNEX_CONNECTION } from './database.provider';

@Module({
  providers: [databaseProvider],
  exports: [KNEX_CONNECTION],
})
export class DatabaseModule {}
