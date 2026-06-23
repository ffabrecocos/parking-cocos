# Next.js Monorepo Template

A template for projects with a public-facing **app** (port 3000) and an authenticated **dashboard** (port 3001), backed by Supabase.

## Project Structure

```
├── app/                  # Public-facing Next.js app (port 3000)
├── dashboard/            # Authenticated dashboard with Supabase auth (port 3001)
└── supabase/             # Supabase local dev config, migrations & seeds
    ├── config.toml
    ├── migrations/
    └── seed.sql
```

## Getting Started from This Template

### 1. Clone and rename

```bash
git clone <this-repo-url> my-project
cd my-project
rm -rf .git && git init
```

### 2. Update package.json files

Edit the `name` field in both package.json files to match your project:

- **`app/package.json`** — change `"name": "app"` to your project name (e.g. `"my-project-app"`)
- **`dashboard/package.json`** — change `"name": "dashboard"` to your project name (e.g. `"my-project-dashboard"`)

Optionally reset both versions to `"version": "0.1.0"`.

### 3. Configure Supabase

Update the project ID in `supabase/config.toml`:

```toml
project_id = "my-project"  # ← change to your project name
```

### 4. Create a Supabase project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project. Note down the **Project URL** and **anon key**.

### 5. Set up environment variables

Copy the example env file for the dashboard and fill in your Supabase credentials:

```bash
cp dashboard/.env.local.example dashboard/.env.local
```

Edit `dashboard/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

For local development with `supabase start`, the values are printed in the terminal output.

### 6. Start local Supabase

```bash
supabase start          # starts local Supabase (Docker required)
supabase db reset       # runs migrations + seed data
```

Useful local URLs after `supabase start`:

| Service          | URL                          |
| ---------------- | ---------------------------- |
| API              | http://127.0.0.1:54321       |
| Studio           | http://127.0.0.1:54323       |
| Inbucket (email) | http://127.0.0.1:54324       |

### 7. Install dependencies and run

```bash
cd app && npm install && cd ..
cd dashboard && npm install && cd ..
```

Run both apps (in separate terminals):

```bash
# Terminal 1
cd app && npm run dev

# Terminal 2
cd dashboard && npm run dev
```

- App: http://localhost:3000
- Dashboard: http://localhost:3001

## Database Migrations

Create a new migration after making changes in Supabase Studio or directly:

```bash
supabase migration new my_migration_name         # create empty migration file
supabase db diff -f my_migration_name             # auto-generate from local DB changes
supabase db reset                                 # reset local DB and replay all migrations
supabase db push                                  # push migrations to remote project
```

## Linking to a Remote Supabase Project

```bash
supabase link --project-ref your-project-ref
supabase db push                                  # apply local migrations to remote
```
