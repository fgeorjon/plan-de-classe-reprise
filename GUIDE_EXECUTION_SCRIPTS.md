# 📘 Guide d'Exécution des Scripts SQL

## ✅ État Actuel de Votre Base de Données

Après vos exécutions, voici ce qui devrait être en place :

| Script | Statut | Action |
|--------|--------|--------|
| **005** | ✅ Exécuté avec succès | ✋ Ne PAS réexécuter |
| **006** | 📝 Vidé (commentaires seulement) | ⏭️ Ignorer ce script |
| **007** | ✅ Exécuté avec succès | ✋ Ne PAS réexécuter |
| **008** | 🆕 Nouveau - Vérification | ▶️ Exécuter pour vérifier |
| **009** | ⚠️ Nettoyage d'urgence | ⛔ Utiliser UNIQUEMENT en cas de problème |

---

## 🎯 Que Faire Maintenant ?

### Option 1 : Tout Fonctionne ✅ (Recommandé)

Si vous avez exécuté 005 et 007 avec succès la première fois :

1. **Ne rien faire de plus** - Votre base est correctement configurée
2. Vous pouvez exécuter le script **008** pour **vérifier** que tout est en place
3. Testez l'application directement

### Option 2 : Vérification 🔍

Exécutez le script **008** pour voir l'état actuel :

\`\`\`bash
# Dans Supabase SQL Editor
Exécuter scripts/008_verify_invitations_setup.sql
\`\`\`

Vous devriez voir :
- ✅ 8 colonnes dans `room_invitations`
- ✅ 3 politiques RLS actives
- ✅ `rowsecurity = true`

### Option 3 : Problème Persistant 🔧

Si vous avez des erreurs de structure ou des incohérences :

1. **Sauvegardez vos données importantes**
2. Exécutez le script **009** (nettoyage complet)
3. ⚠️ Attention : Supprime toutes les invitations existantes

---

## ❌ Erreurs Normales vs Anormales

### ✅ Erreurs NORMALES (Ignorer)

\`\`\`
ERREUR : 42710 : la stratégie "..." existe déjà
ERREUR : 42P07 : la table "room_invitations" existe déjà
\`\`\`
👉 **Signification :** Le script a déjà été exécuté avec succès
👉 **Action :** Aucune - tout va bien !

### ❌ Erreurs ANORMALES (Corriger)

\`\`\`
ERREUR : 42703 : la colonne "user_id" n'existe pas
ERREUR : 42P01 : la table "room_invitations" n'existe pas
\`\`\`
👉 **Signification :** Problème de structure ou ancienne version du script
👉 **Action :** 
1. Recharger le fichier `006_add_room_invitations_rls.sql` (devrait être vide)
2. Si le problème persiste, exécuter le script **009** (nettoyage)

---

## 🔄 Ordre d'Exécution des Scripts

Si vous devez tout réinitialiser (cas extrême) :

1. `009_cleanup_if_needed.sql` ← Nettoie tout
2. `005_add_room_invitations.sql` ← Recrée la structure
3. `007_fix_notifications_table.sql` ← Corrige notifications
4. `008_verify_invitations_setup.sql` ← Vérifie le résultat

**⚠️ Ne jamais exécuter 006** - ce script est obsolète et vide

---

## 🧪 Test Rapide

Après l'exécution des scripts, testez dans l'application :

1. **Créer une sous-salle multi-profs** en invitant un autre professeur
2. **Vérifier les notifications** (devrait voir une invitation)
3. **Accepter/Refuser l'invitation** depuis les notifications
4. **Vérifier les toasts** (ne doivent pas apparaître en double)

---

## 📞 Besoin d'Aide ?

Si après avoir exécuté le script **008**, vous voyez des résultats anormaux, partagez-moi la sortie et je vous aiderai à diagnostiquer le problème.
