import * as fs from 'fs';
import * as path from 'path';

function toPascalCase(name: string): string {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toFileName(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/_/g, '-').toLowerCase();
}

function main() {
  const args = process.argv.slice(2);
  const rawName = args[0];

  if (!rawName) {
    console.error('Argumen wajib: npm run remove:entity NamaEntity');
    process.exit(1);
  }

  const className = toPascalCase(rawName);
  const fileBaseName = toFileName(rawName);

  const entitiesDir = path.resolve(process.cwd(), 'src', 'entities');
  const filePath = path.join(entitiesDir, `${fileBaseName}.entity.ts`);

  if (!fs.existsSync(filePath)) {
    console.error(`File entity tidak ditemukan: ${filePath}`);
    process.exit(1);
  }

  fs.unlinkSync(filePath);
  console.log('Entity berhasil dihapus:');
  console.log(`${fileBaseName}.entity.ts`);

  updateDataSource(className, fileBaseName);
}

main();

function updateDataSource(className: string, fileBaseName: string) {
  const dataSourcePath = path.resolve(
    process.cwd(),
    'database',
    'data-source.ts',
  );
  if (!fs.existsSync(dataSourcePath)) {
    return;
  }
  const content = fs.readFileSync(dataSourcePath, { encoding: 'utf8' });
  const importLine = `import { ${className} } from '../src/entities/${fileBaseName}.entity';`;

  const lines = content.split('\n').filter((line) => line !== importLine);
  let updated = lines.join('\n');

  updated = updated.replace(
    /const baseEntities\s*=\s*\[([^\]]*)\];/s,
    (match, group) => {
      const entries = group
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0 && e !== className);
      return `const baseEntities = [${entries.join(', ')}];`;
    },
  );

  fs.writeFileSync(dataSourcePath, updated, { encoding: 'utf8' });
  console.log('AppDataSource berhasil diupdate:');
  console.log('data-source.ts');
}
