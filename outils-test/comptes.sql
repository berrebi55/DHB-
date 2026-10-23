insert into auth.users(id,email) values ('11111111-1111-1111-1111-111111111111','admin@test-ref.fr'),('22222222-2222-2222-2222-222222222222','collab@test-ref.fr') on conflict do nothing;
update public.profiles set role='admin' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set role='collaborateur' where id='22222222-2222-2222-2222-222222222222';
select id, email, role from public.profiles order by email;
