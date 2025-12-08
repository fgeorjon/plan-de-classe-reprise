# Instructions de connexion

## Étape 1 : Créer les fonctions de vérification de mot de passe

Exécutez le script SQL suivant dans Supabase :
\`\`\`bash
scripts/007_create_password_functions.sql
\`\`\`

Ce script crée les fonctions `hash_password()` et `verify_password()` nécessaires pour l'authentification.

## Étape 2 : Tester la connexion

Utilisez l'une des combinaisons suivantes :

### ST-MARIE 14000 (Code: stm001)

1. **Vie Scolaire**
   - Identifiant : `vs.stmarie`
   - Mot de passe : `VieScol2024!`

2. **Professeur**
   - Identifiant : `prof.stmarie`
   - Mot de passe : `Prof2024!`

3. **Délégué**
   - Identifiant : `del.stmarie`
   - Mot de passe : `Delegue2024!`

### VICTOR-HUGO 18760 (Code: vh001)

1. **Vie Scolaire**
   - Identifiant : `vs.vhugo`
   - Mot de passe : `VieScol2024!`

2. **Professeur**
   - Identifiant : `prof.vhugo`
   - Mot de passe : `Prof2024!`

3. **Délégué**
   - Identifiant : `del.vhugo`
   - Mot de passe : `Delegue2024!`

## Vérification

Pour vérifier que tout fonctionne, exécutez cette requête SQL :

\`\`\`sql
-- Vérifier un login
SELECT verify_password('VieScol2024!', password_hash) as is_valid
FROM profiles
WHERE username = 'vs.stmarie';
\`\`\`

Le résultat devrait être `true`.

## Dépannage

Si la connexion ne fonctionne toujours pas :

1. Vérifiez que les fonctions existent :
\`\`\`sql
SELECT proname FROM pg_proc WHERE proname IN ('hash_password', 'verify_password');
\`\`\`

2. Vérifiez que les utilisateurs existent :
\`\`\`sql
SELECT username, role, establishment_id FROM profiles;
\`\`\`

3. Vérifiez les logs dans la console du navigateur (F12) pour voir les erreurs détaillées.
