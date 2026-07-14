import { IntentClassifierService, Intent } from './intent-classifier.service';
import { Language } from '../../domain/enums';

const mockChat = jest.fn();
const mockAiService = { chat: mockChat } as any;

describe('IntentClassifierService', () => {
  let service: IntentClassifierService;

  beforeEach(() => {
    service = new IntentClassifierService(mockAiService);
    jest.clearAllMocks();
  });

  it('parses a valid JSON classification response', async () => {
    mockChat.mockResolvedValue('{"intent":"FAQ_HOURS","confidence":0.95,"detectedLanguage":"EN","extractedJobNumber":null}');

    const result = await service.classifyIntent('what time do you open?', Language.EN);

    expect(result).toEqual({
      intent: Intent.FAQ_HOURS,
      confidence: 0.95,
      detectedLanguage: Language.EN,
      extractedJobNumber: undefined,
    });
  });

  it('extracts a job number when present', async () => {
    mockChat.mockResolvedValue(
      '{"intent":"TRACK_JOB","confidence":0.9,"detectedLanguage":"EN","extractedJobNumber":"JOB-20260630-0001"}',
    );

    const result = await service.classifyIntent('where is JOB-20260630-0001', Language.EN);

    expect(result.intent).toBe(Intent.TRACK_JOB);
    expect(result.extractedJobNumber).toBe('JOB-20260630-0001');
  });

  it('parses JSON embedded in a markdown code block', async () => {
    mockChat.mockResolvedValue('```json\n{"intent":"FAQ_PRICING","confidence":0.8,"detectedLanguage":"EN"}\n```');

    const result = await service.classifyIntent('how much?', Language.EN);

    expect(result.intent).toBe(Intent.FAQ_PRICING);
  });

  it('defaults to TA only when detectedLanguage is exactly "TA"', async () => {
    mockChat.mockResolvedValue('{"intent":"FAQ_COVERAGE","confidence":0.7,"detectedLanguage":"TA"}');

    const result = await service.classifyIntent('நீங்கள் எங்கு சேவை செய்கிறீர்கள்', Language.TA);

    expect(result.detectedLanguage).toBe(Language.TA);
  });

  it('returns UNKNOWN with zero confidence when the response is not JSON', async () => {
    mockChat.mockResolvedValue('I am not sure what you mean');

    const result = await service.classifyIntent('asdf', Language.EN);

    expect(result).toEqual({ intent: Intent.UNKNOWN, confidence: 0, detectedLanguage: Language.EN });
  });

  it('returns UNKNOWN for an intent name that is not in the enum', async () => {
    mockChat.mockResolvedValue('{"intent":"SOMETHING_ELSE","confidence":0.5,"detectedLanguage":"EN"}');

    const result = await service.classifyIntent('weird message', Language.EN);

    expect(result.intent).toBe(Intent.UNKNOWN);
  });

  it('returns UNKNOWN with zero confidence when the AI call throws', async () => {
    mockChat.mockRejectedValue(new Error('AI service unavailable'));

    const result = await service.classifyIntent('hello', Language.TA);

    expect(result).toEqual({ intent: Intent.UNKNOWN, confidence: 0, detectedLanguage: Language.TA });
  });
});
