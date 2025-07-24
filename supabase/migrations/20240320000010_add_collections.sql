-- Collections table
create table collections (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  slug text unique not null,
  is_featured boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Collection apps junction table
create table collection_apps (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references collections(id) on delete cascade,
  app_id uuid references apps(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamp with time zone default now(),
  unique(collection_id, app_id)
);

-- Add indexes for better performance
create index idx_collections_slug on collections(slug);
create index idx_collections_featured on collections(is_featured);
create index idx_collection_apps_collection_id on collection_apps(collection_id);
create index idx_collection_apps_app_id on collection_apps(app_id);
create index idx_collection_apps_display_order on collection_apps(display_order);

-- Enable RLS
alter table collections enable row level security;
alter table collection_apps enable row level security;

-- Create policies for collections
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
  using (true);

create policy "Allow public delete access for collections"
  on collections for delete
  to anon
  using (true);

-- Create policies for collection_apps
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
  using (true);

create policy "Allow public delete access for collection_apps"
  on collection_apps for delete
  to anon
  using (true);

-- Add some sample collections
insert into collections (name, description, slug, is_featured) values
  ('Productivity Essentials', 'Must-have productivity apps for Mac users', 'productivity-essentials', true),
  ('Developer Tools', 'Essential tools for developers', 'developer-tools', true),
  ('Design & Creative', 'Apps for designers and creatives', 'design-creative', false),
  ('Entertainment', 'Entertainment and media apps', 'entertainment', false); 