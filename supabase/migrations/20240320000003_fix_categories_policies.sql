-- Fix categories RLS policies to ensure UPDATE operations work properly

-- Drop the existing categories policy
drop policy if exists "Allow public all access for categories" on categories;

-- Create specific policies for each operation
create policy "Allow public select access for categories"
  on categories for select
  to anon
  using (true);

create policy "Allow public insert access for categories"
  on categories for insert
  to anon
  with check (true);

create policy "Allow public update access for categories"
  on categories for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for categories"
  on categories for delete
  to anon
  using (true); 