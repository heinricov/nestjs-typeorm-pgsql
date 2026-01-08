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
