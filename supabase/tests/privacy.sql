-- Run in a SQL session with postgres privileges. All fixtures roll back.
begin;
insert into auth.users(id,email,email_confirmed_at) values('99000000-0000-4000-8000-000000000001','qa-admin@example.invalid',now()),('99000000-0000-4000-8000-000000000002','qa-outsider@example.invalid',null);
insert into roadmap_private.admins values('99000000-0000-4000-8000-000000000001');
insert into public.roadmap_items(id,slug,title,summary,category,visibility) values('99000000-0000-4000-8000-000000000003','qa-published-fixture','QA published','QA fixture','Ventures','public'),('99000000-0000-4000-8000-000000000004','qa-private-fixture','QA private','QA fixture','Ventures','private');
insert into public.roadmap_private_notes values('99000000-0000-4000-8000-000000000003','Confidential fixture');
insert into public.roadmap_updates(item_id,title,published)values('99000000-0000-4000-8000-000000000003','QA hidden update',false),('99000000-0000-4000-8000-000000000004','QA private parent update',true);
set local role anon;
do $$begin
 if (select count(*) from public.roadmap_items where slug like 'qa-%')<>1 then raise exception 'Public visibility failed';end if;
 if exists(select 1 from public.roadmap_updates where title like 'QA %')then raise exception 'Update visibility failed';end if;
 begin perform * from public.roadmap_private_notes;raise exception 'Notes leaked';exception when insufficient_privilege then null;end;
 begin update public.roadmap_items set title='Hacked' where slug like 'qa-%';raise exception 'Anonymous write succeeded';exception when insufficient_privilege then null;end;
end;$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000002',true);
do $$begin
 if public.roadmap_is_admin() then raise exception 'Outsider became admin';end if;
 if exists(select 1 from public.roadmap_private_notes)then raise exception 'Notes leaked to outsider';end if;
 update public.roadmap_items set title='Hacked' where slug like 'qa-%';if found then raise exception 'Outsider write succeeded';end if;
 begin perform public.roadmap_save('{}'::jsonb);raise exception 'Outsider RPC succeeded';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
do $$begin
 if not public.roadmap_is_admin() then raise exception 'Admin denied';end if;
 if not exists(select 1 from public.roadmap_private_notes where body='Confidential fixture')then raise exception 'Admin notes denied';end if;
 update public.roadmap_items set deleted_at=now() where slug='qa-published-fixture';if not found then raise exception 'Admin delete failed';end if;
end;$$;
reset role;
set local role anon;
do $$begin if exists(select 1 from public.roadmap_items where slug like 'qa-%')then raise exception 'Deleted entry leaked';end if;end;$$;
reset role;
rollback;
select 'Privacy checks passed; all fixtures rolled back.' as result;
