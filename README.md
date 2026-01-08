# Dokumentasi Proyek

## 1. Setup Awal

### Created project nestjs

- create project nestjs

```bash
nest new prj-01
cd prj-01
```

- hapus .git

```bash
rm -rf .git
```

- Push project to git repository

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/heinricov/prj-01.git
git push -u origin main
```

## 2. Setup Database

### File Environment

- Buat file `.env` di root project

```bash
touch .env
```

- Isi file `.env` dengan konfigurasi database

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=username
DB_PASSWORD=
DB_NAME=db_name
```

### PostgreSQL Lokal

- buat database `db_name` di PostgreSQL

```bash
psql postgres
```

```sql
CREATE DATABASE db_name OWNER username;
```

- untuk melihat database yang ada di PostgreSQL

```sql
\l
```

- untuk keluar dari psql

```sql
\q
```

## 3. Setup TypeORM

### Install dependencies

```bash
npm install @nestjs/typeorm typeorm reflect-metadata pg
```

```bash
npm install @nestjs/config dotenv
```

```bash
npm install -D ts-node
```

### Database Connection

- buat file `data-source.ts` di folder `src`

```bash
touch src/data-source.ts
```

- isi file `data-source.ts` dengan konfigurasi database

```ts
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
```

### Migration Scripts

- buat folder `migrations` di folder `root`

```bash
mkdir -p migrations
```

- buat file - file script migrasi

```bash
mkdir scripts
```

```bash
touch scripts/migration-generate.js
touch scripts/migration-run.js
touch scripts/migration-revert.js
touch scripts/migration-show.js
```

- setup `eslint.config.mjs` agar tidak menganggap file `scripts/**/*` sebagai file yang di lint

```js
export default tseslint.config({
  ignores: ['eslint.config.mjs', 'scripts/**/*'],
}
...
);
```

- isi file `migration-generate.js` dengan konfigurasi migrasi generate

```js
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    'Argumen wajib: npm run migration:generate [NamaEntity] NamaMigrasi. Contoh: npm run migration:generate User CreateUserTable',
  );
  process.exit(1);
}

let entityName;
let migrationName;
let extraArgs = [];

if (args.length === 1) {
  [migrationName] = args;
} else {
  [entityName, migrationName, ...extraArgs] = args;
}

const migrationPath = `migrations/${migrationName}`;

const env = {
  ...process.env,
};

if (entityName) {
  env.MIGRATION_ENTITIES = entityName;
}

const result = spawnSync(
  'npm',
  [
    'run',
    'typeorm',
    '--',
    'migration:generate',
    migrationPath,
    '-d',
    'src/data-source.ts',
    ...extraArgs,
  ],
  {
    stdio: 'inherit',
    env,
  },
);

process.exit(result.status ?? 0);
```

- isi file `migration-run.js` dengan konfigurasi migrasi run

