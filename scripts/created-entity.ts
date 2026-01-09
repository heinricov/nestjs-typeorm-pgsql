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
    console.error('Argumen wajib: npm run create:entity NamaEntity');
    process.exit(1);
  }

  const className = toPascalCase(rawName);
  const fileBaseName = toFileName(rawName);

  const entitiesDir = path.resolve(process.cwd(), 'src', 'entities');
  const filePath = path.join(entitiesDir, `${fileBaseName}.entity.ts`);

  if (!fs.existsSync(entitiesDir)) {
    fs.mkdirSync(entitiesDir, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    console.error(`File sudah ada: ${filePath}`);
    process.exit(1);
  }

  const content = `import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ${className} {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
`;

  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log('Entity berhasil dibuat:');
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
  let updated = content;
  if (!updated.includes(importLine)) {
    const lines = updated.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine);
      updated = lines.join('\n');
    }
  }
  updated = updated.replace(
    /const baseEntities\s*=\s*\[([^\]]*)\];/s,
    (match, group) => {
      const entries = group
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0);
      if (!entries.includes(className)) {
        entries.push(className);
      }
      return `const baseEntities = [${entries.join(', ')}];`;
    },
  );
  fs.writeFileSync(dataSourcePath, updated, { encoding: 'utf8' });
  console.log('AppDataSource berhasil diupdate:');
  console.log('data-source.ts');
}
