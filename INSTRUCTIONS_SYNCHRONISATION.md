# Instructions de Synchronisation

## Problème Résolu

Les professeurs et délégués ne voyaient pas leurs élèves/camarades/collègues car la table `teacher_classes` était vide.

## Solution

### 1. Générateur de Mot de Passe

✅ **Élèves** : Le bouton avec l'icône clé génère déjà un mot de passe fort aléatoire  
✅ **Professeurs** : Ajout du même bouton pour générer un mot de passe fort

### 2. Script de Synchronisation

Exécutez le script `scripts/016_sync_teacher_classes.sql` dans Supabase pour :

- Créer automatiquement les relations entre professeurs et classes
- Associer chaque professeur aux classes de son établissement
- Éviter les doublons

### 3. Comment ça Fonctionne

Après avoir exécuté le script :

**Pour les Professeurs** :
- Voient tous leurs élèves des classes assignées
- Voient leurs collègues du même établissement

**Pour les Délégués** :
- Voient leurs camarades de la même classe
- Voient leurs professeurs

**Pour la Vie Scolaire** :
- Voient tous les élèves de l'établissement
- Voient tous les professeurs de l'établissement

### 4. Prochaines Étapes

1. Exécutez `016_sync_teacher_classes.sql` dans Supabase
2. Testez la connexion avec un compte professeur
3. Vérifiez que les élèves apparaissent dans l'onglet Élèves
4. Testez avec un compte délégué pour voir les camarades

### 5. Note Importante

La synchronisation se fait automatiquement à chaque fois qu'un professeur ou une classe est créé(e). Le script `016_sync_teacher_classes.sql` est juste pour remplir les données existantes.
