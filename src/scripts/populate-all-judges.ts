// src/scripts/populate-all-judges.ts
// Complete C-WAGS judge population in the exact order they appear on the website
// Using the correct individual qualification format for filtering

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

// All judges in the exact order they appear on the C-WAGS website
const allJudges: Judge[] = [
  // CANADA - AB
  {
    name: "Cathy Jenkins",
    email: "cathy.l@live.com",
    phone: "403-803-8425",
    city: "Airdrie",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Janilee Benell",
    email: "comeau.janilee@gmail.com",
    phone: "587-897-2280",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2",
    is_active: true
  },
  {
    name: "Barb Burgess",
    email: "barbburgess@shaw.com",
    phone: "403-875-1051",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Tamara Champagne",
    email: "sportcanines@gmail.com",
    phone: "587-891-3592",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Cailey Christen",
    email: "caileychristen@gmail.com",
    phone: "403-473-4967",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Colleen Herring",
    email: "c.herring@shaw.ca",
    phone: "403-283-6127",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kelly Ladouceur",
    email: "kladckrs@gmail.com",
    phone: "780-715-8010",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Katia Millette",
    email: "katiamillette1@hotmail.com",
    phone: "403-988-3123",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sarah-Jane Petti",
    email: "sarahjane@chemies.com",
    phone: "403-245-5853",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kim Philipoff",
    email: "kim@marveldog.ca",
    phone: "403-254-8576",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Irene Schneider",
    email: "troeigh@gmail.com",
    phone: "587-435-0236",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Kathy Schneider",
    email: "tandkcrew@gmail.com",
    phone: "403-828-5685",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Stephanie Sikora",
    email: "slsikora37@gmail.com",
    phone: "403-471-5749",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Melissa Waters",
    email: "melissa@stixnstonz.ca",
    phone: "403-804-5233",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4",
    is_active: true
  },
  {
    name: "Nicole Wiebe",
    email: "nikkiwiebe@hotmail.com",
    phone: "403-400-6034",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Shanna Zook",
    email: "shannazook@gmail.com",
    phone: "403-988-6768",
    city: "Calgary",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Cheramie Barbazuk",
    email: "cheramie.cl@gmail.com",
    phone: "780-916-0035",
    city: "Edmonton",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Deborah Csongradi",
    email: "debho@outlook.com",
    phone: "780-974-3252",
    city: "Edmonton",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Christina Dunington",
    email: "dunington@hotmail.com",
    phone: "780-717-6373",
    city: "Edmonton",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Dionne Maccagno",
    email: "dianne@dnafamily.ca",
    phone: "780-953-8697",
    city: "Edmonton",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Deb Proc",
    email: "debproc72@gmail.com",
    phone: "782-717-9296",
    city: "Edmonton",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Penny Stiles",
    email: "shopper_pat@hotmail.com",
    phone: "780-453-2698",
    city: "Edmonton",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Jodie Boudreault",
    email: "jodie_derksen@hotmail.com",
    phone: "780-380-4432",
    city: "Grande Prairie",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Shauna Ferby",
    email: "shaunaferby@hotmail.com",
    phone: "403-894-5486",
    city: "Lethbridge",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Amanda Labadie",
    email: "manymuddypaws@hotmail.ca",
    phone: "405-330-5370",
    city: "Lethbridge",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Lou-Anne Lambert",
    email: "lmlambert24@gmail.com",
    phone: "306-313-4556",
    city: "Lethbridge",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Tammy Ruff",
    email: "xrafy7102@yahoo.com",
    phone: "403-315-5950",
    city: "Lethbridge",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "MaryAnn Warren",
    email: "mwtracks@telus.net",
    phone: "780-721-2279",
    city: "Morinville",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Robbi Bitner",
    email: "rbitner@telus.net",
    phone: "780-242-3857",
    city: "Sherwood Park",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Mark Eckley",
    email: "wame@telus.net",
    phone: "780-919-9092",
    city: "Spruce Grove",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kelly Morris",
    email: "noseykelly@gmail.com",
    phone: "250-868-6603",
    city: "Spruce Grove",
    province_state: "AB",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },

  // CANADA - BC
  {
    name: "Alycia Rogal",
    email: "freelifecanine@gmail.com",
    phone: "778-267-2592",
    city: "150 Mile House",
    province_state: "BC",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Samantha Langley",
    email: "sam@tugdog.ca",
    phone: "778-227-6254",
    city: "Abbotsford",
    province_state: "BC",
    country: "Canada",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Alice Jantzen",
    email: "aljantzen@hotmail.com",
    phone: "250-503-6100",
    city: "Armstrong",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Trishanna Ramsey",
    email: "okanagangeckos@hotmail.com",
    phone: "250-938-2210",
    city: "Armstrong",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Natasha Audy",
    email: "natasha.audy.nosework@gmail.com",
    phone: "250-304-0976",
    city: "Castlegar",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Yolanda Chirico",
    email: "yodac666@gmail.com",
    phone: "250-687-4472",
    city: "Castlegar",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Glenda Harris",
    email: "glendalharris@gmail.com",
    phone: "250-354-2842",
    city: "Castlegar",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Karen Leman",
    email: "karen.k9nosework@gmail.com",
    phone: "250-551-5240",
    city: "Castlegar",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Judy Soltesz",
    email: "jsoltesz52@outlook.com",
    phone: "250-304-3346",
    city: "Castlegar",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Trina Ho",
    email: "trinaho@gmail.com",
    city: "Cobble Hill",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Lynne Johaneson",
    email: "lynnejohaneson@me.com",
    phone: "250-351-5263",
    city: "Coldstream",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Gary Truitt",
    email: "cantree@telus.net",
    phone: "250-260-3078",
    city: "Coldstream",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Karen Bereti",
    email: "karen_bereti@hotmail.com",
    phone: "604-928-2867",
    city: "Coquitlam",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Patti Bien",
    email: "pattibien@hotmail.com",
    phone: "604-970-9959",
    city: "Coquitlam",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kirsten Robertson",
    email: "kirstenrobertson@me.com",
    phone: "604-715-3034",
    city: "Delta",
    province_state: "BC",
    country: "Canada",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2",
    is_active: true
  },
  {
    name: "Amy Atkinson",
    email: "amy.l.bitz@gmail.com",
    phone: "604-345-5705",
    city: "Kamloops",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Arleigh Bell",
    email: "arleighb@shaw.ca",
    phone: "778-991-3668",
    city: "Kamloops",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sarah Knight",
    email: "sarahmknight2017@gmail.com",
    phone: "250-212-7130",
    city: "Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Cheree Richmond",
    email: "rottiepups@shaw.ca",
    phone: "250-862-6741",
    city: "Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Heather Schneider",
    email: "corgi@shaw.ca",
    phone: "250-764-9580",
    city: "Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sandy Sommerfeld",
    email: "sandysom123@gmail.com",
    phone: "250-717-6737",
    city: "Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Zoom 1, Zoom 1.5",
    is_active: true
  },
  {
    name: "Tara Thompson",
    email: "prismsea@gmail.com",
    phone: "250-826-6757",
    city: "Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Cathryn Kozak",
    email: "cathryn_kozak@hotmail.com",
    phone: "250-639-4324",
    city: "Kitimat",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Mykela Mahoney",
    email: "wittig.mykela@gmail.com",
    phone: "705-274-4354",
    city: "Kitimat",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective",
    is_active: true
  },
  {
    name: "Deborah Corry",
    email: "thelowchenlady@gmail.com",
    phone: "778-392-7802",
    city: "Lake Country",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Megan Brooking",
    email: "megan@extraordinarycanines.com",
    phone: "604-785-6347",
    city: "Langley",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sara Wells",
    email: "sara.nichole@shaw.ca",
    phone: "778-228-8970",
    city: "Langley",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Shelley Dunlop",
    email: "shellistoo@gmail.com",
    phone: "778-580-6374",
    city: "Lions Bay",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Paige Gordon",
    email: "gordon.paige.tatum@gmail.com",
    city: "Maple Ridge",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kelly Muzzatti",
    email: "kellymuzzatti@gmail.com",
    phone: "604-992-1522",
    city: "Maple Ridge",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Teresa Zurberg",
    email: "teresa.zurberg@vch.ca",
    phone: "604-839-3050",
    city: "Maple Ridge",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Salina Ip",
    email: "salina.hcip@gmail.com",
    phone: "604-518-0111",
    city: "New Westminster",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Kathy McKenzie",
    email: "aussieglitz@gmail.com",
    phone: "250-462-3677",
    city: "Penticton",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Daryl Meyers",
    email: "darylmeyers04@gmail.com",
    phone: "250-809-4202",
    city: "Penticton",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Aaryn Secker",
    email: "aaryn.secker@gmail.com",
    phone: "250-488-0271",
    city: "Penticton",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Melanie Baker",
    email: "jasonmelaniebaker@outlook.com",
    phone: "250-747-3658",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kathy Crosina",
    email: "truenorthaussies@gmail.com",
    phone: "250-991-0106",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Barb Herringshaw",
    email: "barb.herringshaw@hotmail.ca",
    phone: "250-985-7095",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Barb King",
    email: "barb@barbking.ca",
    phone: "250-316-0020",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Erin Lynes",
    email: "erin@kinderdoggin.com",
    phone: "250-992-5253",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Melissa Ramsay",
    email: "m.a.barker@hotmail.com",
    phone: "250-249-5686",
    city: "Quesnel",
    province_state: "BC",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Lia Bijsterveld",
    email: "thedogsma@shaw.ca",
    phone: "604-272-1834",
    city: "Richmond",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Shelley Cherkowski",
    email: "waveswild@gmail.com",
    phone: "604-868-9710",
    city: "Richmond",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Jeanne Shaw",
    email: "jeanne.dogs@gmail.com",
    phone: "250-359-6650",
    city: "Slocan Park",
    province_state: "BC",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Ariana Jones",
    email: "arianaj0220@gmail.com",
    phone: "604-202-4246",
    city: "Surrey",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Rebecca Roy",
    email: "TrainingWithRebecca@gmail.com",
    city: "Surrey",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Crystal Male",
    email: "crystalmale@gmail.com",
    phone: "250-640-3990",
    city: "Terrace",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Alissa Sullivan",
    email: "alissadsullivan@gmail.com",
    phone: "250-641-2192",
    city: "Terrace",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Hana Niemi-Robinson",
    email: "ohanak9centreterrace@gmail.com",
    phone: "250-641-1437",
    city: "Thornhill",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Paige Millward",
    email: "paige.millwards@gmail.com",
    phone: "604-726-4800",
    city: "Vancouver",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Lane Michie",
    email: "caninegoodscents@gmail.com",
    city: "West Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Marla Williamson",
    email: "ISIS_dea@yahoo.com",
    phone: "250-808-6410",
    city: "West Kelowna",
    province_state: "BC",
    country: "Canada",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Breanna Davidson",
    email: "bre_skates@hotmail.com",
    phone: "250-267-4617",
    city: "Williams Lake",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Madelyn Davidson",
    email: "madelyndavidson@hotmail.com",
    phone: "778-888-4265",
    city: "Williams Lake",
    province_state: "BC",
    country: "Canada",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },

  // UNITED STATES - DE
  {
    name: "Terri Eyer",
    email: "yippyskippy247@aol.com",
    phone: "301-305-8479",
    city: "Milford",
    province_state: "DE",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sharon Munshour",
    email: "ldygolfr912@aol.com",
    phone: "301-631-0344",
    city: "Milford",
    province_state: "DE",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },

  // UNITED STATES - IL
  {
    name: "Stacy Sadler",
    email: "mydogsrule73@gmail.com",
    phone: "815-953-1097",
    city: "Bradley",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sandra Carbonell",
    email: "pawsitivetrainingzone@gmail.com",
    phone: "217-816-1022",
    city: "Chatham",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kathleen Stevens",
    email: "stevens.kathleen13@gmail.com",
    phone: "217-971-9277",
    city: "Chatham",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Liz Berna",
    email: "liz.berna35@gmail.com",
    phone: "708-200-4624",
    city: "Chicago",
    province_state: "IL",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Nancy Reyes",
    email: "nancy@foryourk9.com",
    phone: "847-671-6844",
    city: "Chicago",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Amy Wukotich",
    email: "AWUKOTICH@GMAIL.COM",
    phone: "773-330-8347",
    city: "Chicago",
    province_state: "IL",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kim Dykstra",
    email: "kimberlysdykstra@gmail.com",
    phone: "616-780-0571",
    city: "New Berlin",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Amanda Mabus",
    email: "mabusdogs40@gmail.com",
    phone: "217-720-7808",
    city: "New Berlin",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Allison Alcorn",
    email: "allison_alcorn@yahoo.com",
    phone: "847-274-4155",
    city: "Normal",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Lisa Godfrey",
    email: "lisa@kudosforcanines.com",
    phone: "309-310-2624",
    city: "Normal",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kristin Heiden",
    email: "kristin.heiden@gmail.com",
    phone: "618-322-7357",
    city: "Normal",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Jill Snyder",
    email: "jill@foryourk9.com",
    phone: "779-875-6309",
    city: "Plainfield",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Linda Hinsman",
    email: "lhinsman@gmail.com",
    phone: "217-341-3846",
    city: "Springfield",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Melissa Hodges",
    email: "22mhodges@gmail.com",
    phone: "217-685-1143",
    city: "Springfield",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Chris Ruddock",
    email: "rudi017.cr@gmail.com",
    phone: "217-494-4333",
    city: "Springfield",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Pam Thornburg",
    email: "tompam@mwii.net",
    phone: "217-787-6429",
    city: "Springfield",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Alison Boyd",
    email: "nosila57@comcast.net",
    phone: "708-269-7787",
    city: "Steger",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Jeannine Barbour",
    email: "jeannine.barbour@yahoo.com",
    phone: "708-302-4576",
    city: "Wheaton",
    province_state: "IL",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Bonnie Gutzwiler",
    email: "octavia53@aol.com",
    phone: "630-664-9923",
    city: "Yorkville",
    province_state: "IL",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },

  // UNITED STATES - IN
  {
    name: "Patty Rimkus",
    email: "blu728@sbcglobal.net",
    phone: "219-765-5650",
    city: "Demotte",
    province_state: "IN",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Michelle Riccelli",
    email: "michelle.riccelli@frontier.com",
    phone: "708-825-5427",
    city: "Portage",
    province_state: "IN",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Kristy Hubbard",
    email: "hubbardks@comcast.net",
    phone: "219-508-1388",
    city: "Valparaiso",
    province_state: "IN",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Sharon Jonas",
    email: "gizmogreentrees@yahoo.com",
    phone: "219-794-4752",
    city: "Valparaiso",
    province_state: "IN",
    country: "United States",
    level: "Obedience 1, Obedience 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },

  // UNITED STATES - KY
  {
    name: "Katy McClellan",
    email: "katy.mcclellan@gmail.com",
    phone: "502-409-1936",
    city: "Louisville",
    province_state: "KY",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },

  // UNITED STATES - MA
  {
    name: "Casey Palmer",
    email: "taklimakanbcs@verizon.net",
    phone: "978-877-8340",
    city: "Groton",
    province_state: "MA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },

  // UNITED STATES - MD
  {
    name: "Joyce Engle",
    email: "joyengle@comcast.net",
    phone: "410-652-1704",
    city: "Bel Air",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Rebecca Lawson",
    email: "k9trainer@myactv.net",
    phone: "301-432-4347",
    city: "Boonsboro",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Jackie McDonnell",
    email: "jackie.mcdonnell@comcast.net",
    phone: "301-797-3465",
    city: "Boonsboro",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Gwen Carr",
    email: "umbc@christophercarr.com",
    phone: "240-529-5354",
    city: "Frederick",
    province_state: "MD",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Marie Donahue",
    email: "mdcanine@yahoo.com",
    phone: "301-708-1889",
    city: "Frederick",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Liza Lundell",
    email: "senjidogseml@yahoo.com",
    phone: "301-916-6434",
    city: "Germantown",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Cindy Knowlton",
    email: "cindy@seespotgrin.com",
    phone: "301-873-3041",
    city: "Glenwood",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Ryan Baugher",
    email: "rbaugher3@comcast.net",
    phone: "301-606-1611",
    city: "Hagerstown",
    province_state: "MD",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Stephanie Morin",
    email: "stephanieann742@gmail.com",
    phone: "413-205-6014",
    city: "Hagerstown",
    province_state: "MD",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Deborah Swartz",
    email: "raturtle@verizon.net",
    phone: "240-405-7073",
    city: "Keedysville",
    province_state: "MD",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3",
    is_active: true
  },
  {
    name: "Jennieann Mitchell",
    email: "popstardestiny@hotmail.com",
    phone: "443-783-7579",
    city: "Parsonsburg",
    province_state: "MD",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Trena Laswell",
    email: "tlaswell91@gmail.com",
    phone: "410-370-5112",
    city: "Pasadena",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective",
    is_active: true
  },
  {
    name: "Dayna Dreger",
    email: "daynadreger@gmail.com",
    phone: "765-414-8174",
    city: "Rockville",
    province_state: "MD",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },

  // UNITED STATES - MI
  {
    name: "Jayne Meyer",
    email: "jayne.meyer82@yahoo.com",
    phone: "616-826-2234",
    city: "Allendale",
    province_state: "MI",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Lesa Layman",
    email: "agildog555@gmail.com",
    city: "Clinton Twp",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Cindy Angiulo",
    email: "cangiulo@gmail.com",
    phone: "248-921-5759",
    city: "Commerce Township",
    province_state: "MI",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sandi Talerico",
    email: "sandi.talerico@gmail.com",
    phone: "810-240-4857",
    city: "Davison",
    province_state: "MI",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Cynthia Sweet",
    email: "justlabs16@gmail.com",
    phone: "248-941-3756",
    city: "Farmington Hills",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Jodi Jarvis-Therrian",
    email: "Jodidogblessed@gmail.com",
    phone: "231-788-6029",
    city: "Holton",
    province_state: "MI",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Games 1, Games 2",
    is_active: true
  },
  {
    name: "Shirley Ottmer",
    email: "c-wags@sbcglobal.net",
    phone: "517-817-9437",
    city: "Jackson",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Becki Vander Weele",
    email: "beaglegold@yahoo.com",
    phone: "269-599-5523",
    city: "Kalamazoo",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3",
    is_active: true
  },
  {
    name: "Diana Updike",
    email: "vontasz@yahoo.com",
    phone: "734-674-6267",
    city: "Livonia",
    province_state: "MI",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Paula Smith",
    email: "paulaannsmith75@gmail.com",
    phone: "616-430-0297",
    city: "Montague",
    province_state: "MI",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Colleen Belanger",
    email: "acestoli@yahoo.com",
    phone: "810-374-6166",
    city: "Otisville",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3",
    is_active: true
  },
  {
    name: "Karen O'Nail",
    email: "karenonail@yahoo.com",
    phone: "248-459-8699",
    city: "Rochester Hills",
    province_state: "MI",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Games 1, Games 2",
    is_active: true
  },
  {
    name: "Sue Kotlarek",
    email: "dogwasher1@comcast.net",
    phone: "734-776-8290",
    city: "Romulus",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5",
    is_active: true
  },
  {
    name: "Liz McLeod",
    email: "thepointerbrothers@gmail.com",
    phone: "248-506-6773",
    city: "Royal Oak",
    province_state: "MI",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Holly Rupprecht",
    email: "dashalin@comcast.net",
    phone: "248-425-1804",
    city: "White Lake",
    province_state: "MI",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Leah Dykstra",
    email: "leahdykstra@hotmail.com",
    phone: "616-499-5309",
    city: "Zeeland",
    province_state: "MI",
    country: "United States",
    level: "Obedience 1, Obedience 2, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2",
    is_active: true
  },

  // UNITED STATES - NJ
  {
    name: "Gail Vendetti",
    email: "2prettypaints@gmail.com",
    city: "Newton",
    province_state: "NJ",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },

  // UNITED STATES - NY
  {
    name: "Lori Timberlake",
    email: "loricoventry@gmail.com",
    phone: "716-983-9179",
    city: "Cheektowaga",
    province_state: "NY",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
     is_active: true
  },
    {
    name: "John Knoph",
    email: "jak383@yahoo.com",
    phone: "716-481-5225",
    city: "East Amherst",
    province_state: "NY",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },

  // UNITED STATES - OH
  {
    name: "Heather Lampman",
    email: "hflampman@windstream.net",
    phone: "440-708-0768",
    city: "Chagrin Falls",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2",
    is_active: true
  },
  {
    name: "Suzan Bocciarelli",
    email: "labrador@windstream.net",
    phone: "440-286-6255",
    city: "Chardon",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Beth Mann",
    email: "loisbethmann@gmail.com",
    phone: "440-413-8766",
    city: "Chesterland",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Ann Smorado",
    email: "ann.smorado262@gmail.com",
    phone: "440-669-2407",
    city: "Chesterland",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5",
    is_active: true
  },
  {
    name: "Paige Alpine-Malone",
    email: "paigecmalone@gmail.com",
    phone: "(440)465-4829",
    city: "Columbia Station",
    province_state: "OH",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Samantha Speegle",
    email: "samantha@columbuscanines.com",
    phone: "614-288-5483",
    city: "Columbus",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Ann Spurrier",
    email: "dr.annspurrier@gmail.com",
    phone: "440-392-0237",
    city: "Concord Township",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Robin Ford",
    email: "rforddogs@gmail.com",
    phone: "419-923-8201",
    city: "Delta",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Hope Schmeling",
    email: "caninedivine@gmail.com",
    phone: "260-602-5869",
    city: "Englewood",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Doreen Barren",
    email: "seetazrun97@aol.com",
    phone: "440-777-4647",
    city: "Fairview Park",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Joyce Charron",
    email: "joyce.charron@gmail.com",
    phone: "614-284-4991",
    city: "Grove City",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Elisa Jones",
    email: "elisajones73@gmail.com",
    phone: "513-720-6162",
    city: "Hamilton",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Starter, Advanced, Zoom 1, Zoom 1.5, Games 1, Games 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Patty Stafford",
    email: "pands2009@yahoo.com",
    phone: "330-550-5547",
    city: "Hubbard",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5",
    is_active: true
  },
  {
    name: "Ginger Alpine",
    email: "alpinescanineacres@gmail.com",
    phone: "440-465-6199",
    city: "Litchfield",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kathleen Tagliamonte",
    email: "ktagliam@oh.rr.com",
    phone: "440-220-0262",
    city: "Mentor",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4",
    is_active: true
  },
  {
    name: "Tricia Barstow",
    email: "superboo522@yahoo.com",
    phone: "440-478-6272",
    city: "Middlefield",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Carolyn Martin",
    email: "westmark2007@gmail.com",
    phone: "740-345-9211",
    city: "Newark",
    province_state: "OH",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Joanne Shupp",
    email: "joanne.shupp@yahoo.com",
    phone: "440-251-8001",
    city: "Painesville",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Julie Lakas",
    email: "jberner5@yahoo.com",
    phone: "440-292-6421",
    city: "Parma",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Tara Gifford",
    email: "tara@ohioanimaltraining.com",
    phone: "330-350-1658",
    city: "Sullivan",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Annie Hammer",
    email: "anniemhammer2@gmail.com",
    phone: "419-303-3081",
    city: "Swanton",
    province_state: "OH",
    country: "United States",
    level: "Obedience 1, Obedience 2, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Lynmarie Hamel",
    email: "lynmariehamel37@gmail.com",
    phone: "216-644-8101",
    city: "University Heights",
    province_state: "OH",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },

  // UNITED STATES - OR
  {
    name: "Elizabethanne Stevens",
    email: "minipoodles@comcast.net",
    phone: "801-910-9121",
    city: "Beavercreek",
    province_state: "OR",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },

  // UNITED STATES - PA
  {
    name: "Ali Brown",
    email: "ali@greatcompanions.info",
    phone: "610-737-1550",
    city: "Allentown",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Emil Pohodich",
    email: "epoho1@verizon.net",
    phone: "412-833-1693",
    city: "Bethel Park",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Amy Rusenko",
    email: "eandme@rusenko.com",
    phone: "412-654-3148",
    city: "Bethel Park",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Renee Hall",
    email: "renee@letsspeakdog.com",
    phone: "610-570-8720",
    city: "Bethlehem",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Rebecca Menapace",
    email: "crazyzoopeople@yahoo.com",
    phone: "717-3373277",
    city: "Biglerville",
    province_state: "PA",
    country: "United States",
    level: "Starter, Advanced, Pro, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Sharon Keppley",
    email: "shkeppley@aol.com",
    phone: "610-392-6476",
    city: "Blandon",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Randy Sutton",
    email: "blueridgehorns@hotmail.com",
    phone: "717-794-2717",
    city: "Blue Ridge Summit",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Joan Klingler",
    email: "izaakkling@verizon.net",
    phone: "717-763-4501",
    city: "Camp Hill",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Jennifer Kieffer",
    email: "jkieffer@cocalico.org",
    phone: "267-249-9191",
    city: "Denver",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Susan Wetherell",
    email: "wetherell@mac.com",
    phone: "412-414-9052",
    city: "Eight Four",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kathleen Ingram",
    email: "kathleeningram@yahoo.com",
    phone: "724-674-4235",
    city: "Ellwood City",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5",
    is_active: true
  },
  {
    name: "Kim Malmer",
    email: "kmalmer110@gmail.com",
    phone: "717-333-9507",
    city: "Ephrata",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Amy Randt",
    email: "arandt@live.com",
    phone: "717-253-2999",
    city: "Fairfield",
    province_state: "PA",
    country: "United States",
    level: "Games 1, Games 2",
    is_active: true
  },
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
    phone: "717-728-3867 cell:717-547-7766",
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

  {
    name: "Stephanie Barber",
    email: "kelstrincollies@comcast.net",
    phone: "412-841-1889",
    city: "Monongahela",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Marcy Fenell",
    email: "cheeriochops@gmail.com",
    phone: "412-580-4069",
    city: "Moon Township",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Kailly Muthard",
    email: "kaillymuthard@gmail.com",
    phone: "484-602-4054",
    city: "New Tripoli",
    province_state: "PA",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Maribeth Hook",
    email: "maribethhook@yahoo.com",
    phone: "412-247-5198",
    city: "Pittsburgh",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Tracey Miller",
    email: "tmiller@pitt.edu",
    phone: "412-452-5761",
    city: "Pittsburgh",
    province_state: "PA",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Tina Parker",
    email: "successjustclicks@gmail.com",
    phone: "412-389-0202",
    city: "Pittsburgh",
    province_state: "PA",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2",
    is_active: true
  },
  {
    name: "Judy Richardson",
    email: "jazzyrich@earthlink.net",
    phone: "717-762-3429",
    city: "Waynesboro",
    province_state: "PA",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },

  // UNITED STATES - SC
  {
    name: "Nicole Tate",
    email: "njtaterr@gmail.com",
    phone: "803-206-0877",
    city: "Blythewood",
    province_state: "SC",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Robbie Black",
    email: "rblack@sc.rr.com",
    phone: "803-622-8800",
    city: "Columbia",
    province_state: "SC",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5",
    is_active: true
  },
  {
    name: "Nell Jenkins",
    email: "nell.jenkins3324@gmail.com",
    phone: "803-767-3939",
    city: "Columbia",
    province_state: "SC",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },
  {
    name: "Laurie Schlossnagle",
    email: "rlydogs@gmail.com",
    phone: "801-643-6272",
    city: "Conway",
    province_state: "SC",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Monica Callahan",
    email: "familyfidotraining@gmail.com",
    phone: "440-865-0822",
    city: "North Charleston",
    province_state: "SC",
    country: "United States",
    level: "Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Jaye Pearce",
    email: "jaye29169@yahoo.com",
    phone: "803-446-3575",
    city: "West Columbia",
    province_state: "SC",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2, Games 1, Games 2, Games 3, Games 4",
    is_active: true
  },

  // UNITED STATES - TN
  {
    name: "Diane Goff",
    email: "dianee.goff@gmail.com",
    phone: "317-517-3068",
    city: "Chattanooga",
    province_state: "TN",
    country: "United States",
    level: "Games 1, Starter, Zoom 1, Patrol, Detective, Investigator, Super Sleuth, Private Investigator, Detective Diversions",
    is_active: true
  },
  {
    name: "Bonnie Hornfisher",
    email: "hornfisher@comcast.net",
    phone: "734-634-0138",
    city: "Knoxville",
    province_state: "TN",
    country: "United States",
    level: "Obedience 1, Obedience 2, Obedience 3, Obedience 4, Obedience 5, Starter, Advanced, Pro, ARF, Zoom 1, Zoom 1.5, Zoom 2",
    is_active: true
  },

  // UNITED STATES - UT
  {
    name: "Tori Lowry",
    email: "goodscentsnosework@gmail.com",
    phone: "801-556-7618",
    city: "Herriman",
    province_state: "UT",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
  {
    name: "Meagan Benedetto",
    email: "meag.benedetto@gmail.com",
    phone: "801-725-7421",
    city: "Layton",
    province_state: "UT",
    country: "United States",
    level: "Starter, Advanced, Zoom 1, Zoom 1.5, Patrol, Detective, Investigator",
    is_active: true
  },
  {
    name: "Lisa Quibell",
    email: "lisa@quibellsnbits.com",
    phone: "801-608-9429",
    city: "West Jordan",
    province_state: "UT",
    country: "United States",
    level: "Patrol, Detective, Investigator, Super Sleuth",
    is_active: true
  },
];
  async function populateAllJudges() {
  console.log('🚀 Starting complete C-WAGS judge population...');
  
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

    // Insert judges in batches of 10
    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;

    console.log(`📝 Inserting ${allJudges.length} judges in batches of ${batchSize}...`);

    for (let i = 0; i < allJudges.length; i += batchSize) {
      const batch = allJudges.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      
      console.log(`📦 Processing batch ${batchNumber}/${Math.ceil(allJudges.length/batchSize)} (${batch.length} judges)...`);
      
      const { data, error } = await supabase
        .from('judges')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Batch ${batchNumber} failed:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`✅ Batch ${batchNumber} succeeded: ${data.length} judges`);
        successCount += data.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📊 Population Summary:');
    console.log(`✅ Successfully inserted: ${successCount} judges`);
    console.log(`❌ Failed insertions: ${errorCount} judges`);
    console.log(`📈 Total processed: ${allJudges.length} judges`);

    // Final verification
    const { count: finalCount } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true });

    console.log(`🔍 Final database count: ${finalCount || 0} judges`);

    // Show sample data
    const { data: sampleData } = await supabase
      .from('judges')
      .select('name, city, province_state, country')
      .limit(5);

    console.log('\n🔍 Sample judges:');
    sampleData?.forEach((judge, index) => {
      console.log(`${index + 1}. ${judge.name} - ${judge.city}, ${judge.province_state}, ${judge.country}`);
    });

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

populateAllJudges()
  .then(() => {
    console.log('\n🎉 Complete judge population finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Population failed:', error);
    process.exit(1);
  });