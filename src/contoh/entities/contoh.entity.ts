import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Contoh {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nama: string;
}
