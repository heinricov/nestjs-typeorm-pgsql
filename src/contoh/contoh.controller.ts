import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ContohService } from './contoh.service';
import { CreateContohDto } from './dto/create-contoh.dto';
import { UpdateContohDto } from './dto/update-contoh.dto';

@Controller('contoh')
export class ContohController {
  constructor(private readonly contohService: ContohService) {}

  @Post()
  create(@Body() createContohDto: CreateContohDto) {
    return this.contohService.create(createContohDto);
  }

  @Get()
  findAll() {
    return this.contohService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contohService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContohDto: UpdateContohDto) {
    return this.contohService.update(+id, updateContohDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contohService.remove(+id);
  }
}
