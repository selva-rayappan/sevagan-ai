import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/cache/redis.service';
import { WHATSAPP_PROVIDER } from '../src/infrastructure/messaging/whatsapp.provider.interface';
import { AIService } from '../src/infrastructure/ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { JobStatus, TechnicianStatus, PaymentMode } from '../src/domain/enums';

describe('WhatsApp Integration Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let configService: ConfigService;
  let appSecret: string;

  const customerPhone = '919876543210';
  const technicianPhone = '919100000000';
  const customerName = 'Rajesh';
  const technicianName = 'Kumar';

  const mockWhatsAppProvider = {
    sendText: jest.fn().mockResolvedValue(undefined),
    sendInteractiveButtons: jest.fn().mockResolvedValue(undefined),
    sendInteractiveList: jest.fn().mockResolvedValue(undefined),
    sendImage: jest.fn().mockResolvedValue(undefined),
    sendDocument: jest.fn().mockResolvedValue(undefined),
    markAsRead: jest.fn().mockResolvedValue(undefined),
    downloadMedia: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  };

  // Real Ollama/OpenAI calls in this env fail slowly (network round-trip + timeout)
  // and used to race past this test's fire-and-forget webhook dispatch, causing
  // ConversationStateService to write to Redis after `app.close()` had already
  // torn the connection down ("Connection is closed."). Rejecting immediately
  // reproduces the same "AI unavailable, fall back to menu flow" path the test
  // exercises, without the multi-second real network delay.
  const mockAiService = {
    chat: jest.fn().mockRejectedValue(new Error('AI service unavailable — both Ollama and OpenAI failed')),
  };

  const getSignature = (body: string): string => {
    return `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex')}`;
  };

  const sendWebhookMessage = async (payload: any) => {
    const rawBody = JSON.stringify(payload);
    const signature = getSignature(rawBody);

    return request(app.getHttpServer())
      .post('/api/v1/whatsapp/webhook')
      .set('x-hub-signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(200);
  };

  const buildTextPayload = (from: string, name: string, text: string) => {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234567890', phone_number_id: 'pid' },
                contacts: [{ profile: { name }, wa_id: from }],
                messages: [
                  {
                    from,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  };

  const buildButtonPayload = (from: string, name: string, buttonId: string, title: string) => {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234567890', phone_number_id: 'pid' },
                contacts: [{ profile: { name }, wa_id: from }],
                messages: [
                  {
                    from,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: { id: buttonId, title },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  };

  const buildLocationPayload = (from: string, name: string, latitude: number, longitude: number, locationName: string) => {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234567890', phone_number_id: 'pid' },
                contacts: [{ profile: { name }, wa_id: from }],
                messages: [
                  {
                    from,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'location',
                    location: { latitude, longitude, name: locationName },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  };

  const buildImagePayload = (from: string, name: string, mediaId: string) => {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234567890', phone_number_id: 'pid' },
                contacts: [{ profile: { name }, wa_id: from }],
                messages: [
                  {
                    from,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'image',
                    image: {
                      id: mediaId,
                      mime_type: 'image/jpeg',
                      sha256: 'abc1234567890',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  };

  const cleanup = async () => {
    // Find test tech
    const tech = await prisma.technician.findUnique({ where: { phone: technicianPhone } });
    if (tech) {
      await prisma.technicianSkill.deleteMany({ where: { technicianId: tech.id } });
      await prisma.assignment.deleteMany({ where: { technicianId: tech.id } });
      await prisma.rating.deleteMany({ where: { technicianId: tech.id } });
      await prisma.technicianSettlement.deleteMany({ where: { technicianId: tech.id } });
    }

    // Find test customer
    const customer = await prisma.customer.findUnique({ where: { phone: customerPhone } });
    if (customer) {
      await prisma.rating.deleteMany({ where: { customerId: customer.id } });
      
      const jobs = await prisma.job.findMany({ where: { customerId: customer.id } });
      const jobIds = jobs.map((j) => j.id);
      if (jobIds.length > 0) {
        await prisma.assignment.deleteMany({ where: { jobId: { in: jobIds } } });
        await prisma.jobCommission.deleteMany({ where: { jobId: { in: jobIds } } });
        await prisma.dispute.deleteMany({ where: { jobId: { in: jobIds } } });
        
        const invoices = await prisma.invoice.findMany({ where: { jobId: { in: jobIds } } });
        const invoiceIds = invoices.map((i) => i.id);
        if (invoiceIds.length > 0) {
          await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
        }
        await prisma.invoice.deleteMany({ where: { jobId: { in: jobIds } } });
        await prisma.job.deleteMany({ where: { customerId: customer.id } });
      }
      
      await prisma.customer.delete({ where: { id: customer.id } });
    }

    if (tech) {
      await prisma.technician.delete({ where: { id: tech.id } });
    }

    // Clear Redis keys
    await redis.del(`conv:${customerPhone}`);
    await redis.del(`tech_session:${technicianPhone}`);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WHATSAPP_PROVIDER)
      .useValue(mockWhatsAppProvider)
      .overrideProvider(AIService)
      .useValue(mockAiService)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    configService = app.get(ConfigService);
    appSecret = configService.get<string>('whatsapp.appSecret', '');

    await cleanup();
  }, 30000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('should complete the entire WhatsApp service flow successfully', async () => {
    // 1. Seed technician
    const category = await prisma.serviceCategory.findUnique({
      where: { name: 'Electrical' },
    });
    expect(category).toBeDefined();

    const tech = await prisma.technician.create({
      data: {
        name: technicianName,
        phone: technicianPhone,
        status: TechnicianStatus.AVAILABLE as any,
        serviceArea: 'Virudhunagar',
        language: 'EN',
      },
    });

    await prisma.technicianSkill.create({
      data: {
        technicianId: tech.id,
        categoryId: category!.id,
      },
    });

    // 2. Start Customer flow — Send Hello
    mockWhatsAppProvider.sendInteractiveButtons.mockClear();
    await sendWebhookMessage(buildTextPayload(customerPhone, customerName, 'Hello'));

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockWhatsAppProvider.sendInteractiveButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        body: expect.stringContaining('language'),
      }),
    );

    // 3. Choose English
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildButtonPayload(customerPhone, customerName, 'lang_en', 'English'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify language set message and service menu were sent
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Language set'),
      }),
    );
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Electrical'),
      }),
    );

    // 4. Select Service: 1 (Electrical)
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildTextPayload(customerPhone, customerName, '1'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify prompt for location
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Please share your location'),
      }),
    );

    // 5. Input Location: Share location
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildLocationPayload(customerPhone, customerName, 9.9252, 78.1198, 'Allampatti, Virudhunagar'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify prompt for scheduled time
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('need this service'),
      }),
    );

    // 6. Input Scheduled Time: ASAP
    mockWhatsAppProvider.sendText.mockClear();
    mockWhatsAppProvider.sendInteractiveButtons.mockClear();
    await sendWebhookMessage(buildTextPayload(customerPhone, customerName, 'ASAP'));

    // Wait for job creation & assignment (database updates)
    let assignment: any = null;
    for (let i = 0; i < 30; i++) {
      assignment = await prisma.assignment.findFirst({
        where: { technicianId: tech.id },
      });
      if (assignment) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(assignment).not.toBeNull();

    // Verify customer received job confirmation
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('confirmed'),
      }),
    );

    // Verify technician received job offer
    expect(mockWhatsAppProvider.sendInteractiveButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        to: technicianPhone,
        body: expect.stringContaining('New Job Available'),
      }),
    );

    const dbCustomer = await prisma.customer.findUnique({ where: { phone: customerPhone } });
    expect(dbCustomer).not.toBeNull();

    const job = await prisma.job.findFirst({
      where: { customerId: dbCustomer!.id },
    });
    expect(job).toBeDefined();
    expect(job!.status).toBe(JobStatus.ASSIGNED);

    const dbTechBefore = await prisma.technician.findUnique({ where: { id: tech.id } });
    expect(dbTechBefore).not.toBeNull();
    expect(dbTechBefore!.status).toBe(TechnicianStatus.BUSY);

    // 7. Technician Accepts Offer
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildButtonPayload(technicianPhone, technicianName, 'accept_job', 'Accept'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify job status updated to ACCEPTED
    const acceptedJob = await prisma.job.findUnique({ where: { id: job!.id } });
    expect(acceptedJob).not.toBeNull();
    expect(acceptedJob!.status).toBe(JobStatus.ACCEPTED);

    // Verify customer is notified that job is assigned
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Technician Assigned'),
      }),
    );

    // 8. Technician starts job
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildTextPayload(technicianPhone, technicianName, 'START'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify job status updated to IN_PROGRESS
    const startedJob = await prisma.job.findUnique({ where: { id: job!.id } });
    expect(startedJob).not.toBeNull();
    expect(startedJob!.status).toBe(JobStatus.IN_PROGRESS);

    // Verify customer is notified that job has started
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Work has started'),
      }),
    );

    // 9. Technician uploads photo (during in-progress state)
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildImagePayload(technicianPhone, technicianName, 'media_photo_id'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify photo received confirmation sent to technician
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: technicianPhone,
        text: expect.stringContaining('Photo received'),
      }),
    );

    // Verify photo URL appended in DB
    const jobWithPhoto = await prisma.job.findUnique({ where: { id: job!.id } });
    expect(jobWithPhoto).not.toBeNull();
    expect(jobWithPhoto!.description).toContain('job-photos/');

    // 10. Technician completes job
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildTextPayload(technicianPhone, technicianName, 'COMPLETE 500 CASH'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify job completed in DB (jobAmount and paymentMode set)
    const completedJob = await prisma.job.findUnique({ where: { id: job!.id } });
    expect(completedJob).not.toBeNull();
    expect(completedJob!.status).toBe(JobStatus.COMPLETED);
    expect(Number(completedJob!.jobAmount)).toBe(500);
    expect(completedJob!.paymentMode).toBe(PaymentMode.CASH);

    // Verify customer is asked to confirm payment amount
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Amount: ₹500'),
      }),
    );

    // 11. Customer confirms payment amount
    mockWhatsAppProvider.sendText.mockClear();
    await sendWebhookMessage(buildTextPayload(customerPhone, customerName, '1'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify commission is recorded in database
    const commission = await prisma.jobCommission.findUnique({
      where: { jobId: job!.id },
    });
    expect(commission).not.toBeNull();
    
    // Fetch active CASH commission rule dynamically to handle database state variations
    const activeCashRule = await prisma.commissionRule.findFirst({
      where: { paymentMode: PaymentMode.CASH, active: true },
    });
    const expectedCommissionAmount = activeCashRule
      ? activeCashRule.commissionType === 'FLAT'
        ? Number(activeCashRule.commissionValue)
        : Math.round((500 * Number(activeCashRule.commissionValue)) / 100 * 100) / 100
      : 0;
    const expectedTechnicianAmount = Math.round((500 - expectedCommissionAmount) * 100) / 100;

    expect(Number(commission!.commissionAmount)).toBe(expectedCommissionAmount);
    expect(Number(commission!.technicianAmount)).toBe(expectedTechnicianAmount);

    // Verify technician status is now AVAILABLE again
    const dbTechAfter = await prisma.technician.findUnique({ where: { id: tech.id } });
    expect(dbTechAfter).not.toBeNull();
    expect(dbTechAfter!.status).toBe(TechnicianStatus.AVAILABLE);

    // Verify customer is asked to rate the service
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Please rate'),
      }),
    );

    // 12. Customer rates 5 stars
    mockWhatsAppProvider.sendText.mockClear();
    const techBeforeRating = await prisma.technician.findUnique({ where: { id: tech.id } });
    expect(techBeforeRating).not.toBeNull();
    const initialTrust = techBeforeRating!.trustScore;

    await sendWebhookMessage(buildTextPayload(customerPhone, customerName, '5'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify rating is recorded in DB
    const dbRating = await prisma.rating.findUnique({
      where: { jobId: job!.id },
    });
    expect(dbRating).not.toBeNull();
    expect(dbRating!.rating).toBe(5);

    // Verify technician rating updated
    const techAfterRating = await prisma.technician.findUnique({ where: { id: tech.id } });
    expect(techAfterRating).not.toBeNull();
    expect(Number(techAfterRating!.rating)).toBe(5);
    // Positive rating (4-5 stars) increases trust score by 2
    expect(techAfterRating!.trustScore).toBe(initialTrust + 2);

    // Verify thank you message sent to customer
    expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customerPhone,
        text: expect.stringContaining('Thank you for rating'),
      }),
    );
  }, 30000);
});
