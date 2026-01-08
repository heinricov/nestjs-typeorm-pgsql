import { Module } from '@nestjs/common';
import { ContohService } from './contoh.service';
import { ContohController } from './contoh.controller';

@Module({
  controllers: [ContohController],
  providers: [ContohService],
})
export class ContohModule {}
