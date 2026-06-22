/*
# Create campaigns table — Campaign Context Standardization

## Purpose

The Full Purchase Context requires campaign tracking that captures UTM
parameters and campaign identifiers. This table stores marketing campaigns
that can be linked to purchase_contexts and used for conversion attribution.

## New Tables

### campaigns

| Column         | Type        | Description                                      |
|---------------|-------------|--------------------------------------------------|
| id            | uuid PK     | Campaign identifier                               |
| name          | text        | Campaign display name                             |
| slug          | text UNIQUE | URL-safe slug                                     |
| utm_source    | text        | Default UTM source                               |
| utm_medium    | text        | Default UTM medium                               |
| utm_campaign  | text        | Default UTM campaign                              |
| start_date    | timestamptz | Campaign start                                    |
| end_date      | timestamptz | Campaign end                                      |
| is_active     | boolean     | Whether campaign is currently active              |
| budget        | numeric     | Campaign budget                                   |
| description   | text        | Campaign description                              |
| created_at    | timestamptz | Creation timestamp                                |
| updated_at    | timestamptz | Last update timestamp                              |

## Security
- RLS enabled. Authenticated users can read all campaigns; only the owner
  (the creator) can manage (insert/update/delete).
- Authenticated readers can SELECT all rows (campaigns are shared reference data).
*/

CREATE TABLE IF NOT EXISTS campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  start_date      timestamptz,
  end_date        timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  budget          numeric,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all campaigns (reference data)
DROP POLICY IF EXISTS "select_campaigns" ON campaigns;
CREATE POLICY "select_campaigns" ON campaigns
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can create campaigns
DROP POLICY IF EXISTS "insert_campaigns" ON campaigns;
CREATE POLICY "insert_campaigns" ON campaigns
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Authenticated users can update campaigns
DROP POLICY IF EXISTS "update_campaigns" ON campaigns;
CREATE POLICY "update_campaigns" ON campaigns
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete campaigns
DROP POLICY IF EXISTS "delete_campaigns" ON campaigns;
CREATE POLICY "delete_campaigns" ON campaigns
  FOR DELETE TO authenticated
  USING (true);

-- Anon can read active campaigns (for tracking pixel / UTM resolution)
DROP POLICY IF EXISTS "select_anon_campaigns" ON campaigns;
CREATE POLICY "select_anon_campaigns" ON campaigns
  FOR SELECT TO anon
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
