import {
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly transfersService: TransfersService,
  ) {}

  @Post()
  createTransfer(
    @Body()
    body: {
      fromWalletId: string;
      toWalletId: string;
      amountKobo: number;
    },
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.transfersService.createTransfer(
      body.fromWalletId,
      body.toWalletId,
      body.amountKobo,
      idempotencyKey,
    );
  }
}
