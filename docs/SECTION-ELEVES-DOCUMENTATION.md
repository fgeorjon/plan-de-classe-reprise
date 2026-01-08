# 👨‍🎓 DOCUMENTATION EXHAUSTIVE - SECTION ÉLÈVES

> **Version:** 1.0.0  
> **Dernière mise à jour:** 7 janvier 2026  
> **Application:** EduPlan - Classroom Seating Software

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Rôles et Permissions](#rôles-et-permissions)
3. [Structure Base de Données](#structure-base-de-données)
4. [Connexions avec Autres Sections](#connexions-avec-autres-sections)
5. [Paramètres Sauvegardés](#paramètres-sauvegardés)
6. [Fonctionnalités Complètes](#fonctionnalités-complètes)
7. [Gestion des Erreurs](#gestion-des-erreurs)
8. [Workflows Utilisateur](#workflows-utilisateur)

---

## 🎯 VUE D'ENSEMBLE

La section Élèves permet de gérer l'ensemble des élèves de l'établissement avec leurs informations personnelles, leur affectation aux classes, et leurs rôles spécifiques (délégué, éco-délégué).

**Route:** `/dashboard/students`  
**Composant principal:** `StudentsManagement`  
**Fichier:** `components/students-management.tsx`

**Particularités:**
- Affichage contextualisé selon le rôle de l'utilisateur
- Import/Export en masse (CSV, Excel)
- Gestion des délégués et éco-délégués
- Photos de profil
- Recherche et filtrage avancés

---

## 👥 RÔLES ET PERMISSIONS

### **Vie Scolaire** (vie-scolaire)
✅ **Accès complet à tous les élèves**
- Créer des élèves
- Modifier tous les élèves
- Supprimer des élèves
- Affecter aux classes
- Désigner délégués/éco-délégués
- Import/Export en masse
- Générer identifiants et mots de passe

### **Professeur** (professeur)
✅ **Accès aux élèves de ses classes uniquement**
- Voir les élèves de ses classes
- Modifier les notes/commentaires (si implémenté)
- ❌ Ne peut PAS créer/supprimer d'élèves
- ❌ Ne peut PAS modifier les informations personnelles
- ❌ Ne peut PAS affecter à d'autres classes

### **Délégué/Éco-délégué** (delegue, eco-delegue)
✅ **Accès à sa classe uniquement (lecture seule)**
- Voir les élèves de sa classe
- ❌ Aucune modification possible
- ❌ Pas d'export

### **Élève** (student/eleve)
❌ **Aucun accès**
- Ne peut pas accéder à cette section

---

## 🗂️ STRUCTURE BASE DE DONNÉES

### **Table: students**

\`\`\`sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  establishment_id UUID NOT NULL REFERENCES establishments(id),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Informations personnelles
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  photo_url TEXT,
  
  -- Rôles spéciaux
  is_delegate BOOLEAN DEFAULT FALSE,
  is_eco_delegate BOOLEAN DEFAULT FALSE,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour optimisation
CREATE INDEX idx_students_establishment ON students(establishment_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_profile ON students(profile_id);
CREATE INDEX idx_students_delegate ON students(is_delegate) WHERE is_delegate = TRUE;

-- Contrainte : un élève ne peut être que dans une seule classe
ALTER TABLE students ADD CONSTRAINT student_single_class 
  CHECK (class_id IS NOT NULL);

-- Trigger pour update timestamp
CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
\`\`\`

**Champs détaillés:**

| Champ | Type | Description | Requis | Unique |
|-------|------|-------------|---------|--------|
| `id` | UUID | Identifiant unique | ✅ | ✅ |
| `profile_id` | UUID | Lien vers profil utilisateur (si compte créé) | ❌ | ✅ |
| `establishment_id` | UUID | Établissement | ✅ | ❌ |
| `class_id` | UUID | Classe affectée | ✅ | ❌ |
| `first_name` | TEXT | Prénom | ✅ | ❌ |
| `last_name` | TEXT | Nom de famille | ✅ | ❌ |
| `email` | TEXT | Email (pour créer compte) | ❌ | ✅ |
| `phone` | TEXT | Téléphone | ❌ | ❌ |
| `date_of_birth` | DATE | Date de naissance | ❌ | ❌ |
| `photo_url` | TEXT | URL photo de profil | ❌ | ❌ |
| `is_delegate` | BOOLEAN | Est délégué de classe | ❌ | ❌ |
| `is_eco_delegate` | BOOLEAN | Est éco-délégué | ❌ | ❌ |
| `created_at` | TIMESTAMPTZ | Date de création | ✅ (auto) | ❌ |
| `updated_at` | TIMESTAMPTZ | Date de modification | ✅ (auto) | ❌ |

---

## 🔗 CONNEXIONS AVEC AUTRES SECTIONS

### **→ Section Classes** (`/dashboard/classes`)
**Relation:** Many-to-One (N élèves → 1 classe)

**Données liées:**
\`\`\`typescript
students.class_id → classes.id
\`\`\`

**Impact:**
- Affectation d'élève nécessite une classe existante
- Suppression de classe → Élèves orphelins (gestion à prévoir)
- Changement de classe → Mise à jour immédiate

### **→ Section Plans de Classe** (`/dashboard/seating-plan`)
**Relation:** Via `seat_assignments`

**Données liées:**
\`\`\`typescript
seat_assignments.student_id → students.id
seat_assignments.sub_room_id → sub_rooms.id
\`\`\`

**Impact:**
- Placement des élèves dans les plans de classe
- Suppression d'élève → Placements orphelins
- Modification nom élève → Visible immédiatement dans plans

### **→ Section Bac à Sable** (`/dashboard/sandbox`)
**Relation:** Propositions créées par délégués

**Données liées:**
\`\`\`typescript
sub_room_proposals.proposed_by → profiles.id (students.profile_id)
\`\`\`

**Impact:**
- Délégués peuvent créer des propositions
- Accès sandbox nécessite `is_delegate = TRUE` ou `is_eco_delegate = TRUE`

### **→ Système d'Authentification** (`/auth`)
**Relation:** Création de comptes pour élèves

**Données liées:**
\`\`\`typescript
students.profile_id → profiles.id
profiles.role → 'delegue' | 'eco-delegue' | 'eleve'
\`\`\`

**Impact:**
- Génération automatique d'identifiants
- Format: `prenom.nom@local` ou email fourni
- Mot de passe généré automatiquement ou personnalisé

---

## ⚙️ PARAMÈTRES SAUVEGARDÉS

### **États Locaux (React State)**

\`\`\`typescript
interface StudentsManagementState {
  // Données
  students: Student[]                // Liste des élèves chargés
  classes: Class[]                   // Liste des classes disponibles
  filteredStudents: Student[]        // Élèves après filtrage
  
  // UI States
  isLoading: boolean                 // Chargement initial
  isAddDialogOpen: boolean           // Dialog ajout
  isEditDialogOpen: boolean          // Dialog édition
  isImportDialogOpen: boolean        // Dialog import
  isPhotoDialogOpen: boolean         // Dialog photo
  
  // Sélection
  selectedStudent: Student | null    // Élève en cours d'édition
  selectedStudentIds: string[]       // Sélection multiple (pour actions groupées)
  
  // Filtres
  searchQuery: string                // Recherche par nom
  selectedClassFilter: string | null // Filtre par classe
  selectedRoleFilter: string | null  // Filtre par rôle (délégué/éco/tous)
  
  // Formulaire
  formData: StudentFormData
  
  // Upload
  uploadedPhoto: File | null         // Photo en cours d'upload
  photoPreview: string | null        // Preview de la photo
}

interface StudentFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string
  class_id: string
  is_delegate: boolean
  is_eco_delegate: boolean
  generate_account: boolean          // Créer un compte utilisateur
  username: string                   // Identifiant généré
  password: string                   // Mot de passe généré
}
\`\`\`

### **Contraintes de Validation**

\`\`\`typescript
const validation = {
  first_name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/  // Lettres + accents + tirets + apostrophes
  },
  last_name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZÀ-ÿ\s\-']+$/
  },
  email: {
    required: false,  // Optionnel
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    unique: true  // Unique si fourni
  },
  phone: {
    required: false,
    pattern: /^(\+33|0)[1-9](\d{2}){4}$/  // Format français
  },
  date_of_birth: {
    required: false,
    minAge: 6,   // Âge minimum
    maxAge: 25   // Âge maximum
  },
  class_id: {
    required: true,
    mustExist: true  // Doit être une classe existante
  },
  is_delegate: {
    type: "boolean",
    conflictWith: null  // Peut être délégué ET éco-délégué
  },
  is_eco_delegate: {
    type: "boolean",
    conflictWith: null
  },
  username: {
    required: true,  // Si generate_account = true
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-z0-9._-]+$/,
    unique: true
  },
  password: {
    required: true,  // Si generate_account = true
    minLength: 8,
    mustContain: {
      lowercase: true,
      uppercase: true,
      number: true,
      special: false  // Optionnel
    }
  }
}
\`\`\`

### **Format d'Import CSV**

\`\`\`csv
prenom,nom,email,telephone,date_naissance,classe,delegue,eco_delegue
Jean,Dupont,jean.dupont@example.com,0612345678,2010-05-15,6A,true,false
Marie,Martin,marie.martin@example.com,0623456789,2010-08-22,6A,false,true
Pierre,Durand,pierre.durand@example.com,0634567890,2011-01-10,6B,false,false
\`\`\`

**Colonnes obligatoires:**
- `prenom`, `nom`, `classe`

**Colonnes optionnelles:**
- `email`, `telephone`, `date_naissance`, `delegue`, `eco_delegue`

---

## 🛠️ FONCTIONNALITÉS COMPLÈTES

### **A. Gestion Individuelle des Élèves**

#### **1. Ajout d'un Élève**

**Déclencheur:** Clic sur "Ajouter un élève"

**Formulaire complet:**
\`\`\`typescript
{
  // Onglet 1: Informations personnelles
  first_name: string          // Prénom *
  last_name: string           // Nom *
  date_of_birth: string       // Date de naissance
  email: string               // Email
  phone: string               // Téléphone
  photo: File                 // Photo de profil
  
  // Onglet 2: Affectation
  class_id: string            // Classe *
  is_delegate: boolean        // Délégué
  is_eco_delegate: boolean    // Éco-délégué
  
  // Onglet 3: Compte utilisateur
  generate_account: boolean   // Créer un compte
  username: string            // Identifiant (auto-généré)
  password: string            // Mot de passe (auto-généré)
}
\`\`\`

**Processus:**
\`\`\`typescript
async function handleAddStudent() {
  // 1. Valider les données
  if (!formData.first_name || !formData.last_name || !formData.class_id) {
    showError("Champs obligatoires manquants")
    return
  }
  
  // 2. Upload photo si fournie
  let photo_url = null
  if (uploadedPhoto) {
    photo_url = await uploadPhoto(uploadedPhoto)
  }
  
  // 3. Créer le profil utilisateur si demandé
  let profile_id = null
  if (formData.generate_account) {
    profile_id = await createUserProfile({
      username: formData.username,
      password: formData.password,
      role: formData.is_delegate ? 'delegue' : 
            formData.is_eco_delegate ? 'eco-delegue' : 'eleve',
      establishment_id: establishmentId
    })
  }
  
  // 4. Créer l'élève
  const { data, error } = await supabase
    .from('students')
    .insert([{
      ...formData,
      profile_id,
      photo_url,
      establishment_id: establishmentId
    }])
    .select()
    .single()
  
  // 5. Log action
  await logAction('create', 'student', data.id, `${data.first_name} ${data.last_name}`)
  
  // 6. Rafraîchir
  fetchStudents()
}
\`\`\`

#### **2. Modification d'un Élève**

**Déclencheur:** Menu contextuel → "Modifier"

**Permissions:**
- Vie Scolaire : Peut tout modifier
- Professeur : ❌ Aucune modification

**Formulaire pré-rempli:**
- Toutes les données actuelles de l'élève
- Photo actuelle affichée
- Classe actuelle sélectionnée

**Processus:**
\`\`\`typescript
async function handleEditStudent() {
  const { error } = await supabase
    .from('students')
    .update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      date_of_birth: formData.date_of_birth,
      class_id: formData.class_id,
      is_delegate: formData.is_delegate,
      is_eco_delegate: formData.is_eco_delegate,
      photo_url: newPhotoUrl || currentPhotoUrl
    })
    .eq('id', selectedStudent.id)
  
  await logAction('update', 'student', selectedStudent.id, 
    `${formData.first_name} ${formData.last_name}`)
  
  fetchStudents()
}
\`\`\`

#### **3. Suppression d'un Élève**

**Déclencheur:** Menu contextuel → "Supprimer"

**Permissions:** Vie Scolaire uniquement

**Confirmation:**
\`\`\`typescript
if (!confirm(`Êtes-vous sûr de vouloir supprimer ${student.first_name} ${student.last_name} ?`)) {
  return
}
\`\`\`

**Impact de la suppression:**
- ⚠️ Supprime l'élève de la base
- ⚠️ Supprime les placements dans les plans de classe
- ⚠️ Conserve le profil utilisateur (si existant) mais déconnecté
- ✅ Action irréversible

**Processus:**
\`\`\`typescript
async function handleDeleteStudent(student: Student) {
  // 1. Supprimer les placements
  await supabase
    .from('seat_assignments')
    .delete()
    .eq('student_id', student.id)
  
  // 2. Supprimer l'élève
  await supabase
    .from('students')
    .delete()
    .eq('id', student.id)
  
  // 3. Log action
  await logAction('delete', 'student', student.id, 
    `${student.first_name} ${student.last_name}`)
  
  // 4. Rafraîchir
  fetchStudents()
}
\`\`\`

### **B. Gestion en Masse**

#### **1. Import CSV/Excel**

**Déclencheur:** Bouton "Importer"

**Formats supportés:**
- `.csv` (UTF-8, séparateur `,` ou `;`)
- `.xlsx` (Excel)
- `.xls` (Excel ancien format)

**Colonnes reconnues:**
\`\`\`typescript
const columnMapping = {
  'prenom': 'first_name',
  'nom': 'last_name',
  'email': 'email',
  'telephone': 'phone',
  'tel': 'phone',
  'date_naissance': 'date_of_birth',
  'classe': 'class_id',
  'delegue': 'is_delegate',
  'eco_delegue': 'is_eco_delegate'
}
\`\`\`

**Processus:**
\`\`\`typescript
async function handleImport(file: File) {
  // 1. Parser le fichier
  const data = await parseCSV(file)
  
  // 2. Valider chaque ligne
  const validRows = []
  const errors = []
  
  for (const row of data) {
    const validation = validateStudentRow(row)
    if (validation.valid) {
      validRows.push(row)
    } else {
      errors.push({
        row: row,
        errors: validation.errors
      })
    }
  }
  
  // 3. Afficher preview
  showImportPreview(validRows, errors)
  
  // 4. Confirmer import
  if (await confirmImport()) {
    // 5. Insérer en masse
    const { data, error } = await supabase
      .from('students')
      .insert(validRows.map(row => ({
        ...row,
        establishment_id: establishmentId
      })))
    
    // 6. Log action
    await logAction('import', 'students', null, 
      `${validRows.length} élèves importés`)
    
    // 7. Rafraîchir
    fetchStudents()
    
    // 8. Afficher résumé
    showImportSummary({
      total: data.length,
      success: validRows.length,
      errors: errors.length
    })
  }
}
\`\`\`

#### **2. Export CSV/Excel**

**Déclencheur:** Bouton "Exporter"

**Formats disponibles:**
- `.csv` (UTF-8 with BOM pour Excel)
- `.xlsx` (Excel moderne)

**Colonnes exportées:**
\`\`\`typescript
const exportColumns = [
  'Prénom',
  'Nom',
  'Classe',
  'Email',
  'Téléphone',
  'Date de naissance',
  'Délégué',
  'Éco-délégué',
  'Date d'inscription'
]
\`\`\`

**Processus:**
\`\`\`typescript
function handleExport(format: 'csv' | 'xlsx') {
  // 1. Préparer les données
  const exportData = students.map(student => ({
    'Prénom': student.first_name,
    'Nom': student.last_name,
    'Classe': classes.find(c => c.id === student.class_id)?.name,
    'Email': student.email || '',
    'Téléphone': student.phone || '',
    'Date de naissance': student.date_of_birth || '',
    'Délégué': student.is_delegate ? 'Oui' : 'Non',
    'Éco-délégué': student.is_eco_delegate ? 'Oui' : 'Non',
    'Date d\'inscription': new Date(student.created_at).toLocaleDateString('fr-FR')
  }))
  
  // 2. Générer le fichier
  if (format === 'csv') {
    const csv = generateCSV(exportData)
    downloadFile(csv, 'eleves.csv', 'text/csv')
  } else {
    const xlsx = generateXLSX(exportData)
    downloadFile(xlsx, 'eleves.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }
  
  // 3. Log action
  await logAction('export', 'students', null, 
    `${students.length} élèves exportés (${format})`)
}
\`\`\`

#### **3. Actions Groupées**

**Sélection multiple:**
- Checkbox sur chaque ligne
- Checkbox "Tout sélectionner" dans header
- Badge affichant le nombre d'élèves sélectionnés

**Actions disponibles:**
1. **Changer de classe** (en masse)
2. **Supprimer** (en masse)
3. **Exporter** (sélection uniquement)
4. **Générer comptes** (en masse)

**Exemple: Changer de classe en masse**
\`\`\`typescript
async function handleBulkClassChange(studentIds: string[], newClassId: string) {
  const { error } = await supabase
    .from('students')
    .update({ class_id: newClassId })
    .in('id', studentIds)
  
  await logAction('bulk_update', 'students', null, 
    `${studentIds.length} élèves changés de classe`)
  
  fetchStudents()
}
\`\`\`

### **C. Recherche et Filtrage**

#### **1. Recherche par Nom**

**Input de recherche:**
\`\`\`typescript
<Input
  placeholder="Rechercher un élève..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  debounce={300}  // Attendre 300ms après frappe
/>
\`\`\`

**Fonction de recherche:**
\`\`\`typescript
function filterStudents() {
  return students.filter(student => {
    // Recherche insensible à la casse
    const query = searchQuery.toLowerCase()
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    
    return fullName.includes(query) ||
           student.first_name.toLowerCase().includes(query) ||
           student.last_name.toLowerCase().includes(query)
  })
}
\`\`\`

#### **2. Filtre par Classe**

**Select dropdown:**
\`\`\`typescript
<Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
  <SelectItem value="all">Toutes les classes</SelectItem>
  {classes.map(classe => (
    <SelectItem key={classe.id} value={classe.id}>
      {classe.name}
    </SelectItem>
  ))}
</Select>
\`\`\`

**Fonction de filtrage:**
\`\`\`typescript
function filterByClass() {
  if (!selectedClassFilter || selectedClassFilter === 'all') {
    return students
  }
  
  return students.filter(student => 
    student.class_id === selectedClassFilter
  )
}
\`\`\`

#### **3. Filtre par Rôle**

**Tabs:**
\`\`\`typescript
<Tabs defaultValue="all" onValueChange={setSelectedRoleFilter}>
  <TabsList>
    <TabsTrigger value="all">Tous</TabsTrigger>
    <TabsTrigger value="delegate">Délégués</TabsTrigger>
    <TabsTrigger value="eco_delegate">Éco-délégués</TabsTrigger>
  </TabsList>
</Tabs>
\`\`\`

**Fonction de filtrage:**
\`\`\`typescript
function filterByRole() {
  switch (selectedRoleFilter) {
    case 'delegate':
      return students.filter(s => s.is_delegate)
    case 'eco_delegate':
      return students.filter(s => s.is_eco_delegate)
    default:
      return students
  }
}
\`\`\`

#### **4. Filtrage Combiné**

\`\`\`typescript
function getFilteredStudents() {
  let filtered = students
  
  // Appliquer recherche
  if (searchQuery) {
    filtered = filtered.filter(student => {
      const query = searchQuery.toLowerCase()
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      return fullName.includes(query)
    })
  }
  
  // Appliquer filtre classe
  if (selectedClassFilter && selectedClassFilter !== 'all') {
    filtered = filtered.filter(s => s.class_id === selectedClassFilter)
  }
  
  // Appliquer filtre rôle
  if (selectedRoleFilter !== 'all') {
    filtered = filtered.filter(s => {
      if (selectedRoleFilter === 'delegate') return s.is_delegate
      if (selectedRoleFilter === 'eco_delegate') return s.is_eco_delegate
      return true
    })
  }
  
  return filtered
}
\`\`\`

### **D. Gestion des Photos**

#### **1. Upload de Photo**

**Input file:**
\`\`\`typescript
<Input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={handlePhotoSelect}
  maxSize={5 * 1024 * 1024}  // 5MB max
/>
\`\`\`

**Processus d'upload:**
\`\`\`typescript
async function handlePhotoUpload(file: File) {
  // 1. Valider le fichier
  if (file.size > 5 * 1024 * 1024) {
    showError("Fichier trop volumineux (max 5MB)")
    return
  }
  
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showError("Format non supporté")
    return
  }
  
  // 2. Redimensionner l'image
  const resized = await resizeImage(file, 400, 400)
  
  // 3. Upload vers Supabase Storage
  const fileName = `${uuidv4()}.webp`
  const { data, error } = await supabase.storage
    .from('student-photos')
    .upload(`${establishmentId}/${fileName}`, resized, {
      contentType: 'image/webp',
      upsert: false
    })
  
  // 4. Récupérer URL publique
  const { data: publicUrl } = supabase.storage
    .from('student-photos')
    .getPublicUrl(data.path)
  
  return publicUrl.publicUrl
}
\`\`\`

#### **2. Affichage des Photos**

**Avatar avec fallback:**
\`\`\`typescript
<Avatar className="w-12 h-12">
  {student.photo_url ? (
    <AvatarImage src={student.photo_url || "/placeholder.svg"} alt={`${student.first_name} ${student.last_name}`} />
  ) : (
    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
      {student.first_name[0]}{student.last_name[0]}
    </AvatarFallback>
  )}
</Avatar>
\`\`\`

---

## 🚨 GESTION DES ERREURS

### **Erreurs Communes**

#### **1. Email Déjà Existant**

**Erreur Supabase:**
\`\`\`
code: "23505"
detail: "Key (email)=(xxx) already exists"
\`\`\`

**Gestion:**
\`\`\`typescript
if (error?.code === '23505' && error.detail?.includes('email')) {
  toast({
    title: "Erreur",
    description: "Cet email est déjà utilisé par un autre élève",
    variant: "destructive"
  })
}
\`\`\`

#### **2. Classe Inexistante**

**Erreur Supabase:**
\`\`\`
code: "23503"
detail: "Key (class_id)=(xxx) is not present in table classes"
\`\`\`

**Gestion:**
\`\`\`typescript
if (error?.code === '23503' && error.detail?.includes('class_id')) {
  toast({
    title: "Erreur",
    description: "La classe sélectionnée n'existe pas",
    variant: "destructive"
  })
}
\`\`\`

#### **3. Photo Trop Volumineuse**

**Validation côté client:**
\`\`\`typescript
if (file.size > 5 * 1024 * 1024) {
  toast({
    title: "Erreur",
    description: "La photo ne doit pas dépasser 5MB",
    variant: "destructive"
  })
  return
}
\`\`\`

#### **4. Format CSV Invalide**

**Validation lors de l'import:**
\`\`\`typescript
if (!hasRequiredColumns(csvData, ['prenom', 'nom', 'classe'])) {
  toast({
    title: "Erreur",
    description: "Le fichier CSV doit contenir au minimum les colonnes: prenom, nom, classe",
    variant: "destructive"
  })
  return
}
\`\`\`

---

## 🔄 WORKFLOWS UTILISATEUR

### **Workflow 1: Ajouter un Nouvel Élève**

\`\`\`
1. Vie Scolaire clique sur "Ajouter un élève"
   └─> Dialog s'ouvre avec formulaire à onglets
   
2. Onglet "Informations"
   ├─> Saisit prénom : "Jean"
   ├─> Saisit nom : "Dupont"
   ├─> (Optionnel) Ajoute email : "jean.dupont@example.com"
   ├─> (Optionnel) Ajoute téléphone : "0612345678"
   ├─> (Optionnel) Sélectionne date de naissance
   └─> (Optionnel) Upload photo de profil
   
3. Onglet "Affectation"
   ├─> Sélectionne classe : "6A"
   ├─> Coche "Délégué" si applicable
   └─> Coche "Éco-délégué" si applicable
   
4. Onglet "Compte utilisateur" (optionnel)
   ├─> Coche "Créer un compte"
   ├─> Identifiant généré automatiquement : "jean.dupont"
   ├─> Mot de passe généré : "Abc12345!"
   └─> Peut modifier identifiant et mot de passe
   
5. Clique sur "Ajouter"
   ├─> Validation complète des champs
   ├─> Upload photo (si fournie)
   ├─> Création du profil utilisateur (si demandé)
   ├─> Insertion en base de données
   └─> Log de l'action
   
6. Toast de succès affiché
   ├─> Dialog se ferme
   ├─> Liste des élèves mise à jour
   └─> Nouvel élève visible immédiatement
\`\`\`

### **Workflow 2: Import en Masse depuis CSV**

\`\`\`
1. Vie Scolaire clique sur "Importer"
   └─> Dialog d'import s'ouvre
   
2. Télécharge template CSV
   └─> Fichier avec colonnes pré-définies
   
3. Remplit le fichier CSV
   ├─> Ajoute les élèves ligne par ligne
   └─> Sauvegarde en UTF-8
   
4. Upload le fichier dans le dialog
   └─> Parsing automatique
   
5. Preview des données
   ├─> Affichage des lignes valides (en vert)
   ├─> Affichage des erreurs (en rouge)
   └─> Statistiques : X valides, Y erreurs
   
6. Corrige les erreurs (si nécessaire)
   ├─> Re-upload le fichier
   └─> Validation à nouveau
   
7. Confirme l'import
   ├─> Insertion en masse
   ├─> Log de l'action
   └─> Toast de succès
   
8. Résumé affiché
   ├─> "50 élèves importés avec succès"
   ├─> "3 erreurs détectées"
   └─> Option de télécharger rapport d'erreurs
\`\`\`

### **Workflow 3: Modifier un Élève**

\`\`\`
1. Vie Scolaire clique sur menu (⋯) d'un élève
   └─> Menu dropdown s'ouvre
   
2. Sélectionne "Modifier"
   └─> Dialog s'ouvre pré-rempli
   
3. Modifie les informations nécessaires
   ├─> Change de classe : "6A" → "6B"
   ├─> Ajoute email manquant
   ├─> Met à jour téléphone
   └─> Change photo
   
4. Clique sur "Enregistrer"
   ├─> Validation
   ├─> Update en base
   └─> Log action
   
5. Toast de succès
   ├─> Dialog se ferme
   ├─> Élève mis à jour dans liste
   └─> Changements visibles dans plans de classe
\`\`\`

### **Workflow 4: Désigner un Délégué**

\`\`\`
1. Vie Scolaire clique sur menu (⋯) d'un élève
   └─> Menu dropdown s'ouvre
   
2. Sélectionne "Modifier"
   └─> Dialog s'ouvre
   
3. Onglet "Affectation"
   └─> Coche "Délégué"
   
4. Onglet "Compte utilisateur"
   ├─> Coche "Créer un compte" (si pas déjà fait)
   ├─> Rôle automatiquement : "delegue"
   └─> Identifiant et mot de passe générés
   
5. Enregistre
   ├─> Update en base
   ├─> Création profil si nécessaire
   └─> Log action
   
6. Élève peut maintenant se connecter
   ├─> Accès section "Ma classe"
   ├─> Accès "Plan de Classe"
   └─> Accès "Bac à sable" pour créer propositions
\`\`\`

---

## 📊 STATISTIQUES & MÉTRIQUES

### **Affichées dans l'Interface**

\`\`\`typescript
// Header de la section
const totalStudents = students.length
const filteredCount = filteredStudents.length
const delegatesCount = students.filter(s => s.is_delegate).length
const ecoCount = students.filter(s => s.is_eco_delegate).length

<div>
  <p>{totalStudents} élève{totalStudents !== 1 ? 's' : ''} enregistré{totalStudents !== 1 ? 's' : ''}</p>
  {filteredCount !== totalStudents && (
    <p>{filteredCount} résultat{filteredCount !== 1 ? 's' : ''} affiché{filteredCount !== 1 ? 's' : ''}</p>
  )}
  <p>{delegatesCount} délégué{delegatesCount !== 1 ? 's' : ''}</p>
  <p>{ecoCount} éco-délégué{ecoCount !== 1 ? 's' : ''}</p>
</div>
\`\`\`

### **Par Classe**

\`\`\`typescript
const studentsByClass = classes.map(classe => ({
  className: classe.name,
  count: students.filter(s => s.class_id === classe.id).length,
  delegates: students.filter(s => s.class_id === classe.id && s.is_delegate).length
}))
\`\`\`

---

## 🧪 COMMANDES DE DÉBOGAGE

### **Vérifier les Élèves en Base**

\`\`\`sql
-- Compter les élèves par classe
SELECT 
  c.name as classe,
  COUNT(s.id) as nb_eleves,
  COUNT(CASE WHEN s.is_delegate THEN 1 END) as nb_delegues,
  COUNT(CASE WHEN s.is_eco_delegate THEN 1 END) as nb_eco
FROM students s
JOIN classes c ON s.class_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Élèves sans classe
SELECT * FROM students WHERE class_id IS NULL;

-- Élèves avec compte utilisateur
SELECT 
  s.first_name,
  s.last_name,
  p.username,
  p.role
FROM students s
JOIN profiles p ON s.profile_id = p.id;

-- Délégués de l'établissement
SELECT 
  s.first_name || ' ' || s.last_name as nom_complet,
  c.name as classe,
  CASE 
    WHEN s.is_delegate THEN 'Délégué'
    WHEN s.is_eco_delegate THEN 'Éco-délégué'
  END as role
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.is_delegate OR s.is_eco_delegate
ORDER BY c.name;
\`\`\`

---

**FIN DE LA DOCUMENTATION - SECTION ÉLÈVES**
\`\`\`

Je continue maintenant avec les autres sections. Voulez-vous que je crée également les documentations pour :
- Section Professeurs
- Section Plans de Classe
- Section Bac à Sable
- Section Historique

Et ensuite le cahier des charges global qui synthétise toutes les connexions ?
