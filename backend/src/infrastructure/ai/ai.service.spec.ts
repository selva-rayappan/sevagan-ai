import { AIService } from './ai.service';
import { ChatMessage } from './ai.provider.interface';

const mockOllamaChat = jest.fn();
const mockOpenaiChat = jest.fn();

const mockOllama = { chat: mockOllamaChat } as any;
const mockOpenai = { chat: mockOpenaiChat } as any;

describe('AIService', () => {
  let service: AIService;
  const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

  beforeEach(() => {
    service = new AIService(mockOllama, mockOpenai);
    jest.clearAllMocks();
  });

  it('returns the Ollama response when Ollama succeeds', async () => {
    mockOllamaChat.mockResolvedValue('ollama response');

    const result = await service.chat(messages);

    expect(result).toBe('ollama response');
    expect(mockOpenaiChat).not.toHaveBeenCalled();
  });

  it('falls back to OpenAI when Ollama fails', async () => {
    mockOllamaChat.mockRejectedValue(new Error('ollama down'));
    mockOpenaiChat.mockResolvedValue('openai response');

    const result = await service.chat(messages);

    expect(result).toBe('openai response');
    expect(mockOpenaiChat).toHaveBeenCalledWith(messages, undefined);
  });

  it('throws when both providers fail', async () => {
    mockOllamaChat.mockRejectedValue(new Error('ollama down'));
    mockOpenaiChat.mockRejectedValue(new Error('openai down'));

    await expect(service.chat(messages)).rejects.toThrow('AI service unavailable — both Ollama and OpenAI failed');
  });

  it('passes options through to the active provider', async () => {
    mockOllamaChat.mockResolvedValue('ok');

    await service.chat(messages, { temperature: 0.5, maxTokens: 50 });

    expect(mockOllamaChat).toHaveBeenCalledWith(messages, { temperature: 0.5, maxTokens: 50 });
  });
});
