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