```js
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const rawArgs = process.argv.slice(2);

let cliArgs = [];

const env = {
  ...process.env,
};

if (rawArgs.length === 0 || rawArgs[0].startsWith('-')) {
  cliArgs = rawArgs;
} else {
  const first = rawArgs[0];
  const rest = rawArgs.slice(1);
  const isTimestamp = /^\d+$/.test(first);
  if (isTimestamp) {
    env.MIGRATION_TIMESTAMPS = first;
    cliArgs = rest;
  } else {
    env.MIGRATION_ENTITIES = first;
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    const timestamps = [];
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.js')) {
          continue;
        }
        if (!file.includes(first)) {
          continue;
        }
        const match = file.match(/(\d+)\.(t|j)s$/);
        if (match && match[1]) {
          timestamps.push(match[1]);
        }
      }
    }
    if (timestamps.length > 0) {
      env.MIGRATION_TIMESTAMPS = timestamps.join(',');
    }
    cliArgs = rest;
  }
}

const result = spawnSync(
  'npm',
  [
    'run',
    'typeorm',
    '--',
    'migration:run',
    '-d',
    'src/data-source.ts',
    ...cliArgs,
  ],
  {
    encoding: 'utf8',
    env,
  },
);

if (result.status !== 0) {
  console.error('Migration gagal dijalankan. Detail output:');
  if (result.stdout) {
    process.stderr.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exit(result.status ?? 1);
}

async function printTablesInfo() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nestjs_db',
  });

  await client.connect();

  const tablesResult = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'migrations'
      ORDER BY table_name
    `,
  );

  if (tablesResult.rows.length === 0) {
    console.log('Tidak ada tabel di schema public (selain migrations).');
    await client.end();
    return;
  }

  console.log('Struktur tabel setelah migration:');

  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    console.log(`\nTabel: ${tableName}`);

    const columnsResult = await client.query(
      `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position
      `,
      [tableName],
    );

    for (const col of columnsResult.rows) {
      const nullable = col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL';
      const defaultValue = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : '';
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`,
      );
    }

    const relationsResult = await client.query(
      `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
      `,
      [tableName],
    );

    if (relationsResult.rows.length > 0) {
      console.log('  Relasi (FOREIGN KEY):');
      for (const rel of relationsResult.rows) {
        console.log(
          `    - ${rel.column_name} -> ${rel.foreign_table_name}.${rel.foreign_column_name}`,
        );
      }
    }
  }

  await client.end();
}

printTablesInfo()
  .then(() => {
    console.log('\nMigration berhasil dijalankan.');
  })
  .catch((err) => {
    console.error('Gagal menampilkan struktur tabel:', err.message);
    process.exit(1);
  });
```

- isi file `migration-revert.js` dengan konfigurasi migrasi revert

```js
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

async function getLatestMigrationTimestamp(client) {
  const res = await client.query(
    'SELECT "timestamp" FROM "migrations" ORDER BY "timestamp" DESC LIMIT 1',
  );
  if (res.rows.length === 0) {
    return null;
  }
  return String(res.rows[0].timestamp);
}

async function migrationExists(client, targetTimestamp) {
  const res = await client.query(
    'SELECT "timestamp" FROM "migrations" WHERE "timestamp" = $1',
    [targetTimestamp],
  );
  return res.rows.length > 0;
}

function runTypeormRevert() {
  const result = spawnSync(
    'npm',
    ['run', 'typeorm', '--', 'migration:revert', '-d', 'src/data-source.ts'],
    {
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    console.error('Migration revert gagal dijalankan. Detail output:');
    if (result.stdout) {
      process.stderr.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
}

function runTypeormRunWithTimestamps(timestamps) {
  if (timestamps.length === 0) {
    return;
  }

  const env = {
    ...process.env,
    MIGRATION_TIMESTAMPS: timestamps.join(','),
  };

  const result = spawnSync(
    'npm',
    ['run', 'typeorm', '--', 'migration:run', '-d', 'src/data-source.ts'],
    {
      encoding: 'utf8',
      env,
    },
  );

  if (result.status !== 0) {
    console.error(
      'Migration run gagal dijalankan saat reapply. Detail output:',
    );
    if (result.stdout) {
      process.stderr.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
}

function extractTimestamp(arg) {
  const matchPrefix = arg.match(/^(\d+)-/);
  if (matchPrefix && matchPrefix[1]) {
    return matchPrefix[1];
  }
  const matchDigits = arg.match(/^(\d+)$/);
  if (matchDigits && matchDigits[1]) {
    return matchDigits[1];
  }
  const matchSuffix = arg.match(/(\d+)-[^-]+$/);
  if (matchSuffix && matchSuffix[1]) {
    return matchSuffix[1];
  }
  return null;
}

async function revertAllMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nestjs_db',
  });

  await client.connect();

  while (true) {
    const latest = await getLatestMigrationTimestamp(client);
    if (!latest) {
      break;
    }
    runTypeormRevert();
  }

  await client.end();
}

async function revertSpecificMigration(targetArg) {
  const targetTimestamp = extractTimestamp(targetArg);
  if (!targetTimestamp) {
    console.error(
      'Format argumen tidak dikenali. Gunakan timestamp atau nama file yang mengandung timestamp.',
    );
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nestjs_db',
  });

  await client.connect();

  const exists = await migrationExists(client, targetTimestamp);

  if (!exists) {
    console.log(
      `Migration dengan timestamp ${targetTimestamp} belum pernah dijalankan.`,
    );
    await client.end();
    return;
  }

  const revertedTimestamps = [];

  while (true) {
    const latest = await getLatestMigrationTimestamp(client);
    if (!latest) {
      console.error('Tidak menemukan migration target saat proses revert.');
      await client.end();
      process.exit(1);
    }
    if (latest === targetTimestamp) {
      break;
    }
    runTypeormRevert();
    revertedTimestamps.push(latest);
  }

  runTypeormRevert();

  await client.end();

  if (revertedTimestamps.length > 0) {
    runTypeormRunWithTimestamps(revertedTimestamps);
  }
}

async function printTablesInfo() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nestjs_db',
  });

  await client.connect();

  const tablesResult = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'migrations'
      ORDER BY table_name
    `,
  );

  if (tablesResult.rows.length === 0) {
    console.log(
      'Tidak ada tabel di schema public (selain migrations) setelah revert.',
    );
    await client.end();
    return;
  }

  console.log('Struktur tabel setelah migration:revert:');

  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    console.log(`\nTabel: ${tableName}`);

    const columnsResult = await client.query(
      `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position
      `,
      [tableName],
    );

    for (const col of columnsResult.rows) {
      const nullable = col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL';
      const defaultValue = col.column_default
        ? ` DEFAULT ${col.column_default}`
        : '';
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${nullable}${defaultValue}`,
      );
    }

    const relationsResult = await client.query(
      `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
      `,
      [tableName],
    );

    if (relationsResult.rows.length > 0) {
      console.log('  Relasi (FOREIGN KEY):');
      for (const rel of relationsResult.rows) {
        console.log(
          `    - ${rel.column_name} -> ${rel.foreign_table_name}.${rel.foreign_column_name}`,
        );
      }
    }
  }

  await client.end();
}

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs[0].startsWith('-')) {
    await revertAllMigrations();
  } else {
    await revertSpecificMigration(rawArgs[0]);
  }

  await printTablesInfo();

  console.log('\nMigration revert berhasil dijalankan.');
}

main().catch((err) => {
  console.error('Terjadi kesalahan saat menjalankan migration:revert:', err);
  process.exit(1);
});
```

- isi file `migration-show.js` dengan konfigurasi migrasi show

```js
const { spawnSync } = require('child_process');

const extraArgs = process.argv.slice(2);

const result = spawnSync(
  'npm',
  [
    'run',
    'typeorm',
    '--',
    'migration:show',
    '-d',
    'src/data-source.ts',
    ...extraArgs,
  ],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 0);
```

- script `package.json`

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "node scripts/migration-generate.js",
    "migration:run": "node scripts/migration-run.js",
    "migration:revert": "node scripts/migration-revert.js",
    "migration:show": "node scripts/migration-show.js"
  }
}
```

## 4. Connection Entity

### Buat Manual Entity

- buat folder `entities` di folder `src`

```bash
mkdir -p src/entities
touch src/entities/user.entity.ts
```

atau

### Created Resource

- create resource user

```bash
nest generate resource user --no-spec
```

atau

```bash
nest g res user --no-spec
```

- Pilih REST API

```bash
❯ nest generate resource user --no-spec
? What transport layer do you use?
❯ REST API
  GraphQL (code first)
  GraphQL (schema first)
  Microservice (non-HTTP)
  WebSockets
