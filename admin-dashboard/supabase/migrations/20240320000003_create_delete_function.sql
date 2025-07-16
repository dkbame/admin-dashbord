-- Create a function to safely delete apps and related data
-- This function will bypass RLS and handle the deletion properly

create or replace function delete_app_by_id(target_app_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete related records first (in case cascade isn't working)
  delete from screenshots where app_id = target_app_id;
  
  -- Try to delete from tables that might exist
  begin
    delete from custom_metadata where app_id = target_app_id;
  exception when undefined_table then
    -- Table doesn't exist, ignore
    null;
  end;
  
  begin
    delete from ratings where app_id = target_app_id;
  exception when undefined_table then
    -- Table doesn't exist, ignore
    null;
  end;
  
  -- Finally delete the app
  delete from apps where id = target_app_id;
  
  -- Verify the deletion
  if exists (select 1 from apps where id = target_app_id) then
    raise exception 'App was not deleted successfully';
  end if;
end;
$$;

-- Grant execute permission to anon users
grant execute on function delete_app_by_id(uuid) to anon; 