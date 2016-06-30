
exports.up = function(knex) {
    return knex.schema.table('expls', table => {
        table.integer('echoCount')
            .defaultTo(0)
            .comment('How many times this expl has been requested');
    });
};

exports.down = function(knex) {
    return knex.schema.table('expls', table => {
        table.dropColumn('echoCount');
    });
};
