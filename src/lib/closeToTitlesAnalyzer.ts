// src/lib/closeToTitlesAnalyzer.ts
// ============================================================
// "Close to Titles" Report Generator
//
// Analyzes which dogs are close to earning titles or aces by:
//   1. Loading tracker history (past Q's, titles, aces)
//   2. Loading current trial entries (what they're entered in)
//   3. Assuming 100% pass rate for all entries
//   4. Simulating what titles/aces they'll earn if they Q everything
//
// Used by secretaries to prepare rosettes before the trial starts.
// ============================================================

import { getDogTrialHistory } from './registryOperations';
import { createClient } from '@supabase/supabase-js';
import {
  getTitleRequirements,
  getTitleAbbreviation,
  isGamesClass,
  MASTER_TITLES,
  ACE_REQUIREMENT,
  type MasterTitleRequirement,
} from './titleRequirements';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// Data structures for the report
// ============================================================

export interface DogCloseToTitle {
  cwagsNumber: string;
  dogName: string;
  handlerName: string;
  className: string;

  // Current status (before this trial)
  currentQs: number;
  currentJudges: number;
  currentGameTypes: number; // For Games levels only
  hasTitle: boolean;
  aceQs: number; // Q's earned after title (for ace tracking)
  hasAce: boolean; // Has at least 1 ace in this class

  // What they're entered in this trial
  entriesInThisTrial: number; // Number of rounds entered

  // Projected results (assuming 100% pass rate)
  projectedQs: number;
  willEarnTitle: boolean;
  willEarnAce: boolean;
  aceNumber: number; // Which ace (1st, 2nd, 3rd, etc.)

  // Details
  qsNeededForTitle: number;
  judgesNeededForTitle: number;
  gamesNeededForTitle: number;
  qsNeededForNextAce: number;
}

export interface MasterScentProgress {
  // Dog identification
  cwagsNumber: string;
  dogName: string;
  handlerName: string;

  // Master title info
  masterId: string;
  masterName: string;
  abbreviation: string;
  currentlyQualifies: boolean;
  willQualifyAfterTrial: boolean;

  requiredAces: Array<{
    description: string;
    classes: string[];
    operator: 'AND' | 'OR';
    currentAces: string[]; // Classes where they have aces now
    projectedAces: string[]; // Classes where they'll have aces after trial
    isMet: boolean; // Will be met after trial
  }>;
}

export interface CloseToTitlesReport {
  trialId: string;
  trialName: string;

  // Dogs who will earn titles if they Q everything
  closeToTitles: DogCloseToTitle[];

  // Dogs who will earn aces if they Q everything
  closeToAces: DogCloseToTitle[];

  // Dogs who will earn Master Scent achievements
  masterScentProgress: MasterScentProgress[];

  // All analyzed dogs (for debugging or detailed view)
  allDogs: DogCloseToTitle[];

  generatedAt: string;
}

// ============================================================
// Helper: Extract game types from tracker history game field
// ============================================================
function extractGameTypes(records: any[]): Set<string> {
  const games = new Set<string>();
  const GAMES_Q_VALUES = ['GB', 'BJ', 'T', 'P', 'C'];

  records.forEach((record) => {
    if (record.game) {
      const gameStr = String(record.game).toUpperCase();
      GAMES_Q_VALUES.forEach((g) => {
        if (gameStr.includes(g)) games.add(g);
      });
    }
  });

  return games;
}

// ============================================================
// Helper: Calculate current title/ace status from tracker history
// ============================================================
// Maps full DB class names → short tracker names used in the Excel history file
const TRACKER_CLASS_NAME_MAP: Record<string, string> = {
  'Detective Diversions': 'Det Diversions',
  'Private Investigator': 'Private Inv',
};

function normalizeForTracker(name: string): string {
  return TRACKER_CLASS_NAME_MAP[name] ?? name;
}

