const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    "type": "mssql",
    "host": process.env.DATABASE_HOST,
    "port": parseInt(process.env.DATABASE_PORT),
    "username": process.env.DATABASE_USERNAME,
    "password": process.env.DATABASE_PASSWORD,
    "database": process.env.DATABASE_DB,
    "synchronize": true,
    "entities": [
        process.env.NODE_ENV === "production" ? "dist/entity/*.js": "src/entity/*.ts"
    ],
    "subscribers": [
        "src/subscriber/*.ts"
    ],
    "migrations": [
        "src/migration/*.ts"
    ],
    "cli": {
        "entitiesDir": "src/entity",
        "migrationsDir": "src/migration",
        "subscribersDir": "src/subscriber"
    }
};
