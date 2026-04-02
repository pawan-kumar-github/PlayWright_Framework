import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type EnvironmentName = 'dev' | 'staging' | 'uat' | 'prod';

export interface EnvConfig {
  env: EnvironmentName;
  baseUrl: string;
  apiBaseUrl: string;
  credentials: {
    testUsername: string;
    testPassword: string;
    adminUsername: string;
    adminPassword: string;
  };
  timeouts: {
    default: number;
    navigation: number;
    action: number;
    assertion: number;
  };
  retries: number;
  headless: boolean;
  slowMo: number;
}

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`[EnvConfig] Missing required environment variable: ${key}`);
  }
  return value;
}

const envName = (process.env.ENV || 'staging') as EnvironmentName;

export const envConfig: EnvConfig = {
  env: envName,
  baseUrl: requireEnv('BASE_URL', 'https://toolsqa.com/'),
  apiBaseUrl: requireEnv('API_BASE_URL', 'https://api.your-application.com'),
  credentials: {
    testUsername: requireEnv('TEST_USERNAME', 'automation_user@example.com'),
    testPassword: requireEnv('TEST_PASSWORD', 'AutoTest@1234'),
    adminUsername: requireEnv('ADMIN_USERNAME', 'admin@example.com'),
    adminPassword: requireEnv('ADMIN_PASSWORD', 'Admin@1234'),
  },
  timeouts: {
    default: 60_000,
    navigation: 30_000,
    action: 30_000,
    assertion: 10_000,
  },
  retries: process.env.CI === 'true' ? 2 : 1,
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0', 10),
};

export default envConfig;
