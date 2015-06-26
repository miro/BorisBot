var dbConfig = {
    client: 'postgresql',
    connection: process.env.DATABASE_URL
var constants = {
	testChatId: -13232285
};

module.exports = {
	db: dbConfig,
	constants: constants
};
