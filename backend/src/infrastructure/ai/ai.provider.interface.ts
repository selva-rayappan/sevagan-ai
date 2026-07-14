export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

/**
 * Abstraction over AI providers (Ollama, OpenAI, etc.).
 * Swap implementations without changing business logic.
 */
export interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
