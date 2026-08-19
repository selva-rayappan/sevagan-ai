import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';

describe('MetaWhatsAppProvider', () => {
  let provider: MetaWhatsAppProvider;
  let mockPost: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaWhatsAppProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue = '') => defaultValue,
          },
        },
      ],
    }).compile();

    provider = module.get<MetaWhatsAppProvider>(MetaWhatsAppProvider);

    // Swap out the internal axios instance with a controllable mock.
    // The constructor already ran (creating a real AxiosInstance pointing to an
    // empty base URL — harmless). We replace it before any test method is called.
    mockPost = jest.fn().mockResolvedValue({ data: { messages: [{ id: 'wamid.test' }] } });
    (provider as any).client = { post: mockPost };
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('sendText()', () => {
    it('posts a text message with the correct shape', async () => {
      await provider.sendText({ to: '919876543210', text: 'Hello from Sevagan!' });

      expect(mockPost).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '919876543210',
          type: 'text',
          text: { preview_url: false, body: 'Hello from Sevagan!' },
        }),
      );
    });

    it('propagates API errors after logging', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));
      await expect(provider.sendText({ to: '919876543210', text: 'Hi' })).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('sendTemplate()', () => {
    it('posts a template message with named body parameters', async () => {
      await provider.sendTemplate({
        to: '919876543210',
        templateName: 'technician_welcome',
        languageCode: 'en_US',
        bodyParams: [
          { name: 'service_name', value: 'Electrical' },
          { name: 'service_area', value: 'Virudhunagar' },
        ],
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '919876543210',
          type: 'template',
          template: {
            name: 'technician_welcome',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', parameter_name: 'service_name', text: 'Electrical' },
                  { type: 'text', parameter_name: 'service_area', text: 'Virudhunagar' },
                ],
              },
            ],
          },
        }),
      );
    });

    it('posts a header image component when headerImageUrl is given, with no body params', async () => {
      await provider.sendTemplate({
        to: '919876543210',
        templateName: 'technician_welcome',
        languageCode: 'en',
        headerImageUrl: 'https://sevagan.co.in/index_files/logo-new.png',
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.template).toEqual({
        name: 'technician_welcome',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [{ type: 'image', image: { link: 'https://sevagan.co.in/index_files/logo-new.png' } }],
          },
        ],
      });
    });

    it('puts the header component before the body component when both are given', async () => {
      await provider.sendTemplate({
        to: '919876543210',
        templateName: 'order_confirmation',
        languageCode: 'en_US',
        headerImageUrl: 'https://sevagan.co.in/index_files/logo-new.png',
        bodyParams: [{ name: 'customer_name', value: 'Kumar' }],
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.template.components.map((c: { type: string }) => c.type)).toEqual(['header', 'body']);
    });

    it('omits components when no body parameters are given', async () => {
      await provider.sendTemplate({
        to: '919876543210',
        templateName: 'technician_welcome',
        languageCode: 'ta',
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.template).toEqual({
        name: 'technician_welcome',
        language: { code: 'ta' },
      });
    });

    it('propagates API errors after logging', async () => {
      mockPost.mockRejectedValue(new Error('Template not approved'));
      await expect(
        provider.sendTemplate({ to: '919876543210', templateName: 'technician_welcome', languageCode: 'en_US' }),
      ).rejects.toThrow('Template not approved');
    });

    it('posts a quick-reply button component per payload, in order, after the body', async () => {
      await provider.sendTemplate({
        to: '919876543210',
        templateName: 'technician_job_offer_v2',
        languageCode: 'en',
        bodyParams: [{ name: 'customer_name', value: 'Yarl Enterprises' }],
        quickReplyPayloads: ['accept_job', 'reject_job'],
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.template.components).toEqual([
        {
          type: 'body',
          parameters: [{ type: 'text', parameter_name: 'customer_name', text: 'Yarl Enterprises' }],
        },
        { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'accept_job' }] },
        { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'reject_job' }] },
      ]);
    });

    it('omits components when quickReplyPayloads is empty', async () => {
      await provider.sendTemplate({
        to: '919876543210',
        templateName: 'technician_job_offer_v2',
        languageCode: 'en',
        quickReplyPayloads: [],
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.template).toEqual({
        name: 'technician_job_offer_v2',
        language: { code: 'en' },
      });
    });
  });

  describe('sendInteractiveButtons()', () => {
    it('posts an interactive button message with correct action shape', async () => {
      await provider.sendInteractiveButtons({
        to: '919876543210',
        body: 'New job available. Accept?',
        buttons: [
          { id: '1', title: 'Accept' },
          { id: '2', title: 'Reject' },
        ],
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.type).toBe('interactive');
      expect(payload.interactive.type).toBe('button');
      expect(payload.interactive.action.buttons).toHaveLength(2);
      expect(payload.interactive.action.buttons[0].reply.id).toBe('1');
    });

    it('throws when more than 3 buttons are provided', async () => {
      await expect(
        provider.sendInteractiveButtons({
          to: '919876543210',
          body: 'Choose:',
          buttons: [
            { id: '1', title: 'A' },
            { id: '2', title: 'B' },
            { id: '3', title: 'C' },
            { id: '4', title: 'D' },
          ],
        }),
      ).rejects.toThrow('limited to 3');
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('truncates button titles longer than 20 characters', async () => {
      await provider.sendInteractiveButtons({
        to: '919876543210',
        body: 'Choose:',
        buttons: [{ id: '1', title: 'This is a very long button title that exceeds limit' }],
      });

      const [, payload] = mockPost.mock.calls[0];
      const title = payload.interactive.action.buttons[0].reply.title;
      expect(title.length).toBeLessThanOrEqual(20);
    });

    it('includes optional footer when provided', async () => {
      await provider.sendInteractiveButtons({
        to: '919876543210',
        body: 'Choose:',
        buttons: [{ id: '1', title: 'Option' }],
        footer: 'Powered by Sevagan',
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.interactive.footer.text).toBe('Powered by Sevagan');
    });
  });

  describe('sendInteractiveList()', () => {
    it('posts an interactive list message', async () => {
      await provider.sendInteractiveList({
        to: '919876543210',
        headerText: 'Available Services',
        body: 'Select a service:',
        buttonText: 'View',
        sections: [
          {
            title: 'Home Services',
            rows: [
              { id: 'electrical', title: 'Electrical', description: 'Wiring & repairs' },
              { id: 'plumbing', title: 'Plumbing' },
            ],
          },
        ],
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.type).toBe('interactive');
      expect(payload.interactive.type).toBe('list');
      expect(payload.interactive.header.text).toBe('Available Services');
    });
  });

  describe('sendLocationRequest()', () => {
    it('posts an interactive location_request_message', async () => {
      await provider.sendLocationRequest({
        to: '919876543210',
        body: 'Please share your location or type your area name.',
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.type).toBe('interactive');
      expect(payload.interactive.type).toBe('location_request_message');
      expect(payload.interactive.body.text).toBe('Please share your location or type your area name.');
      expect(payload.interactive.action).toEqual({ name: 'send_location' });
    });
  });

  describe('sendImage()', () => {
    it('posts an image message with media ID and caption', async () => {
      await provider.sendImage({
        to: '919876543210',
        mediaId: 'media_abc123',
        caption: 'Job completion photo',
      });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.type).toBe('image');
      expect(payload.image.id).toBe('media_abc123');
      expect(payload.image.caption).toBe('Job completion photo');
    });

    it('posts an image message without caption', async () => {
      await provider.sendImage({ to: '919876543210', mediaId: 'media_xyz' });

      const [, payload] = mockPost.mock.calls[0];
      expect(payload.image.caption).toBeUndefined();
    });
  });

  describe('markAsRead()', () => {
    it('sends a read receipt with the correct message ID', async () => {
      await provider.markAsRead('wamid.abc123');

      expect(mockPost).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: 'wamid.abc123',
        }),
      );
    });
  });
});
