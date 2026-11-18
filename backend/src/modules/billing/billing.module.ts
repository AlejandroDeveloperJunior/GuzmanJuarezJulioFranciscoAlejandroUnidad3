import { Module } from '@nestjs/common';
import { PaymentGatewayAdapter } from './payment-gateway.adapter';

@Module({
  providers: [PaymentGatewayAdapter],
  exports: [PaymentGatewayAdapter],
})
export class BillingModule {}
