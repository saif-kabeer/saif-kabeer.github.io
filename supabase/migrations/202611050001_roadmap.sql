-- Apply once to a Supabase project. All content begins as a draft.
begin;
create schema if not exists roadmap_private;
revoke all on schema roadmap_private from public, anon, authenticated;
create table roadmap_private.admins(user_id uuid primary key references auth.users(id) on delete cascade);
revoke all on roadmap_private.admins from public, anon, authenticated;
create table roadmap_private.allowed_emails(email text primary key check(email=lower(email)));
revoke all on roadmap_private.allowed_emails from public,anon,authenticated;
create function roadmap_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from roadmap_private.admins where user_id=(select auth.uid())) or exists(select 1 from auth.users u join roadmap_private.allowed_emails a on lower(u.email)=a.email where u.id=(select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function roadmap_private.is_admin() from public, anon, authenticated;
grant usage on schema roadmap_private to anon, authenticated;
grant execute on function roadmap_private.is_admin() to anon, authenticated;
create function public.roadmap_is_admin() returns boolean language sql stable security invoker set search_path='' as $$select roadmap_private.is_admin();$$;
revoke all on function public.roadmap_is_admin() from public, anon, authenticated;
grant execute on function public.roadmap_is_admin() to authenticated;
create table public.roadmap_items(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(length(slug)<=100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check(length(trim(title)) between 1 and 160),
 summary text not null check(length(trim(summary)) between 1 and 300),
 description text not null default '' check(length(description)<=30000),
 success text not null default '' check(length(success)<=10000),
 reflection text not null default '' check(length(reflection)<=30000),
 category text not null check(category in ('Ventures','Research & Education','Creative & Technical','Experiences','Life & Growth')),
 status text not null default 'Idea' check(status in ('Idea','Planned','In progress','Paused','Completed','Archived')),
 visibility text not null default 'draft' check(visibility in ('private','draft','public')),
 tags text[] not null default '{}', links jsonb not null default '[]' check(jsonb_typeof(links)='array'),
 priority integer not null default 0, featured boolean not null default false,
 target_date date, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index roadmap_public_index on public.roadmap_items(visibility,deleted_at,priority desc);
create table public.roadmap_milestones(
 id uuid primary key default gen_random_uuid(),item_id uuid not null references public.roadmap_items(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 300),sort_order integer not null default 0,completed_at date
);
create table public.roadmap_updates(
 id uuid primary key default gen_random_uuid(),item_id uuid not null references public.roadmap_items(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 300),body text not null default '' check(length(body)<=30000),date date not null default current_date,published boolean not null default false
);
create table public.roadmap_media(
 id uuid primary key default gen_random_uuid(),item_id uuid not null references public.roadmap_items(id) on delete cascade,
 path text not null unique check(path ~ '^[a-f0-9-]+/[a-f0-9-]+\.(jpg|png|webp|avif)$'),caption text not null default '' check(length(caption)<=500),sort_order integer not null default 0,published boolean not null default false,
 check(split_part(path,'/',1)=item_id::text)
);
create table public.roadmap_private_notes(item_id uuid primary key references public.roadmap_items(id) on delete cascade,body text not null default '' check(length(body)<=50000));
create index on public.roadmap_milestones(item_id);
create index on public.roadmap_updates(item_id);
create index on public.roadmap_media(item_id);
create function roadmap_private.touch_item() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
create trigger roadmap_item_modified before update on public.roadmap_items for each row execute function roadmap_private.touch_item();
alter table public.roadmap_items enable row level security;
alter table public.roadmap_milestones enable row level security;
alter table public.roadmap_updates enable row level security;
alter table public.roadmap_media enable row level security;
alter table public.roadmap_private_notes enable row level security;
revoke all on public.roadmap_items,public.roadmap_milestones,public.roadmap_updates,public.roadmap_media,public.roadmap_private_notes from public,anon,authenticated;
grant select on public.roadmap_items,public.roadmap_milestones,public.roadmap_updates,public.roadmap_media to anon,authenticated;
grant insert,update,delete on public.roadmap_items,public.roadmap_milestones,public.roadmap_updates,public.roadmap_media to authenticated;
grant select,insert,update,delete on public.roadmap_private_notes to authenticated;
create policy roadmap_public_items on public.roadmap_items for select to anon,authenticated using(visibility='public' and deleted_at is null);
create policy roadmap_public_milestones on public.roadmap_milestones for select to anon,authenticated using(exists(select 1 from public.roadmap_items i where i.id=item_id and i.visibility='public' and i.deleted_at is null));
create policy roadmap_public_updates on public.roadmap_updates for select to anon,authenticated using(published and exists(select 1 from public.roadmap_items i where i.id=item_id and i.visibility='public' and i.deleted_at is null));
create policy roadmap_public_media on public.roadmap_media for select to anon,authenticated using(published and exists(select 1 from public.roadmap_items i where i.id=item_id and i.visibility='public' and i.deleted_at is null));
do $$declare t text;begin
 foreach t in array array['roadmap_items','roadmap_milestones','roadmap_updates','roadmap_media','roadmap_private_notes'] loop
 execute format('create policy %I on public.%I for select to authenticated using((select roadmap_private.is_admin()))',t||'_admin_read',t);
 execute format('create policy %I on public.%I for insert to authenticated with check((select roadmap_private.is_admin()))',t||'_admin_insert',t);
 execute format('create policy %I on public.%I for update to authenticated using((select roadmap_private.is_admin())) with check((select roadmap_private.is_admin()))',t||'_admin_update',t);
 execute format('create policy %I on public.%I for delete to authenticated using((select roadmap_private.is_admin()))',t||'_admin_delete',t);
 end loop;end;$$;
-- One atomic transaction for a complete editor save. Invoker policies remain enforced.
create function public.roadmap_save(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare item uuid; child jsonb; existing timestamptz;
begin
 if not roadmap_private.is_admin() then raise exception 'Roadmap admin required' using errcode='42501';end if;
 item=coalesce((payload->>'id')::uuid,gen_random_uuid());
 select updated_at into existing from public.roadmap_items where id=item for update;
 if existing is not null and (payload->>'updated_at')::timestamptz is distinct from existing then raise exception 'This entry changed in another tab. Reload it before saving.';end if;
 if jsonb_array_length(coalesce(payload->'milestones','[]'))>200 or jsonb_array_length(coalesce(payload->'updates','[]'))>500 or jsonb_array_length(coalesce(payload->'media','[]'))>200 then raise exception 'Too many entries in this chapter';end if;
 insert into public.roadmap_items(id,slug,title,summary,description,success,reflection,category,status,visibility,tags,links,priority,featured,target_date)
 values(item,payload->>'slug',trim(payload->>'title'),trim(payload->>'summary'),coalesce(payload->>'description',''),coalesce(payload->>'success',''),coalesce(payload->>'reflection',''),payload->>'category',payload->>'status',coalesce(payload->>'visibility','draft'),array(select jsonb_array_elements_text(coalesce(payload->'tags','[]'))),coalesce(payload->'links','[]'),coalesce((payload->>'priority')::integer,0),coalesce((payload->>'featured')::boolean,false),nullif(payload->>'target_date','')::date)
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,summary=excluded.summary,description=excluded.description,success=excluded.success,reflection=excluded.reflection,category=excluded.category,status=excluded.status,visibility=excluded.visibility,tags=excluded.tags,links=excluded.links,priority=excluded.priority,featured=excluded.featured,target_date=excluded.target_date;
 delete from public.roadmap_milestones where item_id=item;
 for child in select value from jsonb_array_elements(coalesce(payload->'milestones','[]')) loop
 insert into public.roadmap_milestones(item_id,title,sort_order,completed_at) values(item,child->>'title',coalesce((child->>'sort_order')::int,0),nullif(child->>'completed_at','')::date);end loop;
 delete from public.roadmap_updates where item_id=item;
 for child in select value from jsonb_array_elements(coalesce(payload->'updates','[]')) loop
 insert into public.roadmap_updates(item_id,title,body,date,published) values(item,child->>'title',coalesce(child->>'body',''),(child->>'date')::date,coalesce((child->>'published')::boolean,false));end loop;
 delete from public.roadmap_media where item_id=item;
 for child in select value from jsonb_array_elements(coalesce(payload->'media','[]')) loop
 insert into public.roadmap_media(item_id,path,caption,sort_order,published) values(item,child->>'path',coalesce(child->>'caption',''),coalesce((child->>'sort_order')::int,0),coalesce((child->>'published')::boolean,false));end loop;
 insert into public.roadmap_private_notes(item_id,body) values(item,coalesce(payload->>'private_notes','')) on conflict(item_id) do update set body=excluded.body;
 return item;
end;$$;
revoke all on function public.roadmap_save(jsonb) from public,anon,authenticated;
grant execute on function public.roadmap_save(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('roadmap-media','roadmap-media',false,8388608,array['image/jpeg','image/png','image/webp','image/avif']);
create policy roadmap_storage_public_read on storage.objects for select to anon,authenticated using(bucket_id='roadmap-media' and exists(select 1 from public.roadmap_media m join public.roadmap_items i on i.id=m.item_id where m.path=name and m.published and i.visibility='public' and i.deleted_at is null));
create policy roadmap_storage_admin_read on storage.objects for select to authenticated using(bucket_id='roadmap-media' and (select roadmap_private.is_admin()));
create policy roadmap_storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='roadmap-media' and (select roadmap_private.is_admin()));
create policy roadmap_storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='roadmap-media' and (select roadmap_private.is_admin()));
commit;
