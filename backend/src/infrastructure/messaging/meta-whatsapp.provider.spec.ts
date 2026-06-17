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
