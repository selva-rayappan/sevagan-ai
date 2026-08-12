import { TrackedWhatsAppProvider } from './tracked-whatsapp.provider';
import { WhatsAppProvider } from './whatsapp.provider.interface';

describe('TrackedWhatsAppProvider', () => {
  const mockDelegate: jest.Mocked<WhatsAppProvider> = {
    sendText: jest.fn().mockResolvedValue(undefined),
    sendTemplate: jest.fn().mockResolvedValue(undefined),
    sendInteractiveButtons: jest.fn().mockResolvedValue(undefined),
    sendInteractiveList: jest.fn().mockResolvedValue(undefined),
    sendLocationRequest: jest.fn().mockResolvedValue(undefined),
    sendImage: jest.fn().mockResolvedValue(undefined),
    sendDocument: jest.fn().mockResolvedValue(undefined),
    markAsRead: jest.fn().mockResolvedValue(undefined),
    downloadMedia: jest.fn().mockResolvedValue(Buffer.from('x')),
  };
  const mockRecord = jest.fn().mockResolvedValue(undefined);
  const mockTrail = { record: mockRecord } as any;

  let provider: TrackedWhatsAppProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new TrackedWhatsAppProvider(mockDelegate, mockTrail);
  });

  it('delegates sendText and records a text trail entry', async () => {
    await provider.sendText({ to: '91123', text: 'hi' });

    expect(mockDelegate.sendText).toHaveBeenCalledWith({ to: '91123', text: 'hi' });
    expect(mockRecord).toHaveBeenCalledWith('91123', 'OUTBOUND', 'text', 'hi');
  });

  it('records the template name with named params inlined', async () => {
    await provider.sendTemplate({
      to: '91123',
      templateName: 'technician_welcom',
      languageCode: 'en',
      bodyParams: [{ name: 'service_name', value: 'Plumbing' }],
    });

    expect(mockRecord).toHaveBeenCalledWith(
      '91123',
      'OUTBOUND',
      'template',
      'technician_welcom (service_name=Plumbing)',
    );
  });

  it('records just the template name when there are no body params', async () => {
    await provider.sendTemplate({ to: '91123', templateName: 'technician_welcome', languageCode: 'ta' });

    expect(mockRecord).toHaveBeenCalledWith('91123', 'OUTBOUND', 'template', 'technician_welcome');
  });

  it('does not record markAsRead or downloadMedia — not messages themselves', async () => {
    await provider.markAsRead('wamid.1');
    await provider.downloadMedia('media-1');

    expect(mockDelegate.markAsRead).toHaveBeenCalledWith('wamid.1');
    expect(mockDelegate.downloadMedia).toHaveBeenCalledWith('media-1');
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
