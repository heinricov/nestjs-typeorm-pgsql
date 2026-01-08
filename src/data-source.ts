import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config(); // Muat variabel lingkungan dari .env

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
