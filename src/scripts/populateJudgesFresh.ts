// src/scripts/populate-judges-fresh.ts
// Fresh start - judge population with correct individual qualification format

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

interface Judge {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  province_state?: string;
  country?: string;
  level?: string;
  is_active: boolean;
}

const judges: Judge[] = [
  {
    name: "Hope Bean",
    email: "hopebean88@yahoo.com",
    phone: "757-434-9631",
    city: "Gettysburg",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Marguerite Plank",
    email: "mplank@pa.net",
    phone: "717-334-5392",
    city: "Gettysburg",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5",
    is_active: true
  },
  {
    name: "Beth Weidman",
    email: "eaweidman25@hotmail.com",
    phone: "717-471-1455",
    city: "Honey Brook",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kim Loar",
    email: "jrrescuepa@verizon.net",
    phone: "hm:717-299-4040 717-679-2686",
    city: "Lancaster",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Laura Leonard",
    email: "lmleonard67@gmail.com",
    phone: "412-527-0239",
    city: "Lawrence",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Megan Esherick",
    email: "cleverhounddogtraining@gmail.com",
    phone: "610-203-3228",
    city: "Leesport",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Youlia Anderson",
    email: "picasso@prolog.net",
    phone: "717-203-5735",
    city: "Manheim",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Mary Francis Martin",
    email: "popstixs@msn.com",
    phone: "412-445-1225",
    city: "Mc Kees Rocks",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Elaine Mayowski",
    email: "lady-elaine@live.com",
    phone: "412-337-1345",
    city: "Mc Kees Rocks",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Rhonda Robinson",
    email: "rrobinson@pa.net",
    phone: "717-728-3867 717-547-7766",
    city: "Mechanicsburg",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
{
    name: "Toni Sjoblom",
    email: "tonisjoblom17@gmail.com",
    phone: "801-541-2519",
    city: "West Jordan",
    province_state: "UT",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
{
    name: "Renea Dahms",
    email: "renea@pawsitivelyunleashed.com",
    phone: "715-347-3294",
    city: "Custer",
    province_state: "WI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
{
    name: "Brenda Cirricione",
    email: "brenda-cirricione@new.rr.com",
    phone: "920-585-2001",
    city: "Oshkosh",
    province_state: "WI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
{
    name: "Tom Pawlisch",
    email: "pawlischchessie@gmail.com",
    phone: "920-296-1492",
    city: "Fall River",
    province_state: "WI",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5",
    is_active: true
  },

];

async function populateJudges() {
  console.log('🚀 Starting fresh judge population...');
  
  try {
    // Test connection
    const { count, error: testError } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return;
    }

    console.log(`✅ Connected. Current judges: ${count || 0}`);

    // Clear existing data
    const { error: deleteError } = await supabase
      .from('judges')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.log('⚠️ Could not clear existing data:', deleteError.message);
    } else {
      console.log('🧹 Cleared existing data');
    }

    // Insert new judges
    console.log(`📝 Inserting ${judges.length} judges...`);
    
    const { data, error } = await supabase
      .from('judges')
      .insert(judges)
      .select();

    if (error) {
      console.error('❌ Insert failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log(`✅ Successfully inserted ${data.length} judges`);
      
      // Show results
      data.forEach((judge, index) => {
        console.log(`${index + 1}. ${judge.name} - ${judge.level}`);
      });
    }

    // Final verification
    const { count: finalCount } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true });

    console.log(`🔍 Final count: ${finalCount || 0} judges`);

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

populateJudges()
  .then(() => {
    console.log('\n🎉 Population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });