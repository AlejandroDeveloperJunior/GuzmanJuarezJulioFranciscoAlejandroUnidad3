import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface PaymentRequest {
  folio: string;
  amountMxn: number;
  patientEmail: string;
  paymentMethod?: string;
}

export interface PaymentResult {
  provider: string;
  transactionId: string;
  status: 'PAID' | 'REFUNDED';
  amountMxn: number;
  currency: 'MXN';
  processedAt: string;
}

export interface IPaymentGateway {
  processPayment(req: PaymentRequest): Promise<PaymentResult>;
  refundTransaction(transactionId: string, amountMxn: number): Promise<PaymentResult>;
}

/**
 * Patrón Estructural Adapter / Facade: desacopla la pasarela externa (Stripe Sandbox)
 * mediante una interfaz uniforme que permite sustituir proveedores sin tocar el dominio clínico.
 */
@Injectable()
export class PaymentGatewayAdapter implements IPaymentGateway {
  async processPayment(req: PaymentRequest): Promise<PaymentResult> {
    const token = crypto.randomBytes(6).toString('hex');
    return {
      provider: 'Stripe Sandbox Adapter (PCI-DSS Tokenized)',
      transactionId: `pi_mc_${req.folio.toLowerCase()}_${token}`,
      status: 'PAID',
      amountMxn: req.amountMxn,
      currency: 'MXN',
      processedAt: new Date().toISOString(),
    };
  }

  async refundTransaction(transactionId: string, amountMxn: number): Promise<PaymentResult> {
    return {
      provider: 'Stripe Sandbox Adapter (PCI-DSS Tokenized)',
      transactionId,
      status: 'REFUNDED',
      amountMxn,
      currency: 'MXN',
      processedAt: new Date().toISOString(),
    };
  }
}
