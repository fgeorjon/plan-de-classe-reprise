-- Create password hashing and verification functions
-- These functions are required for authentication

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS hash_password(text);
DROP FUNCTION IF EXISTS verify_password(text, text);

-- Function to hash passwords using SHA256
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password text, password_hash text)
RETURNS boolean AS $$
BEGIN
  RETURN encode(digest(password, 'sha256'), 'hex') = password_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Test the functions
SELECT 
  'Testing password functions' as test,
  hash_password('VieScol2024!') as hashed,
  verify_password('VieScol2024!', hash_password('VieScol2024!')) as verified;
