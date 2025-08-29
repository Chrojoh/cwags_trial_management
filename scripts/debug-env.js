// Debug Environment Variables Script
// Let's check if we can load the environment variables properly

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('🔍 Environment Debug Information');
console.log('=' .repeat(50));
console.log(`Current script: ${__filename}`);
console.log(`Script directory: ${__dirname}`);
console.log(`Project root: ${projectRoot}`);

// Check if .env.local exists
const envPath = join(projectRoot, '.env.local');
console.log(`\n📁 Checking for .env.local file:`);
console.log(`Path: ${envPath}`);
console.log(`Exists: ${existsSync(envPath) ? '✅ Yes' : '❌ No'}`);

if (existsSync(envPath)) {
  console.log('\n📄 .env.local file contents:');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    lines.forEach((line, index) => {
      if (line.trim() && !line.startsWith('#')) {
        const [key] = line.split('=');
        const hasValue = line.includes('=') && line.split('=')[1];
        console.log(`  ${index + 1}. ${key}=${hasValue ? '***HIDDEN***' : 'NO_VALUE'}`);
      }
    });
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
  }
}

// Try to load environment variables
console.log('\n🔧 Loading environment variables...');
const result = config({ path: envPath });

if (result.error) {
  console.log(`❌ Error loading .env: ${result.error.message}`);
} else {
  console.log('✅ Environment variables loaded successfully');
}

// Check specific variables
console.log('\n🔑 Checking required variables:');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
if (supabaseUrl) {
  console.log(`  Value: ${supabaseUrl.substring(0, 30)}...`);
}

console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✅ Found' : '❌ Missing'}`);
if (supabaseKey) {
  console.log(`  Length: ${supabaseKey.length} characters`);
  console.log(`  Starts with: ${supabaseKey.substring(0, 10)}...`);
}

console.log('\n📋 All environment variables:');
Object.keys(process.env)
  .filter(key => key.includes('SUPABASE'))
  .forEach(key => {
    console.log(`  ${key}: ${process.env[key] ? '✅ Set' : '❌ Not set'}`);
  });

console.log('\n' + '=' .repeat(50));