-- Storage policies for payment-proofs bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_proofs_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "payment_proofs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_proofs_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "payment_proofs_select" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');
  END IF;
END $$;

-- Storage policies for qris-images bucket
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qris_images_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "qris_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'qris-images');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'qris_images_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "qris_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'qris-images');
  END IF;
END $$;
