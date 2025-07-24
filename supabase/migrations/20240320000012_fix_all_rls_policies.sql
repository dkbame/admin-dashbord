-- Comprehensive fix for all RLS policies
-- This migration removes all existing policies and recreates them properly

-- First, drop ALL existing policies to start fresh
drop policy if exists "Allow public read access for apps" on apps;
drop policy if exists "Allow public insert access for apps" on apps;
drop policy if exists "Allow public update access for apps" on apps;
drop policy if exists "Allow public delete access for apps" on apps;

drop policy if exists "Allow public access for screenshots" on screenshots;
drop policy if exists "Allow public read access for screenshots" on screenshots;
drop policy if exists "Allow public insert access for screenshots" on screenshots;
drop policy if exists "Allow public update access for screenshots" on screenshots;
drop policy if exists "Allow public delete access for screenshots" on screenshots;

drop policy if exists "Allow public access for categories" on categories;
drop policy if exists "Allow public read access for categories" on categories;
drop policy if exists "Allow public insert access for categories" on categories;
drop policy if exists "Allow public update access for categories" on categories;
drop policy if exists "Allow public delete access for categories" on categories;

drop policy if exists "Allow public access for custom metadata" on custom_metadata;
drop policy if exists "Allow public access for ratings" on ratings;

drop policy if exists "Allow public read access for collections" on collections;
drop policy if exists "Allow public insert access for collections" on collections;
drop policy if exists "Allow public update access for collections" on collections;
drop policy if exists "Allow public delete access for collections" on collections;

drop policy if exists "Allow public read access for collection_apps" on collection_apps;
drop policy if exists "Allow public insert access for collection_apps" on collection_apps;
drop policy if exists "Allow public update access for collection_apps" on collection_apps;
drop policy if exists "Allow public delete access for collection_apps" on collection_apps;

-- Now create proper policies for apps table
create policy "Allow public read access for apps"
  on apps for select
  to anon
  using (true);

create policy "Allow public insert access for apps"
  on apps for insert
  to anon
  with check (true);

create policy "Allow public update access for apps"
  on apps for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for apps"
  on apps for delete
  to anon
  using (true);

-- Create proper policies for screenshots table
create policy "Allow public read access for screenshots"
  on screenshots for select
  to anon
  using (true);

create policy "Allow public insert access for screenshots"
  on screenshots for insert
  to anon
  with check (true);

create policy "Allow public update access for screenshots"
  on screenshots for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for screenshots"
  on screenshots for delete
  to anon
  using (true);

-- Create proper policies for categories table
create policy "Allow public read access for categories"
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

-- Create proper policies for custom_metadata table
create policy "Allow public read access for custom metadata"
  on custom_metadata for select
  to anon
  using (true);

create policy "Allow public insert access for custom metadata"
  on custom_metadata for insert
  to anon
  with check (true);

create policy "Allow public update access for custom metadata"
  on custom_metadata for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for custom metadata"
  on custom_metadata for delete
  to anon
  using (true);

-- Create proper policies for ratings table
create policy "Allow public read access for ratings"
  on ratings for select
  to anon
  using (true);

create policy "Allow public insert access for ratings"
  on ratings for insert
  to anon
  with check (true);

create policy "Allow public update access for ratings"
  on ratings for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for ratings"
  on ratings for delete
  to anon
  using (true);

-- Create proper policies for collections table
create policy "Allow public read access for collections"
  on collections for select
  to anon
  using (true);

create policy "Allow public insert access for collections"
  on collections for insert
  to anon
  with check (true);

create policy "Allow public update access for collections"
  on collections for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for collections"
  on collections for delete
  to anon
  using (true);

-- Create proper policies for collection_apps table
create policy "Allow public read access for collection_apps"
  on collection_apps for select
  to anon
  using (true);

create policy "Allow public insert access for collection_apps"
  on collection_apps for insert
  to anon
  with check (true);

create policy "Allow public update access for collection_apps"
  on collection_apps for update
  to anon
  using (true)
  with check (true);

create policy "Allow public delete access for collection_apps"
  on collection_apps for delete
  to anon
  using (true); 