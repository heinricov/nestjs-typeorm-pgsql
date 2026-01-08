import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ContohModule } from './contoh/contoh.module';

@Module({
  imports: [UserModule, ContohModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
