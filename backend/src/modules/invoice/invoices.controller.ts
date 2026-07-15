import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { Public } from '../auth/public.decorator';

/**
 * Unauthenticated by design — this is the link sent to customers over
 * WhatsApp (and fetched by Meta's servers to attach the document), so it
 * can't sit behind our JWT auth. Guarded only by the invoice UUID itself.
 */
@Public()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const result = await this.invoiceService.getInvoicePdfBuffer(id);
    if (!result) {
      res.status(404).json({ message: 'Invoice PDF not found' });
      return;
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${result.invoiceNumber}.pdf"`,
    });
    res.send(result.buffer);
  }
}
