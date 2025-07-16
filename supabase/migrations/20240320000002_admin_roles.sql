-- Create admin_roles table
create table admin_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  created_at timestamp with time zone default now()
);

-- Enable RLS on admin_roles
alter table admin_roles enable row level security;

-- Create policies for admin_roles
create policy "Allow public read access for admin_roles"
  on admin_roles for select
  to anon
  using (true);

create policy "Allow public insert access for admin_roles"
  on admin_roles for insert
  to anon
  with check (true);

create policy "Allow public update access for admin_roles"
  on admin_roles for update
  to anon
  using (true);

-- Create function to check if user is admin
create or replace function is_admin(user_id uuid)
returns boolean as $$
begin
  return exists(
    select 1 from admin_roles 
    where admin_roles.user_id = is_admin.user_id 
    and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

-- Create function to get user role
create or replace function get_user_role(user_id uuid)
returns text as $$
begin
  return (
    select role from admin_roles 
    where admin_roles.user_id = get_user_role.user_id 
    limit 1
  );
end;
$$ language plpgsql security definer; 