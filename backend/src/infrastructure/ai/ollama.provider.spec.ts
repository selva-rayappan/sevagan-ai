import axios from 'axios';
import { OllamaProvider } from './ollama.provider';
import { ChatMessage } from './ai.provider.interface';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockGet = jest.fn();
const mockConfigService = { get: mockGet } as any;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((key: string, fallback?: string) => fallback);
    provider = new OllamaProvider(mockConfigService);
  });

  it('posts to the configured Ollama endpoint and returns trimmed content', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: { content: '  Hello there  ' } } });

    const result = await provider.chat(messages, { temperature: 0.2, maxTokens: 64 });

    expect(result).toBe('Hello there');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        model: 'qwen3',
        messages,
        stream: false,
        options: { temperature: 0.2, num_predict: 64 },
      }),
      expect.objectContaining({ timeout: 10_000 }),
    );
  });

  it('uses default options when none provided', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: { content: 'ok' } } });

    await provider.chat(messages);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ options: { temperature: 0.1, num_predict: 256 } }),
      expect.any(Object),
    );
  });

  it('returns empty string when response has no message content', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    const result = await provider.chat(messages);

    expect(result).toBe('');
  });

  it('rethrows when the Ollama request fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('connection refused'));

    await expect(provider.chat(messages)).rejects.toThrow('connection refused');
  });
});
