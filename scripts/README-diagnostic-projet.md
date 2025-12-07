# Script de Diagnostic - Plan de Classe

## Description

Script PowerShell d'audit complet pour le projet Plan de Classe. Analyse automatiquement l'état du projet et génère des rapports détaillés.

## Prérequis

- Windows PowerShell 5.1+ ou PowerShell Core 7+
- Exécuter depuis la racine du projet

## Installation

1. Copier `diagnostic-projet.ps1` à la racine du projet
2. Ouvrir PowerShell dans le répertoire du projet

## Utilisation

```powershell
# Si nécessaire, autoriser l'exécution temporairement
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Lancer le diagnostic
.\diagnostic-projet.ps1
```

## Fichiers générés

Le script crée un dossier `diagnostic-YYYY-MM-DD-HHmm` contenant :

| Fichier | Description |
|---------|-------------|
| `00-RESUME.txt` | Synthèse avec statistiques |
| `01-fichiers-redondants.txt` | Fichiers backup, doublons (client-layout, *_orig, etc.) |
| `02-console-logs.txt` | Liste tous les console.log/error avec lignes |
| `03-fichiers-config.txt` | État des fichiers de configuration |
| `04-variables-env.txt` | Clés des variables d'environnement (sans valeurs) |
| `05-structure-projet.txt` | Arborescence du projet |
| `06-imports.txt` | Composants potentiellement non utilisés |
| `07-todo-fixme.txt` | TODO/FIXME/HACK à traiter |

## Analyses effectuées

### 1. Fichiers redondants
- Recherche `client-layout*` et `client-wrapper*`
- Fichiers de backup : `*_orig*`, `*_backup*`, `*_old*`, `*.bak`, `*_corr*`

### 2. Console.log/error
- Scan de tous les fichiers `.ts` et `.tsx`
- Exclusion de `node_modules` et `.next`
- Affiche le fichier, ligne et contenu

### 3. Fichiers de configuration
- Vérifie la présence des fichiers attendus
- Détecte les doublons (ex: plusieurs `next.config.*`)
- Liste : next.config.*, tailwind.config.*, postcss.config.*, tsconfig.json, etc.

### 4. Variables d'environnement
- Lit `.env.local` (clés uniquement, pas les valeurs)
- Vérifie les variables Supabase requises
- Indique si une variable est vide

### 5. Structure du projet
- Arborescence sur 3 niveaux
- Exclut node_modules, .next, .git

### 6. Imports
- Détecte les composants avec une seule référence (potentiellement non utilisés)
- Liste les imports de `@/lib/`

### 7. TODO/FIXME
- Recherche les marqueurs : `TODO`, `FIXME`, `XXX`, `HACK`
- Affiche fichier, ligne et contenu

## Exemple de sortie

```
=== DIAGNOSTIC PROJET ===
Dossier de sortie: .\diagnostic-2025-12-06-2230

[1/8] Recherche fichiers redondants...
[2/8] Recherche console.log/error...
[3/8] Verification fichiers de config...
[4/8] Verification variables d environnement...
[5/8] Analyse structure du projet...
[6/8] Analyse des imports...
[7/8] Recherche TODO/FIXME/HACK...
[8/8] Generation du resume...

=== DIAGNOSTIC TERMINE ===
Resultats dans: .\diagnostic-2025-12-06-2230

Fichiers generes:
  - 00-RESUME.txt
  - 01-fichiers-redondants.txt
  - 02-console-logs.txt
  - 03-fichiers-config.txt
  - 04-variables-env.txt
  - 05-structure-projet.txt
  - 06-imports.txt
  - 07-todo-fixme.txt

Ouvrir le resume: notepad .\diagnostic-2025-12-06-2230\00-RESUME.txt
```

## Notes

- Le script n'écrit que des fichiers en lecture (aucune modification du projet)
- Les accents sont évités pour compatibilité PowerShell
- Compatible Windows PowerShell 5.1 et PowerShell Core 7+

## Après le diagnostic

1. Consulter `00-RESUME.txt` pour une vue d'ensemble
2. Examiner `02-console-logs.txt` pour identifier le code de debug à supprimer
3. Vérifier `01-fichiers-redondants.txt` pour les fichiers à nettoyer
4. Mettre à jour `FICHIERS_A_NETTOYER.md` avec les actions à effectuer

---

*Script créé le 06/12/2025 pour le projet Plan de Classe*
