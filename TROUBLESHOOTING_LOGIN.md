# Guide de Dépannage - Connexion

## Problème: Impossible de se connecter

### Étape 1: Vérifier les profiles
Exécutez le script `scripts/004_verify_and_fix_profiles.sql` dans Supabase pour:
1. Voir quels profiles existent
2. Créer les profiles manquants
3. Vérifier que les mots de passe sont hashés

### Étape 2: Tester la connexion
Essayez de vous connecter avec:

**ST-MARIE:**
- Vie Scolaire: `vs.stmarie` / `VieScol2024!`
- Professeur: `prof.stmarie` / `Prof2024!`
- Délégué: `del.stmarie` / `Delegue2024!`

**VICTOR-HUGO:**
- Vie Scolaire: `vs.vhugo` / `VieScol2024!`
- Professeur: `prof.vhugo` / `Prof2024!`
- Délégué: `del.vhugo` / `Delegue2024!`

### Étape 3: Vérifier les erreurs dans la console
Ouvrez la console du navigateur (F12) et regardez les erreurs lors de la tentative de connexion.

### Problème potentiel: Table profiles n'a pas la bonne structure

Si le script échoue avec des erreurs de colonnes manquantes, vérifiez que la table `profiles` a:
- `id` (UUID, primary key)
- `email` (TEXT, unique)
- `role` (TEXT)
- `password_hash` (TEXT)
- `created_at` (TIMESTAMP)

Sinon, exécutez d'abord le script `scripts/002_create_auth_system.sql` pour créer la structure correcte.
