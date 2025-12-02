// order-service/src/payment/stripe.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-10-29.clover',
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'vnd') {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount), // VND → cent
      currency,
      automatic_payment_methods: { enabled: true },
    });
  }
}
