exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 120).notNullable();
    table.string('email', 254).notNullable().unique();
    table.boolean('is_blocked').notNullable().defaultTo(false);
    table.boolean('is_blacklisted').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.string('currency', 3).notNullable().defaultTo('NGN');
    table.bigInteger('balance_kobo').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'currency']);
    table.check('balance_kobo >= 0');
  });

  await knex.schema.createTable('transfers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('from_wallet_id').notNullable().references('id').inTable('wallets').onDelete('RESTRICT');
    table.uuid('to_wallet_id').notNullable().references('id').inTable('wallets').onDelete('RESTRICT');
    table.bigInteger('amount_kobo').notNullable();
    table.string('currency', 3).notNullable().defaultTo('NGN');
    table.string('idempotency_key', 128).notNullable().unique();
    table.string('status', 20).notNullable().defaultTo('completed');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check('amount_kobo > 0');
    table.check('from_wallet_id <> to_wallet_id');
    table.check("status IN ('pending', 'completed', 'failed')");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('transfers');
  await knex.schema.dropTableIfExists('wallets');
  await knex.schema.dropTableIfExists('users');
};
