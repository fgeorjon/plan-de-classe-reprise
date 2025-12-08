# Guide de création d'utilisateurs

## 🎯 Vue d'ensemble

Le système est maintenant **complètement indépendant de `auth.users`**. Tous les utilisateurs sont stockés dans la table `profiles` avec leurs identifiants.

## 📊 Structure des tables

### Table `profiles` (table principale)
\`\`\`sql
- id (uuid, auto-généré)
- establishment_id (uuid, référence establishments)
- role ('vie-scolaire' | 'professeur' | 'delegue')
- username (text, unique)
- password_hash (text)
- first_name (text)
- last_name (text)
- email (text, optionnel)
- phone (text, optionnel)
- can_create_subrooms (boolean)
- created_at (timestamp)
- updated_at (timestamp)
\`\`\`

### Table `students` (élèves)
\`\`\`sql
- id (uuid, auto-généré)
- profile_id (uuid, référence profiles)
- establishment_id (uuid)
- first_name (text)
- last_name (text)
- email (text, optionnel)
- phone (text, optionnel)
- class_id (uuid, référence classes)
- role ('delegue' | 'eco-delegue')
- can_create_subrooms (boolean)
- created_at (timestamp)
- updated_at (timestamp)
\`\`\`

### Table `teachers` (professeurs)
\`\`\`sql
- id (uuid, auto-généré)
- profile_id (uuid, référence profiles)
- establishment_id (uuid)
- first_name (text)
- last_name (text)
- email (text, optionnel)
- subject (text)
- created_at (timestamp)
\`\`\`

### Table `teacher_classes` (classes enseignées)
\`\`\`sql
- id (uuid, auto-généré)
- teacher_id (uuid, référence teachers)
- class_id (uuid, référence classes)
- created_at (timestamp)
\`\`\`

## 🔧 Comment créer un utilisateur

### Étape 1: Exécuter le script SQL

Exécutez d'abord le script `013_remove_auth_dependency.sql` dans Supabase SQL Editor pour:
- Supprimer la dépendance à `auth.users`
- Créer la fonction `hash_password()`
- Mettre à jour les politiques RLS

### Étape 2: Créer un élève via l'interface

1. Allez dans **Dashboard → Élèves**
2. Cliquez sur **"Ajouter un élève"**
3. Remplissez:
   - Prénom (requis)
   - Nom (requis)
   - Email (optionnel)
   - Téléphone (optionnel)
   - Classe (requis - sélection dropdown)
   - Rôle (Délégué ou Éco-délégué)
   - Permission sous-salles (toggle)
4. Cliquez sur **"Ajouter"**

**Ce qui se passe automatiquement:**
- Un enregistrement est créé dans `profiles` avec:
  - `username` généré: `prenom.nom123` (avec nombre aléatoire)
  - `password` généré: 8 caractères aléatoires
  - `password_hash`: hash SHA256 du mot de passe
  - `role`: 'delegue'
- Un enregistrement est créé dans `students` lié au profile
- Les identifiants sont affichés dans un toast (notez-les!)

### Étape 3: Créer un professeur via l'interface

1. Allez dans **Dashboard → Professeurs**
2. Cliquez sur **"Ajouter un professeur"**
3. Remplissez:
   - Prénom (requis)
   - Nom (requis)
   - Email (optionnel)
   - Matière (ex: Mathématiques)
   - Classes enseignées (sélection multiple dropdown)
4. Cliquez sur **"Ajouter"**

**Ce qui se passe automatiquement:**
- Un enregistrement est créé dans `profiles`
- Un enregistrement est créé dans `teachers`
- Des enregistrements sont créés dans `teacher_classes` pour chaque classe

### Étape 4: Créer un utilisateur vie-scolaire manuellement

Pour créer un compte vie-scolaire, utilisez SQL directement:

\`\`\`sql
-- 1. Créer le profile
INSERT INTO profiles (
  establishment_id,
  role,
  username,
  password_hash,
  first_name,
  last_name,
  email,
  can_create_subrooms
) VALUES (
  'ID_ETABLISSEMENT',
  'vie-scolaire',
  'vs.nom',
  hash_password('motdepasse123'),
  'Prénom',
  'Nom',
  'email@example.com',
  true
);
\`\`\`

## 🔑 Connexion des utilisateurs

### Pour les élèves et professeurs:
1. Allez sur la page de connexion
2. Entrez le **code établissement** (ex: stm001)
3. Sélectionnez le **rôle** (Délégué ou Professeur)
4. Entrez l'**identifiant** (ex: jean.dupont123)
5. Entrez le **mot de passe**

### Pour les admins:
1. Cliquez sur **"Connexion Admin"**
2. Entrez le code admin:
   - `cpdc001` → Délégué ST-MARIE
   - `cpdc002` → Professeur ST-MARIE
   - `cpdc003` → Vie Scolaire ST-MARIE

## 📝 Gestion des identifiants

### Voir/Modifier les identifiants d'un élève:
1. Dans la liste des élèves, cliquez sur **"..."**
2. Sélectionnez **"Configurer l'accès"**
3. Vous pouvez:
   - Voir l'identifiant actuel
   - Modifier l'identifiant
   - Générer un nouveau mot de passe
   - Envoyer par email (à implémenter)
   - Imprimer en PDF

### Réinitialiser un mot de passe:
\`\`\`sql
UPDATE profiles
SET password_hash = hash_password('nouveau_mot_de_passe')
WHERE username = 'identifiant_utilisateur';
\`\`\`

## 🔍 Vérifier les données

### Voir tous les profiles:
\`\`\`sql
SELECT id, username, role, first_name, last_name, establishment_id
FROM profiles
ORDER BY created_at DESC;
\`\`\`

### Voir tous les élèves avec leurs profiles:
\`\`\`sql
SELECT 
  s.*,
  p.username,
  p.role as profile_role,
  c.name as class_name
FROM students s
JOIN profiles p ON s.profile_id = p.id
LEFT JOIN classes c ON s.class_id = c.id
ORDER BY s.last_name;
\`\`\`

### Voir tous les professeurs avec leurs classes:
\`\`\`sql
SELECT 
  t.*,
  p.username,
  array_agg(c.name) as classes
FROM teachers t
JOIN profiles p ON t.profile_id = p.id
LEFT JOIN teacher_classes tc ON t.id = tc.teacher_id
LEFT JOIN classes c ON tc.class_id = c.id
GROUP BY t.id, p.username
ORDER BY t.last_name;
\`\`\`

## ⚠️ Important

1. **Notez les identifiants** lors de la création - ils ne seront plus affichés
2. **Les mots de passe sont hashés** - impossible de les récupérer, seulement les réinitialiser
3. **Les usernames sont uniques** - pas de doublons possibles
4. **Pas besoin de Supabase Auth** - tout fonctionne avec la base de données uniquement