function analyzeTrackerHistory(history: any[], className: string) {
  const trackerClassName = normalizeForTracker(className.trim());
  const levelRecords = history.filter(
    (r) => r.class?.trim() === trackerClassName && (r.qs || 0) > 0
  );

  const totalQs = levelRecords.reduce((sum, r) => sum + r.qs, 0);
  const judges = new Set(levelRecords.map((r) => r.judge).filter(Boolean));
  const gameTypes = extractGameTypes(levelRecords);

  const isGames = isGamesClass(className);
  const requirements = getTitleRequirements(className);

  // Check if title is already earned
  const hasTitle = isGames
    ? totalQs >= requirements.minQs &&
      judges.size >= requirements.minJudges &&
      gameTypes.size >= (requirements.minGames || 0)
    : totalQs >= requirements.minQs && judges.size >= requirements.minJudges;

  // Calculate ace Q's (Q's earned AFTER title)
  let aceQs = 0;
  let hasAce = false;

  if (hasTitle) {
    // Sort records by date
    const sorted = [...levelRecords].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateA.getTime() - dateB.getTime();
    });

    // Count Q's until title requirements met, then count remaining as ace Q's
    let cumulativeQs = 0;
    let titleDate: Date | null = null;
    let judgesSoFar = new Set<string>();
    let gamesSoFar = new Set<string>();

    for (const record of sorted) {
      const prevQs = cumulativeQs;
      const prevJudges = judgesSoFar.size;
      const prevGames = gamesSoFar.size;

      cumulativeQs += record.qs;
      if (record.judge) judgesSoFar.add(record.judge);

      if (isGames && record.game) {
        const gameStr = String(record.game).toUpperCase();
        ['GB', 'BJ', 'T', 'P', 'C'].forEach((g) => {
          if (gameStr.includes(g)) gamesSoFar.add(g);
        });
      }

      // Check if title was just earned with this record
      const nowHasTitle = isGames
        ? cumulativeQs >= requirements.minQs &&
          judgesSoFar.size >= requirements.minJudges &&
          gamesSoFar.size >= (requirements.minGames || 0)
        : cumulativeQs >= requirements.minQs && judgesSoFar.size >= requirements.minJudges;

      const previouslyHadTitle = isGames
        ? prevQs >= requirements.minQs &&
          prevJudges >= requirements.minJudges &&
          prevGames >= (requirements.minGames || 0)
        : prevQs >= requirements.minQs && prevJudges >= requirements.minJudges;

      if (nowHasTitle && !previouslyHadTitle) {
        // Title earned with this record
        titleDate = new Date(record.date || 0);

        // Calculate how many Q's from this record went toward title
        let qsTowardTitle = record.qs;
        if (
          isGames &&
          prevQs >= requirements.minQs &&
          prevJudges >= requirements.minJudges &&
          prevGames < (requirements.minGames || 0)
        ) {
          qsTowardTitle = 1;
        } else if (prevQs >= requirements.minQs && prevJudges < requirements.minJudges) {
          qsTowardTitle = 1;
        } else if (prevQs < requirements.minQs) {
          qsTowardTitle = Math.min(record.qs, requirements.minQs - prevQs);
        }

        aceQs = record.qs - qsTowardTitle;
      } else if (titleDate) {
        // After title earned, all Q's count toward ace
        aceQs += record.qs;
      }
    }

    hasAce = aceQs >= ACE_REQUIREMENT.qsAfterTitle;
  }

  return {
    totalQs,
    judgeCount: judges.size,
    gameTypeCount: gameTypes.size,
    hasTitle,
    aceQs: Math.max(0, aceQs),
    hasAce,
  };
}

