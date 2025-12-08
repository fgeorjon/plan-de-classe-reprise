# Status Prompt 1 - Corrections Upgrade & Mots de Passe

## ✅ Problème 1 : Upgrade élève en délégué crée des doublons

**Solution implémentée** dans `lib/user-management.ts` et `components/students-management.tsx` :
- La fonction `createUser` vérifie maintenant si un `profile_id` existe déjà avant de créer un nouvel enregistrement
- Lors de l'upgrade, on met à jour l'enregistrement student existant avec le nouveau `profile_id` au lieu d'en créer un nouveau
- Log ajouté : `[v0] Profile created for delegate, student record should already exist`

## ✅ Problème 2 : Modification d'accès ne fonctionne pas

**Solution implémentée** dans `components/students-management.tsx` et `components/teachers-management.tsx` :
- Vérification que `profile_id` existe avant toute modification
- Utilisation correcte de la fonction `hash_password` de Supabase
- Appel de `fetchData()` après mise à jour pour rafraîchir les données
- Gestion distincte du cas où seul le username change (sans mot de passe)

## ✅ Problème 3 : Format d'identifiant incohérent

**Solution implémentée** dans `lib/user-management.ts` :
- Nouvelle fonction `generateUsernameWithClass()` qui génère le format "NOM.prenom.CLASSE"
- Normalisation automatique :
  - NOM en majuscules
  - prenom en minuscules
  - Suppression des accents
  - Format classe : `6A` au lieu de `6èmeA` (suppression de "ème", "eme", "ère", "ere")
- Exemples générés : `DUPONT.jean.5B`, `MARTIN.sophie.6A`

## 🔧 Action requise : Migration SQL

**Vous devez exécuter le script `scripts/001_create_auth_tables.sql`** pour créer les tables nécessaires :

### Tables à créer :
- `profiles` - Profils utilisateurs avec authentification (username, password_hash, role)
- `teachers` - Extension de profiles pour les professeurs
- `teacher_classes` - Liaison professeurs-classes
- `action_logs` - Logs des actions utilisateurs

### Colonnes à ajouter :
- `students.profile_id` - Lien vers le profil si délégué/éco-délégué
- `students.student_role` - Rôle spécial (delegue ou eco-delegue)

### Fonctions SQL :
- `hash_password()` - Hash SHA-256 des mots de passe
- `update_updated_at_column()` - Mise à jour automatique de updated_at

## 📝 Pour exécuter la migration :

1. Allez dans le chat v0
2. Le script `001_create_auth_tables.sql` peut être exécuté directement
3. Ou copiez le contenu du script et exécutez-le dans le SQL Editor de Supabase

## ⚠️ Vérification post-migration :

Après l'exécution du script, vérifiez que :
- [ ] La table `profiles` existe avec les bonnes colonnes
- [ ] La table `teachers` existe
- [ ] La table `teacher_classes` existe
- [ ] La table `action_logs` existe
- [ ] La colonne `students.profile_id` existe
- [ ] La colonne `students.student_role` existe
- [ ] La fonction `hash_password()` existe

## 🧪 Tests à effectuer :

1. **Test upgrade délégué** :
   - Créer un élève
   - L'upgrader en délégué
   - Vérifier qu'il n'apparaît qu'une seule fois dans l'interface

2. **Test modification identifiants** :
   - Modifier les identifiants d'un délégué/prof
   - Vérifier que la modification est bien enregistrée
   - Tester la connexion avec les nouveaux identifiants

3. **Test format identifiants** :
   - Créer un nouvel utilisateur
   - Vérifier que le format suggéré est "NOM.prenom.CLASSE"
   - Vérifier que "6èmeA" devient "6A"

## ✅ Conclusion :

Le code est prêt et corrigé. **Il manque uniquement l'exécution du script SQL de migration** pour que tout fonctionne correctement.
