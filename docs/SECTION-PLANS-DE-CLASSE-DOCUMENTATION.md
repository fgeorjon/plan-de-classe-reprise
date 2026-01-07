# 📊 DOCUMENTATION EXHAUSTIVE - SECTION PLANS DE CLASSE

> **Version:** 1.0.0  
> **Dernière mise à jour:** 7 janvier 2026  
> **Application:** EduPlan - Classroom Seating Software

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Rôles et Permissions](#rôles-et-permissions)
3. [Structure Base de Données](#structure-base-de-données)
4. [Connexions avec Autres Sections](#connexions-avec-autres-sections)
5. [Fonctionnalités Complètes](#fonctionnalités-complètes)
6. [Éditeur de Plan](#éditeur-de-plan)
7. [Placements Automatiques](#placements-automatiques)
8. [Workflows](#workflows)

---

## 🎯 VUE D'ENSEMBLE

La section Plans de Classe est le cœur de l'application : elle permet de créer des sous-salles (instances de salles pour des classes spécifiques) et de placer les élèves dans les places disponibles.

**Route:** `/dashboard/seating-plan`  
**Composant principal:** `SeatingPlanManagement`  
**Fichier:** `components/seating-plan-management.tsx`

**Composants liés:**
- `SeatingPlanEditor` : Éditeur visuel de placement
- `CreateSubRoomDialog` : Création de sous-salles
- `SeatingVisualizer` : Visualisation 3D de la salle

---

## 👥 RÔLES ET PERMISSIONS

### **Vie Scolaire** (vie-scolaire)
✅ **Accès complet**
- Voir toutes les sous-salles
- Créer des sous-salles
- Modifier tous les placements
- Supprimer des sous-salles
- Placements automatiques
- Export/Import

### **Professeur** (professeur)
✅ **Accès à ses sous-salles**
- Voir ses sous-salles (professeur principal)
- Modifier ses placements
- Créer sous-salles pour ses classes
- Placements automatiques
- ❌ Ne peut PAS voir autres profs

### **Délégué/Éco-délégué** (delegue, eco-delegue)
✅ **Accès lecture + Bac à sable**
- Voir les plans de sa classe
- Créer propositions (via Bac à sable)
- ❌ Ne peut PAS modifier directement

### **Élève** (student/eleve)
✅ **Lecture seule**
- Voir son placement
- ❌ Aucune modification

---

## 🗂️ STRUCTURE BASE DE DONNÉES

### **Table: sub_rooms**
```sql
CREATE TABLE sub_rooms (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) NOT NULL,
  name TEXT NOT NULL,
  custom_name TEXT,
  teacher_id UUID REFERENCES teachers(id),
  establishment_id UUID NOT NULL,
  class_ids UUID[] NOT NULL,
  is_sandbox BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### **Table: seat_assignments**
```sql
CREATE TABLE seat_assignments (
  id UUID PRIMARY KEY,
  sub_room_id UUID REFERENCES sub_rooms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  column_index INTEGER NOT NULL,
  table_index INTEGER NOT NULL,
  seat_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(sub_room_id, column_index, table_index, seat_index)
);
```

### **Table: sub_room_teachers** (Collaboratif)
```sql
CREATE TABLE sub_room_teachers (
  id UUID PRIMARY KEY,
  sub_room_id UUID REFERENCES sub_rooms(id),
  teacher_id UUID REFERENCES teachers(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ,
  UNIQUE(sub_room_id, teacher_id)
);
```

---

## 🔗 CONNEXIONS AVEC AUTRES SECTIONS

### **→ Salles (rooms)**
**Relation:** sub_rooms.room_id → rooms.id

**Données héritées:**
- Configuration des colonnes
- Position du tableau
- Nombre de places disponibles

### **→ Classes (classes)**
**Relation:** sub_rooms.class_ids[] → classes.id

**Multi-classes supporté:**
```typescript
sub_room.class_ids = ['class-1-id', 'class-2-id']
```

### **→ Élèves (students)**
**Relation:** seat_assignments.student_id → students.id

**Placement:**
- Un élève = une place (1:1)
- Coordonnées : (colonne, table, siège)

### **→ Professeurs (teachers)**
**Relation:** sub_rooms.teacher_id → teachers.id

**Mode collaboratif:**
```typescript
sub_room_teachers: [
  { teacher_id, status: 'accepted' },
  { teacher_id, status: 'pending' }
]
```

### **→ Bac à Sable (sandbox)**
**Relation:** Propositions référencent sub_rooms

**Workflow:**
1. Délégué crée proposition dans sandbox
2. Proposition liée à une sous-salle potentielle
3. Professeur valide → devient sous-salle réelle

---

## ⚙️ PARAMÈTRES SAUVEGARDÉS

### **États Locaux**
```typescript
interface SeatingPlanManagementState {
  subRooms: SubRoom[]
  rooms: Room[]
  classes: Class[]
  teachers: Teacher[]
  
  selectedSubRoomIds: string[]
  viewMode: 'grid' | 'list'
  filterTeacher: string | null
  filterClass: string | null
  searchQuery: string
  
  showCreateDialog: boolean
  showEditor: boolean
  currentSubRoom: SubRoom | null
}
```

### **Données de Placement**
```typescript
interface SeatAssignment {
  id: string
  sub_room_id: string
  student_id: string
  column_index: number    // 0-based
  table_index: number     // 0-based
  seat_index: number      // 0-based
}
```

**Exemple de coordonnées:**
```
Colonne 0, Table 2, Siège 1 = Place avant-droite de la 3ème table
```

---

## 🛠️ FONCTIONNALITÉS COMPLÈTES

### **A. Création de Sous-Salles**

**Dialog: CreateSubRoomDialog**

**Formulaire:**
```typescript
{
  selectedRoom: Room             // Salle parent
  selectedClasses: Class[]       // Une ou plusieurs classes
  selectedTeacher: Teacher       // Professeur principal
  customName?: string            // Nom personnalisé (optionnel)
  collaborativeTeachers?: Teacher[]  // Mode collaboratif
}
```

**Nom auto-généré:**
```typescript
const autoName = `${room.name} - ${teacher.last_name}`
// Ex: "Salle A - Dupont"
```

**Multi-classes:**
```typescript
const classIds = selectedClasses.map(c => c.id)
// Sous-salle pour plusieurs classes en même temps
```

**Mode collaboratif:**
```typescript
// Créer sub_room
// Insérer sub_room_teachers avec status='pending'
// Envoyer notifications aux professeurs ajoutés
```

### **B. Éditeur de Plan**

**Composant: SeatingPlanEditor**

**Interface visuelle:**
```
+---------------------------+
|  [Tableau]                |
+---------------------------+

Colonne 1    Colonne 2    Colonne 3
┌─────┐     ┌─────┐     ┌─────┐
│ ● ● │     │ ● ● │     │ ● ● │  Table 1
│ ● ● │     │ ● ● │     │ ● ● │
└─────┘     └─────┘     └─────┘

┌─────┐     ┌─────┐     ┌─────┐
│ ● ● │     │ ● ● │     │ ● ● │  Table 2
│ ● ● │     │ ● ● │     │ ● ● │
└─────┘     └─────┘     └─────┘
```

**Drag & Drop:**
- Liste élèves (gauche)
- Glisser vers place vide
- Drop pour assigner
- Retirer : glisser vers corbeille

**Indicateurs visuels:**
```typescript
const seatColors = {
  empty: 'bg-gray-100',           // Place vide
  occupied: 'bg-blue-500',        // Place occupée
  hovered: 'bg-blue-300',         // Hover
  selected: 'bg-blue-700'         // Sélectionné
}
```

**Actions disponibles:**
- Placer élève
- Retirer élève
- Échanger 2 élèves
- Placer automatiquement
- Réinitialiser tout
- Sauvegarder

### **C. Placements Automatiques**

**Algorithmes disponibles:**

#### **1. Placement Aléatoire**
```typescript
function randomPlacement(students: Student[], seats: Seat[]) {
  const shuffled = shuffle(students)
  seats.forEach((seat, i) => {
    if (shuffled[i]) {
      assignStudentToSeat(shuffled[i], seat)
    }
  })
}
```

#### **2. Placement par Ordre Alphabétique**
```typescript
function alphabeticalPlacement(students: Student[], seats: Seat[]) {
  const sorted = students.sort((a, b) => 
    `${a.last_name} ${a.first_name}`.localeCompare(
      `${b.last_name} ${b.first_name}`
    )
  )
  
  seats.forEach((seat, i) => {
    if (sorted[i]) {
      assignStudentToSeat(sorted[i], seat)
    }
  })
}
```

#### **3. Placement Optimisé (Séparation)**
```typescript
function optimizedPlacement(students: Student[], seats: Seat[], settings) {
  // Séparer les élèves selon critères:
  // - Délégués répartis
  // - Garçons/Filles alternés (si demandé)
  // - Élèves à besoins spécifiques (devant)
  
  const delegates = students.filter(s => s.is_delegate)
  const others = students.filter(s => !s.is_delegate)
  
  // Placer délégués d'abord (répartis)
  distributeDelegates(delegates, seats)
  
  // Placer les autres
  fillRemainingSeats(others, seats)
}
```

**Options de placement:**
```typescript
interface PlacementOptions {
  algorithm: 'random' | 'alphabetical' | 'optimized'
  distributeDelegates: boolean
  alternateGender: boolean
  frontRowForSpecialNeeds: boolean
  keepFriendsTogether: boolean
  separateTroubleMakers: boolean
}
```

### **D. Visualisation**

**Modes d'affichage:**

#### **1. Vue Grille**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {subRooms.map(subRoom => (
    <SubRoomCard key={subRoom.id} subRoom={subRoom} />
  ))}
</div>
```

#### **2. Vue Liste**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nom</TableHead>
      <TableHead>Salle</TableHead>
      <TableHead>Classes</TableHead>
      <TableHead>Professeur</TableHead>
      <TableHead>Élèves placés</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {subRooms.map(subRoom => (
      <SubRoomRow key={subRoom.id} subRoom={subRoom} />
    ))}
  </TableBody>
</Table>
```

#### **3. Vue 3D (Visualiseur)**
```tsx
<SeatingVisualizer
  room={room}
  subRoom={subRoom}
  seatAssignments={assignments}
  interactive={true}
  showNames={true}
/>
```

**Affichage 3D:**
- Perspective isométrique
- Tables en 3D avec profondeur
- Noms des élèves sur les places
- Zoom et rotation
- Export en image/PDF

### **E. Export et Partage**

**Formats d'export:**

#### **1. PDF**
```typescript
function exportToPDF(subRoom: SubRoom) {
  const pdf = generatePDF({
    title: subRoom.name,
    room: room,
    seatAssignments: assignments,
    showPhoto: true,
    showInfo: true
  })
  
  downloadFile(pdf, `${subRoom.name}.pdf`)
}
```

**Contenu PDF:**
- En-tête : Nom sous-salle, date, professeur
- Plan visuel de la salle
- Légende avec noms des élèves
- QR code pour accès digital (optionnel)

#### **2. Image (PNG/JPG)**
```typescript
function exportToImage(subRoom: SubRoom, format: 'png' | 'jpg') {
  const canvas = renderToCanvas(subRoom)
  const dataUrl = canvas.toDataURL(`image/${format}`)
  downloadFile(dataUrl, `${subRoom.name}.${format}`)
}
```

#### **3. Excel (Liste)**
```typescript
function exportToExcel(subRoom: SubRoom) {
  const data = seatAssignments.map(assignment => ({
    'Colonne': assignment.column_index + 1,
    'Table': assignment.table_index + 1,
    'Siège': assignment.seat_index + 1,
    'Élève': `${student.first_name} ${student.last_name}`,
    'Classe': classe.name
  }))
  
  const xlsx = generateXLSX(data)
  downloadFile(xlsx, `${subRoom.name}.xlsx`)
}
```

---

## 🚨 GESTION DES ERREURS

### **Erreurs Communes**

#### **1. Place Déjà Occupée**
```typescript
// Contrainte UNIQUE(sub_room_id, column_index, table_index, seat_index)
if (error.code === '23505' && error.detail.includes('seat')) {
  toast({
    title: "Erreur",
    description: "Cette place est déjà occupée",
    variant: "destructive"
  })
}
```

#### **2. Élève Déjà Placé**
```typescript
// Un élève ne peut être qu'à une seule place
const existingAssignment = await checkStudentPlacement(studentId, subRoomId)
if (existingAssignment) {
  // Retirer ancienne affectation
  await removeAssignment(existingAssignment.id)
  // Puis assigner nouvelle place
}
```

#### **3. Sous-salle Pleine**
```typescript
const totalSeats = calculateTotalSeats(room.config)
const assignedSeats = seatAssignments.length

if (assignedSeats >= totalSeats) {
  toast({
    title: "Salle complète",
    description: `Toutes les ${totalSeats} places sont occupées`,
    variant: "destructive"
  })
  return
}
```

---

## 🔄 WORKFLOWS UTILISATEUR

### **Workflow 1: Créer un Plan de Classe Simple**

```
1. Professeur clique "Créer un plan"
   └─> Dialog de création s'ouvre
   
2. Sélectionne une salle : "Salle A"
   └─> Affiche config : 3 colonnes, 5 tables, 4 sièges/table = 60 places
   
3. Sélectionne sa classe : "6A" (28 élèves)
   └─> Professeur auto-sélectionné comme principal
   
4. Clique "Créer"
   ├─> Sous-salle créée : "Salle A - Dupont"
   ├─> Élèves de 6A chargés
   └─> Éditeur s'ouvre automatiquement
   
5. Dans l'éditeur:
   ├─> Liste de 28 élèves à gauche
   ├─> 60 places vides dans la salle
   └─> Clique "Placement automatique"
   
6. Algorithme place les élèves
   ├─> 28 élèves placés
   ├─> 32 places restent vides
   └─> Visualisation mise à jour
   
7. Ajustements manuels (optionnel)
   ├─> Glisser-déposer pour échanger
   └─> Retirer/replacer si besoin
   
8. Clique "Sauvegarder"
   ├─> seat_assignments insérés en base
   ├─> Toast de succès
   └─> Retour à la liste des plans
```

### **Workflow 2: Plan Collaboratif Multi-Classes**

```
1. Vie Scolaire crée plan collaboratif
   └─> Dialog de création
   
2. Sélectionne salle : "Amphi 1" (100 places)
   
3. Sélectionne plusieurs classes:
   ├─> "3A" (30 élèves)
   ├─> "3B" (28 élèves)
   └─> "3C" (25 élèves)
   = Total : 83 élèves pour 100 places
   
4. Sélectionne professeur principal : "Prof. Martin"
   
5. Ajoute professeurs collaborateurs:
   ├─> "Prof. Durand"
   └─> "Prof. Bernard"
   └─> Status: 'pending' pour chacun
   
6. Clique "Créer"
   ├─> Sous-salle créée
   ├─> sub_room_teachers insérés
   └─> Notifications envoyées aux profs
   
7. Profs reçoivent notification:
   ├─> "Vous êtes ajouté à un plan collaboratif"
   └─> Boutons: [Accepter] [Refuser]
   
8. Profs acceptent
   ├─> Status: 'pending' → 'accepted'
   └─> Accès en modification au plan
   
9. Tous les profs peuvent modifier
   ├─> Placement des élèves
   ├─> Changements visibles en temps réel
   └─> Historique des modifications (optionnel)
```

### **Workflow 3: Modification d'un Plan Existant**

```
1. Professeur ouvre liste des plans
   └─> Voit ses sous-salles
   
2. Clique sur "Modifier" pour "Salle B - Dupont"
   └─> Éditeur s'ouvre avec placements actuels
   
3. Modifications possibles:
   ├─> Échanger deux élèves (drag & drop)
   ├─> Retirer un élève (absence longue durée)
   ├─> Ajouter un nouvel élève (arrivée en cours d'année)
   └─> Réinitialiser tout et replac tout
   
4. Sauvegarde
   ├─> seat_assignments mis à jour
   ├─> updated_at actualisé
   └─> Log de modification enregistré
   
5. Toast de succès
   └─> Plan accessible immédiatement par délégués et élèves
```

---

## 📊 STATISTIQUES & MÉTRIQUES

### **Par Sous-Salle**
```typescript
interface SubRoomStats {
  totalSeats: number          // Places totales dans salle
  assignedSeats: number       // Places occupées
  emptySeats: number          // Places vides
  occupancyRate: number       // % d'occupation
  studentsCount: number       // Nombre d'élèves
  classesCount: number        // Nombre de classes
  collaboratorsCount: number  // Nombre de profs collaborateurs
}
```

### **Globales**
```typescript
const stats = {
  totalSubRooms: subRooms.length,
  avgOccupancy: calculateAvgOccupancy(),
  mostUsedRoom: getMostUsedRoom(),
  totalStudentsPlaced: getTotalPlaced()
}
```

---

**FIN DOCUMENTATION - PLANS DE CLASSE**
