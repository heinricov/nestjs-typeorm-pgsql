/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { CreateContohDto } from './dto/create-contoh.dto';
import { UpdateContohDto } from './dto/update-contoh.dto';

@Injectable()
export class ContohService {
  create(createContohDto: CreateContohDto) {
    return 'This action adds a new contoh';
  }

  findAll() {
    return `This action returns all contoh`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contoh`;
  }

  update(id: number, updateContohDto: UpdateContohDto) {
    return `This action updates a #${id} contoh`;
  }

  remove(id: number) {
    return `This action removes a #${id} contoh`;
  }
}
