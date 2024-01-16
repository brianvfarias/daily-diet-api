import { config } from 'dotenv'
import knex, { type Knex } from 'knex'
config({ path: '.env' })

export const configKnex: Knex.Config = {
  client: process.env.DATABASE_CLIENT, // or 'better-sqlite3'
  connection: process.env.PG_CONNECTION_STRING,
  searchPath: ['knex', 'public'],
  migrations: {
    extension: 'ts',
    directory: './db/migrations',
  },
}

export const db = knex(configKnex)
