import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBody,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { RazorpayService } from './razorpay.service';
import { PaymentService } from './payment.service';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { AuditService } from '../../infrastructure/audit/audit.service';

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment_link?: { entity: { id: string; status: string } };
  };
}

@Public()
@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly paymentService: PaymentService,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: RazorpayWebhookPayload,
    @RawBody() rawBody: Buffer,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ): Promise<{ status: string }> {
    if (!this.razorpayService.verifyWebhookSignature(rawBody, signature)) {
      await this.auditService.log({
        actorType: 'UNKNOWN',
        action: 'RAZORPAY_WEBHOOK_SIGNATURE_REJECTED',
        entityType: 'RazorpayWebhook',
        metadata: { event: payload?.event },
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (payload.event === 'payment_link.paid') {
      const linkId = payload.payload.payment_link?.entity?.id;
      if (linkId) {
        const payment = await this.paymentService.confirmPaymentByRazorpayLinkId(linkId);
        if (payment) {
          await this.invoiceRepository.updateStatus(payment.invoiceId, 'PAID');
          this.logger.log(`Payment ${payment.id} confirmed via Razorpay webhook (link ${linkId})`);
        }
      }
    }

    return { status: 'ok' };
  }
}
