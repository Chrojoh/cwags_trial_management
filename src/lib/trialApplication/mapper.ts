import type {
  ApplicationValueSource,
  ResetSetupIssue,
  TrialApplicationData,
  TrialApplicationOverrides,
  TrialApplicationScheduleRow,
} from '@/types/trialApplication';

type RawRound = {
  id: string; round_number: number; judge_name: string | null; judge_email?: string | null;
  has_reset?: boolean; reset_judge_name?: string | null; is_reset?: boolean;
};
type RawClass = {
  id: string; class_name: string; class_type: string; class_order?: number | null;
  trial_rounds?: RawRound[];
};
type RawDay = { day_number: number; trial_date: string; trial_classes?: RawClass[] };
type RawTrial = {
  id: string; club_name?: string | null; location?: string | null; start_date?: string | null;
  end_date?: string | null; trial_secretary?: string | null; secretary_email?: string | null;
  secretary_phone?: string | null; created_at?: string | null;
};

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const roundKey = (value: number) => value.toFixed(3);

function choose<T extends string | number | boolean>(
  override: T | undefined,
  stored: T | undefined,
  derived: T | undefined
): { value: T | undefined; source: ApplicationValueSource } {
  if (override !== undefined && override !== '') return { value: override, source: 'entered' };
  if (stored !== undefined && stored !== '') return { value: stored, source: 'stored' };
  if (derived !== undefined && derived !== '') return { value: derived, source: 'derived' };
  return { value: undefined, source: 'missing' };
}

