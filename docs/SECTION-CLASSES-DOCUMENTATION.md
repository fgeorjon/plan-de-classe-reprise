# 📚 DOCUMENTATION EXHAUSTIVE - SECTION CLASSES

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Rôles et permissions](#rôles-et-permissions)
3. [Structure base de données](#structure-base-de-données)
4. [Composants principaux](#composants-principaux)
5. [Gestion des niveaux](#gestion-des-niveaux)
6. [Fonctionnalités complètes](#fonctionnalités-complètes)
7. [Connexions avec autres sections](#connexions-avec-autres-sections)
8. [Paramètres sauvegardés](#paramètres-sauvegardés)

---

## Vue d'ensemble

**Fichier principal**: `components/classes-management.tsx` (431 lignes)

**Objectif**: Gérer les classes de l'établissement avec un système de niveaux hiérarchique (6ème, 5ème, etc.).

**Accès**: Vie scolaire uniquement

**Technologies**:
- React hooks (useState, useEffect)
- Supabase pour CRUD
- shadcn/ui pour l'interface
- Dialog system pour modales

---

## Rôles et permissions

### Vie Scolaire (vie-scolaire)
**Accès complet**:
- ✅ Créer des classes
- ✅ Modifier le nom et le niveau des classes
- ✅ Supprimer des classes
- ✅ Gérer les niveaux (via dialog dédié)
- ✅ Voir toutes les classes de l'établissement

**Workflow typique**:
1. Créer des niveaux (6ème, 5ème, 4ème, 3ème, etc.)
2. Créer des classes et les assigner à un niveau
3. Ajouter des élèves aux classes (via section Élèves)
4. Assigner des professeurs aux classes (via section Professeurs)

### Autres rôles
- ❌ **Professeur**: Pas d'accès à la gestion des classes (lecture seule via autres sections)
- ❌ **Délégué/Éco-délégué**: Aucun accès

---

## Structure base de données

### Table: classes
\`\`\`sql
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id),
  name text NOT NULL,                      -- Ex: "6A", "5B"
  description text,
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  level character varying,                 -- Ex: "6ème", "5ème"
  level_id uuid REFERENCES levels(id),     -- FK vers table levels
  is_level boolean DEFAULT false,          -- Indique si c'est un niveau parent
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  version integer DEFAULT 1,
  is_deleted boolean DEFAULT false
);
\`\`\`

**Champs clés**:
- `name`: Nom de la classe (ex: "6A", "5B", "3C")
- `level`: Niveau en texte libre (ex: "6ème")
- `level_id`: Référence vers la table `levels` (optionnel)
- `establishment_id`: Lien vers l'établissement
- `is_deleted`: Soft delete (classe archivée mais pas supprimée physiquement)

### Table: levels
\`\`\`sql
CREATE TABLE public.levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  name text NOT NULL,                      -- Ex: "6ème", "5ème", "Seconde"
  display_order integer DEFAULT 0,         -- Ordre d'affichage
  is_custom boolean DEFAULT false,         -- Niveau personnalisé vs prédéfini
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
\`\`\`

**Champs clés**:
- `name`: Nom du niveau
- `display_order`: Ordre d'affichage (6ème=1, 5ème=2, etc.)
- `is_custom`: Distingue niveaux standards vs personnalisés

### Relations

\`\`\`mermaid
graph LR
    A[establishments] --> B[levels]
    A --> C[classes]
    B -.optionnel.-> C
    C --> D[students]
    C --> E[teacher_classes]
    C --> F[sub_rooms]
\`\`\`

**Relations importantes**:
- Une classe appartient à UN établissement
- Une classe peut être liée à UN niveau (optionnel)
- Une classe peut avoir PLUSIEURS élèves
- Une classe peut avoir PLUSIEURS professeurs (via `teacher_classes`)
- Une classe peut avoir PLUSIEURS sous-salles (plans de classe)

---

## Composants principaux

### ClassesManagement

**Props**:
\`\`\`typescript
interface ClassesManagementProps {
  establishmentId: string    // ID de l'établissement
  onBack?: () => void        // Callback retour au dashboard
}
\`\`\`

**État local**:
\`\`\`typescript
{
  classes: Class[]                    // Liste des classes
  levels: Level[]                     // Liste des niveaux
  loading: boolean                    // État de chargement
  isAddDialogOpen: boolean            // Dialog création ouverte
  isEditDialogOpen: boolean           // Dialog édition ouverte
  isLevelsDialogOpen: boolean         // Dialog gestion niveaux ouverte
  selectedClass: Class | null         // Classe en cours d'édition
  formData: {
    name: string                      // Nom de la classe
    level: string                     // Niveau sélectionné
  }
}
\`\`\`

### Interface Class
\`\`\`typescript
interface Class {
  id: string
  name: string                        // "6A", "5B"
  level: string                       // "6ème", "5ème"
  establishment_id: string
  created_at: string
}
\`\`\`

### Interface Level
\`\`\`typescript
interface Level {
  id: string
  name: string                        // "6ème", "Seconde"
}
\`\`\`

---

## Gestion des niveaux

### LevelsManagementDialog

**Fichier**: `components/levels-management-dialog.tsx`

**Fonctionnalités**:
1. **Créer un niveau**
   - Nom personnalisé
   - Ordre d'affichage automatique

2. **Modifier un niveau**
   - Changement de nom
   - Réorganisation de l'ordre

3. **Supprimer un niveau**
   - Vérification des dépendances (classes liées)
   - Confirmation requise

4. **Niveaux prédéfinis**
   - Collège: 6ème, 5ème, 4ème, 3ème
   - Lycée: Seconde, Première, Terminale
   - Primaire: CP, CE1, CE2, CM1, CM2

**Dialog Props**:
\`\`\`typescript
interface LevelsManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  establishmentId: string
  onLevelsUpdated: () => void          // Callback après modification
}
\`\`\`

---

## Fonctionnalités complètes

### 1. Affichage des classes

**Tri**:
- Par niveau (ascendant): 6ème → 5ème → 4ème → 3ème
- Par nom (ascendant): 6A → 6B → 6C

\`\`\`typescript
const { data } = await supabase
  .from("classes")
  .select("*")
  .eq("establishment_id", establishmentId)
  .order("level", { ascending: true })
  .order("name", { ascending: true })
\`\`\`

**Tableau**:
| Nom | Niveau | Actions |
|-----|--------|---------|
| 6A | 6ème | ⋮ (Dropdown) |
| 6B | 6ème | ⋮ |
| 5A | 5ème | ⋮ |

**Badge niveau**:
- Couleur: Blue (bg-blue-100 text-blue-800)
- Format: Texte arrondi avec padding
- Si pas de niveau: "Non défini" en gris

### 2. Création de classe

**Formulaire**:
\`\`\`typescript
{
  name: string          // Requis, ex: "6A"
  level: string         // Requis, sélection dans dropdown
}
\`\`\`

**Validation**:
- ✅ Nom non vide
- ✅ Niveau sélectionné
- ✅ Nom unique par établissement (pas de contrainte DB, géré côté client)

**Insertion**:
\`\`\`typescript
await supabase
  .from("classes")
  .insert([{
    name: formData.name,
    level: formData.level,
    establishment_id: establishmentId
  }])
\`\`\`

**Logging**:
\`\`\`typescript
await logAction("create", "class", classId, className)
\`\`\`

### 3. Modification de classe

**Champs éditables**:
- Nom de la classe
- Niveau

**Mise à jour**:
\`\`\`typescript
await supabase
  .from("classes")
  .update({
    name: formData.name,
    level: formData.level
  })
  .eq("id", selectedClass.id)
\`\`\`

**Logging**:
\`\`\`typescript
await logAction("update", "class", classId, newName)
\`\`\`

### 4. Suppression de classe

**Confirmation**:
\`\`\`javascript
confirm(`Êtes-vous sûr de vouloir supprimer la classe "${className}" ?`)
\`\`\`

**Suppression physique** (pas de soft delete dans ce composant):
\`\`\`typescript
await supabase
  .from("classes")
  .delete()
  .eq("id", classId)
\`\`\`

**Impact cascade**:
- ⚠️ Supprime les élèves de la classe (via FK cascade)
- ⚠️ Supprime les liens professeurs-classe
- ⚠️ Supprime les sous-salles liées

**Logging**:
\`\`\`typescript
await logAction("delete", "class", classId, className)
\`\`\`

### 5. Gestion des niveaux

**Déclenchement**: Bouton "Gestion des niveaux" (icône GraduationCap)

**Dialog modal**:
- Création de nouveaux niveaux
- Modification des niveaux existants
- Suppression de niveaux (avec vérification)
- Réorganisation de l'ordre d'affichage

**Callback après modification**:
\`\`\`typescript
onLevelsUpdated={() => fetchLevels()}
\`\`\`

---

## Connexions avec autres sections

### 1. Élèves (students)

**Lien**: Table `students.class_id` → `classes.id`

**Flux**:
1. Une classe est créée dans ClassesManagement
2. Des élèves sont ajoutés à cette classe dans StudentsManagement
3. La classe apparaît dans les filtres de StudentsManagement

**Données partagées**:
- `class_id`: Référence la classe
- `class_name`: Nom affiché dans l'interface élèves

### 2. Professeurs (teachers)

**Lien**: Table `teacher_classes` (join table)

\`\`\`sql
CREATE TABLE teacher_classes (
  teacher_id uuid REFERENCES teachers(id),
  class_id uuid REFERENCES classes(id)
)
\`\`\`

**Flux**:
1. Une classe est créée
2. Un professeur est assigné à cette classe via TeachersManagement
3. Le professeur voit les élèves de cette classe

**Données partagées**:
- Liste des classes d'un professeur
- Liste des professeurs d'une classe

### 3. Salles (rooms)

**Lien**: Via sous-salles (`sub_rooms`)

\`\`\`sql
CREATE TABLE sub_rooms (
  room_id uuid REFERENCES rooms(id),
  class_id uuid REFERENCES classes(id),
  class_ids uuid[]        -- Multi-classes
)
\`\`\`

**Flux**:
1. Une salle est créée dans RoomsManagement
2. Une sous-salle est créée et liée à une classe
3. La sous-salle hérite de la configuration de la salle parente

### 4. Plans de classe (seating-plan)

**Lien**: Via `sub_rooms.class_id`

**Flux**:
1. Une classe existe
2. Un plan de classe (sous-salle) est créé pour cette classe
3. Les élèves sont placés selon leur appartenance à la classe

### 5. Bac à sable (sandbox)

**Lien**: Table `sub_room_proposals.class_id`

**Flux**:
1. Un délégué crée une proposition pour sa classe
2. La proposition est liée à la classe
3. Le professeur de la classe peut valider

### 6. Niveaux (levels)

**Lien**: `classes.level_id` → `levels.id` (optionnel)

**Flux**:
1. Des niveaux sont créés via LevelsManagementDialog
2. Les classes sont assignées à ces niveaux
3. Filtrage et regroupement par niveau dans toutes les sections

---

## Paramètres sauvegardés

### Base de données
\`\`\`typescript
// Table classes
{
  id: uuid
  name: string                        // "6A"
  level: string                       // "6ème"
  level_id: uuid                      // Référence vers levels
  establishment_id: uuid
  created_at: timestamptz
  updated_at: timestamptz
  is_deleted: boolean
}

// Table levels
{
  id: uuid
  name: string                        // "6ème"
  display_order: integer              // 1, 2, 3...
  is_custom: boolean
  establishment_id: uuid
}
\`\`\`

### État local (non persistant)
\`\`\`typescript
{
  classes: Class[]                    // Classes chargées en mémoire
  levels: Level[]                     // Niveaux chargés
  selectedClass: Class | null         // Classe en cours d'édition
  formData: {
    name: string
    level: string
  }
}
\`\`\`

### Logs d'actions
\`\`\`typescript
// Table action_logs
{
  user_id: uuid
  establishment_id: uuid
  action_type: 'create' | 'update' | 'delete'
  entity_type: 'class'
  entity_id: uuid
  details: jsonb {
    class_name: string
    level: string
  }
  created_at: timestamptz
}
\`\`\`

---

## Statistiques et métriques

### Affichées dans l'interface
- Nombre total de classes
- Format: "{count} classe(s) enregistrée(s)"

### Non affichées (disponibles en base)
- Nombre d'élèves par classe (via JOIN)
- Nombre de professeurs par classe
- Nombre de sous-salles par classe
- Date de création de chaque classe

---

## Fonctionnalités avancées

### 1. Tri automatique

Classes triées par:
1. Niveau (ordre croissant)
2. Nom (ordre alphabétique)

**Exemple**:
\`\`\`
6A, 6B, 6C
5A, 5B
4A, 4B, 4C, 4D
3A, 3B, 3C
\`\`\`

### 2. Badge de niveau

Chaque classe affiche un badge coloré avec son niveau:
- Bleu pour tous les niveaux
- Texte "Non défini" si pas de niveau

### 3. Dropdown d'actions

Menu contextuel par classe:
- ✏️ Modifier
- 🗑️ Supprimer

### 4. État vide

Affichage spécial quand aucune classe:
- Icône Plus dans un cercle gris
- Message: "Aucune classe"
- Sous-texte: "Commencez par créer votre première classe"

### 5. Gestion des niveaux intégrée

Bouton dédié pour ouvrir le dialog de gestion:
- Icône GraduationCap
- Label: "Gestion des niveaux"
- Position: Header à côté de "Ajouter une classe"

---

## Problèmes connus et améliorations futures

### Bugs connus
1. ❌ Pas de vérification d'unicité du nom de classe (peut créer "6A" deux fois)
2. ❌ Suppression sans vérifier les dépendances (élèves, sous-salles)
3. ❌ Pas de pagination si beaucoup de classes (>100)

### Améliorations proposées
1. ✨ Ajouter une colonne "Nombre d'élèves" dans le tableau
2. ✨ Filtrage par niveau dans la liste
3. ✨ Recherche par nom de classe
4. ✨ Export CSV de la liste des classes
5. ✨ Import en masse de classes
6. ✨ Duplication de classe (copier structure)
7. ✨ Archivage de classes (année passée)
8. ✨ Vue par niveau (grouper visuellement)
9. ✨ Glisser-déposer pour changer le niveau

---

## Workflows types

### Workflow 1: Début d'année scolaire

1. **Créer les niveaux**
   \`\`\`
   6ème, 5ème, 4ème, 3ème
   \`\`\`

2. **Créer les classes**
   \`\`\`
   6A, 6B, 6C
   5A, 5B
   4A, 4B, 4C
   3A, 3B
   \`\`\`

3. **Assigner les élèves** (section Élèves)
   - Importer ou créer manuellement
   - Assigner à chaque classe

4. **Assigner les professeurs** (section Professeurs)
   - Créer les professeurs
   - Assigner aux classes

5. **Créer les salles** (section Salles)
   - Créer les salles physiques
   - Créer sous-salles par classe

### Workflow 2: Ajout d'une nouvelle classe en cours d'année

1. Cliquer "Ajouter une classe"
2. Remplir nom et niveau
3. Valider
4. Aller dans section Élèves pour ajouter des élèves
5. Aller dans section Professeurs pour assigner des professeurs

### Workflow 3: Réorganisation des niveaux

1. Cliquer "Gestion des niveaux"
2. Modifier l'ordre d'affichage
3. Valider
4. Les classes sont automatiquement retriées

---

## Commandes utiles

### Lister les classes d'un établissement
\`\`\`sql
SELECT * FROM classes
WHERE establishment_id = 'xxx'
ORDER BY level, name;
\`\`\`

### Compter les élèves par classe
\`\`\`sql
SELECT c.name, COUNT(s.id) as nb_students
FROM classes c
LEFT JOIN students s ON s.class_id = c.id
WHERE c.establishment_id = 'xxx'
GROUP BY c.id, c.name
ORDER BY c.level, c.name;
\`\`\`

### Trouver les classes sans niveau
\`\`\`sql
SELECT * FROM classes
WHERE level IS NULL OR level = ''
ORDER BY name;
\`\`\`

### Supprimer toutes les classes vides (sans élèves)
\`\`\`sql
DELETE FROM classes
WHERE id NOT IN (
  SELECT DISTINCT class_id FROM students
)
AND establishment_id = 'xxx';
\`\`\`

---

**Dernière mise à jour**: 7 janvier 2026
**Version**: 1.0.0
**Mainteneur**: Équipe v0
\`\`\`

Je vais continuer avec les autres sections dans le prochain message...
