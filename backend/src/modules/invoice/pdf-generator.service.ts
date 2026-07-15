import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import { Language } from '../../domain/enums';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  customerPhone: string;
  jobNumber: string;
  serviceCategory: string;
  location: string;
  technicianName: string;
  jobAmount: number;
  commissionAmount: number;
  technicianAmount: number;
  paymentMode: string;
  language: Language;
}

const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');
const TAMIL_REGULAR = path.join(FONTS_DIR, 'NotoSansTamil-Regular.woff');
const TAMIL_BOLD = path.join(FONTS_DIR, 'NotoSansTamil-Bold.woff');

@Injectable()
export class PdfGeneratorService {
  async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const isTA = data.language === Language.TA;

      // PDFKit's built-in Standard-14 fonts (Helvetica etc.) are Latin-only —
      // Tamil text renders as missing-glyph boxes/garbage unless we embed a
      // font with Tamil coverage instead.
      if (isTA) {
        doc.registerFont('Body', TAMIL_REGULAR);
        doc.registerFont('Body-Bold', TAMIL_BOLD);
      } else {
        doc.registerFont('Body', 'Helvetica');
        doc.registerFont('Body-Bold', 'Helvetica-Bold');
      }

      // ── Header ──────────────────────────────────────────────────────────
      doc
        .fontSize(24)
        .font('Body-Bold')
        .text('SEVAGAN HOMESERVICES', { align: 'center' });

      doc
        .fontSize(10)
        .font('Body')
        .text(isTA ? 'வீட்டு சேவை நிபுணர்கள்' : 'Home Service Experts', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#2563eb')
        .lineWidth(2)
        .stroke();

      doc.moveDown(1);

      // ── Invoice Info ────────────────────────────────────────────────────
      doc
        .fontSize(16)
        .font('Body-Bold')
        .fillColor('#1e293b')
        .text(isTA ? 'விலைப்பட்டியல்' : 'INVOICE', { align: 'left' });

      doc.moveDown(0.5);
      doc.fontSize(10).font('Body').fillColor('#334155');

      this.addRow(doc, isTA ? 'விலைப்பட்டியல் எண்' : 'Invoice Number', data.invoiceNumber);
      this.addRow(doc, isTA ? 'தேதி' : 'Date', data.invoiceDate.toLocaleDateString('en-IN'));
      this.addRow(doc, isTA ? 'வேலை எண்' : 'Job Number', data.jobNumber);

      doc.moveDown(1);

      // ── Customer Details ────────────────────────────────────────────────
      doc
        .fontSize(12)
        .font('Body-Bold')
        .fillColor('#1e293b')
        .text(isTA ? 'வாடிக்கையாளர் விவரங்கள்' : 'Customer Details');

      doc.moveDown(0.3);
      doc.fontSize(10).font('Body').fillColor('#334155');

      this.addRow(doc, isTA ? 'பெயர்' : 'Name', data.customerName || 'N/A');
      this.addRow(doc, isTA ? 'தொலைபேசி' : 'Phone', data.customerPhone);
      this.addRow(doc, isTA ? 'இடம்' : 'Location', data.location);

      doc.moveDown(1);

      // ── Service Details ─────────────────────────────────────────────────
      doc
        .fontSize(12)
        .font('Body-Bold')
        .fillColor('#1e293b')
        .text(isTA ? 'சேவை விவரங்கள்' : 'Service Details');

      doc.moveDown(0.3);
      doc.fontSize(10).font('Body').fillColor('#334155');

      this.addRow(doc, isTA ? 'சேவை' : 'Service', data.serviceCategory);
      this.addRow(doc, isTA ? 'தொழில்நுட்பர்' : 'Technician', data.technicianName);
      this.addRow(doc, isTA ? 'கட்டணமுறை' : 'Payment Mode', data.paymentMode);

      doc.moveDown(1);

      // ── Amount Breakdown ────────────────────────────────────────────────
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.moveDown(0.5);

      doc
        .fontSize(12)
        .font('Body-Bold')
        .fillColor('#1e293b')
        .text(isTA ? 'தொகை விவரம்' : 'Amount Breakdown');

      doc.moveDown(0.3);
      doc.fontSize(10).font('Body').fillColor('#334155');

      this.addRow(doc, isTA ? 'மொத்த தொகை' : 'Total Amount', `₹${data.jobAmount.toFixed(2)}`);
      this.addRow(doc, isTA ? 'சேவை கட்டணம்' : 'Service Fee', `₹${data.commissionAmount.toFixed(2)}`);

      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font('Body-Bold')
        .fillColor('#2563eb');
      this.addRow(doc, isTA ? 'செலுத்தவேண்டிய தொகை' : 'Amount Paid', `₹${data.jobAmount.toFixed(2)}`);

      doc.moveDown(1.5);

      // ── Footer ──────────────────────────────────────────────────────────
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#2563eb')
        .lineWidth(1)
        .stroke();

      doc.moveDown(0.5);
      doc
        .fontSize(8)
        .font('Body')
        .fillColor('#64748b')
        .text(
          isTA
            ? 'நன்றி! உங்கள் ஆதரவுக்கு நன்றி. ஏதேனும் கேள்விகள் இருந்தால் எங்களை தொடர்பு கொள்ளவும்.'
            : 'Thank you for choosing Sevagan Homeservices! For any queries, please contact us via WhatsApp.',
          { align: 'center' },
        );

      doc.end();
    });
  }

  private addRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
    const y = doc.y;
    doc.text(`${label}:`, 50, y, { continued: false });
    doc.text(value, 250, y);
    doc.moveDown(0.3);
  }
}
