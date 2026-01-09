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
    [
      'run',
      'typeorm',
      '--',
      'migration:revert',
      '-d',
      'database/data-source.ts',
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
    ['run', 'typeorm', '--', 'migration:run', '-d', 'database/data-source.ts'],
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
