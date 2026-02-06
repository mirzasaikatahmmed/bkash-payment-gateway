import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BkashService } from './bkash.service';

@Module({
  imports: [HttpModule],
  providers: [BkashService],
  exports: [BkashService],
})
export class BkashModule {}
