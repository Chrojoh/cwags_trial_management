// src/app/api/admin/import-trial/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get auth from headers
    const authHeader = request.headers.get('authorization');
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {}
        }
      }
    );
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'administrator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('📄 Starting import for file:', file.name);

    // Official C-WAGS judges list for name matching
    const CWAGS_JUDGES = [
      'Rhonda Robinson', 'Jeannine Barbour', 'Kirsten Robertson', 'Cathryn Kozak', 'Shirley Ottmer',
      'Kim Malmer', 'Kayla Steponavicius', 'Alison Lux', 'Alison Boyd', 'Madelyn Davidson',
      'Hope Schmeling', 'Joan Klingler', 'Tamara Champagne', 'Cynthia Sweet', 'Nell Jenkins',
      'Teresa Zurberg', 'Cheramie Barbazuk', 'Christina Dunington', 'Rebecca Lawson', 'Bonnie Gutzwiller',
      'Barb King', 'Lynne Johaneson', 'Sharon Jonas', 'Ariana Jones', 'Bonnie Hornfisher',
      'Nancy Reyes', 'Hope Bean', 'Rebecca Roy', 'Sandy Sommerfeld', 'John Knoph',
      'Kristin Heiden', 'Sara Wells', 'Colleen Herring', 'Elaine Mayowski', 'Janilee Benell',
      'Monica Callahan', 'Holly Rupprecht', 'Amanda Labadie', 'Judy Soltesz', 'Joyce Engle',
      'Kathleen Ingram', 'Sue Kotlarek', 'Trena Laswell', 'Katy McClellan', 'Diane Goff',
      'Kristy Hubbard', 'Melanie Baker', 'Candice Lantos', 'Liza Lundell', 'Tammy Ruff',
      'Shelley Dunlop', 'Suzan Boccarelli', 'Marla Williamson', 'Jackie McDonnell', 'Heather Schneider',
      'MaryAnn Warren', 'Toni Sjoblom', 'Stephanie Barber', 'Patti Bien', 'Barb Burgess',
      'Breanna Davidson', 'Kim Loar', 'Nicole Tate', 'Amy Wukotich', 'Liz McLeod',
      'Paige Gordon', 'Joyce Charron', 'Deborah Corry', 'Paige Millward', 'Emil Pohodich',
      'Gail Vendetti', 'Sarah-Jane Petti', 'Tina Parker', 'Beth Weidman', 'Tracey Miller',
      'Megan Brooking', 'Shauna Ferby', 'Jill Robbins', 'Kathleen Tagliamonte', 'Deb Proc',
      'Melissa Hodges', 'Jodie Boudreault', 'Patty Stafford', 'Laurie Schlossnagle', 'Rebecca Menapace',
      'Cindy Knowlton', 'Susan Wetherell', 'Ginger Alpine', 'Alissa Sullivan', 'Lou-Anne Lambert',
      'Meagan Benedetto', 'Alice Jantzen', 'Jamie Fenn', 'Cailey Christen', 'Pamela Hedrich',
      'Samantha Langley', 'Kelly Muzzatti', 'Jennifer Kieffer', 'Tom Pawlisch', 'Joanne Shupp',
      'Melissa Lane', 'Lane Michie', 'Dayna Dreger', 'Robbi Bitner', 'Paige Alpine-Malone',
      'Lia Bijsterveld', 'Alycia Rogel', 'Kathy McKenzie', 'Chris Ruddock', 'Ryan Baugher',
      'Tara Thompson', 'Gwen Carr', 'Mary Francis Martin', 'Samantha Speegle', 'Heather Lampman',
      'Casey Palmer', 'Salina Ip', 'Terri Eyer', 'Kelly Morris', 'Cheree Richmond',
      'Sharon Keppley', 'Stephanie Morin', 'Robbie Black', 'Cathy Jenkins', 'Kelly Ladouceur',
      'Cindy Angiulo', 'Stacy Sadler', 'Kathleen Stevens', 'Trina Ho', 'Arleigh Bell',
      'Jayne Meyer', 'Erin Lynes', 'Karen O\'Nail', 'Glenda Harris', 'Natasha Audy',
      'Lisa Quibell', 'Jennieann Mitchell', 'Kathy Schneider', 'Renee Hall', 'Maribeth Hook',
      'Margot Wagner', 'Marguerite Plank', 'Marcy Fenell', 'Lori Timberlake', 'Tricia Barstow',
      'Daryl Meyers', 'Linda Hinsman', 'Shelley Cherkowski', 'Gary Truitt', 'Pam Thornburg',
      'Diana Updike', 'Jill Snyder', 'Sharon Munshour', 'Yolanda Chirico', 'Karen Bereti',
      'Patty Rimkus', 'Kailly Muthard', 'Leah Dykstra', 'Lisa Godfrey', 'Lesa Layman',
      'Kathy Crosina', 'Amanda Mabus', 'Annie Hammer', 'Amy Randt', 'Deborah Swartz',
      'Tara Gifford', 'Randy Sutton', 'Barb Herringshaw', 'Irene Schneider', 'Mark Eckley',
      'Amy Rusenko', 'Elisa Jones', 'Beth Mann', 'Kayla Brandenberg', 'Ann Smorado',
      'Lynmarie Hamel', 'Penny Stiles', 'Melissa Waters', 'Robin Ford', 'Allison Alcorn',
      'Stephanie Sikora', 'Shanna Zook', 'Youlia Anderson', 'Liz Berna', 'Kim Dykstra',
      'Judy Richardson', 'Jaye Pearce', 'Carolyn Martin', 'Sandra Carbonell', 'Brenda Cirricione',
      'Michelle Riccelli', 'Katia Millette', 'Melissa Ramsay', 'Renea Dahms', 'Ali Brown',
      'Kim Philipoff', 'Tori Lowry', 'Jodi Jarvis-Therrian', 'Laura Leonard', 'Julie Lakas',
      'Hana Niemi-Robinson', 'Colleen Belanger', 'Aaryn Secker', 'Crystal Male', 'Elizabethanne Stevens',
      'Sarah Knight', 'Deborah Csongradi', 'Karen Leman', 'Dionne Maccagno', 'Paula Smith',
      'Ann Spurrier', 'Amy Atkinson', 'Michelle Wieser', 'Mykela Mahoney', 'Jeanne Shaw',
      'Nicole Wiebe', 'Trishanna Ramsey', 'Becki Vander Weele', 'Marie Donahue', 'Megan Esherick',
      'Pat Truitt'
    ];

    // Helper function to match abbreviated judge names
    const matchJudgeName = (input: string): string => {
      if (!input || input.trim() === '') return 'Unknown Judge';
      
      // STEP 1: Aggressive cleaning - remove ALL junk characters
      // This handles: \r\n, leading numbers/dates, extra whitespace, tabs, etc.
      let cleaned = input
        // Remove leading junk (newlines, numbers, slashes, dashes, spaces)
        .replace(/^[\r\n\s\/0-9-]+/, '')
        // Replace all types of whitespace (spaces, tabs, newlines, non-breaking spaces) with single space
        .replace(/[\s\u00A0\t\r\n]+/g, ' ')
        // Trim leading/trailing whitespace
        .trim();
      
      if (!cleaned) return 'Unknown Judge';
      
      // STEP 2: Normalize to proper case (First Letter Of Each Word)
      const normalized = cleaned
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // STEP 3: Try exact match (case insensitive)
      const exactMatch = CWAGS_JUDGES.find(judge => 
        judge.toLowerCase() === normalized.toLowerCase()
      );
      if (exactMatch) return exactMatch;
      
      // Try to match abbreviated name (e.g., "G Truitt" or "G. Truitt")
      // Remove periods and extra spaces
      const cleanInput = normalized.replace(/\./g, '').replace(/\s+/g, ' ').trim();
      
      // Split into parts
      const parts = cleanInput.split(' ');
      
      if (parts.length >= 2) {
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];
        
        // Check if first part is just an initial
        if (firstPart.length === 1) {
          // Match: initial + last name
          const match = CWAGS_JUDGES.find(judge => {
            const judgeParts = judge.split(' ');
            const judgeFirst = judgeParts[0];
            const judgeLast = judgeParts[judgeParts.length - 1];
            
            return judgeFirst[0].toUpperCase() === firstPart.toUpperCase() &&
                   judgeLast.toLowerCase() === lastPart.toLowerCase();
          });
          
          if (match) {
            console.log(`  📝 Matched "${input}" → "${match}"`);
            return match;
          }
        }
        
        // Try fuzzy match on last name only
        const lastNameMatch = CWAGS_JUDGES.find(judge => {
          const judgeLast = judge.split(' ').pop()?.toLowerCase();
          return judgeLast === lastPart.toLowerCase();
        });
        
        if (lastNameMatch) {
          console.log(`  📝 Matched "${input}" → "${lastNameMatch}" (by last name)`);
          return lastNameMatch;
        }
      }
      
      // If no match found, return original input but log warning
      console.warn(`  ⚠️  Could not match judge name: "${input}"`);
      return normalized;
    };

    // Helper function to detect if a value is a date
    const isDate = (value: any): boolean => {
      if (!value) return false;
      
      // If it's already a Date object
      if (value instanceof Date && !isNaN(value.getTime())) return true;
      
      // If it's a string, try to parse it
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return !isNaN(parsed.getTime());
      }
      
      // If it's a number (Excel date serial)
      if (typeof value === 'number' && value > 40000 && value < 60000) {
        return true; // Likely an Excel date
      }
      
      return false;
    };

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    // Extract basic info
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const trialNameRaw = firstSheet['A1'] ? XLSX.utils.format_cell(firstSheet['A1']) : 'Imported Trial';
    const clubName = firstSheet['A2'] ? XLSX.utils.format_cell(firstSheet['A2']) : 'Imported Club';

    // Parse date range from trial name (e.g., "June 6 -- July 26, 2024")
    let startDate = new Date();
    let endDate = new Date();
    const dateMatch = trialNameRaw.match(/(\w+\s+\d+)\s*--\s*(\w+\s+\d+),\s*(\d{4})/);
    if (dateMatch) {
      const year = dateMatch[3];
      // Use noon local time to avoid timezone issues
      const startParsed = new Date(`${dateMatch[1]}, ${year}`);
      const endParsed = new Date(`${dateMatch[2]}, ${year}`);
      startDate = new Date(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate(), 12, 0, 0);
      endDate = new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate(), 12, 0, 0);
    }

    // Helper function to format date safely for database
    const formatDateForDB = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Step 1: Create the trial
    const { data: trial, error: trialError } = await supabase
      .from('trials')
      .insert({
        trial_name: trialNameRaw,
        club_name: clubName,
        location: clubName, // Using club name as location
        start_date: formatDateForDB(startDate),
        end_date: formatDateForDB(endDate),
        created_by: user.id,
        trial_status: 'completed', // Imported trials are already completed
        entry_status: 'closed', // Entries are closed
        trial_secretary: user.email || '',
        secretary_email: user.email || '',
        waiver_text: 'Imported from Excel - no waiver available',
        fee_configuration: { regular: 0, feo: 0 } // $0 fees for imported trials
      })
      .select()
      .single();

    if (trialError || !trial) {
      throw new Error(`Failed to create trial: ${trialError?.message}`);
    }

    console.log('✅ Trial created:', trial.id);

    // Step 2: Collect all unique dates from all sheets
    const allDatesSet = new Set<string>();
    const classDataMap = new Map<string, any>();

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const className = sheetName;

      // Find dates and judges in rows 5-6 (order can vary!)
      const roundInfo: any[] = [];
      
      for (let col = 4; col <= 26; col++) {
        const colLetter = String.fromCharCode(64 + col);
        const row5Cell = sheet[`${colLetter}5`];
        const row6Cell = sheet[`${colLetter}6`];
        
        // Get values
        const row5Value = row5Cell?.v;
        const row6Value = row6Cell?.v;
        
        // Skip if both are empty
        if (!row5Value && !row6Value) continue;
        
        // Detect which row has the date and which has the judge
        let dateValue: any = null;
        let judgeValue: string = '';
        
        const row5IsDate = isDate(row5Value);
        const row6IsDate = isDate(row6Value);
        
        if (row5IsDate && !row6IsDate) {
          // Row 5 = date, Row 6 = judge (or empty)
          dateValue = row5Value;
          judgeValue = row6Value ? XLSX.utils.format_cell(row6Cell) : '';
        } else if (row6IsDate && !row5IsDate) {
          // Row 6 = date, Row 5 = judge (or empty)
          dateValue = row6Value;
          judgeValue = row5Value ? XLSX.utils.format_cell(row5Cell) : '';
        } else if (row5IsDate && row6IsDate) {
          // Both look like dates - assume row 6 is date, row 5 is judge
          console.warn(`  ⚠️  Both ${colLetter}5 and ${colLetter}6 look like dates, using row 6`);
          dateValue = row6Value;
          judgeValue = row5Value ? XLSX.utils.format_cell(row5Cell) : '';
        } else {
          // Neither looks like a date clearly - try to parse row 6 as date anyway (old default)
          dateValue = row6Value;
          judgeValue = row5Value ? XLSX.utils.format_cell(row5Cell) : '';
        }
        
        // Parse the date
        if (dateValue) {
          let date: Date;
          if (dateValue instanceof Date) {
            date = dateValue;
          } else if (typeof dateValue === 'number') {
            // Excel date serial number
            date = new Date((dateValue - 25569) * 86400 * 1000);
          } else {
            date = new Date(dateValue);
          }
          
          if (!isNaN(date.getTime())) {
            // Force to noon local time to avoid timezone issues
            const noonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
            const dateStr = formatDateForDB(noonDate);
            allDatesSet.add(dateStr);
            
            // Match judge name against official list
            const matchedJudge = matchJudgeName(judgeValue);
            
            roundInfo.push({
              date: dateStr,
              judge: matchedJudge,
              column: colLetter
            });
          }
        }
      }

      // Collect entry data
      const entries: any[] = [];
      for (let row = 7; row <= 100; row++) {
        const cwagsCell = sheet[`A${row}`];
        const dogCell = sheet[`B${row}`];
        const handlerCell = sheet[`C${row}`];
        
        if (!cwagsCell || !cwagsCell.v) {
          if (row > 20 && entries.length > 0) break;
          continue;
        }

        const cwagsNumber = XLSX.utils.format_cell(cwagsCell);
        const dogName = dogCell ? XLSX.utils.format_cell(dogCell) : '';
        const handlerName = handlerCell ? XLSX.utils.format_cell(handlerCell) : '';

        // Get scores for this entry
        const scores: Record<string, string> = {};
        for (const round of roundInfo) {
          const scoreCell = sheet[`${round.column}${row}`];
          if (scoreCell && scoreCell.v) {
            scores[round.column] = XLSX.utils.format_cell(scoreCell);
          }
        }

        entries.push({
          cwagsNumber,
          dogName,
          handlerName,
          scores,
          row
        });
      }

      if (roundInfo.length > 0 || entries.length > 0) {
        classDataMap.set(className, {
          className,
          roundInfo,
          entries
        });
      }
    }

    // Step 3: Create trial days
    const sortedDates = Array.from(allDatesSet).sort();
    const dayMap = new Map<string, string>(); // date -> trial_day_id

    for (let i = 0; i < sortedDates.length; i++) {
      const { data: trialDay, error: dayError } = await supabase
        .from('trial_days')
        .insert({
          trial_id: trial.id,
          day_number: i + 1,
          trial_date: sortedDates[i],
          day_status: 'completed'
        })
        .select()
        .single();

      if (dayError || !trialDay) {
        throw new Error(`Failed to create day ${i + 1}: ${dayError?.message}`);
      }

      dayMap.set(sortedDates[i], trialDay.id);
      console.log(`✅ Day ${i + 1} created:`, trialDay.id);
    }

    // Step 4: Create classes and rounds for each sheet
    let totalEntriesCreated = 0;
    let totalScoresCreated = 0;

    // Helper function to normalize class names to official C-WAGS standards
    const normalizeClassName = (name: string): string => {
      let normalized = name.trim();
      
      // Remove common prefixes
      normalized = normalized.replace(/^League\s+/i, '');
      normalized = normalized.replace(/^CWAGS\s+/i, '');
      
      // Standardize scent class names that are missing level numbers
      if (normalized === 'Patrol') normalized = 'Patrol 1';
      if (normalized === 'Detective') normalized = 'Detective 2';
      if (normalized === 'Investigator') normalized = 'Investigator 3';
      if (normalized === 'Super Sleuth') normalized = 'Super Sleuth 4';
      
      // Fix Private Investigator variants (any number)
      if (normalized.startsWith('Private Investigator') && normalized !== 'Private Investigator') {
        normalized = 'Private Investigator';
      }
      
      return normalized.trim();
    };

    for (const [className, classData] of classDataMap) {
      // Normalize the class name
      const normalizedClassName = normalizeClassName(className);
      
      console.log(`📋 Processing class: "${className}" → "${normalizedClassName}"`);
      
      // Group rounds by date to organize by day
      const roundsByDate = new Map<string, any[]>();
      for (const round of classData.roundInfo) {
        if (!roundsByDate.has(round.date)) {
          roundsByDate.set(round.date, []);
        }
        roundsByDate.get(round.date)!.push(round);
      }

      // Create a class for each day that has this class
      for (const [dateStr, rounds] of roundsByDate) {
        const trialDayId = dayMap.get(dateStr);
        if (!trialDayId) continue;

        // Determine class type from name
        let classType = 'scent';
        if (className.toLowerCase().includes('rally')) classType = 'rally';
        else if (className.toLowerCase().includes('games')) classType = 'games';
        else if (className.toLowerCase().includes('obedience')) classType = 'obedience';

        // Create trial class
        const { data: trialClass, error: classError } = await supabase
          .from('trial_classes')
          .insert({
            trial_day_id: trialDayId,
            class_name: normalizedClassName, // Use normalized name
            class_type: classType,
            entry_fee: 0, // $0 for imported trials
            feo_price: 0,
            class_order: 1,
            class_status: 'completed'
          })
          .select()
          .single();

        if (classError || !trialClass) {
          console.error(`Failed to create class ${normalizedClassName}:`, classError);
          continue;
        }

        console.log(`✅ Class created: ${normalizedClassName} on ${dateStr}`);

        // Create rounds for this class on this day
        for (let roundNum = 0; roundNum < rounds.length; roundNum++) {
          const roundData = rounds[roundNum];
          
          const { data: trialRound, error: roundError } = await supabase
            .from('trial_rounds')
            .insert({
              trial_class_id: trialClass.id,
              round_number: roundNum + 1,
              judge_name: roundData.judge,
              round_status: 'completed'
            })
            .select()
            .single();

          if (roundError || !trialRound) {
            console.error(`Failed to create round:`, roundError);
            continue;
          }

          console.log(`  ✅ Round ${roundNum + 1} - Judge: ${roundData.judge}`);

          // Step 5: Create entries and scores for this round
          for (const entryData of classData.entries) {
            // Check if this entry has a score for this specific round
            const scoreValue = entryData.scores[roundData.column] || '';
            const trimmedScore = scoreValue.trim().toLowerCase();
            
            // Skip if empty, dash, or other non-score indicators
            if (!scoreValue || trimmedScore === '' || trimmedScore === '-' || trimmedScore === 'n/a') {
              // Skip this entry - no score for this round
              continue;
            }

            // Validate CWAGS number exists in registry
            const { data: registryEntry } = await supabase
              .from('cwags_registry')
              .select('*')
              .eq('cwags_number', entryData.cwagsNumber)
              .single();

            let handlerName = entryData.handlerName;
            let dogName = entryData.dogName;

            if (registryEntry) {
              // Use registry data if it exists
              handlerName = registryEntry.handler_name;
              dogName = registryEntry.dog_call_name;
            }

            // Check if entry already exists for this trial and handler/dog
            let { data: existingEntry } = await supabase
              .from('entries')
              .select('id')
              .eq('trial_id', trial.id)
              .eq('cwags_number', entryData.cwagsNumber)
              .single();

            let entryId: string;

            if (!existingEntry) {
              // Create new entry
              const { data: newEntry, error: entryError } = await supabase
                .from('entries')
                .insert({
                  trial_id: trial.id,
                  handler_name: handlerName,
                  dog_call_name: dogName,
                  cwags_number: entryData.cwagsNumber,
                  handler_email: 'imported@trial.com',
                  waiver_accepted: true,
                  total_fee: 0,
                  payment_status: 'paid',
                  entry_status: 'confirmed'
                })
                .select()
                .single();

              if (entryError || !newEntry) {
                console.error(`Failed to create entry for ${entryData.cwagsNumber}:`, entryError);
                continue;
              }

              entryId = newEntry.id;
              totalEntriesCreated++;
            } else {
              entryId = existingEntry.id;
            }

            // Create entry selection (links entry to round)
            // First check if it already exists
            const { data: existingSelection } = await supabase
              .from('entry_selections')
              .select('id')
              .eq('entry_id', entryId)
              .eq('trial_round_id', trialRound.id)
              .single();

            let entrySelection;
            if (existingSelection) {
              // Already exists, reuse it
              entrySelection = existingSelection;
            } else {
              // Create new entry selection
              const { data: newSelection, error: selectionError } = await supabase
                .from('entry_selections')
                .insert({
                  entry_id: entryId,
                  trial_round_id: trialRound.id,
                  entry_type: 'regular',
                  fee: 0,
                  entry_status: 'confirmed'
                })
                .select()
                .single();

              if (selectionError || !newSelection) {
                console.error(`Failed to create entry selection:`, selectionError);
                continue;
              }

              entrySelection = newSelection;
            }

            // Create score
            let passFailValue = null;
            
            // Convert score to pass/fail (use trimmedScore for comparison)
            if (trimmedScore === 'pass' || trimmedScore === 'p') {
              passFailValue = 'Pass';
            } else if (trimmedScore === 'fail' || trimmedScore === 'f') {
              passFailValue = 'Fail';
            } else if (trimmedScore.includes('nq')) {
              passFailValue = 'NQ';
            } else if (trimmedScore.includes('abs')) {
              passFailValue = 'ABS';
            }

            if (passFailValue) {
              const { error: scoreError } = await supabase
                .from('scores')
                .insert({
                  entry_selection_id: entrySelection.id,
                  trial_round_id: trialRound.id,
                  pass_fail: passFailValue,
                  entry_status: 'present'
                });

              if (!scoreError) {
                totalScoresCreated++;
              }
            } else {
              // Score value exists but isn't recognized - log warning
              console.warn(`⚠️  Unrecognized score value "${scoreValue}" for ${entryData.cwagsNumber} in ${roundData.column}`);
            }
          }
        }
      }
    }

    console.log('✅ Import complete!');
    console.log(`   - Total entries: ${totalEntriesCreated}`);
    console.log(`   - Total scores: ${totalScoresCreated}`);

    return NextResponse.json({
      success: true,
      trialId: trial.id,
      stats: {
        entriesCreated: totalEntriesCreated,
        scoresCreated: totalScoresCreated
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import trial' },
      { status: 500 }
    );
  }
}