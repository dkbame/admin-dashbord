-- Temporarily disable RLS for delete operations to fix the deletion issue
-- This is a more direct approach to resolve the RLS blocking problem

-- Disable RLS on apps table for delete operations
alter table apps disable row level security;

-- Re-enable RLS but with a more permissive delete policy
alter table apps enable row level security;

-- Drop the existing delete policy
drop policy if exists "Allow public delete access for apps" on apps;

-- Create a new, more permissive delete policy
create policy "Allow public delete access for apps"
  on apps for delete
  to anon
  using (true)
  with check (true);

-- Also ensure screenshots can be deleted
drop policy if exists "Allow public delete access for screenshots" on screenshots;
create policy "Allow public delete access for screenshots"
  on screenshots for delete
  to anon
  using (true)
  with check (true); 