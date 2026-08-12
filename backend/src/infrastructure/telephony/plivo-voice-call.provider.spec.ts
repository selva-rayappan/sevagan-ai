import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PlivoVoiceCallProvider } from './plivo-voice-call.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PlivoVoiceCallProvider', () => {
  let provider: PlivoVoiceCallProvider;

  const configValues: Record<string, string> = {
    'voice.plivoAuthId': 'auth-id-1',
    'voice.plivoAuthToken': 'auth-token-1',
    'voice.plivoNumber': '+918031151236',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: {} });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlivoVoiceCallProvider,
        {
          provide: ConfigService,
          useValue: { get: (key: string, fallback = '') => configValues[key] ?? fallback },
        },
      ],
    }).compile();

    provider = module.get<PlivoVoiceCallProvider>(PlivoVoiceCallProvider);
  });

  it('posts to the Plivo Call API with normalized from/to numbers', async () => {
    await provider.placeCall({
      to: '+91 96261 91907',
      answerUrl: 'https://api.sevagan.co.in/api/v1/voice/answer?token=abc&lang=EN',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.plivo.com/v1/Account/auth-id-1/Call/',
      {
        from: '918031151236',
        to: '919626191907',
        answer_url: 'https://api.sevagan.co.in/api/v1/voice/answer?token=abc&lang=EN',
        answer_method: 'GET',
      },
      expect.objectContaining({ auth: { username: 'auth-id-1', password: 'auth-token-1' } }),
    );
  });

  it('propagates API errors after logging', async () => {
    mockedAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { error: 'invalid number' } },
      message: 'Request failed',
    });

    await expect(
      provider.placeCall({ to: '919626191907', answerUrl: 'https://example.com/answer' }),
    ).rejects.toBeDefined();
  });
});
