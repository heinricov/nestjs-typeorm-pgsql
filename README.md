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

- isi file `data-source.ts` dengan konfigurasi database connection yang bisa di lihat di [data-source.ts](src/data-source.ts)

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

- isi file `migration-generate.js` dengan konfigurasi migrasi generate yang bisa di lihat di [migration-generate.js](scripts/migration-generate.js)

- isi file `migration-run.js` dengan konfigurasi migrasi run yang bisa di lihat di [migration-run.js](scripts/migration-run.js)

- isi file `migration-revert.js` dengan konfigurasi migrasi revert yang bisa di lihat di [migration-revert.js](scripts/migration-revert.js)

- isi file `migration-show.js` dengan konfigurasi migrasi show yang bisa di lihat di [migration-show.js](scripts/migration-show.js)
  `

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
