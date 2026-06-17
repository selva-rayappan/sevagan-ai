# Template: Tests

Use these patterns when writing unit and integration tests.

---

## Service Unit Test

```typescript
// backend/src/modules/<feature>/<feature>.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { <Feature>Service } from './<feature>.service';
import { <Feature>Repository } from './<feature>.repository';
import { TranslationService } from '@/infrastructure/i18n/translation.service';
import { Language } from '@/domain/enums';

describe('<Feature>Service', () => {
  let service: <Feature>Service;
  let repo: jest.Mocked<<Feature>Repository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Feature>Service,
        {
          provide: <Feature>Repository,
          useValue: {
            findById: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: { translate: jest.fn((key: string) => `[${key}]`) },
        },
      ],
    }).compile();

    service = module.get(<Feature>Service);
    repo = module.get(<Feature>Repository) as jest.Mocked<<Feature>Repository>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('findById', () => {
    it('returns the item when found', async () => {
      repo.findById.mockResolvedValue({ id: '1' } as any);
      const result = await service.findById('1');
      expect(result).toEqual({ id: '1' });
      expect(repo.findById).toHaveBeenCalledWith('1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns the new item', async () => {
      const input = { field: 'value' };
      const created = { id: '2', ...input };
      repo.create.mockResolvedValue(created as any);
      const result = await service.create(input);
      expect(result).toEqual(created);
    });
  });
});
```

---

## Repository Unit Test

```typescript
// backend/src/modules/<feature>/<feature>.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { <Feature>Repository } from './<feature>.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';

describe('<Feature>Repository', () => {
  let repo: <Feature>Repository;
  let prisma: { <model>: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      <model>: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Feature>Repository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(<Feature>Repository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(repo).toBeDefined());

  describe('findById', () => {
    it('calls prisma.findUnique with correct args', async () => {
      prisma.<model>.findUnique.mockResolvedValue({ id: '1' });
      const result = await repo.findById('1');
      expect(prisma.<model>.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual({ id: '1' });
    });
  });
});
```

---

## WhatsApp Bot Service Test Pattern

```typescript
// Test a bot service that sends WhatsApp messages
import { WHATSAPP_PROVIDER } from '@/infrastructure/messaging/whatsapp.provider.interface';

const mockProvider = { sendText: jest.fn(), sendInteractiveList: jest.fn() };

providers: [
  BotService,
  { provide: WHATSAPP_PROVIDER, useValue: mockProvider },
  { provide: TranslationService, useValue: { translate: jest.fn((k) => k) } },
  { provide: ConversationStateService, useValue: { get: jest.fn(), set: jest.fn() } },
  // ... other deps
]

// Assert message was sent
expect(mockProvider.sendText).toHaveBeenCalledWith(
  '+91XXXXXXXXXX',
  'customer.welcome'  // translation returns the key itself in tests
);
```

---

## Controller Test (if needed)

```typescript
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';

describe('<Feature>Controller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [<Feature>Controller],
      providers: [{ provide: <Feature>Service, useValue: { findAll: jest.fn().mockResolvedValue([]) } }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /<feature>s returns 200', () =>
    request(app.getHttpServer()).get('/<feature>s').expect(200));
});
```

---

## Coverage Rules

- Target ≥80% branches, functions, lines, statements
- Run: `npm run test:api:cov` from root
- Excluded automatically: `*.module.ts`, `main.ts`, enums, infrastructure adapters, config, prisma
- Never mock `TranslationService` with `undefined` — always return the key as a string
