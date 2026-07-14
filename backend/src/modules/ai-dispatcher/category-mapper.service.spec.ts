import { CategoryMapperService } from './category-mapper.service';

const mockChat = jest.fn();
const mockAiService = { chat: mockChat } as any;

const mockFindByName = jest.fn();
const mockCategoriesRepository = { findByName: mockFindByName } as any;

describe('CategoryMapperService', () => {
  let service: CategoryMapperService;

  beforeEach(() => {
    service = new CategoryMapperService(mockAiService, mockCategoriesRepository);
    jest.clearAllMocks();
  });

  it('maps a free-text message to a known category', async () => {
    mockChat.mockResolvedValue('{"categoryName":"Electrical","confidence":0.92}');
    mockFindByName.mockResolvedValue({ id: 'cat-1', name: 'Electrical' });

    const result = await service.mapToCategory('my fan is not working');

    expect(result).toEqual({ categoryId: 'cat-1', categoryName: 'Electrical', confidence: 0.92 });
    expect(mockFindByName).toHaveBeenCalledWith('Electrical');
  });

  it('returns null when the AI cannot determine a category', async () => {
    mockChat.mockResolvedValue('{"categoryName":null,"confidence":0}');

    const result = await service.mapToCategory('hello');

    expect(result).toBeNull();
    expect(mockFindByName).not.toHaveBeenCalled();
  });

  it('returns null when the AI-matched category is not found in the DB', async () => {
    mockChat.mockResolvedValue('{"categoryName":"Roofing","confidence":0.8}');
    mockFindByName.mockResolvedValue(null);

    const result = await service.mapToCategory('I need a new roof');

    expect(result).toBeNull();
  });

  it('returns null when the AI response is not valid JSON', async () => {
    mockChat.mockResolvedValue('not sure');

    const result = await service.mapToCategory('asdf');

    expect(result).toBeNull();
  });

  it('returns null when the AI call throws', async () => {
    mockChat.mockRejectedValue(new Error('AI service unavailable'));

    const result = await service.mapToCategory('my AC is leaking');

    expect(result).toBeNull();
  });
});
