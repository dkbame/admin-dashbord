-- Fix RLS policies to ensure DELETE operations work properly
-- Focus on the core tables that actually exist

-- First, let's check what tables exist and drop problematic policies
drop policy if exists "Allow public delete access for apps" on apps;
drop policy if exists "Allow public access for screenshots" on screenshots;
drop policy if exists "Allow public access for categories" on categories;

-- Recreate the apps delete policy with explicit permissions
create policy "Allow public delete access for apps"
  on apps for delete
  to anon
  using (true);

-- Recreate screenshots policies with explicit delete permissions
create policy "Allow public delete access for screenshots"
  on screenshots for delete
  to anon
  using (true);

create policy "Allow public all access for screenshots"
  on screenshots for all
  to anon
  using (true)
  with check (true);

-- Recreate categories policies
create policy "Allow public all access for categories"
  on categories for all
  to anon
  using (true)
  with check (true);

-- Only add custom_metadata and ratings policies if the tables exist
-- We'll check and create them conditionally

-- Check if custom_metadata table exists and create policy if it does
do $$
begin
  if exists (select from information_schema.tables where table_name = 'custom_metadata') then
    drop policy if exists "Allow public access for custom_metadata" on custom_metadata;
    create policy "Allow public delete access for custom_metadata"
      on custom_metadata for delete
      to anon
      using (true);
    create policy "Allow public all access for custom_metadata"
      on custom_metadata for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

-- Check if ratings table exists and create policy if it does
do $$
begin
  if exists (select from information_schema.tables where table_name = 'ratings') then
    drop policy if exists "Allow public access for ratings" on ratings;
    create policy "Allow public delete access for ratings"
      on ratings for delete
      to anon
      using (true);
    create policy "Allow public all access for ratings"
      on ratings for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

-- Verify the policies are working
-- This will help us debug if there are any remaining issues 