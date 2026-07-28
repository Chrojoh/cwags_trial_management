-- READ ONLY. Safe to run before the collaborator migration.
select t.id, t.trial_name, t.created_by,
       trim(concat_ws(' ', u.first_name, u.last_name)) as owner_name,
       u.email as owner_email
from public.trials t left join public.users u on u.id = t.created_by
order by t.start_date desc;

select a.trial_id, t.trial_name, a.user_id, u.email, a.assigned_role, a.assigned_at
from public.trial_assignments a
join public.trials t on t.id = a.trial_id
left join public.users u on u.id = a.user_id
order by t.start_date desc, u.email;

select trial_id, user_id, count(*) as duplicate_count
from public.trial_assignments
group by trial_id, user_id having count(*) > 1;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;
