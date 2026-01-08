# 👨‍🏫 DOCUMENTATION EXHAUSTIVE - SECTION PROFESSEURS

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

La section Professeurs permet de gérer l'ensemble des enseignants avec leurs matières, leurs classes et leur statut de professeur principal.

**Route:** `/dashboard/teachers`  
**Composant principal:** `TeachersManagement`  
**Fichier:** `components/teachers-management.tsx`

---

## 👥 RÔLES ET PERMISSIONS

### **Vie Scolaire** (vie-scolaire)
✅ **Accès complet**
- Créer des professeurs
- Modifier tous les professeurs
- Supprimer des professeurs
- Assigner aux classes
- Gérer les matières
- Désigner professeur principal
- Import/Export
- Générer identifiants

### **Professeur** (professeur)
✅ **Accès lecture seule à ses collègues**
- Voir les autres professeurs
- Voir les classes communes
- ❌ Aucune modification

### **Délégué/Éco-délégué** (delegue, eco-delegue)
✅ **Accès à ses professeurs uniquement**
- Voir ses professeurs
- ❌ Aucune modification

---

## 🗂️ STRUCTURE BASE DE DONNÉES

### **Table: teachers**
\`\`\`sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  establishment_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  subject TEXT,
  is_principal BOOLEAN DEFAULT FALSE,
  principal_class_id UUID REFERENCES classes(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
\`\`\`

### **Table: teacher_classes**
\`\`\`sql
CREATE TABLE teacher_classes (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id),
  class_id UUID REFERENCES classes(id),
  subject TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE(teacher_id, class_id, subject)
);
\`\`\`

---

## 🔗 CONNEXIONS AVEC AUTRES SECTIONS

### **→ Classes** : Affectation professeur-classe
### **→ Élèves** : Via teacher_classes
### **→ Salles** : Création sous-salles pour profs
### **→ Plans de Classe** : Professeur principal / Collaboratif
### **→ Bac à Sable** : Validation propositions

---

**Suite de la documentation complète dans le fichier...**
