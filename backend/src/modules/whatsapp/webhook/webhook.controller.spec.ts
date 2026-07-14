import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { CustomerBotService } from '../customer-bot/customer-bot.service';
import { TechnicianBotService } from '../technician-bot/technician-bot.service';
import { TechniciansRepository } from '../../technicians/technicians.repository';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import {
  InboundWhatsAppMessage,
  WhatsAppStatusUpdate,
} from '../../../infrastructure/messaging/types/inbound-message.types';

const mockConfigGet = jest.fn();
const mockHandleMessage = jest.fn().mockResolvedValue(undefined);
const mockTechHandleMessage = jest.fn().mockResolvedValue(undefined);
const mockFindByPhone = jest.fn().mockResolvedValue(null); // default: not a technician
const mockAuditLog = jest.fn().mockResolvedValue(undefined);

describe('WebhookController', () => {
  let controller: WebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: ConfigService,
          useValue: { get: mockConfigGet },
        },
        {
          provide: CustomerBotService,
          useValue: { handleMessage: mockHandleMessage },
        },
        {
          provide: TechnicianBotService,
          useValue: { handleMessage: mockTechHandleMessage },
        },
        {
          provide: TechniciansRepository,
          useValue: { findByPhone: mockFindByPhone },
        },
        {
          provide: AuditService,
          useValue: { log: mockAuditLog },
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  afterEach(() => {
    mockConfigGet.mockReset();
    mockHandleMessage.mockReset();
    mockHandleMessage.mockResolvedValue(undefined);
    mockTechHandleMessage.mockReset();
    mockTechHandleMessage.mockResolvedValue(undefined);
    mockFindByPhone.mockReset();
    mockFindByPhone.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook()', () => {
    it('returns the hub challenge when mode and token are valid', () => {
      mockConfigGet.mockReturnValue('my-verify-token');

      const result = controller.verifyWebhook('subscribe', 'my-verify-token', 'challenge_abc');

      expect(result).toBe('challenge_abc');
    });

    it('throws ForbiddenException when token does not match', () => {
      mockConfigGet.mockReturnValue('correct-token');

      expect(() =>
        controller.verifyWebhook('subscribe', 'wrong-token', 'challenge'),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when mode is not subscribe', () => {
      mockConfigGet.mockReturnValue('my-verify-token');

      expect(() =>
        controller.verifyWebhook('unsubscribe', 'my-verify-token', 'challenge'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('handleWebhook()', () => {
    const rawBody = Buffer.from('{}');

    const buildPayload = (
      messages: InboundWhatsAppMessage[] = [],
      statuses: WhatsAppStatusUpdate[] = [],
    ) => ({
      object: 'whatsapp_business_account' as const,
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages' as const,
              value: {
                messaging_product: 'whatsapp' as const,
                metadata: { display_phone_number: '1234567890', phone_number_id: 'pid' },
                contacts: [{ profile: { name: 'Rajesh' }, wa_id: '919876543210' }],
                messages,
                statuses,
              },
            },
          ],
        },
      ],
    });

    it('returns { status: ok } for a valid text message payload', () => {
      const payload = buildPayload([
        {
          from: '919876543210',
          id: 'msg_001',
          timestamp: '1718000000',
          type: 'text',
          text: { body: 'Hello' },
        },
      ]);

      const result = controller.handleWebhook(payload, rawBody);
      expect(result).toEqual({ status: 'ok' });
    });

    it('routes to CustomerBotService when sender is not a technician (fire-and-forget)', async () => {
      mockFindByPhone.mockResolvedValue(null);
      const payload = buildPayload([
        {
          from: '919876543210',
          id: 'msg_001',
          timestamp: '1718000000',
          type: 'text',
          text: { body: 'Hello' },
        },
      ]);

      controller.handleWebhook(payload, rawBody);

      // Let pending microtasks flush
      await Promise.resolve();
      await Promise.resolve();

      expect(mockHandleMessage).toHaveBeenCalledWith(
        expect.objectContaining({ from: '919876543210', type: 'text' }),
        'Rajesh',
      );
      expect(mockTechHandleMessage).not.toHaveBeenCalled();
    });

    it('routes to TechnicianBotService when sender is a registered technician', async () => {
      const fakeTechnician = { id: 'tech-1', phone: '919876543210', name: 'Kumar' };
      mockFindByPhone.mockResolvedValue(fakeTechnician);

      const payload = buildPayload([
        {
          from: '919876543210',
          id: 'msg_001',
          timestamp: '1718000000',
          type: 'text',
          text: { body: 'STATUS' },
        },
      ]);

      controller.handleWebhook(payload, rawBody);

      await Promise.resolve();
      await Promise.resolve();

      expect(mockTechHandleMessage).toHaveBeenCalledWith(
        expect.objectContaining({ from: '919876543210', type: 'text' }),
        'Rajesh',
        fakeTechnician,
      );
      expect(mockHandleMessage).not.toHaveBeenCalled();
    });

    it('does not crash when CustomerBotService rejects', async () => {
      mockHandleMessage.mockRejectedValue(new Error('Bot error'));

      const payload = buildPayload([
        {
          from: '919876543210',
          id: 'msg_001',
          timestamp: '1718000000',
          type: 'text',
          text: { body: 'Hello' },
        },
      ]);

      expect(() => controller.handleWebhook(payload, rawBody)).not.toThrow();
      await Promise.resolve();
    });

    it('returns { status: ok } for a button reply payload', () => {
      const payload = buildPayload([
        {
          from: '919876543210',
          id: 'msg_002',
          timestamp: '1718000001',
          type: 'interactive',
          interactive: { type: 'button_reply', button_reply: { id: '1', title: 'Accept' } },
        },
      ]);

      const result = controller.handleWebhook(payload, rawBody);
      expect(result).toEqual({ status: 'ok' });
    });

    it('returns { status: ok } for a location payload', () => {
      const payload = buildPayload([
        {
          from: '919876543210',
          id: 'msg_003',
          timestamp: '1718000002',
          type: 'location',
          location: { latitude: 9.9252, longitude: 78.1198, name: 'Virudhunagar' },
        },
      ]);

      const result = controller.handleWebhook(payload, rawBody);
      expect(result).toEqual({ status: 'ok' });
    });

    it('returns { status: ok } for a status-only update (no messages)', () => {
      const payload = buildPayload([], [
        { id: 'msg_001', status: 'delivered', timestamp: '1718000010', recipient_id: '919876543210' },
      ]);

      const result = controller.handleWebhook(payload, rawBody);
      expect(result).toEqual({ status: 'ok' });
    });

    it('throws BadRequestException for unrecognised webhook object type', () => {
      const payload = { object: 'page', entry: [] } as any;
      expect(() => controller.handleWebhook(payload, rawBody)).toThrow(BadRequestException);
    });

    it('handles empty entry array gracefully', () => {
      const payload = { object: 'whatsapp_business_account' as const, entry: [] };
      expect(controller.handleWebhook(payload, rawBody)).toEqual({ status: 'ok' });
    });

    it('falls back to "Unknown" sender name when contact is not found', () => {
      const payload = buildPayload([
        {
          from: '910000000000',
          id: 'msg_004',
          timestamp: '1718000099',
          type: 'text' as const,
          text: { body: 'Test' },
        },
      ]);
      // contacts only has '919876543210' — the message sender '910000000000' has no matching contact
      expect(() => controller.handleWebhook(payload, rawBody)).not.toThrow();
      expect(controller.handleWebhook(payload, rawBody)).toEqual({ status: 'ok' });
    });
  });
});
