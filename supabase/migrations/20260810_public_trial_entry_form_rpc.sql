-- Public, read-only payload for published trial entry forms.
begin;

create or replace function public.get_public_trial_entry_form(p_trial_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'trial', jsonb_build_object(
      'id', t.id,
      'trial_name', t.trial_name,
      'club_name', t.club_name,
      'location', t.location,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'entries_open', t.entries_open,
      'entries_close_date', t.entries_close_date,
      'entry_status', t.entry_status,
      'trial_secretary', t.trial_secretary,
      'secretary_email', t.secretary_email,
      'secretary_phone', t.secretary_phone,
      'default_entry_fee', t.default_entry_fee,
      'default_feo_price', t.default_feo_price,
      'waiver_text', t.waiver_text
    ),
    'rounds', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', tr.id,
          'round_number', tr.round_number,
          'judge_name', tr.judge_name,
          'trial_class_id', tr.trial_class_id,
          'feo_available', tr.feo_available,
          'max_entries', tr.max_entries,
          'trial_classes', jsonb_build_object(
            'class_name', tc.class_name,
            'games_subclass', tc.games_subclass,
            'trial_day_id', tc.trial_day_id,
            'class_level', tc.class_level,
            'class_type', tc.class_type,
            'entry_fee', tc.entry_fee,
            'feo_available', tc.feo_available,
            'feo_price', tc.feo_price,
            'trial_days', jsonb_build_object(
              'id', td.id,
              'trial_id', td.trial_id,
              'trial_date', td.trial_date,
              'day_number', td.day_number,
              'is_accepting_entries', td.is_accepting_entries
            )
          )
        )
        order by td.day_number, tr.round_number, tr.id
      )
      from public.trial_rounds tr
      join public.trial_classes tc on tc.id = tr.trial_class_id
      join public.trial_days td on td.id = tc.trial_day_id
      where td.trial_id = t.id
    ), '[]'::jsonb)
  )
  from public.trials t
  where t.id = p_trial_id
    and t.trial_status = 'published';
$$;

revoke all on function public.get_public_trial_entry_form(uuid) from public;
grant execute on function public.get_public_trial_entry_form(uuid) to anon, authenticated, service_role;

commit;

