-- ─────────────────────────────────────────────────────────────
-- DEBT TRACKER — Schéma Supabase
-- À coller dans : Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────

-- 1. Profiles (liés à auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Entities (comptes, proches, autres)
CREATE TABLE IF NOT EXISTS entities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('bank', 'person', 'other')),
  note         TEXT DEFAULT '',
  real_balance NUMERIC DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Operations (dettes, transferts, remboursements)
CREATE TABLE IF NOT EXISTS operations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  amount     NUMERIC NOT NULL CHECK (amount > 0),
  from_id    TEXT NOT NULL,
  to_id      TEXT NOT NULL,
  type       TEXT NOT NULL,
  comment    TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Future incomes (revenus planifiés)
CREATE TABLE IF NOT EXISTS future_incomes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount     NUMERIC NOT NULL CHECK (amount > 0),
  date       DATE NOT NULL,
  label      TEXT DEFAULT '',
  dest_id    UUID REFERENCES entities(id) ON DELETE SET NULL,
  freq       TEXT NOT NULL DEFAULT 'once'
               CHECK (freq IN ('once','weekly','monthly','bimonthly','quarterly','annual')),
  end_date   DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — chaque user ne voit que ses données
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_incomes ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: own rows" ON profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- entities
CREATE POLICY "entities: own rows" ON entities
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- operations
CREATE POLICY "operations: own rows" ON operations
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- future_incomes
CREATE POLICY "future_incomes: own rows" ON future_incomes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Index pour les performances
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS entities_user_id       ON entities(user_id);
CREATE INDEX IF NOT EXISTS operations_user_id     ON operations(user_id);
CREATE INDEX IF NOT EXISTS operations_date        ON operations(date DESC);
CREATE INDEX IF NOT EXISTS future_incomes_user_id ON future_incomes(user_id);
CREATE INDEX IF NOT EXISTS future_incomes_date    ON future_incomes(date);