export function mapTrialApplicationData(
  trial: RawTrial,
  days: RawDay[],
  overrides: TrialApplicationOverrides = {}
): TrialApplicationData {
  const sortedDays = [...days].sort(
    (a, b) => a.trial_date.localeCompare(b.trial_date) || a.day_number - b.day_number
  );
  const locationParts = clean(trial.location).split(',').map((part) => part.trim()).filter(Boolean);
  const derivedLocation = {
    name: locationParts[0] || '',
    city: locationParts.length >= 2 ? locationParts[locationParts.length - 3] || locationParts[1] : '',
    region: locationParts.length >= 2 ? locationParts[locationParts.length - 2] || '' : '',
  };
  const phone = choose(overrides.contactPhone, clean(trial.secretary_phone) || undefined, undefined);
  const website = choose(overrides.premiumWebsite, undefined, undefined);
  const submitted = choose(
    overrides.submittedDate,
    undefined,
    clean(trial.created_at).slice(0, 10) || undefined
  );
  const insurance = choose(overrides.insuranceExpirationDate, undefined, undefined);
  const setting = choose(overrides.venueSetting, undefined, undefined);
  const league = choose(overrides.isLeague, undefined, undefined);
  const surface = choose(overrides.surface, undefined, undefined);
  const exception = choose(overrides.ringSizeExceptionRequest, undefined, undefined);
  const ringCount = choose(overrides.numberOfRings, undefined, undefined);
  const searchCount = choose(overrides.numberOfSearchAreas, undefined, undefined);

  const programs = { obedience: false, rally: false, games: false, scent: false };
  const schedule: TrialApplicationScheduleRow[] = [];
  const resetIssues: ResetSetupIssue[] = [];
  const unmappedScheduleRows: string[] = [];

  for (const day of sortedDays) {
    for (const trialClass of day.trial_classes || []) {
      const program = trialClass.class_type.toLowerCase();
      if (program in programs) programs[program as keyof typeof programs] = true;
      if (!(program in programs)) {
        unmappedScheduleRows.push(`${trialClass.class_name}: unknown program ${trialClass.class_type}`);
        continue;
      }
      const rounds = [...(trialClass.trial_rounds || [])].sort((a, b) => a.round_number - b.round_number);
      const byNumber = new Map(rounds.map((round) => [roundKey(round.round_number), round]));

      for (const round of rounds.filter((item) => !item.is_reset)) {
        schedule.push({
          roundId: round.id,
          program: program as TrialApplicationScheduleRow['program'],
          className: trialClass.class_name,
          classOrder: trialClass.class_order || 0,
          dayNumber: day.day_number,
          date: day.trial_date,
          judgeName: clean(round.judge_name),
          roundNumber: round.round_number,
          isReset: false,
        });

        if (program === 'scent' && round.has_reset) {
          const expected = round.round_number + 0.5;
          const child = byNumber.get(roundKey(expected));
          const override = overrides.resetJudgeOverrides?.[round.id];
          const childJudge = clean(child?.judge_name);
          const judgeName = clean(override?.judgeName) || childJudge;
          let reason: ResetSetupIssue['reason'] | undefined;
          if (!child || !child.is_reset) reason = 'missing_reset_round';
          else if (!judgeName) reason = 'missing_reset_judge';
          else if (clean(round.reset_judge_name) && clean(round.reset_judge_name) !== childJudge) {
            reason = 'judge_mismatch';
          }
          if (reason) {
            resetIssues.push({
              parentRoundId: round.id,
              className: trialClass.class_name,
              classNameForCertification: trialClass.class_name,
              dayNumber: day.day_number,
              parentRoundNumber: round.round_number,
              primaryJudgeName: clean(round.judge_name),
              expectedResetRoundNumber: expected,
              reason,
            });
          }
          if ((child?.is_reset || override) && judgeName) {
            schedule.push({
              roundId: child?.id || `application-only-reset-${round.id}`,
              program: 'scent',
              className: trialClass.class_name,
              classOrder: trialClass.class_order || 0,
              dayNumber: day.day_number,
              date: day.trial_date,
              judgeName,
              roundNumber: child?.round_number || expected,
              isReset: true,
              parentRoundNumber: round.round_number,
            });
          }
        }
      }

      for (const orphan of rounds.filter((item) => item.is_reset)) {
        const parent = byNumber.get(roundKey(orphan.round_number - 0.5));
        if (!parent?.has_reset) {
          unmappedScheduleRows.push(
            `${trialClass.class_name} Round ${orphan.round_number}: reset row has no enabled parent`
          );
        }
      }
    }
  }

  schedule.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.classOrder - b.classOrder ||
      a.className.localeCompare(b.className) ||
      a.roundNumber - b.roundNumber
  );
  const trialDates = sortedDays.map((day) => day.trial_date);
  const missingRequired: string[] = [];
  if (!clean(trial.club_name)) missingRequired.push('Host name');
  if (!trialDates.length) missingRequired.push('Trial dates');
  if (!derivedLocation.city || !derivedLocation.region) missingRequired.push('City and state/province');
  if (!Object.values(programs).some(Boolean)) missingRequired.push('Program');
  if (!schedule.length) missingRequired.push('Schedule');
  if (resetIssues.some((issue) => !overrides.resetJudgeOverrides?.[issue.parentRoundId]?.judgeName)) {
    missingRequired.push('Reset setup');
  }

  const missingOptional = [
    !phone.value && 'Trial contact phone',
    !website.value && 'Premium website',
    !(overrides.advocateNames || []).length && 'C-WAGS Advocate',
    !insurance.value && 'Insurance expiration date',
    !setting.value && 'Inside / Outside',
    league.value === undefined && 'League Yes / No',
    !surface.value && 'Surface',
    !exception.value && 'Ring/Search size exception request',
    programs.scent && searchCount.value === undefined && 'Number of search areas',
    !programs.scent && ringCount.value === undefined && 'Number of rings',
  ].filter(Boolean) as string[];

  const sources: Record<string, ApplicationValueSource> = {
    contactPhone: phone.source, premiumWebsite: website.source, submittedDate: submitted.source,
    insuranceExpirationDate: insurance.source, venueSetting: setting.source, surface: surface.source,
    isLeague: league.source,
    ringSizeExceptionRequest: exception.source, numberOfRings: ringCount.source,
    numberOfSearchAreas: searchCount.source, city: derivedLocation.city ? 'derived' : 'missing',
    region: derivedLocation.region ? 'derived' : 'missing', locationName: derivedLocation.name ? 'derived' : 'missing',
  };

  return {
    trialId: trial.id,
    template: programs.scent && !programs.obedience && !programs.rally && !programs.games ? 'scent' : 'general',
    trialDates,
    city: derivedLocation.city,
    region: derivedLocation.region,
    hostName: clean(trial.club_name),
    locationName: derivedLocation.name || clean(trial.location),
    premiumWebsite: String(website.value || ''),
    contact: { name: clean(trial.trial_secretary), email: clean(trial.secretary_email), phone: String(phone.value || '') },
    submittedDate: String(submitted.value || ''),
    programs,
    judges: [...new Set(schedule.map((row) => row.judgeName).filter(Boolean))],
    advocates: overrides.advocateNames?.filter(Boolean) || [],
    schedule,
    venue: {
      setting: setting.value, isLeague: league.value,
      surface: String(surface.value || ''),
      insuranceExpirationDate: String(insurance.value || ''),
      ringSizeExceptionRequest: String(exception.value || ''),
      numberOfRings: ringCount.value,
    },
    scent: programs.scent ? { resetsOffered: schedule.some((row) => row.isReset), numberOfSearchAreas: searchCount.value } : undefined,
    sources,
    missingRequired: [...new Set(missingRequired)],
    missingOptional,
    derived: Object.entries(sources).filter(([, source]) => source === 'derived').map(([field]) => field),
    unmappedScheduleRows,
    resetIssues,
  };
}
