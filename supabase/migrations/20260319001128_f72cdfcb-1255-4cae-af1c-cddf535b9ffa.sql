
-- Delete orphaned conversations (no user_id)
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IS NULL);
DELETE FROM conversations WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent future orphans
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
