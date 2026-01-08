import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { User } from './user/entities/user.entity';
import { Contoh } from './contoh/entities/contoh.entity';

dotenv.config();

const baseEntities = [User, Contoh];

const migrationEntitiesEnv = process.env.MIGRATION_ENTITIES;

const selectedEntities =
  migrationEntitiesEnv && migrationEntitiesEnv.length > 0
    ? baseEntities.filter((entity) =>
        migrationEntitiesEnv.split(',').includes(entity.name),
      )
    : baseEntities;

function resolveMigrations(): string[] {
  const timestampsEnv = process.env.MIGRATION_TIMESTAMPS;
  if (!timestampsEnv || timestampsEnv.length === 0) {
    return ['migrations/*{.ts,.js}'];
  }
  const timestamps = new Set(timestampsEnv.split(','));
  const migrationsDir = path.resolve(__dirname, '..', 'migrations');
  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir)
    : [];
  const selected: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) {
      continue;
    }
    let match = false;
    for (const ts of timestamps) {
      if (file.includes(ts)) {
        match = true;
        break;
      }
    }
    if (!match) {
      continue;
    }
    selected.push(path.join('migrations', file));
  }
  return selected;
}

const migrations = resolveMigrations();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: selectedEntities,
  migrations,
  synchronize: false,
  logging: false,
});
