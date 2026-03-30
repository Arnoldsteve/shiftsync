import { Module } from '@nestjs/common';
import { CsvService } from './csv.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CsvService],
  exports: [CsvService],
})
export class CsvModule {}
