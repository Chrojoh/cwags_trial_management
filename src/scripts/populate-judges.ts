// src/scripts/populate-judges.ts
// Step 5: Judge Data Population - Updated for existing schema

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Judge data structure matching your existing table schema
interface JudgeData {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  province_state?: string;
  country?: string;
  level?: string;  // Just the qualification levels they have
  is_active: boolean;
}

// Sample judge data formatted for your schema
const judgeData: JudgeData[] = [
  // CANADA - Alberta
  {
    name: "Cathy Jenkins",
    email: "cathy.l@live.com",
    phone: "403-803-8425",
    city: "Airdrie",
    province_state: "AB",
    country: "Canada",
    level: "Scent Judge",
    certified_classes: ["Patrol", "Detective", "Investigator"],
    advanced_classes: ["Super Sleuth", "Private Investigator", "Detective Diversions"],
    is_active: true
  },
  {
    name: "Janilee Benell",
    email: "comeau.janilee@gmail.com",
    phone: "587-897-2280",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Rally Judge",
    certified_classes: ["Starter", "Advanced", "Pro"],
    advanced_classes: ["ARF", "Zoom 1", "Zoom 1.5", "Zoom 2"],
    is_active: true
  },
  {
    name: "Barb Burgess",
    email: "barbburgess@shaw.com",
    phone: "403-875-1051",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Scent Judge",
    certified_classes: ["Patrol", "Detective"],
    advanced_classes: ["Investigator", "Super Sleuth", "Private Investigator", "Detective Diversions"],
    is_active: true
  },
  {
    name: "Nicole Wiebe",
    email: "nikkiwiebe@hotmail.com",
    phone: "403-400-6034",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Multi-Discipline Judge",
    certified_classes: ["Rally Starter", "Rally Advanced", "Obedience Level 1-3"],
    advanced_classes: ["Rally Pro", "Rally ARF", "Obedience Level 4-5", "Scent Classes"],
    is_active: true
  },
  // CANADA - British Columbia
  {
    name: "Alycia Rogal",
    email: "freelifecanine@gmail.com",
    phone: "778-267-2592",
    city: "150 Mile House",
    province_state: "BC",
    country: "Canada",
    level: "Master Judge",
    certified_classes: ["All Obedience Levels", "All Rally Levels", "All Games"],
    advanced_classes: ["All Scent Classes", "Specialty Classes"],
    is_active: true
  },
  {
    name: "Melissa Ramsay",
    email: "m.a.barker@hotmail.com",
    phone: "250-249-5686",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Multi-Discipline Judge",
    certified_classes: ["Obedience Level 1-3", "Rally Starter-Pro", "Games Level 1-4"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  // UNITED STATES - Ohio
  {
    name: "Heather Lampman",
    email: "hflampman@windstream.net",
    phone: "440-708-0768",
    city: "Chagrin Falls",
    province_state: "OH",
    country: "United States",
    level: "Senior Judge",
    certified_classes: ["All Obedience Levels", "All Rally Levels"],
    advanced_classes: [],
    is_active: true
  },
  {
    name: "Paige Alpine-Malone",
    email: "paigecmalone@gmail.com",
    phone: "(440)465-4829",
    city: "Columbia Station",
    province_state: "OH",  // Fixed: was too long
    country: "United States",
    level: "Multi-Discipline Judge",
    certified_classes: ["Rally Starter-Pro", "Games Level 1-4"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  {
    name: "Ann Spurrier",
    email: "dr.annspurrier@gmail.com",
    phone: "440-392-0237",
    city: "Concord Township",
    province_state: "OH",
    country: "United States",
    level: "Master Judge",
    certified_classes: ["Obedience Level 1-3", "Rally Starter-Pro", "Games Level 1-4"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  // UNITED STATES - Maryland
  {
    name: "Gwen Carr",
    email: "umbc@christophercarr.com",
    phone: "240-529-5354",
    city: "Frederick",
    province_state: "MD",
    country: "United States",
    level: "Master Judge",
    certified_classes: ["All Obedience Levels", "All Rally Levels", "All Games"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  {
    name: "Randy Sutton",
    email: "blueridgehorns@hotmail.com",
    phone: "717-794-2717",
    city: "Blue Ridge Summit",
    province_state: "PA",
    country: "United States",
    level: "Master Judge",
    certified_classes: ["All Obedience Levels", "All Rally Levels", "All Games"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  // UNITED STATES - Michigan
  {
    name: "Shirley Ottmer",
    email: "c-wags@sbcglobal.net",
    phone: "517-817-9437",
    city: "Jackson",
    province_state: "MI",
    country: "United States",
    level: "Senior Judge",
    certified_classes: ["Obedience Level 1-4", "Rally Starter-Pro", "Games Level 1-4"],
    advanced_classes: ["Scent Patrol-Super Sleuth"],
    is_active: true
  },
  {
    name: "Amy Wukotich",
    email: "AWUKOTICH@GMAIL.COM",
    phone: "773-330-8347",
    city: "Chicago",
    province_state: "IL",
    country: "United States",
    level: "Multi-Discipline Judge",
    certified_classes: ["Rally Starter-Pro", "Games Level 1-4"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  // UNITED STATES - New York
  {
    name: "Lori Timberlake",
    email: "loricoventry@gmail.com",
    phone: "716-983-9179",
    city: "Cheektowaga",
    province_state: "NY",
    country: "United States",
    level: "Master Judge",
    certified_classes: ["All Obedience Levels", "All Rally Levels", "All Games"],
    advanced_classes: ["All Scent Classes"],
    is_active: true
  },
  {
    name: "Casey Palmer",
    email: "taklimakanbcs@verizon.net",
    phone: "978-877-8340",
    city: "Groton",
    province_state: "MA",
    country: "United States",
    level: "Multi-Discipline Judge",
    certified_classes: ["Obedience Level 1-3", "Rally Starter-Pro", "Games Level 1-4"],
    advanced_classes: [],
    is_active: true
  },
  {
    name: "Nicole Tate",
    email: "njtaterr@gmail.com",
    phone: "803-206-0877",
    city: "Blythewood",
    province_state: "SC",
    country: "United States",
    level: "Master Judge",
    certified_classes: ["All Obedience Levels", "All Rally Levels", "All Games"],
    advanced_classes: [],
    is_active: true
  }
];

/**
 * Populate the judges table with C-WAGS judge data
 */
async function populateJudges() {
  console.log('🚀 Starting judge data population...');
  
  try {
    // Test connection with the correct schema
    console.log('🔍 Testing database connection...');
    const { count, error: testError } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Failed to connect to judges table:', testError.message);
      return;
    }

    console.log('✅ Successfully connected to judges table');

    // Show current count
    const currentCount = count || 0;
    console.log(`📊 Current judges in database: ${currentCount}`);

    // Ask before clearing (optional)
    if (currentCount > 0) {
      console.log('🧹 Clearing existing judge data...');
      const { error: deleteError } = await supabase
        .from('judges')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.log('⚠️  Warning: Could not clear existing data:', deleteError.message);
      } else {
        console.log('✅ Existing data cleared');
      }
    }

    // Insert judge data in batches
    const batchSize = 5; // Small batches for safety
    let successCount = 0;
    let errorCount = 0;

    console.log(`📝 Inserting ${judgeData.length} judges in batches of ${batchSize}...`);

    for (let i = 0; i < judgeData.length; i += batchSize) {
      const batch = judgeData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      
      console.log(`📦 Processing batch ${batchNumber}/${Math.ceil(judgeData.length/batchSize)} (${batch.length} judges)...`);
      
      const { data, error } = await supabase
        .from('judges')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error inserting batch ${batchNumber}:`, error.message);
        console.error('   Batch judges:', batch.map(j => j.name));
        errorCount += batch.length;
      } else {
        console.log(`✅ Successfully inserted batch ${batchNumber}: ${data.length} judges`);
        successCount += data.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📊 Population Summary:');
    console.log(`✅ Successfully inserted: ${successCount} judges`);
    console.log(`❌ Failed insertions: ${errorCount} judges`);
    console.log(`📈 Total records processed: ${judgeData.length} judges`);

    // Verify the final count
    const { count: finalCount, error: verifyError } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError.message);
    } else {
      console.log(`🔍 Final verification: ${finalCount || 0} total judges in database`);
    }

    // Show some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('judges')
      .select('name, city, province_state, country, level')
      .limit(5);

    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError.message);
    } else {
      console.log('\n🔍 Sample judge records:');
      sampleData?.forEach((judge, index) => {
        console.log(`${index + 1}. ${judge.name} - ${judge.city}, ${judge.province_state}, ${judge.country} (${judge.level})`);
      });
    }

  } catch (error) {
    console.error('💥 Fatal error during population:', error);
  }
}

// Run the population script
populateJudges()
  .then(() => {
    console.log('\n🎉 Judge data population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Population failed:', error);
    process.exit(1);
  });