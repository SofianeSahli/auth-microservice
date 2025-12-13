import { Sequelize } from "sequelize-typescript";
import { Client } from "pg";
import * as path from "path";
import * as dotenv from "dotenv";
import { Auth } from "src/auth/models/auth.model";
import { Session } from "src/auth/models/session.model";
import { RefreshToken } from "src/auth/models/token.model";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const {
  DB_HOST = "127.0.0.1",
  DB_PORT = "5432",
  DB_USERNAME = "postgres",
  DB_PASSWORD = "password",
  DB_NAME = "auth_db",
} = process.env;

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: "postgres", // connect to default DB
  });

  await client.connect();

  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [DB_NAME]
  );

  if (res.rowCount === 0) {
    console.log(`🟡 Database ${DB_NAME} does not exist — creating...`);
    // Use template0 to avoid collation issues
    await client.query(
      `CREATE DATABASE "${DB_NAME}" WITH TEMPLATE template0 ENCODING 'UTF8';`
    );
    console.log(`✅ Database ${DB_NAME} created.`);
  } else {
    console.log(`✅ Database ${DB_NAME} already exists.`);
  }

  await client.end();
}

async function resetDatabase() {
  await createDatabaseIfNotExists();

  const sequelize = new Sequelize({
    dialect: "postgres",
    host: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    logging: false,
    models: [Auth, Session, RefreshToken],
  });

  console.log("⚙️ Dropping and recreating all tables...");
  await sequelize.sync({ force: true });
  console.log("✅ All tables dropped and recreated.");

  await sequelize.close();
  console.log("🔒 Connection closed.");
}

resetDatabase().catch((err) => {
  console.error("❌ Error resetting database:", err);
  process.exit(1);
});
