// TODO:
// - it would be more postgres-y if all the column names would be snake_case (or wth it is).
//   For now I am creating new columns with that style, it will mix up the codebase but...


exports.up = function(knex, Promise) {
    return Promise.resolve()
    .then(() => knex.schema.createTable('users', function(t) {
        t.increments('id').primary();

        t.integer('telegramId').unique();
        t.string('userName', 100).unique();
        t.string('firstName', 100);
        t.string('lastName', 100);

        t.integer('primaryGroupId');
        t.string('primaryGroupName', 100);

        t.integer('weight').defaultTo(65);
        t.boolean('isMale').defaultTo(true);

    }))
    .then(() => knex.schema.createTable('drinks', function(t) {
        t.increments('id').primary();
        t.timestamp('timestamp').defaultTo(knex.raw('now()'));
        t.integer('chatGroupId');

        t.integer('drinker_id')
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        t.integer('drinker_telegram_id');

        t.integer('messageId');

        t.string('drinkType', 140);
        t.integer('drinkValue').defaultTo(10);

    }))
    .then(() => knex.schema.createTable('expls', function(t) {
        t.increments('id').primary();
        t.timestamp('timestamp').defaultTo(knex.raw('now()'));
        t.integer('creatorId'); // later: reference to user-table?

        t.string('key', 50);

        // expl can be a plain string
        t.string('value', 250);

        // ...or a reference to a previous message
        t.integer('messageId');
        t.integer('chatId');

    }))
    .then(() => knex.schema.createTable('groups', function(t) {
        t.increments('id').primary();
        t.timestamp('found_at').defaultTo(knex.raw('now()'));

        t.string('name', 400);
        t.integer('telegram_group_id').unique();
    }))
    .then(() => knex.schema.createTable('links', function(t) {
        t.increments('id').primary();
        t.timestamp('timestamp').defaultTo(knex.raw('now()'));

        t.string('url', 400);
        t.integer('original_link_message_id');

        t.integer('times_linked').defaultTo(1); // NOTE: group-based

        t.integer('group_id')
            .unsigned()
            .references('id')
            .inTable('groups')
            .onDelete('SET NULL');

        t.integer('telegram_group_id');

        t.unique(['url', 'group_id']);

        t.integer('linker_telegram_id');
    }));
};

exports.down = function(knex, Promise) {
    return Promise.resolve()
        .then(() => knex.schema.dropTable('users'))
        .then(() => knex.schema.dropTable('drinks'))
        .then(() => knex.schema.dropTable('expls'))
        .then(() => knex.schema.dropTable('groups'))
        .then(() => knex.schema.dropTable('links'));
};
