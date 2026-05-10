
ALTER TABLE conversations ADD COLUMN is_shared boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN share_id text UNIQUE;

CREATE POLICY "Public can view shared conversations"
ON conversations FOR SELECT
TO anon, authenticated
USING (is_shared = true AND share_id IS NOT NULL);

CREATE POLICY "Public can view messages of shared conversations"
ON messages FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.is_shared = true
  )
);
