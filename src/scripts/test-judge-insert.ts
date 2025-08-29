// src/scripts/test-judge-insert.ts
// Minimal test to identify which column is causing the length issue

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMinimalInsert() {
  console.log('🧪 Testing minimal judge insert...');

  // Test 1: Absolute minimal data
  console.log('\n1. Testing with minimal required fields...');
  const minimalJudge = {
    name: "Test Judge",
    email: "test@example.com",
    is_active: true
  };

  try {
    const { data, error } = await supabase
      .from('judges')
      .insert([minimalJudge])
      .select();

    if (error) {
      console.error('❌ Minimal insert failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Minimal insert succeeded:', data[0].id);
      
      // Clean up
      await supabase.from('judges').delete().eq('id', data[0].id);
      console.log('🧹 Cleaned up test record');
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }

  // Test 2: Add province_state field
  console.log('\n2. Testing with province_state field...');
  const judgeWithState = {
    name: "Test Judge 2",
    email: "test2@example.com", 
    province_state: "AB",
    is_active: true
  };

  try {
    const { data, error } = await supabase
      .from('judges')
      .insert([judgeWithState])
      .select();

    if (error) {
      console.error('❌ Province state insert failed:', error.message);
    } else {
      console.log('✅ Province state insert succeeded:', data[0].id);
      await supabase.from('judges').delete().eq('id', data[0].id);
      console.log('🧹 Cleaned up test record');
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }

  // Test 3: Add arrays
  console.log('\n3. Testing with array fields...');
  const judgeWithArrays = {
    name: "Test Judge 3",
    email: "test3@example.com",
    province_state: "AB", 
    certified_classes: ["Rally"],
    advanced_classes: ["Scent"],
    is_active: true
  };

  try {
    const { data, error } = await supabase
      .from('judges')
      .insert([judgeWithArrays])
      .select();

    if (error) {
      console.error('❌ Array insert failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Array insert succeeded:', data[0].id);
      await supabase.from('judges').delete().eq('id', data[0].id);
      console.log('🧹 Cleaned up test record');
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }

  // Test 4: Test with long values to identify the problematic field
  console.log('\n4. Testing with progressively longer values...');
  
  const testFields = [
    { field: 'name', value: 'This is a very long judge name that might exceed limits' },
    { field: 'email', value: 'this.is.a.very.long.email.address.that.might.exceed.database.limits@example.com' },
    { field: 'phone', value: '1234567890123456789012345678901234567890' },
    { field: 'city', value: 'This is a very long city name that might exceed database limits' },
    { field: 'province_state', value: 'VERYLONGSTATE' },
    { field: 'country', value: 'This is a very long country name that might exceed database limits' },
    { field: 'level', value: 'This is a very long judge level description that might exceed database limits' }
  ];

  for (const testField of testFields) {
    console.log(`\n   Testing ${testField.field} with long value...`);
    
    const testJudge = {
      name: testField.field === 'name' ? testField.value : 'Test Judge',
      email: testField.field === 'email' ? testField.value : 'test@example.com',
      phone: testField.field === 'phone' ? testField.value : undefined,
      city: testField.field === 'city' ? testField.value : undefined,
      province_state: testField.field === 'province_state' ? testField.value : 'AB',
      country: testField.field === 'country' ? testField.value : undefined,
      level: testField.field === 'level' ? testField.value : undefined,
      is_active: true
    };

    try {
      const { data, error } = await supabase
        .from('judges')
        .insert([testJudge])
        .select();

      if (error) {
        console.error(`   ❌ ${testField.field} failed:`, error.message);
        if (error.message.includes('value too long for type character varying(10)')) {
          console.log(`   🎯 FOUND IT! The ${testField.field} field has a 10-character limit!`);
        }
      } else {
        console.log(`   ✅ ${testField.field} succeeded`);
        await supabase.from('judges').delete().eq('id', data[0].id);
      }
    } catch (err) {
      console.error(`   💥 ${testField.field} unexpected error:`, err);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

testMinimalInsert()
  .then(() => {
    console.log('\n🎉 Diagnostic test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });