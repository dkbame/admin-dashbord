-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Categories table
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default now()
);

-- Apps table
create table apps (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  developer text not null,
  category_id uuid references categories(id),
  price numeric(10,2),
  currency text,
  is_on_mas boolean default false,
  mas_id text unique,
  mas_url text,
  download_url text,
  website_url text,
  icon_url text,
  minimum_os_version text,
  last_updated timestamp with time zone default now(),
  features text[],
  source text check (source in ('MAS', 'CUSTOM')),
  status text check (status in ('ACTIVE', 'PENDING', 'INACTIVE')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Screenshots table
create table screenshots (
  id uuid default gen_random_uuid() primary key,
  app_id uuid references apps(id) on delete cascade,
  url text not null,
  caption text,
  display_order integer,
  created_at timestamp with time zone default now()
);

-- Custom metadata table
create table custom_metadata (
  id uuid default gen_random_uuid() primary key,
  app_id uuid references apps(id) on delete cascade,
  license text,
  release_notes text,
  system_requirements text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Ratings table
create table ratings (
  id uuid default gen_random_uuid() primary key,
  app_id uuid references apps(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  review text,
  created_at timestamp with time zone default now()
);

-- Ratings view
create view app_ratings as
select 
  app_id,
  avg(rating)::numeric(3,2) as average_rating,
  count(*) as rating_count
from ratings
group by app_id;

-- Enable RLS
alter table apps enable row level security;
alter table screenshots enable row level security;
alter table categories enable row level security;
alter table custom_metadata enable row level security;
alter table ratings enable row level security;

-- Create policies for public access (for testing)
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
  using (true);

create policy "Allow public delete access for apps"
  on apps for delete
  to anon
  using (true);

-- Similar policies for other tables
create policy "Allow public access for screenshots"
  on screenshots for all
  to anon
  using (true);

create policy "Allow public access for categories"
  on categories for all
  to anon
  using (true);

create policy "Allow public access for custom metadata"
  on custom_metadata for all
  to anon
  using (true);

create policy "Allow public access for ratings"
  on ratings for all
  to anon
  using (true); 