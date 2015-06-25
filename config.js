var dbConfig = {
    client: 'postgresql',
    connection: process.env.DATABASE_URL
};

module.exports = {
	db: dbConfig
};