```

- Pilih Yes untuk membuat controller dan service

```bash
? Would you like to generate CRUD entry points? (y/N)
```

- Struktur folder user yang dihasilkan :

```py
src
├── user
│   ├── dto
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── entities
│   │   └── user.entity.ts
│   ├── user.controller.ts
│   ├── user.module.ts
│   ├── user.service.ts
```

- isi file `user.entity.ts` dengan konfigurasi entity user

```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;
}
```

### migration

- perintah migration generate (semua entity)

```bash
npm run migration:generate CreateUserTable
```

- perintah migration generate (hanya entity tertentu)

```bash
npm run migration:generate User CreateUserTable
```

- perintah migration run (jalankan semua migration pending)

```bash
npm run migration:run
```

- perintah migration run (jalankan migration tertentu berdasarkan timestamp)

```bash
npm run migration:run 1767867653217
```

- perintah migration run (jalankan migration terkait class entity tertentu)

```bash
npm run migration:run User
```

- perintah migration revert (batalkan semua migration yang sudah dijalankan)

```bash
npm run migration:revert
```

- perintah migration revert (batalkan 1 migration tertentu berdasarkan nama file / timestamp)

```bash
npm run migration:revert 1767867653217-CreateContohTable
```

- perintah migration show

```bash
npm run migration:show
```

## 5. Seed Data
