# 💡 DOCUMENTATION EXHAUSTIVE - SECTION BAC À SABLE

> **Version:** 1.0.0  
> **Dernière mise à jour:** 7 janvier 2026  
> **Application:** EduPlan - Classroom Seating Software

---

## 📋 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Concept du Bac à Sable](#concept-du-bac-à-sable)
3. [Rôles et Permissions](#rôles-et-permissions)
4. [Structure Base de Données](#structure-base-de-données)
5. [Workflow de Proposition](#workflow-de-proposition)
6. [Statuts des Propositions](#statuts-des-propositions)
7. [Fonctionnalités Complètes](#fonctionnalités-complètes)
8. [Connexions avec Autres Sections](#connexions-avec-autres-sections)

---

## 🎯 VUE D'ENSEMBLE

Le Bac à Sable est un espace collaboratif où les délégués peuvent créer et proposer des plans de classe à leurs professeurs, qui peuvent ensuite les valider, modifier ou refuser.

**Route:** `/dashboard/sandbox`  
**Composant principal:** `SandboxManagement`  
**Fichier:** `components/sandbox-management.tsx`

**Philosophie:**
> "Donner du pouvoir aux délégués tout en gardant le contrôle aux professeurs"

---

## 💡 CONCEPT DU BAC À SABLE

### **Pourquoi un Bac à Sable?**

1. **Participation des élèves**
   - Les délégués connaissent mieux leur classe
   - Proposent des arrangements optimaux
   - Sentiment d'implication et responsabilité

2. **Sécurité et Contrôle**
   - Les propositions ne sont PAS appliquées directement
   - Les professeurs gardent le dernier mot
   - Possibilité de modifier avant validation

3. **Collaboration**
   - Discussion constructive profs-délégués
   - Feedback via commentaires
   - Itérations possibles

### **Flux de Travail**

\`\`\`
Délégué            Bac à Sable           Professeur         Production
   │                    │                     │                  │
   ├─> Créer           │                     │                  │
   │   proposition     │                     │                  │
   │                    │                     │                  │
   ├─> Éditer          │                     │                  │
   │   (brouillon)     │                     │                  │
   │                    │                     │                  │
   ├─> Soumettre ─────>│                     │                  │
   │                    │                     │                  │
   │                    ├─────> Notif ─────>│                  │
   │                    │                     │                  │
   │                    │         Réviser <──┤                  │
   │                    │                     │                  │
   │                    │         Valider ───┼───> Créer ────>│
   │                    │                     │      sous-salle  │
   │                    │                     │                  │
   │                    │         Refuser <──┤                  │
   │<──── Notif ────────┤                     │                  │
   │                    │                     │                  │
   └─> Rééditer        │                     │                  │
\`\`\`

---

## 👥 RÔLES ET PERMISSIONS

### **Délégué / Éco-délégué** (delegue, eco-delegue)
✅ **Créateur de propositions**

**Peut:**
- Créer des propositions (brouillons)
- Éditer ses brouillons
- Soumettre pour validation
- Voir l'historique de ses propositions
- Rééditer après refus
- Supprimer ses brouillons

**Ne peut PAS:**
- Valider ses propres propositions
- Voir les propositions d'autres délégués
- Modifier des propositions soumises
- Accéder aux plans validés directement

### **Professeur** (professeur)
✅ **Validateur et Réviseur**

**Peut:**
- Voir toutes les propositions de ses classes
- Réviser/Modifier les propositions avant validation
- Valider (créer sous-salle réelle)
- Refuser avec commentaire
- Renvoyer avec demande de modifications

**Ne peut PAS:**
- Créer des propositions dans le sandbox
- Voir les propositions d'autres professeurs

### **Vie Scolaire** (vie-scolaire)
✅ **Superviseur**

**Peut:**
- Voir toutes les propositions de l'établissement
- (Optionnel) Valider à la place des professeurs
- Statistiques globales sur l'utilisation

---

## 🗂️ STRUCTURE BASE DE DONNÉES

### **Table: sub_room_proposals**

\`\`\`sql
CREATE TABLE sub_room_proposals (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  
  -- Liens
  room_id UUID REFERENCES rooms(id) NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id),
  teacher_id UUID REFERENCES teachers(id) NOT NULL,
  proposed_by UUID REFERENCES profiles(id) NOT NULL,
  establishment_id UUID REFERENCES establishments(id) NOT NULL,
  
  -- État
  status TEXT CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  is_submitted BOOLEAN DEFAULT FALSE,
  
  -- Données du plan
  seat_assignments JSONB,                    -- Placements proposés
  comments TEXT,                             -- Commentaires du proposant
  
  -- Révision
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,                     -- Si refusé
  
  -- Lien vers sous-salle créée
  sub_room_id UUID REFERENCES sub_rooms(id), -- Si validé
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

**Champs clés:**

| Champ | Type | Description |
|-------|------|-------------|
| `status` | ENUM | draft, pending, approved, rejected |
| `is_submitted` | BOOLEAN | FALSE = brouillon, TRUE = soumis |
| `seat_assignments` | JSONB | Placements au format `[{student_id, column, table, seat}]` |
| `rejection_reason` | TEXT | Commentaire si refusé |
| `sub_room_id` | UUID | Lien vers sous-salle créée si validé |

---

## 🔄 STATUTS DES PROPOSITIONS

### **Cycle de Vie**

\`\`\`mermaid
graph LR
    A[draft] -->|Soumettre| B[pending]
    B -->|Valider| C[approved]
    B -->|Refuser| D[rejected]
    B -->|Renvoyer| A
    D -->|Rééditer| A
    C -->|Créé| E[sub_room réelle]
\`\`\`

### **1. Draft (Brouillon)**

**Caractéristiques:**
- `status = 'draft'`
- `is_submitted = FALSE`
- Éditable par le délégué
- Supprimable
- Non visible par le professeur

**Actions possibles:**
- Éditer
- Soumettre
- Supprimer

**Badge UI:**
\`\`\`tsx
<Badge variant="outline" className="bg-gray-50 text-gray-700">
  <FileText className="w-3 h-3 mr-1" />
  Brouillon
</Badge>
\`\`\`

### **2. Pending (En Attente)**

**Caractéristiques:**
- `status = 'pending'`
- `is_submitted = TRUE`
- Non éditable par le délégué
- Visible par le professeur
- Notification envoyée

**Actions possibles (Professeur):**
- Réviser/Modifier
- Valider
- Refuser
- Renvoyer

**Badge UI:**
\`\`\`tsx
<Badge variant="outline" className="bg-yellow-50 text-yellow-700">
  <Clock className="w-3 h-3 mr-1" />
  En attente
</Badge>
\`\`\`

### **3. Approved (Validée)**

**Caractéristiques:**
- `status = 'approved'`
- `sub_room_id` renseigné
- Sous-salle créée
- Non modifiable
- Archivée

**Badge UI:**
\`\`\`tsx
<Badge variant="outline" className="bg-green-50 text-green-700">
  <CheckCircle2 className="w-3 h-3 mr-1" />
  Validée
</Badge>
\`\`\`

### **4. Rejected (Refusée)**

**Caractéristiques:**
- `status = 'rejected'`
- `rejection_reason` renseigné
- Rééditable par le délégué
- Notification envoyée

**Badge UI:**
\`\`\`tsx
<Badge variant="outline" className="bg-red-50 text-red-700">
  <XCircle className="w-3 h-3 mr-1" />
  Refusée
</Badge>
\`\`\`

---

## 🛠️ FONCTIONNALITÉS COMPLÈTES

### **A. Création de Proposition (Délégué)**

**Dialog: CreateProposalDialog**

**Formulaire:**
\`\`\`typescript
{
  name: string                // Nom de la proposition
  room_id: string             // Salle sélectionnée
  class_id: string            // Classe (auto: classe du délégué)
  teacher_id: string          // Professeur concerné
  comments?: string           // Message pour le prof
}
\`\`\`

**Processus:**
\`\`\`typescript
async function createProposal(data) {
  const { data: proposal, error } = await supabase
    .from('sub_room_proposals')
    .insert([{
      ...data,
      proposed_by: userId,
      establishment_id: establishmentId,
      status: 'draft',
      is_submitted: false
    }])
    .select()
    .single()
  
  // Ouvrir éditeur pour placer les élèves
  openEditor(proposal)
}
\`\`\`

### **B. Édition de Proposition**

**Composant: SandboxEditor**

**Interface:**
\`\`\`
┌─────────────────────────────────────────────┐
│  Proposition: "Plan pour Mme Dupont"       │
│  Status: [Brouillon]                        │
├─────────────────────────────────────────────┤
│                                             │
│  Élèves non placés (12)    │   Salle       │
│  ─────────────────────     │   ─────────   │
│  □ Alice Bernard           │   [ ] [ ] [ ] │
│  □ Bob Durand              │   [ ] [●] [ ] │
│  □ Claire Martin           │   [ ] [ ] [●] │
│  ...                       │   ...         │
│                            │               │
│  [Placement Auto]          │  [Réinitialiser]
│                                             │
├─────────────────────────────────────────────┤
│  Commentaires (optionnel):                  │
│  ┌─────────────────────────────────────┐   │
│  │ J'ai placé les délégués au fond    │   │
│  │ pour surveiller la classe.          │   │
│  └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  [Annuler]  [Sauvegarder]  [Soumettre]    │
└─────────────────────────────────────────────┘
\`\`\`

**Actions:**

1. **Sauvegarder (brouillon)**
   \`\`\`typescript
   await supabase
     .from('sub_room_proposals')
     .update({
       seat_assignments: assignments,
       comments: comments,
       updated_at: new Date().toISOString()
     })
     .eq('id', proposalId)
   \`\`\`

2. **Soumettre**
   \`\`\`typescript
   await supabase
     .from('sub_room_proposals')
     .update({
       seat_assignments: assignments,
       comments: comments,
       status: 'pending',
       is_submitted: true
     })
     .eq('id', proposalId)
   
   // Envoyer notification au professeur
   await sendNotification({
     user_id: teacherId,
     type: 'proposal_submitted',
     message: `${delegateName} a soumis une proposition de plan`
   })
   \`\`\`

### **C. Révision par Professeur**

**Dialog: ReviewProposalDialog**

**Interface:**
\`\`\`
┌─────────────────────────────────────────────┐
│  Proposition de Jean Dupont (Délégué)      │
│  Pour: 6A - Salle B                         │
├─────────────────────────────────────────────┤
│  Commentaires du délégué:                   │
│  "J'ai placé les délégués au fond..."      │
├─────────────────────────────────────────────┤
│  [Aperçu du plan]                           │
│  ... visualisation ...                      │
├─────────────────────────────────────────────┤
│  Actions:                                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ○ Valider directement               │   │
│  │   → Créer la sous-salle             │   │
│  │                                     │   │
│  │ ○ Modifier puis valider             │   │
│  │   → Ouvrir éditeur                  │   │
│  │                                     │   │
│  │ ○ Renvoyer avec commentaires        │   │
│  │   [Commentaires obligatoires]       │   │
│  │                                     │   │
│  │ ○ Refuser définitivement            │   │
│  │   [Raison obligatoire]              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Annuler]              [Valider l'action] │
└─────────────────────────────────────────────┘
\`\`\`

**Actions professeur:**

#### **1. Valider Directement**
\`\`\`typescript
async function approveProposal(proposalId) {
  // 1. Créer la sous-salle
  const { data: subRoom } = await supabase
    .from('sub_rooms')
    .insert([{
      room_id: proposal.room_id,
      name: proposal.name,
      teacher_id: proposal.teacher_id,
      class_ids: [proposal.class_id],
      establishment_id: proposal.establishment_id
    }])
    .select()
    .single()
  
  // 2. Créer les seat_assignments
  const assignments = proposal.seat_assignments.map(a => ({
    ...a,
    sub_room_id: subRoom.id
  }))
  
  await supabase
    .from('seat_assignments')
    .insert(assignments)
  
  // 3. Mettre à jour la proposition
  await supabase
    .from('sub_room_proposals')
    .update({
      status: 'approved',
      sub_room_id: subRoom.id,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', proposalId)
  
  // 4. Notifier le délégué
  await sendNotification({
    user_id: proposal.proposed_by,
    type: 'proposal_approved',
    message: `Votre proposition a été validée !`
  })
}
\`\`\`

#### **2. Modifier puis Valider**
\`\`\`typescript
// Ouvrir l'éditeur avec les données de la proposition
openEditor(proposal, { mode: 'review' })

// Le prof peut modifier les placements
// Puis valider → suit le même process que "Valider directement"
\`\`\`

#### **3. Renvoyer avec Commentaires**
\`\`\`typescript
async function returnProposal(proposalId, comments) {
  await supabase
    .from('sub_room_proposals')
    .update({
      status: 'draft',
      is_submitted: false,
      rejection_reason: comments
    })
    .eq('id', proposalId)
  
  await sendNotification({
    user_id: proposal.proposed_by,
    type: 'proposal_returned',
    message: `Votre proposition a été renvoyée avec des commentaires`
  })
}
\`\`\`

#### **4. Refuser Définitivement**
\`\`\`typescript
async function rejectProposal(proposalId, reason) {
  await supabase
    .from('sub_room_proposals')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', proposalId)
  
  await sendNotification({
    user_id: proposal.proposed_by,
    type: 'proposal_rejected',
    message: `Votre proposition a été refusée`
  })
}
\`\`\`

### **D. Sélection Multiple et Actions Groupées**

**Pour les délégués : Supprimer brouillons**

**Interface:**
\`\`\`
┌─────────────────────────────────────────────┐
│  [☑ Sélectionner tous les brouillons]      │
│  (3 brouillons sélectionnés)                │
│  [🗑️ Supprimer (3)]                         │
├─────────────────────────────────────────────┤
│  ☑ Plan pour Mme Dupont  [Brouillon]       │
│  ☑ Essai salle A        [Brouillon]       │
│  ☑ Nouveau plan 6B      [Brouillon]       │
│  □ Plan validé          [Validée]          │
└─────────────────────────────────────────────┘
\`\`\`

**Logique:**
\`\`\`typescript
// Checkbox "Select All" ne sélectionne QUE les brouillons
const drafts = proposals.filter(p => !p.is_submitted)

function handleSelectAll() {
  if (selectedIds.length === drafts.length) {
    setSelectedIds([])  // Désélectionner tout
  } else {
    setSelectedIds(drafts.map(p => p.id))  // Sélectionner tous brouillons
  }
}

// Suppression groupée
async function deleteDrafts(ids: string[]) {
  await supabase
    .from('sub_room_proposals')
    .delete()
    .in('id', ids)
  
  toast({
    title: "Suppression réussie",
    description: `${ids.length} brouillon(s) supprimé(s)`
  })
}
\`\`\`

---

## 🔗 CONNEXIONS AVEC AUTRES SECTIONS

### **→ Salles (rooms)**
- Propositions référencent des salles existantes
- Hérite configuration de la salle

### **→ Classes (classes)**
- Propositions liées à une classe
- Élèves chargés depuis la classe

### **→ Professeurs (teachers)**
- Propositions adressées à un professeur
- Professeur reçoit notification

### **→ Plans de Classe (seating-plan)**
- Proposition validée → Créé sub_room
- sub_room apparaît dans Plans de Classe
- Délégué peut voir le plan final

### **→ Notifications**
- Soumission → Notif au professeur
- Validation → Notif au délégué
- Refus → Notif au délégué
- Renvoi → Notif au délégué

---

## 📊 STATISTIQUES

### **Par Délégué**
\`\`\`typescript
const stats = {
  totalProposals: proposals.length,
  drafts: proposals.filter(p => p.status === 'draft').length,
  pending: proposals.filter(p => p.status === 'pending').length,
  approved: proposals.filter(p => p.status === 'approved').length,
  rejected: proposals.filter(p => p.status === 'rejected').length,
  approvalRate: approved / (approved + rejected) * 100
}
\`\`\`

### **Par Professeur**
\`\`\`typescript
const stats = {
  receivedProposals: proposals.length,
  pendingReview: proposals.filter(p => p.status === 'pending').length,
  avgReviewTime: calculateAvgTime(),
  mostActiveDelegate: getMostActive()
}
\`\`\`

---

**FIN DOCUMENTATION - BAC À SABLE**
