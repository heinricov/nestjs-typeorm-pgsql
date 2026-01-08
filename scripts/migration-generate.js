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
