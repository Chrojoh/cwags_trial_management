import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateSelectionFees } from '@/lib/financialRules';

export async function recalculateEntryFees(supabase: SupabaseClient, entryId: string) {
  const { data: selections, error: selectionsError } = await supabase
    .from('entry_selections')
    .select('fee, entry_status')
    .eq('entry_id', entryId);

  if (selectionsError) throw selectionsError;

  const totalFee = calculateSelectionFees(selections || []);

  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('fees_waived, amount_paid')
    .eq('id', entryId)
    .single();

  if (entryError) throw entryError;

  const amountOwed = entry?.fees_waived ? Number(entry.amount_paid || 0) : totalFee;
  const { error: updateError } = await supabase
    .from('entries')
    .update({ total_fee: totalFee, amount_owed: amountOwed })
    .eq('id', entryId);

  if (updateError) throw updateError;
  return { totalFee, amountOwed };
}
