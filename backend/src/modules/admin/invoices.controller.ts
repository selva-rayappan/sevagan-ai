import { Controller, Get, Param, Post, Query, Res, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { InvoiceRepository } from '../invoice/invoice.repository';
import { InvoiceService } from '../invoice/invoice.service';
import { PaymentRepository } from '../payment/payment.repository';
import { PaymentService } from '../payment/payment.service';
import { AdminRole } from '../../domain/enums';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@UseInterceptors(AuditInterceptor)
@Controller('admin/invoices')
export class InvoicesController {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceService: InvoiceService,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentService: PaymentService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoiceRepository.findAll({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.invoiceRepository.findById(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const result = await this.invoiceService.getInvoicePdfBuffer(id);
    if (!result) {
      res.status(404).json({ message: 'Invoice PDF not found' });
      return;
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.invoiceNumber}.pdf"`,
    });
    res.send(result.buffer);
  }

  @Roles(AdminRole.ADMIN)
  @Post(':id/confirm-payment')
  async confirmPayment(@Param('id') invoiceId: string, @CurrentUser() user: CurrentUserPayload) {
    const payment = await this.paymentRepository.findByInvoiceId(invoiceId);
    if (!payment) {
      return { message: 'No payment record found for this invoice' };
    }
    const confirmed = await this.paymentService.confirmPayment(payment.id);
    await this.invoiceRepository.updateStatus(invoiceId, 'PAID');

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'CONFIRM_PAYMENT',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: { paymentId: payment.id },
    });

    return confirmed;
  }
}
