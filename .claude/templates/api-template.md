# Template: REST API Endpoint

Use when adding a new controller or route handler.

---

## Controller Template

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { <Feature>Service } from './<feature>.service';
import { Create<Feature>Input } from './dto/create-<feature>.input';

@ApiTags('<feature>')
@ApiBearerAuth()
@Controller('<feature>s')
export class <Feature>Controller {
  constructor(private readonly <feature>Service: <Feature>Service) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new <feature>' })
  @ApiResponse({ status: 201, description: '<Feature> created' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  create(@Body() input: Create<Feature>Input) {
    return this.<feature>Service.create(input);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get <feature> by ID' })
  @ApiResponse({ status: 200, description: '<Feature> found' })
  @ApiResponse({ status: 404, description: '<Feature> not found' })
  findById(@Param('id') id: string) {
    return this.<feature>Service.findById(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all <feature>s' })
  findAll() {
    return this.<feature>Service.findAll();
  }
}
```

---

## Standard Response Shapes

### Success (wrapped by TransformInterceptor)
```json
{
  "data": { "id": "uuid", "field": "value" },
  "meta": { "timestamp": "2026-06-15T10:00:00.000Z", "path": "/api/v1/<feature>s/uuid" }
}
```

### List Response
```json
{
  "data": [{ "id": "uuid" }],
  "meta": { "timestamp": "...", "path": "..." }
}
```

### Error (HttpExceptionFilter)
```json
{
  "statusCode": 404,
  "message": "<Feature> not found",
  "timestamp": "2026-06-15T10:00:00.000Z",
  "path": "/api/v1/<feature>s/uuid"
}
```

---

## Swagger Setup in `main.ts`

Add the tag in `DocumentBuilder`:
```typescript
.addTag('<feature>', '<Feature> management')
```

---

## Versioning

All routes automatically get `/api/v1/` prefix via:
```typescript
app.setGlobalPrefix('api');
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
```

No need to add `/v1` to `@Controller()` decorators.

---

## Authentication Guard

```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('<feature>s')
export class <Feature>Controller { ... }
```

All admin routes should be guarded. WhatsApp webhook routes are guarded by `WebhookHmacGuard` instead.
