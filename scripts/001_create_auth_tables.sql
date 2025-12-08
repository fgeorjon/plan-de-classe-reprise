-- Migration pour créer les tables d'authentification et de gestion des utilisateurs
-- Compatible avec le schéma existant (accounts, classes, students, etc.)

-- Table des profils utilisateurs (authentification)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('vie-scolaire', 'professeur', 'delegue', 'eco-delegue')),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  can_create_subrooms boolean DEFAULT false,
  allow_delegate_subrooms boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE
);

-- Index pour la recherche rapide par username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_establishment_id ON public.profiles(establishment_id);

-- Table des professeurs (extension de profiles)
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  establishment_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  subject text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_deleted boolean DEFAULT false,
  CONSTRAINT teachers_pkey PRIMARY KEY (id),
  CONSTRAINT teachers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT teachers_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE
);

-- Table de liaison professeurs-classes
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_classes_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE,
  CONSTRAINT teacher_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  CONSTRAINT teacher_classes_unique UNIQUE (teacher_id, class_id)
);

-- Ajouter profile_id et student_role aux students existants
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_role text CHECK (student_role IN ('delegue', 'eco-delegue') OR student_role IS NULL);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);

-- Table des logs d'actions
CREATE TABLE IF NOT EXISTS public.action_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  establishment_id uuid,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT action_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT action_logs_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE
);

-- Index pour recherche rapide des logs
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_establishment_id ON public.action_logs(establishment_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at DESC);

-- Fonction pour hasher les mots de passe (SHA-256)
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(password, 'sha256'), 'hex');
END;
$$;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE public.profiles IS 'Table des profils utilisateurs avec authentification';
COMMENT ON TABLE public.teachers IS 'Table des professeurs, liée aux profiles';
COMMENT ON TABLE public.teacher_classes IS 'Table de liaison entre professeurs et classes';
COMMENT ON COLUMN public.students.profile_id IS 'Lien vers le profil si l''élève est délégué/éco-délégué';
COMMENT ON COLUMN public.students.student_role IS 'Rôle spécial : delegue ou eco-delegue';
