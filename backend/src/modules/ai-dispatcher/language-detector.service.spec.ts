import { LanguageDetectorService } from './language-detector.service';
import { Language } from '../../domain/enums';

const mockChat = jest.fn();
const mockAiService = { chat: mockChat } as any;

describe('LanguageDetectorService', () => {
  let service: LanguageDetectorService;

  beforeEach(() => {
    service = new LanguageDetectorService(mockAiService);
    jest.clearAllMocks();
  });

  it('detects English from plain ASCII text without calling the AI', async () => {
    const result = await service.detectLanguage('what are your working hours');

    expect(result).toBe(Language.EN);
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('detects Tamil heuristically when most characters are Tamil script', async () => {
    const result = await service.detectLanguage('உங்கள் வேலை நேரம் என்ன');

    expect(result).toBe(Language.TA);
    expect(mockChat).not.toHaveBeenCalled();
  });

  const ambiguousText = 'My air conditioner is not cooling properly today அ';

  it('calls the AI for ambiguous mixed-script text and respects a TA response', async () => {
    mockChat.mockResolvedValue('TA');

    const result = await service.detectLanguage(ambiguousText);

    expect(result).toBe(Language.TA);
    expect(mockChat).toHaveBeenCalled();
  });

  it('calls the AI for ambiguous mixed-script text and respects an EN response', async () => {
    mockChat.mockResolvedValue('EN');

    const result = await service.detectLanguage(ambiguousText);

    expect(result).toBe(Language.EN);
  });

  it('defaults to EN when the AI call fails', async () => {
    mockChat.mockRejectedValue(new Error('AI unavailable'));

    const result = await service.detectLanguage(ambiguousText);

    expect(result).toBe(Language.EN);
  });
});
