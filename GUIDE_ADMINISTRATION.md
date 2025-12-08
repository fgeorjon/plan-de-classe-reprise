# Guide d'Administration - Système de Plan de Classe

## Table des Matières
1. [Configuration Initiale](#configuration-initiale)
2. [Gestion des Établissements](#gestion-des-établissements)
3. [Gestion des Utilisateurs](#gestion-des-utilisateurs)
4. [Structure de la Base de Données](#structure-de-la-base-de-données)

---

## Configuration Initiale

### Étape 1 : Exécuter les Scripts SQL

Les scripts doivent être exécutés dans l'ordre suivant dans l'éditeur SQL de Supabase :

1. **001_create_schema.sql** - Crée la structure de base (tables, types, RLS)
2. **002_profile_trigger.sql** - Crée le trigger pour les profils
3. **003_create_rooms.sql** - Crée les tables pour les salles
4. **004_create_subrooms.sql** - Crée les tables pour les sous-salles
5. **006_create_test_users.sql** - Crée les utilisateurs de test

### Étape 2 : Vérifier la Création

Après l'exécution, vérifiez dans Supabase :
- **Table Editor** : Vous devriez voir les tables `establishments`, `profiles`, `students`, `teachers`, `rooms`, `subrooms`
- **Authentication** : Vous devriez voir 6 utilisateurs créés

---

## Gestion des Établissements

### Ajouter un Nouvel Établissement

\`\`\`sql
-- Exemple : Ajouter le lycée Jean Moulin
insert into public.establishments (name, code) 
values ('JEAN-MOULIN 75015', 'jm001');
\`\`\`

**Important :**
- Le `code` doit être unique et suivre le format : `[initiales][numéro]`
- Exemples : `stm001`, `vh001`, `jm001`
- Le code est utilisé lors de la connexion pour vérifier l'établissement

### Modifier un Établissement

\`\`\`sql
-- Modifier le nom d'un établissement
update public.establishments 
set name = 'NOUVEAU-NOM 12345' 
where code = 'stm001';
\`\`\`

### Supprimer un Établissement

\`\`\`sql
-- ATTENTION : Cela supprimera aussi tous les utilisateurs, salles, etc. liés
delete from public.establishments where code = 'stm001';
\`\`\`

---

## Gestion des Utilisateurs

### Comprendre la Structure Utilisateur

Chaque utilisateur a **deux composants** :
1. **auth.users** - Compte d'authentification Supabase (email, mot de passe)
2. **public.profiles** - Informations de profil (établissement, rôle, nom, etc.)

### Ajouter un Nouvel Utilisateur

#### Méthode 1 : Via SQL (Recommandé pour les tests)

\`\`\`sql
do $$
declare
  new_user_id uuid;
  establishment_id uuid;
begin
  -- 1. Récupérer l'ID de l'établissement
  select id into establishment_id 
  from public.establishments 
  where code = 'stm001';

  -- 2. Créer l'utilisateur dans auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'nouvel.utilisateur@test.local',  -- Email unique
    crypt('MotDePasse123!', gen_salt('bf')),  -- Mot de passe crypté
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"nouvel.user"}',  -- Identifiant
    now(),
    now(),
    '',
    ''
  ) returning id into new_user_id;

  -- 3. Créer le profil associé
  insert into public.profiles (
    id,
    establishment_id,
    role,
    username,
    first_name,
    last_name,
    email,
    can_create_subrooms
  ) values (
    new_user_id,
    establishment_id,
    'professeur',  -- ou 'vie-scolaire', 'delegue', 'eco-delegue'
    'nouvel.user',  -- Identifiant (doit correspondre à raw_user_meta_data)
    'Prénom',
    'Nom',
    'nouvel.utilisateur@test.local',
    true  -- true pour professeur et vie-scolaire, false pour délégués
  );

  raise notice 'Utilisateur créé avec succès! ID: %', new_user_id;
end $$;
\`\`\`

#### Méthode 2 : Via l'Interface Supabase (Production)

1. **Aller dans Authentication > Users**
2. **Cliquer sur "Add user"**
3. **Remplir :**
   - Email : `utilisateur@etablissement.fr`
   - Password : Mot de passe sécurisé
   - Auto Confirm User : ✓ (coché)
4. **Copier l'UUID de l'utilisateur créé**
5. **Aller dans Table Editor > profiles**
6. **Cliquer sur "Insert row"**
7. **Remplir :**
   - id : UUID copié à l'étape 4
   - establishment_id : Sélectionner l'établissement
   - role : Choisir le rôle
   - username : Identifiant de connexion
   - first_name, last_name, email : Informations personnelles
   - can_create_subrooms : true/false selon le rôle

### Modifier un Utilisateur

\`\`\`sql
-- Changer le rôle d'un utilisateur
update public.profiles 
set role = 'vie-scolaire', can_create_subrooms = true
where username = 'prof.stmarie';

-- Changer le mot de passe
update auth.users 
set encrypted_password = crypt('NouveauMotDePasse123!', gen_salt('bf'))
where email = 'prof.stmarie@test.local';

-- Changer l'établissement d'un utilisateur
update public.profiles 
set establishment_id = (select id from public.establishments where code = 'vh001')
where username = 'prof.stmarie';
\`\`\`

### Supprimer un Utilisateur

\`\`\`sql
-- Supprimer un utilisateur (supprime aussi le profil grâce à ON DELETE CASCADE)
delete from auth.users 
where email = 'utilisateur@test.local';
\`\`\`

---

## Structure de la Base de Données

### Tables Principales

#### 1. establishments
Stocke les établissements scolaires.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| name | text | Nom de l'établissement (ex: "ST-MARIE 14000") |
| code | text | Code unique (ex: "stm001") |
| created_at | timestamptz | Date de création |

#### 2. profiles
Profils utilisateurs liés à auth.users.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant (= auth.users.id) |
| establishment_id | uuid | Établissement de rattachement |
| role | user_role | Rôle (vie-scolaire, professeur, delegue, eco-delegue) |
| username | text | Identifiant de connexion (unique) |
| first_name | text | Prénom |
| last_name | text | Nom |
| email | text | Email |
| phone | text | Téléphone |
| can_create_subrooms | boolean | Peut créer des sous-salles |

#### 3. students
Élèves de l'établissement.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| profile_id | uuid | Lien vers le profil (si l'élève a un compte) |
| establishment_id | uuid | Établissement |
| first_name | text | Prénom |
| last_name | text | Nom |
| email | text | Email |
| phone | text | Téléphone |
| class_name | text | Classe (ex: "3ème A") |
| role | user_role | delegue ou eco-delegue |
| can_create_subrooms | boolean | Peut créer des sous-salles |

#### 4. teachers
Professeurs de l'établissement.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| profile_id | uuid | Lien vers le profil |
| establishment_id | uuid | Établissement |
| first_name | text | Prénom |
| last_name | text | Nom |
| email | text | Email |
| subject | text | Matière enseignée |
| classes | text[] | Liste des classes (ex: ["3ème A", "4ème B"]) |

#### 5. rooms
Salles de classe.

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| establishment_id | uuid | Établissement |
| name | text | Nom de la salle (ex: "B23") |
| class_name | text | Classe associée |
| teacher_id | uuid | Professeur responsable |
| layout | jsonb | Configuration des tables |
| share_token | text | Token pour partage public |
| modifiable_by_delegates | boolean | Les délégués peuvent modifier |

#### 6. subrooms
Sous-salles (versions personnalisées).

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| room_id | uuid | Salle parente |
| name | text | Nom de la sous-salle |
| type | text | "temporary" ou "indeterminate" |
| start_date | date | Date de début (temporary) |
| end_date | date | Date de fin (temporary) |
| created_by | uuid | Créateur |
| layout | jsonb | Configuration des tables |
| share_token | text | Token pour partage public |
| modifiable_by_delegates | boolean | Les délégués peuvent modifier |

---

## Identifiants de Test

### ST-MARIE 14000 (Code: stm001)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Vie Scolaire | vs.stmarie | VieScol2024! |
| Professeur | prof.stmarie | Prof2024! |
| Délégué | del.stmarie | Delegue2024! |

### VICTOR-HUGO 18760 (Code: vh001)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Vie Scolaire | vs.vhugo | VieScol2024! |
| Professeur | prof.vhugo | Prof2024! |
| Délégué | del.vhugo | Delegue2024! |

---

## Dépannage

### Problème : "Impossible de se connecter"

1. Vérifier que le code établissement existe dans la table `establishments`
2. Vérifier que l'utilisateur existe dans `auth.users` avec le bon email
3. Vérifier que le profil existe dans `profiles` avec le bon `username`
4. Vérifier que `establishment_id` dans `profiles` correspond au code saisi

### Problème : "Erreur RLS"

Les politiques RLS (Row Level Security) limitent l'accès aux données. Si un utilisateur ne peut pas voir/modifier des données :

1. Vérifier son rôle dans `profiles`
2. Vérifier que son `establishment_id` correspond aux données qu'il essaie d'accéder
3. Pour vie-scolaire : doit avoir `role = 'vie-scolaire'`
4. Pour professeurs : peuvent voir leur établissement
5. Pour délégués : accès limité selon les permissions

### Réinitialiser la Base de Données

\`\`\`sql
-- ATTENTION : Supprime TOUTES les données
drop schema public cascade;
create schema public;
-- Puis réexécuter tous les scripts dans l'ordre
\`\`\`

---

## Support

Pour toute question ou problème, consultez la documentation Supabase :
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor](https://supabase.com/docs/guides/database/overview)
