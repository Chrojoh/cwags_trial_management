// src/scripts/test-supabase.ts
// Test Supabase connection and diagnose issues

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Supabase Connection Diagnostics');
console.log('================================');

console.log('1. Environment Variables:');
console.log('   URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Missing');
console.log('   Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

console.log('\n2. Creating Supabase Client...');
const supabase = getSupabaseBrowser(supabaseUrl, supabaseServiceKey);
console.log('✅ Client created');

async function testConnection() {
  try {
    console.log('\n3. Testing Basic Connection...');
    
    // Test 1: Simple query to a system table
    console.log('   Testing system access...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('   ❌ Auth test failed:', authError.message);
      console.error('   This usually means the service role key is incorrect');
    } else {
      console.log('   ✅ Auth system accessible');
    }

    console.log('\n4. Testing Database Access...');
    
    // Test 2: Check if judges table exists
    console.log('   Checking if judges table exists...');
    const { data: tableData, error: tableError } = await supabase
      .from('judges')
      .select('count(*)', { count: 'exact', head: true });

    if (tableError) {
      console.error('   ❌ Judges table access failed:', tableError.message);
      console.error('   Error code:', tableError.code);
      console.error('   Error details:', tableError.details);
      
      if (tableError.code === '42P01') {
        console.log('\n   📋 The judges table does not exist. Creating it...');
        await createJudgesTable();
      } else if (tableError.code === '42501') {
        console.error('\n   🔐 Permission denied. Check your service role key has the correct permissions.');
      }
    } else {
      console.log('   ✅ Judges table accessible');
      console.log(`   Current record count: ${tableData?.[0]?.count || 0}`);
    }

    console.log('\n5. Testing Insert Permissions...');
    
    // Test 3: Try to insert a test record
    const testJudge = {
      first_name: 'Test',
      last_name: 'Judge',
      city: 'Test City',
      state_province: 'TS',
      country: 'Test Country',
      email: 'test@example.com',
      obedience_levels: [],
      rally_levels: [],
      games_levels: [],
      scent_levels: [],
      is_active: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('judges')
      .insert([testJudge])
      .select();

    if (insertError) {
      console.error('   ❌ Insert test failed:', insertError.message);
      console.error('   Error code:', insertError.code);
    } else {
      console.log('   ✅ Insert permissions working');
      
      // Clean up test record
      if (insertData && insertData[0]) {
        await supabase
          .from('judges')
          .delete()
          .eq('id', insertData[0].id);
        console.log('   🧹 Test record cleaned up');
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function createJudgesTable() {
  console.log('   Creating judges table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS judges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      state_province VARCHAR(10) NOT NULL,
      country VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      obedience_levels TEXT[] DEFAULT '{}',
      rally_levels TEXT[] DEFAULT '{}',
      games_levels TEXT[] DEFAULT '{}',
      scent_levels TEXT[] DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('   ❌ Failed to create table:', error.message);
      console.log('\n   📋 Please create the table manually in Supabase SQL Editor:');
      console.log(createTableSQL);
    } else {
      console.log('   ✅ Judges table created successfully');
    }
  } catch (error) {
    console.log('\n   📋 Please create the table manually in Supabase SQL Editor:');
    console.log(createTableSQL);
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('\n🎉 Connection test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });