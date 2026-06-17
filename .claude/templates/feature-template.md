# Template: NestJS Feature Module

Copy this structure when adding a new feature module to `backend/src/modules/`.

---

## File Structure

```
backend/src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.service.ts
├── <feature>.service.spec.ts
├── <feature>.repository.ts
├── <feature>.repository.spec.ts
└── dto/
    ├── create-<feature>.input.ts
    └── update-<feature>.input.ts
```

---

## `<feature>.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { <Feature>Service } from './<feature>.service';
import { <Feature>Repository } from './<feature>.repository';

@Module({
  providers: [<Feature>Service, <Feature>Repository],
  exports: [<Feature>Service, <Feature>Repository],
})
export class <Feature>Module {}
```

---

## `<feature>.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class <Feature>Repository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.<model>.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.<model>.findMany();
  }

  async create(data: { /* typed fields */ }) {
    return this.prisma.<model>.create({ data });
  }

  async update(id: string, data: { /* typed fields */ }) {
    return this.prisma.<model>.update({ where: { id }, data });
  }
}
```

---

## `<feature>.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { <Feature>Repository } from './<feature>.repository';
import { TranslationService } from '@/infrastructure/i18n/translation.service';
import { Language } from '@/domain/enums';

@Injectable()
export class <Feature>Service {
  constructor(
    private readonly <feature>Repository: <Feature>Repository,
    private readonly translation: TranslationService,
  ) {}

  async findById(id: string) {
    const item = await this.<feature>Repository.findById(id);
    if (!item) {
      throw new NotFoundException(`<Feature> ${id} not found`);
    }
    return item;
  }
}
```

---

## `dto/create-<feature>.input.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create<Feature>Input {
  @ApiProperty({ example: 'example value' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  optionalField?: string;
}
```

---

## `<feature>.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { <Feature>Service } from './<feature>.service';
import { <Feature>Repository } from './<feature>.repository';
import { TranslationService } from '@/infrastructure/i18n/translation.service';

describe('<Feature>Service', () => {
  let service: <Feature>Service;
  let repository: jest.Mocked<<Feature>Repository>;

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
          useValue: { translate: jest.fn((key) => key) },
        },
      ],
    }).compile();

    service = module.get<<Feature>Service>(<Feature>Service);
    repository = module.get(<Feature>Repository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return item when found', async () => {
      const item = { id: '1', field: 'test' };
      repository.findById.mockResolvedValue(item as any);
      const result = await service.findById('1');
      expect(result).toEqual(item);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Register in `app.module.ts`

```typescript
import { <Feature>Module } from './modules/<feature>/<feature>.module';

@Module({
  imports: [
    // ... existing modules
    <Feature>Module,
  ],
})
export class AppModule {}
```
