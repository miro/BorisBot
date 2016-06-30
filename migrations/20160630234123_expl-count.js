
exports.up = function(knex) {
    return knex.schema.table('expls', table => {
        table.integer('echoCount')
            .defaultTo(0)
            .comment('How many times this expl has been requested');

        table.timestamp('lastEcho')
            .nullable()
            .comment('Last time this expl was echoed somewhere');
    });
};

exports.down = function(knex) {
    return knex.schema.table('expls', table => {
        table.dropColumn('echoCount');
        table.dropColumn('lastEcho');
    });
};
