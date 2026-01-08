# 📋 DOCUMENTATION EXHAUSTIVE - SECTION SALLES

## Table des matières
1. [Rôles et Permissions](#roles-et-permissions)
2. [Structure Base de Données](#structure-base-de-donnees)
3. [Connexions avec Autres Sections](#connexions-avec-autres-sections)
4. [Paramètres Sauvegardés](#parametres-sauvegardes)
5. [Fonctionnalités Complètes](#fonctionnalites-completes)
6. [Gestion des Erreurs & Bugs Connus](#gestion-des-erreurs-bugs-connus)
7. [Statistiques & Métriques](#statistiques-metriques)

---

## 🎯 1. RÔLES ET PERMISSIONS

### Vie Scolaire (vie-scolaire)
**Accès complet à toutes les fonctionnalités**

- ✅ Voir toutes les salles de l'établissement
- ✅ Créer des salles (via Templates ou Personnalisées)
- ✅ Modifier toutes les salles
- ✅ Supprimer toutes les salles
- ✅ Dupliquer des salles
- ✅ Créer des sous-salles
- ✅ Gérer tous les templates (créer, modifier, supprimer, épingler)
- ✅ Créer des salles collaboratives multi-professeurs
- ✅ Accès au mode multi-classes

### Professeur (professeur)
**Accès étendu avec restrictions sur les salles d'autres professeurs**

- ✅ Voir toutes les salles de l'établissement
- ✅ Créer des salles (via Templates ou Personnalisées)
- ✅ Créer des sous-salles individuelles (pour lui-même uniquement)
- ✅ Créer des sous-salles collaboratives (multi-professeurs avec système d'acceptation)
- ✅ Modifier ses propres salles/sous-salles uniquement
- ✅ Dupliquer des salles
- ✅ Gérer ses propres templates
- ✅ Accès au mode multi-classes
- ⚠️ **RESTRICTION** : Ne peut PAS créer de salle individuelle pour un autre professeur
- ⚠️ **RESTRICTION** : Ne peut PAS modifier les salles d'autres professeurs

### Délégué/Éco-délégué (delegue, eco-delegue)
**Accès limité aux fonctionnalités essentielles**

- ✅ Voir toutes les salles de l'établissement
- ✅ Créer des sous-salles (via Templates uniquement)
- ✅ Modifier les salles marquées comme `is_modifiable_by_delegates`
- ❌ Ne peut PAS créer de salles personnalisées
- ❌ Ne peut PAS utiliser le mode multi-classes
- ❌ Ne peut PAS supprimer de salles
- ❌ Ne peut PAS créer de templates personnalisés
- ❌ Accès limité aux fonctionnalités collaboratives

### Élève (student/eleve)
**Accès lecture seule uniquement**

- ✅ Voir les salles (lecture seule)
- ❌ Ne peut PAS sélectionner de sous-salles
- ❌ Ne peut PAS supprimer de sous-salles
- ❌ Aucune modification possible
- ❌ Aucune création possible

---

## 🗂️ 2. STRUCTURE BASE DE DONNÉES

### Table: `rooms`
**Table principale stockant les configurations de salles**

\`\`\`sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  board_position TEXT CHECK (board_position IN ('top', 'bottom', 'left', 'right')),
  config JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(establishment_id, code)
);
\`\`\`

**Structure du champ `config` (JSONB)**:
\`\`\`json
{
  "columns": [
    {
      "id": "unique-column-id",
      "tables": 5,
      "seatsPerTable": 2
    }
  ]
}
\`\`\`

**Champs**:
- `id` : Identifiant unique de la salle
- `establishment_id` : Lien vers l'établissement
- `name` : Nom de la salle (ex: "Salle A1", "Laboratoire")
- `code` : Code unique de la salle (ex: "A101")
- `board_position` : Position du tableau (haut/bas/gauche/droite)
- `config` : Configuration des colonnes en JSON
- `created_by` : ID de l'utilisateur créateur
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

### Table: `sub_rooms`
**Salles dérivées liées à des professeurs et classes spécifiques**

\`\`\`sql
CREATE TABLE sub_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  custom_name TEXT,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  class_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Champs**:
- `id` : Identifiant unique de la sous-salle
- `room_id` : Lien vers la salle parente
- `name` : Nom auto-généré
- `custom_name` : Nom personnalisé (optionnel)
- `teacher_id` : Professeur principal
- `establishment_id` : Lien vers l'établissement
- `class_ids` : Array des IDs de classes associées
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

### Table: `sub_room_teachers`
**Système de salles collaboratives multi-professeurs**

\`\`\`sql
CREATE TABLE sub_room_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_room_id UUID NOT NULL REFERENCES sub_rooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Champs**:
- `id` : Identifiant unique
- `sub_room_id` : Lien vers la sous-salle
- `teacher_id` : ID du professeur invité
- `status` : Statut de l'invitation (pending/accepted/rejected)
- `created_at` : Date de l'invitation

**Workflow de collaboration**:
1. Un professeur crée une sous-salle collaborative
2. Il ajoute d'autres professeurs → statut `pending`
3. Les professeurs reçoivent une notification
4. Ils acceptent → statut `accepted` ou refusent → statut `rejected`

### Table: `room_templates`
**Templates personnalisés créés par les utilisateurs**

\`\`\`sql
CREATE TABLE room_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

**Champs**:
- `id` : Identifiant unique du template
- `user_id` : Créateur du template
- `establishment_id` : Établissement associé
- `name` : Nom du template (ex: "Ma configuration préférée")
- `description` : Description optionnelle
- `config` : Configuration identique à `rooms.config`
- `is_pinned` : Template épinglé en favori
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

---

## 🔗 3. CONNEXIONS AVEC AUTRES SECTIONS

### → Section Classes (`/dashboard/classes`)
**Dépendance forte**

- Les sous-salles référencent des `class_ids` (array)
- Lors de la création d'une sous-salle, liste déroulante des classes
- Filtre automatique des classes selon les professeurs sélectionnés
- Mode multi-classes : permet de lier une sous-salle à plusieurs classes simultanément
- Les classes sont affichées dans les détails de chaque sous-salle

**Queries utilisées**:
\`\`\`typescript
// Récupération des classes pour un établissement
const { data: classes } = await supabase
  .from('classes')
  .select('*')
  .eq('establishment_id', establishmentId);

// Récupération des sous-salles avec leurs classes
const { data: subRooms } = await supabase
  .from('sub_rooms')
  .select('*, classes(*)')
  .eq('room_id', roomId);
\`\`\`

### → Section Professeurs (`/dashboard/teachers`)
**Intégration collaborative**

- Création de sous-salles nécessite la sélection d'un professeur principal
- Mode collaboratif : plusieurs professeurs peuvent être liés à une sous-salle
- Système de notifications pour acceptation collaborative (via `sub_room_teachers`)
- Filtre des classes selon le professeur sélectionné
- Affichage du nom du professeur dans les sous-salles

**Queries utilisées**:
\`\`\`typescript
// Récupération des professeurs
const { data: teachers } = await supabase
  .from('teachers')
  .select('*, user:profiles(*)')
  .eq('establishment_id', establishmentId);

// Invitation de professeurs collaboratifs
await supabase
  .from('sub_room_teachers')
  .insert({
    sub_room_id: subRoomId,
    teacher_id: teacherId,
    status: 'pending'
  });
\`\`\`

### → Section Sandbox (`/dashboard/sandbox`)
**Système de propositions**

- Les salles créées peuvent être utilisées dans le sandbox
- Les sub-rooms peuvent avoir des propositions (table `sub_room_proposals`)
- Workflow de validation: pending → submitted → validated/rejected
- Intégration avec `review-proposal-dialog` pour les professeurs
- Les propositions approuvées deviennent des sous-salles officielles

**Tables liées**:
- `sub_room_proposals` : Propositions en attente
- `proposal_data` : Données de configuration des propositions

### → Section Plans de Classe (`/dashboard/seating-plans`)
**Base pour l'affectation des élèves**

- Les salles servent de base pour les plans de classe
- Configuration des colonnes utilisée pour générer les places
- Les `seat_assignments` sont stockés dans les sous-salles
- Les élèves sont placés selon la configuration de la salle
- Calcul automatique du nombre de places disponibles

**Intégration**:
\`\`\`typescript
// Une salle avec 3 colonnes de 5 tables × 2 places = 30 places totales
// Utilisé pour limiter le nombre d'élèves assignables
const totalSeats = room.config.columns.reduce((sum, col) => 
  sum + (col.tables * col.seatsPerTable), 0
);
\`\`\`

### → Système de Notifications
**Communication temps réel**

- **Notifications de collaboration** : Quand un professeur est ajouté à une sous-salle collaborative
- **Notifications de création** : Quand une nouvelle salle/sous-salle est créée
- **Notifications de modification** : Quand une salle partagée est modifiée
- **Notifications de validation/rejet** : Pour le workflow sandbox → rooms

**Types de notifications**:
- `sub_room_invitation` : Invitation à rejoindre une sous-salle
- `sub_room_accepted` : Acceptation d'une invitation
- `sub_room_rejected` : Rejet d'une invitation
- `room_created` : Nouvelle salle créée
- `room_modified` : Salle existante modifiée

---

## ⚙️ 4. PARAMÈTRES SAUVEGARDÉS

### États Locaux (React State)
**Gérés dans `components/rooms-management.tsx`**

\`\`\`typescript
// États principaux
const [localRooms, setLocalRooms] = useState<Room[]>([]);
const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
const [searchQuery, setSearchQuery] = useState<string>("");
const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
const [viewedRoom, setViewedRoom] = useState<Room | null>(null);
const [editingRoom, setEditingRoom] = useState<Room | null>(null);

// États des dialogs
const [showCreateTemplate, setShowCreateTemplate] = useState<boolean>(false);
const [showTemplates, setShowTemplates] = useState<boolean>(false);
const [showCreateSubRoom, setShowCreateSubRoom] = useState<boolean>(false);
const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

// Formulaire de création/édition
const [formData, setFormData] = useState({
  name: string,
  code: string,
  boardPosition: 'top' | 'bottom' | 'left' | 'right',
  columns: Array<{
    id: string,
    tables: number,      // Max 20
    seatsPerTable: number // Max 7
  }>
});
\`\`\`

### Contraintes de Validation

**Limites système**:
\`\`\`typescript
const VALIDATION_RULES = {
  MAX_TOTAL_SEATS: 350,           // Maximum de places par salle
  MAX_TOTAL_WIDTH: 10,            // Somme max des seatsPerTable
  MAX_COLUMNS: 5,                 // Maximum de colonnes
  MIN_COLUMNS: 1,                 // Minimum de colonnes
  MAX_TABLES_PER_COLUMN: 20,      // Maximum de tables par colonne
  MAX_SEATS_PER_TABLE: 7,         // Maximum de sièges par table
  MIN_TABLES_PER_COLUMN: 1,       // Minimum de tables par colonne
  MIN_SEATS_PER_TABLE: 1          // Minimum de sièges par table
};
\`\`\`

**Validation en temps réel**:
- Calcul automatique du total de places
- Vérification de la largeur totale (contrainte d'affichage)
- Code de salle unique par établissement
- Format du code : alphanumerique, 2-10 caractères

**Messages d'erreur**:
\`\`\`typescript
if (totalSeats > 350) {
  toast.error("Le nombre total de places ne peut pas dépasser 350");
}
if (totalWidth > 10) {
  toast.error("La largeur totale ne peut pas dépasser 10 places");
}
if (columns.length > 5) {
  toast.error("Maximum 5 colonnes autorisées");
}
\`\`\`

### Paramètres Supabase (Base de données)

**Données persistantes**:
- Templates personnalisés stockés par `user_id`
- Épinglage de templates via `is_pinned`
- Configuration des colonnes en JSONB
- Historique complet : `created_by`, `created_at`, `updated_at`
- Code de salle unique avec contrainte `UNIQUE(establishment_id, code)`

**Politiques RLS (Row Level Security)**:
\`\`\`sql
-- Lecture : Tout le monde dans l'établissement
CREATE POLICY "Rooms are viewable by establishment members"
ON rooms FOR SELECT
USING (establishment_id IN (
  SELECT establishment_id FROM profiles WHERE id = auth.uid()
));

-- Création : Vie scolaire et professeurs
CREATE POLICY "Rooms can be created by staff"
ON rooms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('vie-scolaire', 'professeur')
  )
);

-- Modification : Créateur ou vie scolaire
CREATE POLICY "Rooms can be updated by creator or vie-scolaire"
ON rooms FOR UPDATE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'vie-scolaire'
  )
);
\`\`\`

---

## 🛠️ 5. FONCTIONNALITÉS COMPLÈTES

### A. Création de Salles

#### 1. Via Templates

**Templates Prédéfinis** (6 configurations):
\`\`\`typescript
const PREDEFINED_TEMPLATES = [
  {
    id: 'small',
    name: 'Petite classe',
    description: '15 places',
    config: {
      columns: [
        { tables: 5, seatsPerTable: 1 },
        { tables: 5, seatsPerTable: 1 },
        { tables: 5, seatsPerTable: 1 }
      ]
    }
  },
  {
    id: 'medium',
    name: 'Classe moyenne',
    description: '24 places',
    config: {
      columns: [
        { tables: 6, seatsPerTable: 2 },
        { tables: 6, seatsPerTable: 2 }
      ]
    }
  },
  {
    id: 'large',
    name: 'Grande classe',
    description: '30 places',
    config: {
      columns: [
        { tables: 10, seatsPerTable: 1 },
        { tables: 10, seatsPerTable: 1 },
        { tables: 10, seatsPerTable: 1 }
      ]
    }
  },
  {
    id: 'xlarge',
    name: 'Très grande classe',
    description: '40 places',
    config: {
      columns: [
        { tables: 10, seatsPerTable: 2 },
        { tables: 10, seatsPerTable: 2 }
      ]
    }
  },
  {
    id: 'exam',
    name: 'Configuration examen',
    description: '30 places espacées',
    config: {
      columns: [
        { tables: 10, seatsPerTable: 1 },
        { tables: 10, seatsPerTable: 1 },
        { tables: 10, seatsPerTable: 1 }
      ]
    }
  },
  {
    id: 'workshop',
    name: 'Atelier',
    description: '20 places en groupes',
    config: {
      columns: [
        { tables: 4, seatsPerTable: 5 }
      ]
    }
  }
];
\`\`\`

**Templates Personnalisés**:
- Créés par les utilisateurs via `CreateTemplateDialog`
- Stockés dans la table `room_templates`
- Peuvent être épinglés (favoris) avec `is_pinned`
- Affichés en priorité dans la sélection
- Supprimables uniquement par le créateur

**Processus de sélection**:
1. Clic sur "Templates"
2. Affichage des templates prédéfinis + personnalisés
3. Templates épinglés affichés en premier (étoile)
4. Sélection → formulaire pré-rempli avec la configuration
5. Personnalisation possible avant création finale

#### 2. Personnalisée

**Formulaire de création**:
\`\`\`typescript
interface CreateRoomForm {
  name: string;              // Ex: "Salle A1"
  code: string;              // Ex: "A101" (unique)
  boardPosition: 'top' | 'bottom' | 'left' | 'right';
  columns: Column[];
}

interface Column {
  id: string;                // UUID généré
  tables: number;            // 1-20
  seatsPerTable: number;     // 1-7
}
\`\`\`

**Étapes de création**:
1. Remplir le nom et le code
2. Choisir la position du tableau
3. Ajouter des colonnes (bouton "+")
4. Configurer chaque colonne :
   - Nombre de tables (slider 1-20)
   - Sièges par table (slider 1-7)
5. Visualisation en temps réel :
   - Total de places calculé automatiquement
   - Largeur totale vérifiée
   - Contraintes validées
6. Sauvegarde dans la base de données

**Validation en temps réel**:
- Nom : requis, non vide
- Code : requis, alphanumerique, 2-10 caractères, unique
- Au moins 1 colonne
- Maximum 5 colonnes
- Total ≤ 350 places
- Largeur totale ≤ 10

### B. Gestion des Salles

#### Visualisation

**Affichage de la configuration**:
\`\`\`
Tableau (position configurée)
╔════════════════════════════╗
║                            ║
╚════════════════════════════╝

Colonne 1    Colonne 2    Colonne 3
┌──┬──┐     ┌──┬──┐     ┌──┬──┐
│  │  │     │  │  │     │  │  │
└──┴──┘     └──┴──┘     └──┴──┘
  (×5)        (×5)        (×5)

Configuration : 3 colonnes, 30 places totales
\`\`\`

**Informations affichées**:
- Nom de la salle
- Code de la salle
- Position du tableau (icône)
- Nombre de colonnes
- Configuration détaillée (tables × sièges)
- Total de places
- Date de création
- Créateur (nom de l'utilisateur)

#### Modification

**Actions disponibles**:
- Éditer le nom
- Éditer le code (si non utilisé)
- Changer la position du tableau
- Ajouter/supprimer des colonnes
- Modifier la configuration de chaque colonne
- Sauvegarder les modifications

**Permissions**:
- Vie scolaire : peut tout modifier
- Professeur : peut modifier ses propres salles uniquement
- Délégué : peut modifier si `is_modifiable_by_delegates = true`
- Élève : aucune modification

#### Duplication

**Processus**:
\`\`\`typescript
const duplicateRoom = async (roomId: string) => {
  const original = rooms.find(r => r.id === roomId);
  const timestamp = Date.now();
  
  const duplicate = {
    ...original,
    id: undefined, // Nouveau ID généré
    name: `${original.name} (copie)`,
    code: `${original.code}-copy-${timestamp}`,
    created_at: new Date(),
    created_by: currentUserId
  };
  
  await supabase.from('rooms').insert(duplicate);
};
\`\`\`

**Caractéristiques**:
- Copie exacte de la configuration
- Nom avec suffixe "(copie)"
- Code unique avec timestamp
- Nouveau créateur = utilisateur actuel
- Pas de copie des sous-salles (uniquement la salle parent)

#### Suppression

**Sécurité**:
- Dialog de confirmation requis
- Code de confirmation à saisir (6 caractères alphanumériques)
- Suppression en cascade des sous-salles
- Suppression des templates liés (si applicable)

**Code de confirmation**:
\`\`\`typescript
const confirmationCode = Math.random()
  .toString(36)
  .substring(2, 8)
  .toUpperCase();
\`\`\`

**Cascade DELETE**:
\`\`\`sql
-- Suppression automatique des sous-salles
ON DELETE CASCADE

-- Suppression automatique des affectations d'élèves
-- Suppression automatique des propositions sandbox
\`\`\`

#### Sélection Multiple

**Fonctionnalités**:
- Checkbox sur chaque salle
- Sélectionner tout / Désélectionner tout
- Compteur de sélection affiché
- Actions groupées disponibles :
  - Dupliquer toutes (génère N copies)
  - Supprimer toutes (avec confirmation)

**Interface**:
\`\`\`
[✓] Sélectionner tout (5 salles sélectionnées)

[Actions groupées]
  - Dupliquer la sélection
  - Supprimer la sélection
\`\`\`

### C. Sous-Salles

#### Création Simple (1 professeur + classes)

**Formulaire**:
\`\`\`typescript
interface CreateSubRoomForm {
  roomId: string;               // Salle parente (auto-sélectionnée)
  teacherId: string;            // Professeur principal
  classIds: string[];           // 1 ou plusieurs classes
  customName?: string;          // Nom personnalisé (optionnel)
}
\`\`\`

**Nom auto-généré**:
\`\`\`typescript
const generateSubRoomName = (room: Room, teacher: Teacher) => {
  return `${room.name} - ${teacher.last_name}`;
};
// Ex: "Salle A1 - Dupont"
\`\`\`

**Processus**:
1. Sélectionner la salle parente
2. Choisir le professeur
3. Sélectionner une ou plusieurs classes
4. (Optionnel) Personnaliser le nom
5. Validation et création

#### Mode Collaboratif (Multi-professeurs)

**Workflow complet**:

1. **Création initiale**:
\`\`\`typescript
// Professeur A crée une sous-salle
const subRoom = await supabase.from('sub_rooms').insert({
  room_id: roomId,
  name: 'Salle A1 - Dupont',
  teacher_id: professorAId,
  class_ids: [class1Id, class2Id]
});
\`\`\`

2. **Ajout de professeurs collaborateurs**:
\`\`\`typescript
// Ajouter le professeur B
await supabase.from('sub_room_teachers').insert({
  sub_room_id: subRoom.id,
  teacher_id: professorBId,
  status: 'pending'
});

// Créer une notification pour le professeur B
await supabase.from('notifications').insert({
  user_id: professorBId,
  type: 'sub_room_invitation',
  title: 'Invitation à rejoindre une sous-salle',
  message: `${professorA.name} vous invite à rejoindre "${subRoom.name}"`,
  data: { sub_room_id: subRoom.id }
});
\`\`\`

3. **Acceptation/Rejet**:
\`\`\`typescript
// Le professeur B accepte
await supabase
  .from('sub_room_teachers')
  .update({ status: 'accepted' })
  .eq('id', invitationId);

// Notification au professeur A
await supabase.from('notifications').insert({
  user_id: professorAId,
  type: 'sub_room_accepted',
  message: `${professorB.name} a accepté votre invitation`
});
\`\`\`

**Interface de gestion**:
- Liste des professeurs collaborateurs
- Statut de chaque invitation (pending/accepted/rejected)
- Possibilité de retirer un professeur
- Possibilité de renvoyer une invitation

#### Mode Multi-Classes

**Activation**:
- Checkbox "Mode multi-classes"
- Désactivé pour les délégués
- Permet de sélectionner plusieurs classes simultanément

**Interface**:
\`\`\`
Sélection des classes:
[✓] 6ème A
[✓] 6ème B
[ ] 6ème C
[✓] 6ème D

→ 3 classes sélectionnées
\`\`\`

**Cas d'usage**:
- Cours en groupes mélangés (ex: options, langues)
- Cours inter-classes (ex: sport, musique)
- Projets pédagogiques transversaux

### D. Templates

#### Templates Prédéfinis

**Liste complète** (non modifiables, non supprimables):

1. **Petite classe** : 15 places (3 colonnes × 5 tables × 1 siège)
2. **Classe moyenne** : 24 places (2 colonnes × 6 tables × 2 sièges)
3. **Grande classe** : 30 places (3 colonnes × 10 tables × 1 siège)
4. **Très grande classe** : 40 places (2 colonnes × 10 tables × 2 sièges)
5. **Configuration examen** : 30 places espacées (3 × 10 × 1)
6. **Atelier** : 20 places en groupes (1 colonne × 4 tables × 5 sièges)

#### Templates Personnalisés

**Création**:
\`\`\`typescript
interface CreateTemplateForm {
  name: string;              // Ex: "Ma config préférée"
  description?: string;      // Description optionnelle
  config: {
    columns: Column[];
  };
  is_pinned?: boolean;       // Épingler directement
}
\`\`\`

**Fonctionnalités**:
- Créer à partir d'une configuration existante
- Créer from scratch
- Modifier (nom, description seulement - pas la config)
- Épingler/Désépingler (marquer comme favori)
- Supprimer (uniquement le créateur)

**Épinglage** (favoris):
\`\`\`typescript
await supabase
  .from('room_templates')
  .update({ is_pinned: true })
  .eq('id', templateId);
\`\`\`

**Affichage**:
- Templates épinglés affichés en premier
- Icône étoile (⭐) pour les favoris
- Tri : Épinglés → Récents → Alphabétique

**Permissions**:
- Vie scolaire : Voir tous, créer, modifier, supprimer tous
- Professeur : Voir tous, créer, modifier/supprimer ses propres
- Délégué : Voir tous, pas de création
- Élève : Voir tous (lecture seule)

### E. Recherche & Filtrage

#### Recherche

**Champs recherchés**:
- Nom de la salle
- Code de la salle

**Implémentation**:
\`\`\`typescript
const filteredRooms = localRooms.filter(room => {
  const query = searchQuery.toLowerCase();
  return (
    room.name.toLowerCase().includes(query) ||
    room.code.toLowerCase().includes(query)
  );
});
\`\`\`

**Caractéristiques**:
- Recherche en temps réel (debounce 300ms)
- Insensible à la casse
- Recherche partielle (substring match)
- Affichage du nombre de résultats

**Interface**:
\`\`\`
[🔍] Rechercher une salle...

Résultats : 3 salles sur 15
\`\`\`

#### Filtres Avancés (à implémenter)

**Filtres possibles** (non encore implémentés):
- Par position du tableau (top/bottom/left/right)
- Par nombre de places (range slider)
- Par créateur
- Par date de création
- Par présence de sous-salles

---

## 🚨 6. GESTION DES ERREURS & BUGS CONNUS

### Erreur React #130 (ACTUELLE)

**Erreur complète**:
\`\`\`
Error: Minified React error #130
Element type is invalid: expected a string (for built-in components) 
or a class/function (for composite components) but got: undefined. 
You likely forgot to export your component from the file it's defined in, 
or you might have mixed up default and named exports.
\`\`\`

**Symptômes observés**:
- ✅ La page charge correctement les données Supabase
- ✅ Les logs de débogage s'affichent (connexion, chargement des salles)
- ✅ Fonctionne parfaitement pour les **délégués**
- ❌ Crash immédiat pour **vie-scolaire** et **professeurs**
- ❌ L'erreur se produit APRÈS le rendu des données
- ❌ Le crash survient au moment du rendu des composants Dialog

**Causes possibles identifiées**:

1. **Import/Export mismatch** :
   - Un composant importé n'existe pas ou n'est pas exporté correctement
   - Confusion entre `export default` et `export function`

2. **Composant conditionnel undefined** :
   - Un composant est rendu uniquement si une condition est vraie
   - Mais le composant lui-même est `undefined`

3. **Props undefined** :
   - Un Dialog reçoit des props `undefined` qui cassent son rendu
   - Exemple : `userId={undefined}` alors que l'interface attend `string`

4. **console.log() dans le JSX** :
   - Les expressions `{console.log(...)}` retournent `undefined`
   - React ne peut pas rendre `undefined` dans le JSX

5. **Fragment malformé** :
   - Un `<></>` ou `<Fragment>` contenant un composant undefined

**Tentatives de correction effectuées** (20+ itérations):
- ✅ Ajout de console.log pour tracer l'exécution → Tous les Dialogs se rendent
- ✅ Vérification des imports/exports → Tous corrects
- ✅ Rendu conditionnel des Dialogs avec `&&` → Toujours le crash
- ✅ Props optionnelles (`userId?`, `establishmentId?`) → Pas résolu
- ✅ Suppression des `console.log()` dans le JSX → Pas résolu
- ✅ Simplification du composant → Pas résolu
- ✅ Remplacement de RoomVisualization par du JSX inline → Pas résolu
- ✅ Correction de l'import Toaster (react-hot-toast → shadcn) → Pas résolu

**État actuel**:
- Le composant `rooms-management.tsx` contient ~830 lignes
- Tous les imports sont corrects (vérifiés avec Grep)
- Tous les composants Dialog sont bien exportés
- Les logs montrent que tous les Dialogs se rendent avec succès
- Le crash se produit APRÈS "All Dialogs rendered successfully"

**Solution probable** :
Il y a un composant non-Dialog dans le JSX principal qui retourne `undefined` pour les rôles vie-scolaire/professeur mais pas pour délégué. Il faut identifier CE composant spécifique.

### Autres Bugs Connus

#### 1. Section "Classes" renommée en "Cours"
**Symptôme** : L'utilisateur rapporte que la section s'appelle "Cours" au lieu de "Classes"

**Statut** : Non reproduit dans le code actuel

**Vérification** :
\`\`\`typescript
// components/dashboard-content.tsx ligne 276
<h2>Classes</h2> // Correct
\`\`\`

#### 2. Crash lors de la navigation Dashboard → Salles
**Symptôme** : Erreur lors du changement de section

**Cause probable** : Props non initialisées dans `app/dashboard/rooms/page.tsx`

**Solution proposée** :
\`\`\`typescript
// Assurer que toutes les props sont définies
<RoomsManagement
  rooms={rooms || []}
  userRole={profile.role}
  userId={profile.id}
/>
\`\`\`

#### 3. Toasts en surcharge
**Symptôme** : Trop de notifications affichées simultanément

**Solution implémentée** :
\`\`\`typescript
// hooks/use-toast.ts
const TOAST_LIMIT = 3; // Au lieu de 1
\`\`\`

#### 4. Délégués ne voient pas la section création
**Symptôme** : La section "Créer une nouvelle salle" n'apparaît pas pour les délégués

**Solution** : Rendre visible pour tous avec adaptation selon le rôle
\`\`\`typescript
const canCreateRooms = 
  isVieScolaire || 
  isTeacher || 
  isDelegue; // ✅ Inclure les délégués
\`\`\`

### Messages d'Erreur Courants

#### Supabase Errors

**"violates foreign key constraint"**:
\`\`\`
Cause : Tentative d'insérer un teacher_id qui n'existe pas
Solution : Vérifier que le professeur existe avant création
\`\`\`

**"duplicate key value violates unique constraint"**:
\`\`\`
Cause : Code de salle déjà utilisé
Solution : Validation côté client + message clair
\`\`\`

**"row-level security policy violation"**:
\`\`\`
Cause : L'utilisateur n'a pas les permissions RLS
Solution : Vérifier le rôle et les politiques RLS
\`\`\`

#### Validation Errors

**"Le nombre total de places ne peut pas dépasser 350"**:
\`\`\`typescript
const totalSeats = columns.reduce(
  (sum, col) => sum + (col.tables * col.seatsPerTable), 
  0
);
if (totalSeats > 350) throw new Error();
\`\`\`

**"La largeur totale ne peut pas dépasser 10 places"**:
\`\`\`typescript
const totalWidth = Math.max(
  ...columns.map(col => col.seatsPerTable)
);
if (totalWidth > 10) throw new Error();
\`\`\`

**"Maximum 5 colonnes autorisées"**:
\`\`\`typescript
if (columns.length > 5) throw new Error();
\`\`\`

---

## 📊 7. STATISTIQUES & MÉTRIQUES

### Affichées dans l'Interface

**Dashboard principal**:
- Nombre total de salles dans l'établissement
- Nombre de salles affichées (après filtre de recherche)
- Nombre de salles sélectionnées (sélection multiple)

**Par salle**:
- Nombre de colonnes
- Configuration détaillée (ex: "3 colonnes: 5×2, 5×2, 5×2")
- Nombre total de places
- Date de création
- Nom du créateur

**Par template**:
- Nombre de places
- Configuration résumée
- Statut épinglé (étoile)

**Par sous-salle**:
- Nom du professeur principal
- Nombre de classes associées
- Noms des classes
- Statut des collaborations (si applicable)

### Limites Système

**Contraintes techniques**:
\`\`\`typescript
const SYSTEM_LIMITS = {
  // Limites de salle
  MAX_SEATS_PER_ROOM: 350,
  MAX_WIDTH: 10,
  MAX_COLUMNS: 5,
  MIN_COLUMNS: 1,
  
  // Limites de colonne
  MAX_TABLES_PER_COLUMN: 20,
  MIN_TABLES_PER_COLUMN: 1,
  MAX_SEATS_PER_TABLE: 7,
  MIN_SEATS_PER_TABLE: 1,
  
  // Limites de code
  CODE_MIN_LENGTH: 2,
  CODE_MAX_LENGTH: 10,
  
  // Limites de template
  MAX_TEMPLATES_PER_USER: null, // Illimité
  MAX_PINNED_TEMPLATES: null,   // Illimité
  
  // Limites de sous-salles
  MAX_SUB_ROOMS_PER_ROOM: null,      // Illimité
  MAX_TEACHERS_PER_SUB_ROOM: null,   // Illimité
  MAX_CLASSES_PER_SUB_ROOM: null     // Illimité
};
\`\`\`

**Raisons des limites**:
- **350 places** : Contrainte d'affichage et de performance
- **10 de largeur** : Limite d'écran (affichage responsive)
- **5 colonnes** : Lisibilité de l'interface
- **20 tables/colonne** : Performance du rendu
- **7 sièges/table** : Réalisme pédagogique

### Métriques de Performance

**Temps de chargement** (estimations):
- Chargement initial des salles : ~200-500ms
- Recherche/filtrage : <50ms (debounce 300ms)
- Création d'une salle : ~300-600ms
- Duplication : ~200-400ms
- Suppression : ~300-500ms

**Optimisations**:
- Pas de pagination (toutes les salles chargées)
- Filtrage côté client (pas de requêtes supplémentaires)
- Debounce sur la recherche (évite les requêtes multiples)
- Sélection optimiste (UI update immédiat)

### Code de Confirmation

**Format** : 6 caractères alphanumériques en MAJUSCULES

**Génération**:
\`\`\`typescript
const generateConfirmationCode = () => {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
};
// Exemples : "A7X9K2", "B3M7P1", "Q5W8R4"
\`\`\`

**Usage**:
- Suppression de salle(s)
- Suppression de template(s)
- Actions irréversibles

---

## 🔄 WORKFLOW COMPLET

### Scénario 1 : Professeur crée une salle simple

1. Connexion en tant que professeur
2. Navigation vers `/dashboard/rooms`
3. Clic sur "Créer une salle personnalisée"
4. Remplir le formulaire :
   - Nom : "Salle de Mathématiques"
   - Code : "MATH01"
   - Position tableau : Top
   - 2 colonnes : 6 tables × 2 sièges
5. Validation → Salle créée (24 places)
6. La salle apparaît dans la liste

### Scénario 2 : Vie scolaire crée une sous-salle collaborative

1. Connexion en tant que vie-scolaire
2. Sélectionner une salle existante
3. Clic sur "Créer une sous-salle"
4. Sélectionner le professeur principal (Prof A)
5. Ajouter un professeur collaborateur (Prof B)
6. Sélectionner 2 classes (6ème A, 6ème B)
7. Validation → Sous-salle créée
8. Prof B reçoit une notification
9. Prof B accepte → Collaboration activée
10. Les deux professeurs peuvent gérer la sous-salle

### Scénario 3 : Délégué crée une sous-salle depuis template

1. Connexion en tant que délégué
2. Navigation vers `/dashboard/rooms`
3. Clic sur "Templates"
4. Sélection du template "Classe moyenne"
5. Formulaire pré-rempli avec 24 places
6. Sélection d'un professeur
7. Sélection d'une classe
8. Validation → Sous-salle créée
9. Le délégué peut uniquement utiliser des templates (pas de création personnalisée)

---

## 📝 NOTES IMPORTANTES

### Pour les Développeurs

- **Ne JAMAIS modifier** les templates prédéfinis (IDs en dur)
- **Toujours valider** le nombre total de places avant insertion
- **Vérifier les permissions** RLS avant chaque opération
- **Utiliser les transactions** pour les créations multi-tables
- **Logger les erreurs** Supabase pour le débogage

### Pour les Utilisateurs

- Les codes de salle doivent être **uniques par établissement**
- La suppression d'une salle **supprime toutes ses sous-salles**
- Les templates personnalisés sont **privés** (sauf partage manuel)
- Les collaborations nécessitent **l'acceptation** des professeurs invités
- Maximum **350 places** par salle pour des raisons de performance

### Points d'Attention

⚠️ **Sécurité** :
- Validation côté client ET serveur
- Policies RLS strictes
- Code de confirmation pour suppressions

⚠️ **Performance** :
- Limiter les requêtes Supabase
- Utiliser le filtrage côté client
- Optimiser les rendus (React.memo si nécessaire)

⚠️ **UX** :
- Messages d'erreur clairs et explicites
- Feedbacks visuels pour les actions longues
- Confirmations pour les actions irréversibles

---

## 🔧 COMMANDES UTILES

### Debugging Supabase

\`\`\`sql
-- Voir toutes les salles d'un établissement
SELECT * FROM rooms WHERE establishment_id = 'xxx';

-- Voir toutes les sous-salles d'une salle
SELECT * FROM sub_rooms WHERE room_id = 'xxx';

-- Voir les collaborations en attente
SELECT * FROM sub_room_teachers WHERE status = 'pending';

-- Voir les templates d'un utilisateur
SELECT * FROM room_templates WHERE user_id = 'xxx';
\`\`\`

### Queries Courantes

\`\`\`typescript
// Récupérer toutes les salles avec créateur
const { data: rooms } = await supabase
  .from('rooms')
  .select('*, creator:profiles!created_by(*)')
  .eq('establishment_id', establishmentId);

// Récupérer une salle avec ses sous-salles
const { data: room } = await supabase
  .from('rooms')
  .select('*, sub_rooms(*)')
  .eq('id', roomId)
  .single();

// Créer une salle
const { data, error } = await supabase
  .from('rooms')
  .insert({
    establishment_id,
    name,
    code,
    board_position: boardPosition,
    config: { columns },
    created_by: userId
  })
  .select()
  .single();
\`\`\`

---

**Dernière mise à jour** : 7 janvier 2026
**Version** : 1.0.0
**Statut** : Documentation complète - Erreur React #130 non résolue
