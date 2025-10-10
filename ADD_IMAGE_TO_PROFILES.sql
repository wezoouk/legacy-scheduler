-- Add image column to profiles table for storing user profile images
-- Run this in your Supabase SQL Editor

-- 1. Add image column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image TEXT;

-- 2. Update the trigger function to include image when new users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, plan, image)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'FREE'),
    NEW.raw_user_meta_data->>'image'  -- Include image from user_metadata
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    plan = EXCLUDED.plan,
    image = EXCLUDED.image;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing users with their images from auth.users
UPDATE public.profiles p
SET image = (
  SELECT raw_user_meta_data->>'image'
  FROM auth.users u
  WHERE u.id = p.id
)
WHERE image IS NULL;

-- 4. Show results
SELECT 
  email,
  name,
  plan,
  CASE 
    WHEN image IS NOT NULL THEN '✅ Has image'
    ELSE '❌ No image'
  END as image_status
FROM public.profiles
ORDER BY created_at DESC;

-- Summary
SELECT 
  COUNT(*) as total_users,
  COUNT(image) as users_with_images,
  COUNT(*) - COUNT(image) as users_without_images
FROM public.profiles;



