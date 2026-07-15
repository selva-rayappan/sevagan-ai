import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @IsOptional()
  API_PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'sevagan-jwt-secret-change-in-prod';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'sevagan-refresh-secret-change-in-prod';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  // WhatsApp
  @IsString()
  @IsOptional()
  WA_PHONE_NUMBER_ID: string;

  @IsString()
  @IsOptional()
  WA_ACCESS_TOKEN: string;

  @IsString()
  @IsOptional()
  WA_APP_SECRET: string;

  @IsString()
  @IsOptional()
  WA_WEBHOOK_VERIFY_TOKEN: string;

  // MinIO
  @IsString()
  @IsOptional()
  MINIO_ENDPOINT: string;

  @IsInt()
  @IsOptional()
  MINIO_PORT: number;

  @IsString()
  @IsOptional()
  MINIO_USE_SSL: string;

  @IsString()
  @IsOptional()
  MINIO_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  MINIO_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  MINIO_BUCKET_NAME: string;

  // AI
  @IsString()
  @IsOptional()
  OLLAMA_BASE_URL: string;

  @IsString()
  @IsOptional()
  OLLAMA_MODEL: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  ADMIN_DOMAIN: string;

  @IsString()
  @IsOptional()
  PUBLIC_API_URL: string;

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_ID: string;

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_SECRET: string;

  @IsString()
  @IsOptional()
  RAZORPAY_WEBHOOK_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.toString()}`);
  }

  return validatedConfig;
}
