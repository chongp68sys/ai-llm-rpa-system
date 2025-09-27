interface EnvironmentConfig {
  // Database
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections?: number;
  };

  // Email Services
  email: {
    provider: 'smtp' | 'sendgrid' | 'ses';
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
      secure: boolean;
    };
    sendgrid?: {
      apiKey: string;
      fromEmail: string;
    };
    ses?: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      fromEmail: string;
    };
  };

  // SMS Services
  sms: {
    provider: 'twilio' | 'sns';
    twilio?: {
      accountSid: string;
      authToken: string;
      fromPhone: string;
    };
    sns?: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };

  // Chat Services
  chat: {
    slack?: {
      botToken?: string;
      webhookUrl?: string;
    };
    discord?: {
      botToken: string;
    };
    teams?: {
      webhookUrl: string;
    };
  };

  // LLM Services
  llm: {
    openai?: {
      apiKey: string;
    };
    anthropic?: {
      apiKey: string;
    };
  };

  // General
  general: {
    nodeEnv: 'development' | 'production' | 'test';
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };

  // Security
  security: {
    jwtSecret: string;
    encryptionKey: string;
    webhookSecret: string;
  };
}

// Environment variable parsing with defaults
const parseEnvBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const parseEnvNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Load configuration from environment variables
export const config: EnvironmentConfig = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_llm_rpa_system',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseEnvNumber(process.env.DATABASE_PORT, 5432),
    name: process.env.DATABASE_NAME || 'ai_llm_rpa_system',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: parseEnvBoolean(process.env.DATABASE_SSL, false),
    maxConnections: parseEnvNumber(process.env.DATABASE_MAX_CONNECTIONS, 20)
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER as any) || 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseEnvNumber(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: parseEnvBoolean(process.env.SMTP_SECURE, true)
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || ''
    },
    ses: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      fromEmail: process.env.AWS_SES_FROM_EMAIL || ''
    }
  },

  sms: {
    provider: (process.env.SMS_PROVIDER as any) || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromPhone: process.env.TWILIO_FROM_PHONE || ''
    },
    sns: {
      region: process.env.AWS_SNS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  },

  chat: {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN,
      webhookUrl: process.env.SLACK_WEBHOOK_URL
    },
    discord: {
      botToken: process.env.DISCORD_BOT_TOKEN || ''
    },
    teams: {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL || ''
    }
  },

  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    }
  },

  general: {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    port: parseEnvNumber(process.env.PORT, 3001),
    logLevel: (process.env.LOG_LEVEL as any) || 'info'
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars-long',
    webhookSecret: process.env.WEBHOOK_SECRET || 'dev-webhook-secret'
  }
};

// Validation functions
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Email validation
  if (config.email.provider === 'smtp') {
    if (!config.email.smtp?.host) errors.push('SMTP_HOST is required when using SMTP provider');
    if (!config.email.smtp?.user) errors.push('SMTP_USER is required when using SMTP provider');
    if (!config.email.smtp?.pass) errors.push('SMTP_PASS is required when using SMTP provider');
  }

  if (config.email.provider === 'sendgrid') {
    if (!config.email.sendgrid?.apiKey) errors.push('SENDGRID_API_KEY is required when using SendGrid provider');
    if (!config.email.sendgrid?.fromEmail) errors.push('SENDGRID_FROM_EMAIL is required when using SendGrid provider');
  }

  // SMS validation
  if (config.sms.provider === 'twilio') {
    if (!config.sms.twilio?.accountSid) errors.push('TWILIO_ACCOUNT_SID is required when using Twilio provider');
    if (!config.sms.twilio?.authToken) errors.push('TWILIO_AUTH_TOKEN is required when using Twilio provider');
    if (!config.sms.twilio?.fromPhone) errors.push('TWILIO_FROM_PHONE is required when using Twilio provider');
  }

  // Security validation
  if (config.general.nodeEnv === 'production') {
    if (config.security.jwtSecret === 'dev-jwt-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed in production');
    }
    if (config.security.encryptionKey === 'dev-encryption-key-32-chars-long') {
      errors.push('ENCRYPTION_KEY must be changed in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Export individual service configs for easier access
export const dbConfig = config.database;
export const emailConfig = config.email;
export const smsConfig = config.sms;
export const chatConfig = config.chat;
export const llmConfig = config.llm;
export const securityConfig = config.security;