// ============================================================
// Helper: Check Master Scent progress for all dogs
// ============================================================
async function checkMasterScentProgress(
  trialId: string,
  dogClassMap: Map<
    string,
    {
      cwagsNumber: string;
      dogName: string;
      handlerName: string;
      className: string;
      roundCount: number;
    }
  >
): Promise<MasterScentProgress[]> {
  const masterProgress: MasterScentProgress[] = [];

  // Group by dog to get all their classes
  const dogMap = new Map<string, typeof dogClassMap extends Map<any, infer V> ? V[] : never>();

  dogClassMap.forEach((value, key) => {
    if (!dogMap.has(value.cwagsNumber)) {
      dogMap.set(value.cwagsNumber, []);
    }
    dogMap.get(value.cwagsNumber)!.push(value);
  });

  // For each dog, check their Master Scent status
  for (const [cwagsNumber, dogClasses] of dogMap) {
    try {
      const history = await getDogTrialHistory(cwagsNumber);
      const dogName = dogClasses[0].dogName;
      const handlerName = dogClasses[0].handlerName;

      // Build a map of all classes and their ace status
      const allClasses = new Set<string>();

      // Add classes from tracker history
      history.forEach((r) => {
        if (r.class) allClasses.add(r.class.trim());
      });

      // Add classes from this trial
      dogClasses.forEach((dc) => allClasses.add(dc.className));

      // Analyze ace status for each class
      const aceStatus = new Map<string, { hasAceNow: boolean; willHaveAce: boolean }>();

      for (const className of allClasses) {
        const trackerStatus = analyzeTrackerHistory(history, className);
        const entriesInClass = dogClasses.find((dc) => dc.className === className)?.roundCount || 0;

        const projectedAceQs = trackerStatus.hasTitle ? trackerStatus.aceQs + entriesInClass : 0;

        const willHaveAce = projectedAceQs >= ACE_REQUIREMENT.qsAfterTitle;

        aceStatus.set(className, {
          hasAceNow: trackerStatus.hasAce,
          willHaveAce,
        });
      }

      // Check each Master title requirement
      for (const masterReq of MASTER_TITLES) {
        const reqProgress = {
          masterId: masterReq.id,
          masterName: masterReq.displayName,
          abbreviation: masterReq.abbreviation,
          currentlyQualifies: true,
          willQualifyAfterTrial: true,
          requiredAces: [] as any[],
        };

        // Check each ace requirement group
        for (const aceReq of masterReq.requiredAces) {
          const currentAces: string[] = [];
          const projectedAces: string[] = [];

          // Check which classes in this requirement have aces
          aceReq.classes.forEach((className) => {
            const status = aceStatus.get(className);
            if (status?.hasAceNow) currentAces.push(className);
            if (status?.willHaveAce) projectedAces.push(className);
          });

          // Determine if this requirement group is met
          let isMet = false;
          let isCurrentlyMet = false;

          if (aceReq.operator === 'AND') {
            // ALL classes in the list must have aces
            isMet = projectedAces.length === aceReq.classes.length;
            isCurrentlyMet = currentAces.length === aceReq.classes.length;
          } else {
            // At least ONE class must have an ace
            isMet = projectedAces.length > 0;
            isCurrentlyMet = currentAces.length > 0;
          }

          reqProgress.requiredAces.push({
            description: aceReq.description,
            classes: aceReq.classes,
            operator: aceReq.operator,
            currentAces,
            projectedAces,
            isMet,
          });

          if (!isMet) reqProgress.willQualifyAfterTrial = false;
          if (!isCurrentlyMet) reqProgress.currentlyQualifies = false;
        }

        // Only add to report if they'll earn it (not if they already have it)
        if (!reqProgress.currentlyQualifies && reqProgress.willQualifyAfterTrial) {
          masterProgress.push({
            cwagsNumber,
            dogName,
            handlerName,
            masterId: reqProgress.masterId,
            masterName: reqProgress.masterName,
            abbreviation: reqProgress.abbreviation,
            currentlyQualifies: reqProgress.currentlyQualifies,
            willQualifyAfterTrial: reqProgress.willQualifyAfterTrial,
            requiredAces: reqProgress.requiredAces,
          });
        }
      }
    } catch (err) {
      console.warn(`Could not check Master Scent for ${cwagsNumber}:`, err);
    }
  }

  return masterProgress;
}

