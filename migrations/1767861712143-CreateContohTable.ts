import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContohTable1767861712143 implements MigrationInterface {
  name = 'CreateContohTable1767861712143';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contoh" ("id" SERIAL NOT NULL, "nama" character varying NOT NULL, CONSTRAINT "PK_22381c1fc4de1020f8a76df2a59" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contoh"`);
  }
}
