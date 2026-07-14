import axios from 'axios';
import { OpenAIProvider } from './openai.provider';
import { ChatMessage } from './ai.provider.interface';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockGet = jest.fn();
const mockConfigService = { get: mockGet } as any;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when no API key is configured', async () => {
    mockGet.mockReturnValue('');
    provider = new OpenAIProvider(mockConfigService);

    await expect(provider.chat(messages)).rejects.toThrow('OpenAI API key not configured');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('posts to the OpenAI chat completions endpoint and returns trimmed content', async () => {
    mockGet.mockReturnValue('sk-test-key');
    provider = new OpenAIProvider(mockConfigService);
    mockedAxios.post.mockResolvedValue({
      data: { choices: [{ message: { content: '  Hi!  ' } }] },
    });

    const result = await provider.chat(messages, { temperature: 0.3, maxTokens: 100 });

    expect(result).toBe('Hi!');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 100,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
        timeout: 15_000,
      }),
    );
  });

  it('returns empty string when response has no choices', async () => {
    mockGet.mockReturnValue('sk-test-key');
    provider = new OpenAIProvider(mockConfigService);
    mockedAxios.post.mockResolvedValue({ data: {} });

    const result = await provider.chat(messages);

    expect(result).toBe('');
  });

  it('rethrows when the OpenAI request fails', async () => {
    mockGet.mockReturnValue('sk-test-key');
    provider = new OpenAIProvider(mockConfigService);
    mockedAxios.post.mockRejectedValue(new Error('rate limited'));

    await expect(provider.chat(messages)).rejects.toThrow('rate limited');
  });
});
