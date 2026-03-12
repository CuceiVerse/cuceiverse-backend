import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SiiauService } from './siiau.service';
import type { SiiauSnapshotRequestDto } from './dto/siiau.dto';

@Controller('siiau')
@UseGuards(AuthGuard('jwt'))
export class SiiauController {
  constructor(private readonly siiau: SiiauService) {}

  @Get('status')
  status() {
    return this.siiau.status();
  }

  @Post('snapshot')
  snapshot(@Body() body: SiiauSnapshotRequestDto) {
    return this.siiau.fetchSnapshot(body);
  }
}
