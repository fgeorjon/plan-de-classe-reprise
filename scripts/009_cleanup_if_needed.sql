-- ⚠️ ATTENTION : Ce script supprime et recrée la table room_invitations
-- Utilisez-le UNIQUEMENT si vous avez des erreurs de structure
-- Toutes les invitations existantes seront perdues !

-- Désactiver temporairement les contraintes de clés étrangères
-- (si d'autres tables référencent room_invitations)

-- Supprimer la table si elle existe
DROP TABLE IF EXISTS room_invitations CASCADE;

-- Recréer la table avec la bonne structure
CREATE TABLE room_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  sub_room_id uuid REFERENCES sub_rooms(id) ON DELETE CASCADE,
  invited_teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_room_invitations_teacher ON room_invitations(invited_teacher_id);
CREATE INDEX idx_room_invitations_room ON room_invitations(room_id);
CREATE INDEX idx_room_invitations_sub_room ON room_invitations(sub_room_id);
CREATE INDEX idx_room_invitations_status ON room_invitations(status);

-- Activer RLS
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leurs propres invitations
CREATE POLICY "Les utilisateurs peuvent consulter leurs propres invitations"
ON room_invitations FOR SELECT
USING (
  invited_teacher_id IN (
    SELECT id FROM teachers WHERE profile_id = auth.uid()
  )
  OR invited_by = auth.uid()
);

-- Politique : Seuls les admins et directeurs peuvent créer des invitations
CREATE POLICY "Admins et directeurs peuvent créer des invitations"
ON room_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'directeur')
  )
);

-- Politique : Les utilisateurs peuvent mettre à jour leurs propres invitations
CREATE POLICY "Les utilisateurs peuvent accepter/refuser leurs invitations"
ON room_invitations FOR UPDATE
USING (
  invited_teacher_id IN (
    SELECT id FROM teachers WHERE profile_id = auth.uid()
  )
);

-- Fonction de trigger pour updated_at
CREATE OR REPLACE FUNCTION update_room_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_invitations_updated_at
BEFORE UPDATE ON room_invitations
FOR EACH ROW
EXECUTE FUNCTION update_room_invitations_updated_at();
