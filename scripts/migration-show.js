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
