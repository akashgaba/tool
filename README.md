## Flashcard App (Supabase-native)

Minimal flashcard web app that runs fully on Supabase: email/password auth, Postgres-backed cards, and a four-box review flow (`new`, `forget`, `slow`, `easy`) with a configurable daily review limit.

Below is a **click-by-click guide** to go from zero to deployed on Supabase.

---

### Step 0 – Prerequisites

- **GitHub account** with this repo pushed (the folder containing `index.html`, `app.js`, `styles.css`, and `db/`).
- **Supabase account** and you are logged into the dashboard at `https://supabase.com`.

---

### Step 1 – Create a Supabase project

1. Go to the Supabase dashboard.
2. Click **New project**.
3. Choose an **organization** and give the project a **name** (e.g. `flashcards`).
4. Choose a **database password** (store it somewhere safe).
5. Click **Create new project** and wait until the database is ready (green checkmark).

---

### Step 2 – Create tables and RLS (run the SQL files)

1. In the Supabase dashboard sidebar, click **SQL**.
2. Click **+ New query**.
3. On your machine, open `db/schema.sql` and copy **all** of it.
4. Paste it into the SQL editor and click **Run**.
5. After it succeeds, click **+ New query** again.
6. Open `db/policies.sql`, copy **all** of it, paste into the editor, and click **Run**.
   - **Important**: the script uses `drop policy if exists ...` followed by `create policy ...`.  
     Supabase **does not support** `create policy if not exists`, so make sure your `db/policies.sql` matches the version in this repo (no `if not exists` after `create policy`), or you will see a syntax error at `not`.

You now have:

- `cards` table with `box` enum-like column: `1 = new`, `2 = forget`, `3 = slow`, `4 = easy`.
- `user_settings` table with per-user `daily_limit`.
- Row Level Security so users only see and modify their own data.

---

### Step 3 – Get your Supabase URL and anon key

1. In the Supabase sidebar, click **Project Settings**.
2. Click **API**.
3. Under **Project URL**, copy the URL (looks like `https://xxxx.supabase.co`).
4. Under **Project API keys**, find **anon public** and copy that key.

Keep both handy; you will paste them into `app.js` next.

---

### Step 4 – Configure `app.js` with your Supabase keys

1. On your machine, open `app.js`.
2. At the top you’ll see:

   ```js
   const SUPABASE_URL = window.SUPABASE_URL || "https://YOUR-PROJECT.supabase.co";
   const SUPABASE_ANON_KEY =
     window.SUPABASE_ANON_KEY || "YOUR_PUBLIC_ANON_KEY_HERE";
   ```

3. Replace `"https://YOUR-PROJECT.supabase.co"` with your **Project URL** from Step 3.
4. Replace `"YOUR_PUBLIC_ANON_KEY_HERE"` with your **anon public key** from Step 3.
5. Save the file and commit/push the changes to GitHub.

---

### Step 5 – (Optional) Preview locally

If you want to sanity-check before deploying:

1. In a terminal, go to the project folder:

   ```bash
   cd tool   # or the folder name of this repo
   python -m http.server 4173
   ```

2. Open `http://localhost:4173` in your browser.
3. You should see the auth screen. (Sign-up/login may fail locally if your keys are wrong; fix `app.js` if so.)

---

### Step 6 – Connect GitHub repo to Supabase Hosting

1. Ensure your latest changes are pushed to GitHub (including the `app.js` keys).
2. In the Supabase dashboard sidebar, click **Projects** and select your project.
3. In the left sidebar, click **Web** or **Hosting** (name can vary slightly).
4. Click **Connect to GitHub** (or similar button).
5. Authorize Supabase to access your GitHub account if prompted.
6. Select the **repository** that contains this project.
7. Choose the **branch** to deploy from (usually `main`).

On the configuration screen:

1. Framework: select **Other** or **Vanilla JS**.
2. Build command: **leave empty** (no build step for this app).
3. Output directory: set to `.` (a single dot, meaning repo root).
4. Click **Deploy**.

Supabase will build (very fast, since there is no build) and then host your static files.

---

### Step 7 – First run & sign up

1. After deploy finishes, there will be a **URL** shown in the hosting panel. Click it.
2. You should see the **auth screen**:
   - Enter an email and password.
   - Click **Sign up**.
3. Depending on your Supabase auth settings:
   - If email confirmation is required, check your inbox, confirm, then **Log in** with the same email/password.
   - If not required, you may be logged in immediately.
4. Once logged in you should see:
   - Your email at the top.
   - **Daily limit** field (default `10`).
   - A card area; initially you will probably see a “No cards to review” / “Add some cards” message since there are no cards yet.

---

### Step 8 – Seed some cards for yourself

Right now there is no UI for adding/editing cards. Use the Supabase UI:

1. In the Supabase sidebar, click **Authentication → Users**.
2. Click on your user and note the **UUID** `id` (this is `auth.users.id`).
3. In the sidebar, click **Table editor**.
4. Choose the `cards` table.
5. Click **Insert row** and fill:
   - `user_id` = the UUID from step 2.
   - `front` = question text (e.g. `"What is React?"`).
   - `back` = answer text (e.g. `"A UI library by Facebook"`).
   - leave `box` empty to use the default `1` (new).
6. Insert a few more rows so you have cards to review.
7. Go back to your deployed app URL and **refresh**. Cards should now appear as you review.

---

### Step 9 – Daily usage behavior

- The app reads your `daily_limit` from `user_settings` (default 10).
- It counts how many cards you’ve reviewed **today**.
- It fetches up to `daily_limit - reviewedToday` cards, ordered by:
  - `box` ascending (`new` first, then `forget`, `slow`, `easy`),
  - then oldest `last_reviewed_at`,
  - then oldest `created_at`.
- For each card:
  - Click **Show answer**.
  - Then choose:
    - **Forget** → moves to `forget` box (2),
    - **Took time** → moves to `slow` box (3),
    - **Easy** → moves to `easy` box (4).
- Once you hit today’s limit, you’ll see a **“You reached today's review limit.”** style message and no more cards will load until the next day.

---

### Step 10 – Next improvements (optional)

- Add an **“Add card”** form directly in the app so you don’t need the Supabase UI to create cards.
- Add a **summary** view that shows counts per box (`New`, `Forget`, `Slow`, `Easy`).
- Store Supabase URL and anon key as **environment variables** and read them instead of hardcoding in `app.js`.

