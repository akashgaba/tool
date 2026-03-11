-- RLS policies for per-user access control

-- Cards: users can only see and modify their own cards

create policy if not exists "Users can select own cards"
on public.cards
for select
using (auth.uid() = user_id);

create policy if not exists "Users can insert own cards"
on public.cards
for insert
with check (auth.uid() = user_id);

create policy if not exists "Users can update own cards"
on public.cards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "Users can delete own cards"
on public.cards
for delete
using (auth.uid() = user_id);


-- User settings: one row per user, self-owned

create policy if not exists "Users can select own settings"
on public.user_settings
for select
using (auth.uid() = user_id);

create policy if not exists "Users can insert own settings"
on public.user_settings
for insert
with check (auth.uid() = user_id);

create policy if not exists "Users can update own settings"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "Users can delete own settings"
on public.user_settings
for delete
using (auth.uid() = user_id);

