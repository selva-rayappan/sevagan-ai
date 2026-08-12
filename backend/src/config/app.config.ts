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
    templates: {
      // Business-initiated messages (e.g. technician onboarding) require a
      // pre-approved Meta template, registered per-language in Business Manager.
      // The EN and TA translations were submitted as separate template names
      // (not just language variants of one name) — confirmed via
      // GET /{waba-id}/message_templates — so both name and body-param shape
      // must be selected per language, not shared.
      technicianWelcomeEn: process.env.WA_TEMPLATE_TECHNICIAN_WELCOME_EN ?? 'technician_welcom',
      technicianWelcomeTa: process.env.WA_TEMPLATE_TECHNICIAN_WELCOME_TA ?? 'technician_welcome',
      // Both approved templates have an IMAGE header — Meta requires the
      // header image at send-time (the template's "example" image is
      // preview-only, never reused for real sends).
      technicianWelcomeHeaderImage:
        process.env.WA_TEMPLATE_TECHNICIAN_WELCOME_HEADER_IMAGE ?? 'https://sevagan.co.in/index_files/logo-new.png',
    },
  },

  messageTrail: {
    // Real AWS S3 (not the self-hosted MinIO used for uploads) — the audit
    // trail must survive independently of our own infra. Auth is via the EC2
    // instance's IAM role (default AWS SDK credential chain), no keys here.
    s3Bucket: process.env.MESSAGE_TRAIL_S3_BUCKET ?? 'sevagan-ai',
    s3Region: process.env.MESSAGE_TRAIL_S3_REGION ?? 'us-east-1',
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
    upiVpa: process.env.UPI_VPA ?? 'sevagan@upi',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  voice: {
    plivoAuthId: process.env.PLIVO_AUTH_ID,
    plivoAuthToken: process.env.PLIVO_AUTH_TOKEN,
    plivoNumber: process.env.PLIVO_NUMBER,
    // Shared secret appended as a query param on the answer/DTMF callback URLs
    // Plivo hits — the only auth those endpoints have (see voice-webhook-token.guard.ts).
    webhookToken: process.env.VOICE_WEBHOOK_TOKEN,
    audioUrls: {
      jobOfferEn: process.env.VOICE_JOB_OFFER_AUDIO_EN ?? 'https://sevagan.co.in/audio/job_offer_call_en.mp3',
      jobOfferTa: process.env.VOICE_JOB_OFFER_AUDIO_TA ?? 'https://sevagan.co.in/audio/job_offer_call_ta.mp3',
    },
  },
});
