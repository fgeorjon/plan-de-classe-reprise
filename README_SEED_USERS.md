# Script de Création des Utilisateurs de Test

## 🎯 Objectif

Ce script SQL crée automatiquement les utilisateurs de test pour deux établissements :
- **ST-MARIE 14000** (code: stm001)
- **VICTOR-HUGO 18760** (code: vh001)

## 📋 Utilisateurs créés

### ST-MARIE 14000 (stm001)

| Rôle | Identifiant | Mot de passe | Email |
|------|-------------|--------------|-------|
| Vie Scolaire | `vs.stmarie` | `VieScol2024!` | vs.stmarie@test.local |
| Professeur | `prof.stmarie` | `Prof2024!` | prof.stmarie@test.local |
| Délégué | `del.stmarie` | `Delegue2024!` | del.stmarie@test.local |

### VICTOR-HUGO 18760 (vh001)

| Rôle | Identifiant | Mot de passe | Email |
|------|-------------|--------------|-------|
| Vie Scolaire | `vs.vhugo` | `VieScol2024!` | vs.vhugo@test.local |
| Professeur | `prof.vhugo` | `Prof2024!` | prof.vhugo@test.local |
| Délégué | `del.vhugo` | `Delegue2024!` | del.vhugo@test.local |

## 🚀 Exécution

### Option 1 : Via l'interface Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard/project/bdvdrzohbieqeisxwmwh
2. Cliquez sur **SQL Editor**
3. Créez une nouvelle requête
4. Copiez-collez le contenu de `scripts/seed-test-users.sql`
5. Cliquez sur **Run**

### Option 2 : Via la ligne de commande

Si vous avez le CLI Supabase installé :

\`\`\`bash
supabase db execute --file scripts/seed-test-users.sql --project-ref bdvdrzohbieqeisxwmwh
\`\`\`

## 📊 Ce que fait le script

1. **Crée les établissements** (s'ils n'existent pas)
   - ST-MARIE 14000 avec code stm001
   - VICTOR-HUGO 18760 avec code vh001

2. **Crée les profils utilisateurs** avec :
   - Username
   - Mot de passe hashé (SHA256)
   - Email
   - Rôle (vie-scolaire, teacher, delegate)
   - Établissement associé

3. **Affiche une vérification** des utilisateurs créés avec leur statut

## ⚠️ Important

- Les mots de passe sont hashés en SHA256
- Les emails sont au format `@test.local` (pour les tests uniquement)
- Le script utilise `ON CONFLICT` pour éviter les doublons
- Peut être exécuté plusieurs fois sans danger

## 🔐 Connexion

Après l'exécution, vous pouvez vous connecter avec :
- **Identifiant** : `vs.stmarie`, `prof.stmarie`, `del.stmarie`, etc.
- **Mot de passe** : `VieScol2024!`, `Prof2024!`, ou `Delegue2024!`

## 🐛 En cas d'erreur

Si le script échoue :
1. Vérifiez que les tables existent (`establishments`, `profiles`)
2. Vérifiez que vous êtes connecté à Supabase
3. Vérifiez que PostgreSQL supporte la fonction `sha256()` (ou utilisez `md5()` en alternative)
4. Consultez les logs d'erreur dans le SQL Editor de Supabase