// ============================================================
// Main export: Generate "Close to Titles" report for a trial
// ============================================================
export async function generateCloseToTitlesReport(trialId: string): Promise<CloseToTitlesReport> {
  console.log('🔍 Generating Close to Titles report for trial:', trialId);

  const report: CloseToTitlesReport = {
    trialId,
    trialName: '',
    closeToTitles: [],
    closeToAces: [],
    masterScentProgress: [],
    allDogs: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    // -------------------------------------------------------
    // Step 1: Get trial name
    // -------------------------------------------------------
    const { data: trial } = await supabase
      .from('trials')
      .select('trial_name')
      .eq('id', trialId)
      .single();

    if (trial) report.trialName = trial.trial_name;

    // -------------------------------------------------------
    // Step 2: Get all entries for this trial with their classes
    // -------------------------------------------------------
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select(
        `
        cwags_number,
        dog_call_name,
        handler_name,
        entry_selections!inner(
          entry_type,
          entry_status,
          trial_rounds!inner(
            round_number,
            trial_classes!inner(
              class_name
            )
          )
        )
      `
      )
      .eq('trial_id', trialId);

    if (entriesError || !entries) {
      console.error('Error loading entries:', entriesError);
      return report;
    }

    console.log(`📋 Found ${entries.length} entries`);

    // -------------------------------------------------------
    // Step 3: Group entries by dog + class
    // -------------------------------------------------------
    const dogClassMap = new Map<
      string,
      {
        cwagsNumber: string;
        dogName: string;
        handlerName: string;
        className: string;
        roundCount: number;
      }
    >();

    entries.forEach((entry) => {
      const selections = entry.entry_selections || [];

      selections.forEach((sel) => {
        // Skip FEO and withdrawn entries
        if (sel.entry_type === 'feo') return;
        if (sel.entry_status === 'withdrawn') return;

        // Get class name
        const round = Array.isArray(sel.trial_rounds) ? sel.trial_rounds[0] : sel.trial_rounds;

        if (!round?.trial_classes) return;

        // trial_classes can be either an object or array depending on Supabase join
        const trialClass = Array.isArray(round.trial_classes)
          ? round.trial_classes[0]
          : round.trial_classes;

        if (!trialClass?.class_name) return;

        const className = trialClass.class_name;
        const key = `${entry.cwags_number}|${className}`;

        if (!dogClassMap.has(key)) {
          dogClassMap.set(key, {
            cwagsNumber: entry.cwags_number,
            dogName: entry.dog_call_name,
            handlerName: entry.handler_name,
            className: className,
            roundCount: 0,
          });
        }

        // Increment round count for this dog in this class
        dogClassMap.get(key)!.roundCount++;
      });
    });

    console.log(`🐕 Found ${dogClassMap.size} unique dog/class combinations`);

    // -------------------------------------------------------
    // Step 4: For each dog/class, analyze their status
    // -------------------------------------------------------
    for (const [key, dogClass] of dogClassMap) {
      try {
        // Get tracker history for this dog
        const history = await getDogTrialHistory(dogClass.cwagsNumber);

        // Analyze current status from tracker
        const trackerStatus = analyzeTrackerHistory(history, dogClass.className);

        const isGames = isGamesClass(dogClass.className);
        const requirements = getTitleRequirements(dogClass.className);

        // Calculate requirements
        const qsNeededForTitle = trackerStatus.hasTitle
          ? 0
          : Math.max(0, requirements.minQs - trackerStatus.totalQs);

        const judgesNeededForTitle = trackerStatus.hasTitle
          ? 0
          : Math.max(0, requirements.minJudges - trackerStatus.judgeCount);

        const gamesNeededForTitle =
          isGames && !trackerStatus.hasTitle
            ? Math.max(0, (requirements.minGames || 0) - trackerStatus.gameTypeCount)
            : 0;

        // Project: what happens if they Q all entries in this trial?
        const projectedQs = trackerStatus.totalQs + dogClass.roundCount;
        const projectedAceQs = trackerStatus.hasTitle
          ? trackerStatus.aceQs + dogClass.roundCount
          : 0;

        // Will they earn title?
        // (We can't perfectly predict judges/games, but we assume they'll be met)
        const willEarnTitle =
          !trackerStatus.hasTitle &&
          projectedQs >= requirements.minQs &&
          (trackerStatus.judgeCount >= requirements.minJudges ||
            dogClass.roundCount >= requirements.minJudges);

        // Will they earn an ace?
        // Must check if they'll CROSS into a new ace tier (every 10 Q's)
        const currentAceCount = trackerStatus.hasTitle
          ? Math.floor(trackerStatus.aceQs / ACE_REQUIREMENT.qsAfterTitle)
          : 0;
        const projectedAceCount = trackerStatus.hasTitle
          ? Math.floor(projectedAceQs / ACE_REQUIREMENT.qsAfterTitle)
          : 0;
        const willEarnAce = projectedAceCount > currentAceCount;

        const aceNumber = projectedAceCount; // The ace number they'll have after trial

        const qsNeededForNextAce = trackerStatus.hasTitle
          ? ACE_REQUIREMENT.qsAfterTitle - (trackerStatus.aceQs % ACE_REQUIREMENT.qsAfterTitle)
          : 0;

        const dogReport: DogCloseToTitle = {
          cwagsNumber: dogClass.cwagsNumber,
          dogName: dogClass.dogName,
          handlerName: dogClass.handlerName,
          className: dogClass.className,

          currentQs: trackerStatus.totalQs,
          currentJudges: trackerStatus.judgeCount,
          currentGameTypes: trackerStatus.gameTypeCount,
          hasTitle: trackerStatus.hasTitle,
          aceQs: trackerStatus.aceQs,
          hasAce: trackerStatus.hasAce,

          entriesInThisTrial: dogClass.roundCount,

          projectedQs,
          willEarnTitle,
          willEarnAce,
          aceNumber,

          qsNeededForTitle,
          judgesNeededForTitle,
          gamesNeededForTitle,
          qsNeededForNextAce,
        };

        report.allDogs.push(dogReport);

        // Add to closeToTitles if they'll earn one
        if (willEarnTitle) {
          report.closeToTitles.push(dogReport);
        }

        // Add to closeToAces if they'll earn one
        if (willEarnAce) {
          report.closeToAces.push(dogReport);
        }
      } catch (err) {
        console.warn(`Could not analyze ${dogClass.cwagsNumber} in ${dogClass.className}:`, err);
      }
    }

    // Sort results by dog name
    report.closeToTitles.sort((a, b) => a.dogName.localeCompare(b.dogName));
    report.closeToAces.sort((a, b) => a.dogName.localeCompare(b.dogName));
    report.allDogs.sort((a, b) => a.dogName.localeCompare(b.dogName));

    console.log(
      `✅ Report generated: ${report.closeToTitles.length} close to titles, ${report.closeToAces.length} close to aces`
    );

    return report;
  } catch (error) {
    console.error('Error generating close to titles report:', error);
    return report;
  }
}

// ============================================================
// Helper: Format title name from class name
// ============================================================
export function formatTitleName(className: string): string {
  return getTitleAbbreviation(className);
}
