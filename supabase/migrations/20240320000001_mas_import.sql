-- Function to import apps from Mac App Store
create or replace function import_from_mas(url text)
returns json
language plpgsql
security definer
as $$
declare
  app_id text;
  response json;
  app_data json;
  screenshots json;
  category_id uuid;
  curl_command text;
  curl_result text;
begin
  -- Extract app ID from URL
  app_id := (regexp_matches(url, 'id(\d+)'))[1];
  
  if app_id is null then
    return json_build_object('error', 'Invalid Mac App Store URL');
  end if;
  
  -- Make HTTP request to iTunes API using curl
  curl_command := 'curl -s "https://itunes.apple.com/lookup?id=' || app_id || '&entity=macSoftware"';
  curl_result := curl_command;
  response := curl_result::json;
  
  if response->>'resultCount' = '0' then
    return json_build_object('error', 'App not found');
  end if;
  
  -- Get first result
  app_data := response->'results'->0;
  
  -- Get category ID
  select id into category_id
  from categories
  where name = app_data->>'primaryGenreName'
  limit 1;
  
  -- Insert app
  with inserted_app as (
    insert into apps (
      name,
      developer,
      description,
      category_id,
      price,
      currency,
      is_on_mas,
      mas_id,
      mas_url,
      icon_url,
      minimum_os_version,
      last_updated,
      features,
      status,
      source
    ) values (
      app_data->>'trackName',
      app_data->>'artistName',
      app_data->>'description',
      category_id,
      (app_data->>'price')::numeric,
      app_data->>'currency',
      true,
      app_id,
      url,
      app_data->>'artworkUrl512',
      app_data->>'minimumOsVersion',
      (app_data->>'currentVersionReleaseDate')::timestamp with time zone,
      array[]::text[],
      'ACTIVE',
      'MAS'
    )
    returning id
  ),
  inserted_screenshots as (
    insert into screenshots (app_id, url, display_order)
    select 
      (select id from inserted_app),
      jsonb_array_elements_text(app_data->'screenshotUrls')::text,
      row_number() over ()
    returning id
  )
  select json_build_object(
    'success', true,
    'app_id', (select id from inserted_app),
    'screenshot_count', (select count(*) from inserted_screenshots)
  ) into response;
  
  return response;
exception
  when others then
    return json_build_object('error', SQLERRM);
end;
$$; 