-- Fix delete policies for apps and screenshots
-- This migration ensures that delete operations work properly

-- Drop existing delete policies
drop policy if exists "Allow public delete access for apps" on apps;
drop policy if exists "Allow public delete access for screenshots" on screenshots;

-- Create proper delete policies (DELETE operations don't use WITH CHECK)
create policy "Allow public delete access for apps"
  on apps for delete
  to anon
  using (true);

create policy "Allow public delete access for screenshots"
  on screenshots for delete
  to anon
  using (true);

-- Also ensure categories can be deleted
drop policy if exists "Allow public delete access for categories" on categories;
create policy "Allow public delete access for categories"
  on categories for delete
  to anon
  using (true);

-- Ensure all other policies are in place for full CRUD operations
create policy if not exists "Allow public read access for apps"
  on apps for select
  to anon
  using (true);

create policy if not exists "Allow public insert access for apps"
  on apps for insert
  to anon
  with check (true);

create policy if not exists "Allow public update access for apps"
  on apps for update
  to anon
  using (true)
  with check (true);

-- Screenshots policies
create policy if not exists "Allow public read access for screenshots"
  on screenshots for select
  to anon
  using (true);

create policy if not exists "Allow public insert access for screenshots"
  on screenshots for insert
  to anon
  with check (true);

create policy if not exists "Allow public update access for screenshots"
  on screenshots for update
  to anon
  using (true)
  with check (true);

-- Categories policies
create policy if not exists "Allow public read access for categories"
  on categories for select
  to anon
  using (true);

create policy if not exists "Allow public insert access for categories"
  on categories for insert
  to anon
  with check (true);

create policy if not exists "Allow public update access for categories"
  on categories for update
  to anon
  using (true)
  with check (true); 