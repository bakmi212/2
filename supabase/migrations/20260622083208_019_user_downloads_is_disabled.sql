DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_downloads' AND column_name='is_disabled') THEN
    ALTER TABLE user_downloads ADD COLUMN is_disabled BOOLEAN DEFAULT false;
  END IF;
END $$;
