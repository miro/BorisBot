ALTER TABLE drinks ADD COLUMN drinker_id INTEGER;
ALTER TABLE drinks ADD CONSTRAINT drinks_drinker_id_foreign FOREIGN KEY (drinker_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT users_telegramId_unique UNIQUE ("telegramId");


UPDATE drinks d2
SET drinker_id = user_id
FROM (
    SELECT drinks.id as drink_id, "creatorId", users.id as user_id from drinks
    INNER JOIN users
    ON drinks."creatorId" = users."telegramId"
) d1
WHERE d2.id = d1.drink_id;

ALTER TABLE drinks RENAME COLUMN "creatorId" TO drinker_telegram_id;
