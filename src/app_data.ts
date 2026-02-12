import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

/**
 * TypeORM `DataSource` configured for the guild's PostgreSQL database.
 *
 * Connection parameters are read from environment variables:
 * - `PGHOST` — database hostname
 * - `PGPORT` — database port
 * - `PGUSER` — database user
 * - `PGPASSWORD` — database password
 * - `POSTGRES_DB` — database name
 *
 * Entity classes are discovered via the glob `./entities/*.js`.
 * Schema synchronisation is **disabled** — migrations are managed externally.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  logging: false,
  entities: ['./dist/entities/*.js'],
  subscribers: [],
  migrations: [],
});

/**
 * Initialises the {@link AppDataSource} connection pool.
 *
 * Called once at application startup from `index.ts`.
 * On failure the process exits with code 1 so Railway restarts it.
 */
export async function initializeDataSource() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');
  }
  catch (error) {
    console.error('Error during Data Source initialization:', error);
    process.exit(1);
  }
}
