#!/usr/bin/env node
/**
 * Production configuration verification script.
 *
 * Usage:
 *   node scripts/verify-production-config.mjs --env .env.production
 *   npm run verify:production
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_VARS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'AZURE_COSMOS_ENDPOINT',
  'AZURE_COSMOS_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT_NAME',
  'AZURE_SEARCH_ENDPOINT',
  'AZURE_SEARCH_KEY',
  'AZURE_SEARCH_INDEX',
  'AZURE_STORAGE_ACCOUNT',
  'AZURE_STORAGE_KEY',
  'APPLICATIONINSIGHTS_CONNECTION_STRING',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'REDIS_URL',
  'CORS_ORIGIN',
];

const OPTIONAL_VARS = [
  'REDIS_PASSWORD',
  'SENTRY_DSN',
  'LOG_LEVEL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--env' && args[i + 1]) {
      options.envFile = args[i + 1];
      i += 1;
    }
  }

  return options;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }

  return env;
}

function resolveEnv() {
  const { envFile } = parseArgs();
  if (envFile) {
    return parseEnvFile(resolve(process.cwd(), envFile));
  }

  const productionPath = resolve(process.cwd(), '.env.production');
  if (existsSync(productionPath)) {
    return parseEnvFile(productionPath);
  }

  // Fall back to current process env (useful in CI)
  return process.env;
}

function red(text) {
  return `\u001b[31m${text}\u001b[39m`;
}

function green(text) {
  return `\u001b[32m${text}\u001b[39m`;
}

function yellow(text) {
  return `\u001b[33m${text}\u001b[39m`;
}

function maskSecret(value = '') {
  if (!value) return '<missing>';
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function main() {
  try {
    const env = resolveEnv();
    const missingRequired = [];
    const warnings = [];

    for (const key of REQUIRED_VARS) {
      if (!env[key] || env[key].trim().length === 0) {
        missingRequired.push(key);
      }
    }

    for (const key of OPTIONAL_VARS) {
      if (!env[key]) {
        warnings.push(key);
      }
    }

    console.log('\n=== Production Configuration Audit ===');
    console.log(`Environment source: ${process.env.NODE_ENV ?? 'process.env (runtime)'}`);

    if (missingRequired.length > 0) {
      console.error(red(`\n❌ Missing required environment variables (${missingRequired.length}):`));
      for (const key of missingRequired) {
        console.error(`  - ${key}`);
      }
      process.exitCode = 1;
    } else {
      console.log(green('\n✅ Required environment variables present.'));
    }

    if (warnings.length > 0) {
      console.warn(yellow('\n⚠️ Optional variables not set (consider configuring for full feature coverage):'));
      for (const key of warnings) {
        console.warn(`  - ${key}`);
      }
    }

    console.log('\nSample values (masked):');
    for (const key of ['AZURE_COSMOS_ENDPOINT', 'AZURE_OPENAI_ENDPOINT', 'AZURE_SEARCH_ENDPOINT', 'NEXT_PUBLIC_APP_URL']) {
      console.log(`  ${key}: ${maskSecret(env[key])}`);
    }

    console.log('\nRun `npm run verify:production -- --env <path>` to test alternative env files.');
  } catch (error) {
    console.error(red(`\nFailed to validate production configuration: ${error.message}`));
    process.exitCode = 1;
  }
}

main();
