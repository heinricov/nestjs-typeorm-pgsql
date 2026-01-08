import { PartialType } from '@nestjs/mapped-types';
import { CreateContohDto } from './create-contoh.dto';

export class UpdateContohDto extends PartialType(CreateContohDto) {}
