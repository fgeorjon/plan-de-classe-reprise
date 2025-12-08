# Guide complet : Structure des utilisateurs

## 📊 Structure des tables

### 1. Table `establishments` (Établissements)
Contient les établissements scolaires.

**Colonnes importantes :**
- `id` : UUID unique de l'établissement
- `name` : Nom de l'établissement (ex: "ST-MARIE 14000")
- `code` : Code de l'établissement (ex: "stm001", "vh001")

**Données actuelles :**
\`\`\`sql
-- ST-MARIE
id: [uuid généré]
name: 'ST-MARIE 14000'
code: 'stm001'

-- VICTOR-HUGO
id: [uuid généré]
name: 'VICTOR-HUGO 18760'
code: 'vh001'
\`\`\`

---

### 2. Table `profiles` (Profils utilisateurs - TABLE PRINCIPALE)
**C'EST LA TABLE PRINCIPALE POUR TOUS LES UTILISATEURS**

**Colonnes importantes :**
- `id` : UUID unique du profil (clé primaire)
- `establishment_id` : UUID de l'établissement (référence `establishments.id`)
- `role` : Rôle de l'utilisateur ('vie-scolaire', 'professeur', 'delegue')
- `username` : **IDENTIFIANT DE CONNEXION** (unique, ex: "jean.dupont")
- `password_hash` : **MOT DE PASSE HACHÉ** (bcrypt)
- `first_name` : Prénom
- `last_name` : Nom de famille
- `email` : Email (optionnel)
- `phone` : Téléphone (optionnel)
- `can_create_subrooms` : Peut créer des sous-salles (boolean)

**Exemple de création d'un utilisateur vie-scolaire :**
\`\`\`sql
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
  '[uuid de ST-MARIE]',
  'vie-scolaire',
  'marie.martin',
  '[hash bcrypt du mot de passe]',
  'Marie',
  'Martin',
  'marie.martin@stmarie.fr',
  true
);
\`\`\`

---

### 3. Table `students` (Élèves)
Contient les informations spécifiques aux élèves.

**Colonnes importantes :**
- `id` : UUID unique de l'élève
- `profile_id` : **UUID du profil** (référence `profiles.id`)
- `establishment_id` : UUID de l'établissement
- `class_id` : UUID de la classe (référence `classes.id`)
- `first_name` : Prénom (dupliqué depuis profiles)
- `last_name` : Nom (dupliqué depuis profiles)
- `email` : Email (dupliqué depuis profiles)
- `phone` : Téléphone (dupliqué depuis profiles)
- `role` : Rôle spécifique ('delegue' ou 'eco-delegue')
- `username` : Identifiant (dupliqué depuis profiles)
- `password_hash` : Mot de passe haché (dupliqué depuis profiles)

**Processus de création d'un élève :**
1. Créer d'abord un profil dans `profiles`
2. Puis créer l'élève dans `students` avec le `profile_id`

---

### 4. Table `teachers` (Professeurs)
Contient les informations spécifiques aux professeurs.

**Colonnes importantes :**
- `id` : UUID unique du professeur
- `profile_id` : **UUID du profil** (référence `profiles.id`)
- `establishment_id` : UUID de l'établissement
- `first_name` : Prénom
- `last_name` : Nom
- `email` : Email
- `subject` : Matière enseignée
- `username` : Identifiant (dupliqué depuis profiles)
- `password_hash` : Mot de passe haché (dupliqué depuis profiles)

---

### 5. Table `classes` (Classes)
Contient les classes de l'établissement.

**Colonnes importantes :**
- `id` : UUID unique de la classe
- `name` : Nom de la classe (ex: "6ème A", "3ème B")
- `level` : Niveau (ex: "6ème", "5ème")
- `establishment_id` : UUID de l'établissement
- `created_by` : UUID du profil qui a créé la classe

---

## 🔐 Où mettre les informations de connexion ?

### Pour TOUS les utilisateurs (élèves, profs, vie-scolaire) :

#### 1. **Identifiant (username)**
- **Table principale** : `profiles.username`
- **Tables secondaires** : `students.username` ou `teachers.username` (optionnel, pour faciliter les requêtes)

#### 2. **Mot de passe (password_hash)**
- **Table principale** : `profiles.password_hash`
- **Tables secondaires** : `students.password_hash` ou `teachers.password_hash` (optionnel)

#### 3. **Code établissement**
- **NE PAS stocker directement** : Le code établissement ("stm001", "vh001") est dans `establishments.code`
- **Lien utilisateur → établissement** : Via `profiles.establishment_id` qui référence `establishments.id`

---

## 📝 Processus complet de création d'utilisateur

### Exemple : Créer un élève "Jean Dupont" à ST-MARIE

#### Étape 1 : Récupérer l'ID de l'établissement
\`\`\`sql
SELECT id FROM establishments WHERE code = 'stm001';
-- Résultat : [uuid-establishment]
\`\`\`

#### Étape 2 : Récupérer l'ID de la classe
\`\`\`sql
SELECT id FROM classes WHERE name = '6ème A' AND establishment_id = '[uuid-establishment]';
-- Résultat : [uuid-class]
\`\`\`

#### Étape 3 : Créer le profil
\`\`\`sql
INSERT INTO profiles (
  establishment_id,
  role,
  username,
  password_hash,
  first_name,
  last_name,
  email,
  phone,
  can_create_subrooms
) VALUES (
  '[uuid-establishment]',
  'delegue',
  'jean.dupont',
  '$2a$10$...[hash bcrypt]',
  'Jean',
  'Dupont',
  'jean.dupont@email.com',
  '0612345678',
  false
) RETURNING id;
-- Résultat : [uuid-profile]
\`\`\`

#### Étape 4 : Créer l'élève
\`\`\`sql
INSERT INTO students (
  profile_id,
  establishment_id,
  class_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  username,
  password_hash
) VALUES (
  '[uuid-profile]',
  '[uuid-establishment]',
  '[uuid-class]',
  'Jean',
  'Dupont',
  'jean.dupont@email.com',
  '0612345678',
  'delegue',
  'jean.dupont',
  '$2a$10$...[hash bcrypt]'
);
\`\`\`

---

## ✅ Résumé : Où mettre quoi ?

| Information | Table principale | Valeur |
|-------------|------------------|--------|
| **Identifiant** | `profiles.username` | Ex: "jean.dupont" |
| **Mot de passe** | `profiles.password_hash` | Hash bcrypt |
| **Code établissement** | `establishments.code` | Ex: "stm001" |
| **Lien établissement** | `profiles.establishment_id` | UUID de l'établissement |
| **Rôle** | `profiles.role` | 'vie-scolaire', 'professeur', 'delegue' |
| **Prénom** | `profiles.first_name` | Ex: "Jean" |
| **Nom** | `profiles.last_name` | Ex: "Dupont" |

---

## 🎯 Important

1. **La table `profiles` est la table PRINCIPALE** pour l'authentification
2. Les tables `students` et `teachers` sont des **extensions** avec des infos spécifiques
3. Le **code établissement** n'est PAS stocké avec l'utilisateur, mais via la relation `profiles.establishment_id → establishments.id`
4. L'application utilise `lib/user-management.ts` qui gère automatiquement la création dans les deux tables

---

## 🔧 Utilisation dans le code

Le module `lib/user-management.ts` gère automatiquement :
- Génération d'identifiant unique
- Génération de mot de passe sécurisé
- Hachage bcrypt
- Création dans `profiles` ET `students`/`teachers`
- Enregistrement de l'action dans `action_logs`

**Vous n'avez PAS besoin de créer manuellement les utilisateurs en SQL !**
Utilisez l'interface de gestion des élèves/professeurs qui appelle `createUser()`.
