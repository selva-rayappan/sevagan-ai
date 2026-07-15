export const appConfig = () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  adminDomain: process.env.ADMIN_DOMAIN ?? 'admin.sevagan.ai',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:3001',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'sevagan-jwt-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'sevagan-refresh-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },

  whatsapp: {
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
    accessToken: process.env.WA_ACCESS_TOKEN,
    appSecret: process.env.WA_APP_SECRET,
    webhookVerifyToken: process.env.WA_WEBHOOK_VERIFY_TOKEN,
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSsl: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucketName: process.env.MINIO_BUCKET_NAME ?? 'sevagan-uploads',
  },

  ai: {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen3',
    openaiApiKey: process.env.OPENAI_API_KEY,
  },

  payment: {
    razorpayLinkUrl: process.env.RAZORPAY_LINK_URL ?? 'https://razorpay.me/@yarlenterprises',
    upiVpa: process.env.UPI_VPA ?? 'sevagan@upi',
  },
});
