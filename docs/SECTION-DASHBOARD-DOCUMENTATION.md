# 📊 DOCUMENTATION EXHAUSTIVE - SECTION DASHBOARD

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Rôles et permissions](#rôles-et-permissions)
3. [Composants principaux](#composants-principaux)
4. [Navigation et routing](#navigation-et-routing)
5. [Système d'authentification](#système-dauthentification)
6. [Gestion des paramètres utilisateur](#gestion-des-paramètres-utilisateur)
7. [Système de notifications](#système-de-notifications)
8. [Connexions avec autres sections](#connexions-avec-autres-sections)

---

## Vue d'ensemble

**Fichier principal**: `components/dashboard-content.tsx` (702 lignes)

**Objectif**: Le Dashboard est le point d'entrée principal de l'application après authentification. Il sert de hub central pour naviguer vers toutes les autres sections de l'application.

**Technologies**:
- Next.js 15 avec App Router
- Supabase Auth pour l'authentification
- Framer Motion pour les animations
- React hooks (useState, useEffect)

---

## Rôles et permissions

### 1. Vie Scolaire (vie-scolaire)
**Couleur d'interface**: Amber (orange doré)
**Icône**: Users avec gradient amber

**Accès**:
- ✅ Classes (création, modification, suppression)
- ✅ Élèves (gestion complète)
- ✅ Professeurs (gestion complète)
- ✅ Salles (configuration complète)
- ✅ Plans de classe (gestion complète)
- ✅ Bac à sable (consultation de toutes les propositions)

**Restrictions**: Aucune - accès administrateur complet

### 2. Professeur (professeur)
**Couleur d'interface**: Teal (vert-bleu)
**Icône**: Users avec gradient teal

**Accès**:
- ✅ Mes élèves (consultation uniquement de ses classes)
- ✅ Mes collègues (consultation des autres professeurs)
- ✅ Salles (consultation et création)
- ✅ Plans de classe (gestion de ses sous-salles)
- ✅ Bac à sable (validation des propositions le concernant)

**Restrictions**:
- ❌ Ne peut pas créer/modifier/supprimer des classes
- ❌ Ne peut pas modifier les élèves (sauf via plans de classe)
- ❌ Accès limité aux données de ses propres classes

### 3. Délégué / Éco-délégué (delegue, eco-delegue)
**Couleur d'interface**: Blue (bleu)
**Icône**: Users avec gradient blue

**Accès**:
- ✅ Plans de classe (création de propositions)
- ✅ Bac à sable (création et modification de brouillons)

**Restrictions**:
- ❌ Pas d'accès aux sections Classes, Élèves, Professeurs
- ❌ Ne peut pas créer de salles personnalisées (templates uniquement)
- ❌ Ne peut que proposer, pas valider

---

## Composants principaux

### DashboardContent
**Props**:
\`\`\`typescript
interface DashboardContentProps {
  user: User                 // Objet utilisateur Supabase
  profile: Profile           // Profil complet de l'utilisateur
}
\`\`\`

**État local**:
\`\`\`typescript
- isLoggingOut: boolean                    // État de déconnexion
- activeSection: string                    // Section actuellement active
- isSettingsOpen: boolean                  // Dialog paramètres ouvert/fermé
- settingsData: {
    username: string
    password: string
  }
\`\`\`

### Cartes de navigation

Chaque carte représente une section accessible:

\`\`\`typescript
<Card onClick={() => router.push("/dashboard/{section}")}>
  <CardHeader className="bg-gradient-to-br from-{color}-500 to-{color}-600">
    <CardTitle>Titre de la section</CardTitle>
    <CardDescription>Description courte</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Description détaillée</p>
  </CardContent>
</Card>
\`\`\`

**Effets visuels**:
- Hover: shadow-xl + translate-y-1 (élévation)
- Border hover: border-{color}-300
- Gradient header selon la section
- Animations Framer Motion (fade-in avec stagger)

---

## Navigation et routing

### Routes disponibles

| Route | Rôles autorisés | Composant | Description |
|-------|----------------|-----------|-------------|
| `/dashboard` | Tous | DashboardContent | Page d'accueil du tableau de bord |
| `/dashboard/classes` | vie-scolaire | ClassesManagement | Gestion des classes |
| `/dashboard/students` | vie-scolaire, professeur | StudentsManagement | Gestion des élèves |
| `/dashboard/teachers` | vie-scolaire, professeur | TeachersManagement | Gestion des professeurs |
| `/dashboard/rooms` | vie-scolaire, professeur, delegue | RoomsManagement | Gestion des salles |
| `/dashboard/seating-plan` | vie-scolaire, professeur, delegue | SeatingPlanManagement | Plans de classe |
| `/dashboard/sandbox` | Tous | SandboxManagement | Bac à sable (propositions) |

### Système de navigation interne

Le Dashboard utilise un **état local** (`activeSection`) pour afficher les sections sans changer de route:

\`\`\`typescript
if (activeSection === "students") {
  return <StudentsManagement 
    establishmentId={profile.establishment_id}
    userRole={profile.role}
    userId={profile.id}
    onBack={() => setActiveSection("home")}
  />
}
\`\`\`

**Avantages**:
- Pas de rechargement de page
- Navigation instantanée
- État préservé lors du retour
- Animations fluides

**Inconvénient**:
- L'URL ne change pas (pas de deep linking direct)

---

## Système d'authentification

### Types d'authentification

#### 1. Authentification Supabase (Production)
\`\`\`typescript
const supabase = createClient()
const { error } = await supabase.auth.signOut()
\`\`\`

**Flux**:
1. Login via `/auth/login` avec username + password
2. Vérification dans table `profiles` via RPC `verify_user_credentials`
3. Création de session Supabase
4. Redirection vers `/dashboard`

#### 2. Session Admin (Mode debug)
\`\`\`typescript
if (isAdminSession()) {
  clearAdminSession()
  router.push("/auth/login")
}
\`\`\`

**Utilisation**: Mode développement pour tester rapidement avec différents rôles

### Vérification des permissions

\`\`\`typescript
// Vérifie le rôle avant de rendre une carte
{profile.role === "vie-scolaire" && (
  <Card onClick={() => router.push("/dashboard/classes")}>
    ...
  </Card>
)}
\`\`\`

### Protection des routes

Les routes sont protégées au niveau **app/dashboard/layout.tsx**:
\`\`\`typescript
export default async function DashboardLayout({ children }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  // Charger le profil
  const profile = await fetchProfile(user.id)
  
  return <>{children}</>
}
\`\`\`

---

## Gestion des paramètres utilisateur

### Dialog Paramètres

**Déclenchement**: Bouton "Paramètres" dans le header

**Fonctionnalités**:
1. **Modification de l'identifiant**
   - Champ: username
   - Validation: ne peut pas être vide
   - Unique par établissement

2. **Modification du mot de passe**
   - Champ optionnel
   - Si vide = pas de changement
   - Si rempli = hashage via RPC `hash_password`

3. **Génération de mot de passe sécurisé**
   \`\`\`typescript
   function generateStrongPassword(length = 8): string {
     // Mix de minuscules, majuscules, chiffres, symboles
     // Garantit au moins 1 caractère de chaque type
     // Mélange aléatoire final
   }
   \`\`\`

### Flux de mise à jour

\`\`\`typescript
async function handleUpdateCredentials() {
  // 1. Validation
  if (!settingsData.username.trim()) {
    return showError()
  }
  
  // 2. Hash du nouveau mot de passe si fourni
  if (settingsData.password) {
    const { data: hashed } = await supabase.rpc('hash_password', {
      password: settingsData.password
    })
    
    // 3. Update avec mot de passe
    await supabase.from('profiles').update({
      username: settingsData.username,
      password_hash: hashed
    }).eq('id', profile.id)
  } else {
    // 3bis. Update sans mot de passe
    await supabase.from('profiles').update({
      username: settingsData.username
    }).eq('id', profile.id)
  }
  
  // 4. Toast de succès
  toast({ title: "Succès", description: "Identifiants mis à jour" })
}
\`\`\`

---

## Système de notifications

### Composant NotificationsDropdown

**Emplacement**: Header du dashboard, à côté du bouton Paramètres

**Fonctionnalités**:
- Badge avec nombre de notifications non lues
- Dropdown avec liste des notifications
- Marquage comme lu au clic
- Temps relatif (il y a 2h, hier, etc.)
- Icônes différentes selon le type

**Types de notifications**:
\`\`\`typescript
type NotificationType = 
  | 'plan_modified'        // Plan modifié
  | 'plan_validated'       // Plan validé
  | 'plan_rejected'        // Plan refusé
  | 'plan_returned'        // Plan renvoyé avec commentaires
  | 'plan_created'         // Nouveau plan créé
  | 'plan_deleted'         // Plan supprimé
  | 'proposal_submitted'   // Nouvelle proposition soumise
  | 'sub_room_created'     // Sous-salle créée
  | 'room_invitation'      // Invitation à une salle collaborative
\`\`\`

### Intégration Realtime (à venir)

**Script SQL**: `scripts/034_enable_realtime_notifications.sql`

\`\`\`sql
-- Activation de Realtime sur la table notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- RLS policies pour sécurité
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
\`\`\`

**Abonnement côté client**:
\`\`\`typescript
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Ajouter la nouvelle notification
      setNotifications(prev => [payload.new, ...prev])
      // Incrémenter le badge
      setUnreadCount(prev => prev + 1)
    })
    .subscribe()
    
  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
\`\`\`

---

## Connexions avec autres sections

### 1. Classes → Dashboard
**Sens**: Classes crée des classes → Dashboard affiche la carte "Classes"
**Données partagées**:
- `establishment_id`: Pour filtrer les classes
- Nombre de classes créées (affiché dans la description)

### 2. Élèves → Dashboard
**Sens**: Élèves gère les élèves → Dashboard contrôle l'accès selon le rôle
**Données partagées**:
- Rôle utilisateur: détermine si "Mes élèves" ou "Élèves"
- Classes de l'utilisateur (pour professeur)

### 3. Professeurs → Dashboard
**Sens**: Professeurs gère les profs → Dashboard affiche "Mes collègues" pour prof
**Données partagées**:
- `teacher_id` de l'utilisateur connecté
- Classes communes

### 4. Salles → Dashboard
**Sens**: Salles gère les salles → Dashboard donne accès selon rôle
**Données partagées**:
- Permissions de création (vie-scolaire et prof)
- Templates disponibles

### 5. Plans de classe → Dashboard
**Sens**: Plans gère sous-salles → Dashboard affiche "Plan de Classe"
**Données partagées**:
- Sous-salles de l'utilisateur
- Propositions en attente (pour profs)

### 6. Bac à sable → Dashboard
**Sens**: Sandbox gère propositions → Dashboard affiche notifications
**Données partagées**:
- Propositions en attente de validation
- Notifications de soumission/validation/refus

---

## Paramètres sauvegardés

### Session utilisateur
\`\`\`typescript
{
  user: User {
    id: string
    email: string
    created_at: string
  }
  profile: Profile {
    id: string
    establishment_id: string
    role: 'vie-scolaire' | 'professeur' | 'delegue' | 'eco-delegue'
    username: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    is_active: boolean
  }
}
\`\`\`

### État local (non persistant)
\`\`\`typescript
{
  activeSection: string           // Section active dans le dashboard
  isSettingsOpen: boolean         // Dialog paramètres
  settingsData: {                 // Formulaire paramètres
    username: string
    password: string
  }
}
\`\`\`

### Cookies/LocalStorage
- **Supabase session**: Cookie httpOnly pour la session auth
- **Admin session**: localStorage pour mode debug (`isAdminSession()`)

---

## Fonctionnalités complètes

### 1. Authentification et déconnexion
- ✅ Détection automatique du type de session (Supabase vs Admin)
- ✅ Déconnexion propre avec redirection
- ✅ Gestion des erreurs de déconnexion
- ✅ État de chargement pendant la déconnexion

### 2. Navigation contextuelle
- ✅ Cartes différentes selon le rôle
- ✅ Descriptions adaptées (ex: "Mes élèves" vs "Élèves")
- ✅ Couleurs et icônes par rôle
- ✅ Animations d'entrée (fade-in avec stagger)

### 3. Gestion des paramètres
- ✅ Modification de l'identifiant
- ✅ Modification du mot de passe (optionnel)
- ✅ Génération de mot de passe sécurisé
- ✅ Validation des champs
- ✅ Hashage sécurisé des mots de passe
- ✅ Toast de confirmation

### 4. Notifications en temps réel (implémenté partiellement)
- ✅ Dropdown de notifications
- ✅ Badge avec nombre non lu
- ✅ Marquage comme lu
- ⚠️ Realtime Supabase (script SQL prêt, abonnement à implémenter)

### 5. Interface responsive
- ✅ Grid adaptatif (1 col mobile, 2 tablet, 3 desktop)
- ✅ Header avec infos utilisateur
- ✅ Cartes avec hover effects
- ✅ Mode sombre supporté

---

## Statistiques et métriques

### Affichées dans l'interface
- Nom et prénom de l'utilisateur
- Rôle (badge coloré)
- Nombre de notifications non lues

### Non affichées (disponibles en base)
- Date de dernière connexion
- Nombre d'actions effectuées
- Historique de navigation

---

## Problèmes connus et améliorations futures

### Bugs connus
1. ❌ L'URL ne change pas lors de la navigation interne (pas de deep linking)
2. ❌ Pas de breadcrumb pour se situer dans l'arborescence
3. ⚠️ Realtime notifications pas complètement implémenté

### Améliorations proposées
1. ✨ Ajouter des statistiques sur les cartes (ex: "12 élèves", "5 classes")
2. ✨ Recherche globale dans le dashboard
3. ✨ Raccourcis clavier pour navigation rapide
4. ✨ Thème personnalisable par rôle
5. ✨ Widget "Activité récente"
6. ✨ Export PDF des données (pour vie-scolaire)

---

## Commandes utiles

### Tester avec différents rôles
\`\`\`typescript
// Mode admin (dans auth/login/page.tsx)
setAdminSession({
  userId: 'test-id',
  role: 'vie-scolaire' // ou 'professeur', 'delegue'
})
\`\`\`

### Forcer une déconnexion
\`\`\`typescript
const supabase = createClient()
await supabase.auth.signOut({ scope: 'global' })
\`\`\`

### Vérifier la session
\`\`\`typescript
const { data: { session } } = await supabase.auth.getSession()
console.log(session)
\`\`\`

---

**Dernière mise à jour**: 7 janvier 2026
**Version**: 1.0.0
**Mainteneur**: Équipe v0
