export type RingsideShowStatus = 'draft' | 'published' | 'paused' | 'closed';
export type RingsideEntryStatus =
  | 'waiting'
  | 'checked_in'
  | 'in_ring'
  | 'completed'
  | 'conflict_hold'
  | 'available_waiting_for_secretary'
  | 'absent'
  | 'scratched';
export interface RingsideShow {
  id: string;
  trial_id: string;
  public_show_number: string;
  title: string;
  show_date: string | null;
  venue: string | null;
  status: RingsideShowStatus;
}
export interface RingsideRing {
  id: string;
  show_id: string;
  ring_number: number;
  slug: string;
  display_name: string;
  display_order: number;
  active_block_id: string | null;
  paused: boolean;
  status_message: string;
  session_version: number;
}
export interface RingsideBlock {
  id: string;
  ring_id: string;
  title: string;
  judge_name: string;
  sequence: number;
  notes: string;
  status: string;
}
export interface RingsideEntry {
  id: string;
  block_id: string;
  registration_number: string;
  handler_name: string;
  dog_name: string;
  running_order: number;
  original_running_order: number;
  notes: string;
  status: RingsideEntryStatus;
  conflict_reason: string;
  conflict_other_ring: string;
  conflict_return_note: string;
}
export interface RingsideState {
  show: RingsideShow;
  rings: RingsideRing[];
  blocks: RingsideBlock[];
  entries: RingsideEntry[];
}
