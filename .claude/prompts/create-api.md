# Prompt: Create API Endpoint

Use this prompt when adding a new REST endpoint to an existing module.

---

## Prompt Template

```
Add the [HTTP_METHOD] /api/v1/[route] endpoint to the [MODULE_NAME] module.

Spec:
- Request body / params: [describe or paste from docs/API_SPEC.md]
- Response shape: [describe]
- Auth required: [yes/no — JWT bearer]
- Rate limit: [default 30/min or custom]

Implementation steps:
1. Add DTO class in backend/src/modules/[module]/dto/[action]-[resource].input.ts
   - Use class-validator decorators (whitelist is enforced globally)
2. Add method to [module].service.ts with business logic
3. Add method to [module].repository.ts if DB access needed
4. Add route handler in [module].controller.ts
   - @ApiOperation + @ApiResponse for Swagger
   - Add @UseGuards(JwtAuthGuard) if auth required
5. Write unit test in [module].service.spec.ts

Constraints:
- Never return Prisma model objects directly — map to a plain response type
- Use TransformInterceptor's { data, meta } shape (handled globally)
- Swagger tags are configured in backend/src/main.ts
```

---

## Response Shape (global TransformInterceptor)

```json
{
  "data": { },
  "meta": {
    "timestamp": "ISO8601",
    "path": "/api/v1/..."
  }
}
```

## Error Shape (global HttpExceptionFilter)

```json
{
  "statusCode": 404,
  "message": "Job not found",
  "timestamp": "ISO8601",
  "path": "/api/v1/jobs/JOB999"
}
```
