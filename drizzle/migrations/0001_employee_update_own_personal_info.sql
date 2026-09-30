create or replace function public.update_my_personal_info(_marital_status text, _children_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _emp uuid;
begin
  _emp := public.get_user_employee_id(auth.uid());
  if _emp is null then
    raise exception 'No employee record linked to this account';
  end if;
  if _marital_status is not null and _marital_status not in ('single','married','divorced','widowed') then
    raise exception 'Invalid marital status';
  end if;
  if _children_count is not null and (_children_count < 0 or _children_count > 30) then
    raise exception 'Invalid children count';
  end if;
  update public.employees
     set marital_status = coalesce(_marital_status, marital_status),
         children_count = coalesce(_children_count, children_count)
   where id = _emp;
end;
$$;

grant execute on function public.update_my_personal_info(text, integer) to authenticated;