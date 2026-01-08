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
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT as string, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/entities/*.entity{.ts,.js}'],
  migrations: ['migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
```

### Entity

- buat folder `entities` di folder `src`

```bash
mkdir -p src/entities
touch src/entities/user.entity.ts
```

atau

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

### Migration

- buat folder `migrations` di folder `src`

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

- isi file `migration-generate.js` dengan konfigurasi migrasi generate

```js
const { spawnSync } = require('child_process');

const name = process.argv[2];

if (!name) {
  console.error(
    'Nama migrasi wajib diisi. Contoh: npm run migration:generate CreateUserTable',
  );
  process.exit(1);
}

const migrationPath = `migrations/${name}`;

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
  ],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 0);
```

- isi file `migration-run.js` dengan konfigurasi migrasi run

```js
const { spawnSync } = require('child_process');

const result = spawnSync(
  'npm',
  ['run', 'typeorm', '--', 'migration:run', '-d', 'src/data-source.ts'],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 0);
```

- isi file `migration-run.js` dengan konfigurasi migrasi run

```js
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const extraArgs = process.argv.slice(2);

const result = spawnSync(
  'npm',
  [
    'run',
    'typeorm',
    '--',
    'migration:run',
    '-d',
    'src/data-source.ts',
    ...extraArgs,
  ],
  {
    encoding: 'utf8',
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

const extraArgs = process.argv.slice(2);

const result = spawnSync(
  'npm',
  [
    'run',
    'typeorm',
    '--',
    'migration:revert',
    '-d',
    'src/data-source.ts',
    ...extraArgs,
  ],
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

printTablesInfo()
  .then(() => {
    console.log('\nMigration revert berhasil dijalankan.');
  })
  .catch((err) => {
    console.error(
      'Gagal menampilkan struktur tabel setelah revert:',
      err.message,
    );
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

- perbaharui `eslint.config.mjs`

```js
export default tseslint.config({
  ignores: ['eslint.config.mjs', 'scripts/**/*'],
}
...
);
```

- perintah migration generate

```bash
npm run migration:generate CreateContohTable
```

- perintah migration run

```bash
npm run migration:run
```

- perintah migration revert

```bash
npm run migration:revert
```

- perintah migration show

```bash
npm run migration:show
```

## 4. Uji Coba

### buat table baru

- Buat Resource Contoh

```bash
nest generate resource contoh --no-spec
```

- isi file `contoh.entity.ts` dengan konfigurasi entity contoh

```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Contoh {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nama: string;
}
```

- perintah migration generate

```bash
npm run migration:generate CreateContohTable
```

- perintah migration run

```bash
npm run migration:run
```

- perintah migration show

```bash
npm run migration:show
```

- perintah migration revert

```bash
npm run migration:revert
```
