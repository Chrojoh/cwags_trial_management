// src/app/api/admin/import-trial/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get auth from headers
    const authHeader = request.headers.get('authorization');
    
    // Create Supabase client with service role for server-side operations
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

    console.log('📄 Processing file:', file.name);

    // Read the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    console.log('📊 Found sheets:', workbook.SheetNames);

    // Extract basic info from first sheet
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    
    const trialNameCell = firstSheet['A1'];
    const clubNameCell = firstSheet['A2'];
    
    const trialName = trialNameCell ? XLSX.utils.format_cell(trialNameCell) : 'Imported Trial';
    const clubName = clubNameCell ? XLSX.utils.format_cell(clubNameCell) : '';

    console.log('📋 Trial:', trialName);
    console.log('🏢 Club:', clubName);

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
      const cleanInput = normalized.replace(/\./g, '').replace(/\s+/g, ' ').trim();
      const parts = cleanInput.split(' ');
      
      if (parts.length >= 2) {
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];
        
        // Check if first part is just an initial
        if (firstPart.length === 1) {
          const match = CWAGS_JUDGES.find(judge => {
            const judgeParts = judge.split(' ');
            const judgeFirst = judgeParts[0];
            const judgeLast = judgeParts[judgeParts.length - 1];
            
            return judgeFirst[0].toUpperCase() === firstPart.toUpperCase() &&
                   judgeLast.toLowerCase() === lastPart.toLowerCase();
          });
          
          if (match) return match;
        }
        
        // Try fuzzy match on last name only
        const lastNameMatch = CWAGS_JUDGES.find(judge => {
          const judgeLast = judge.split(' ').pop()?.toLowerCase();
          return judgeLast === lastPart.toLowerCase();
        });
        
        if (lastNameMatch) return lastNameMatch;
      }
      
      return normalized;
    };

    // Helper function to detect if a value is a date
    const isDate = (value: any): boolean => {
      if (!value) return false;
      if (value instanceof Date && !isNaN(value.getTime())) return true;
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return !isNaN(parsed.getTime());
      }
      if (typeof value === 'number' && value > 40000 && value < 60000) {
        return true;
      }
      return false;
    };

    // Helper function to format date safely for database
    const formatDateForDB = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

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
  
  // Fix typos and variants
  if (normalized.toLowerCase().includes('overseers')) normalized = 'Detective Diversions';
  if (normalized.startsWith('Private Inv') && normalized !== 'Private Investigator') {
    normalized = 'Private Investigator';
  }
  if (normalized.startsWith('Det Div')) normalized = 'Detective Diversions';
  
  return normalized.trim();
};

    // Collect all unique dates from all sheets
    const allDates = new Set<string>();
    const classData: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const className = normalizeClassName(sheetName); // Normalize class name

      // Find dates and judges in rows 5-6 (order can vary!)
      const dates: { date: Date; judge: string; column: string }[] = [];
      
      for (let col = 4; col <= 26; col++) { // Columns D-Z
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
          // Row 5 = date, Row 6 = judge
          dateValue = row5Value;
          judgeValue = row6Value ? XLSX.utils.format_cell(row6Cell) : '';
        } else if (row6IsDate && !row5IsDate) {
          // Row 6 = date, Row 5 = judge
          dateValue = row6Value;
          judgeValue = row5Value ? XLSX.utils.format_cell(row5Cell) : '';
        } else if (row5IsDate && row6IsDate) {
          // Both look like dates - assume row 6 is date
          dateValue = row6Value;
          judgeValue = row5Value ? XLSX.utils.format_cell(row5Cell) : '';
        } else {
          // Neither looks like a date clearly - try row 6 as date (old default)
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
            allDates.add(dateStr);
            
            // Match judge name against official list
            const matchedJudge = matchJudgeName(judgeValue);
            
            dates.push({
              date: noonDate,
              judge: matchedJudge,
              column: colLetter
            });
          }
        }
      }

      // Count entries (rows with CWAGS number in column A)
      let entryCount = 0;
      for (let row = 7; row <= 100; row++) {
        const cwagsCell = sheet[`A${row}`];
        if (cwagsCell && cwagsCell.v) {
          entryCount++;
        } else if (row > 20 && entryCount > 0) {
          break; // Stop if we hit empty rows after seeing entries
        }
      }

      if (dates.length > 0 || entryCount > 0) {
        classData.push({
          className,
          dates,
          entryCount
        });
        console.log(`  📌 ${className}: ${dates.length} rounds, ${entryCount} entries`);
      }
    }

    // Sort dates and assign day numbers
    const sortedDates = Array.from(allDates).sort();
    const dayMap = new Map<string, number>();
    sortedDates.forEach((date, index) => {
      dayMap.set(date, index + 1);
    });

    console.log('📅 Days:', sortedDates);

    // Organize data by day
    const daysSummary: any[] = [];
    sortedDates.forEach((dateStr, index) => {
      const classesThisDay = classData
        .filter(cls => cls.dates.some((d: any) => formatDateForDB(d.date) === dateStr))
        .map(cls => ({
          className: cls.className,
          rounds: cls.dates.filter((d: any) => formatDateForDB(d.date) === dateStr).length,
          entries: cls.entryCount
        }));

      if (classesThisDay.length > 0) {
        // Parse date string and force to noon local time to prevent timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        const displayDate = new Date(year, month - 1, day, 12, 0, 0);
        
        daysSummary.push({
          dayNumber: index + 1,
          date: displayDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          classes: classesThisDay
        });
      }
    });

    // Calculate totals
    const totalRounds = classData.reduce((sum, cls) => sum + cls.dates.length, 0);
    const totalEntries = classData.reduce((sum, cls) => sum + cls.entryCount, 0);
    const totalScores = classData.reduce((sum, cls) => {
      return sum + (cls.dates.length * cls.entryCount);
    }, 0);

    // Check for warnings
    const warnings: string[] = [];
    if (!clubName) {
      warnings.push('Club name not found in cell A2');
    }
    if (classData.some(cls => cls.entryCount === 0)) {
      warnings.push('Some classes have no entries');
    }

    // Check for errors
    const errors: string[] = [];
    if (!trialName) {
      errors.push('Trial name not found in cell A1');
    }
    if (sortedDates.length === 0) {
      errors.push('No valid dates found in any class sheet (row 6)');
    }
    if (classData.length === 0) {
      errors.push('No classes with data found');
    }

    const summary = {
      trialId: '', // Will be generated on actual import
      trialName,
      clubName,
      dateRange: trialName, // Using A1 as date range
      stats: {
        totalDays: sortedDates.length,
        totalClasses: classData.length,
        totalRounds,
        totalEntries,
        totalScores
      },
      days: daysSummary,
      warnings,
      errors
    };

    console.log('✅ Preview complete');
    console.log('   Stats:', summary.stats);

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('❌ Preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}