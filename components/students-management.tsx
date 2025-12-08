"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createUser } from "@/lib/user-management"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Plus, Eye, Key, Mail, FileText, Upload, MoreHorizontal, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ImportStudentsDialog } from "@/components/import-students-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog" // Added import for confirmation dialog

interface Class {
  id: string
  name: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  class_id: string | null
  role: "eleve" | "delegue" | "eco-delegue" // Added "eleve" role
  can_create_subrooms: boolean
  classes?: { name: string }
  username?: string
  password_hash?: string
  profile_id?: string | null // Made nullable for "élève" role
  class_name?: string // Added class_name to Student interface
}

interface StudentsManagementProps {
  establishmentId: string
  userRole?: string
  userId?: string
  onBack?: () => void
}

export function StudentsManagement({ establishmentId, userRole, userId, onBack }: StudentsManagementProps) {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false) // Added import dialog state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    class_id: "",
    role: "eleve" as "delegue" | "eco-delegue" | "eleve", // Default to "eleve"
    can_create_subrooms: false,
  })
  const [accessData, setAccessData] = useState({
    username: "",
    password: "",
  })
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]) // Added class filter state
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false) // Added promote dialog state
  const [promoteToRole, setPromoteToRole] = useState<"delegue" | "eco-delegue">("delegue")
  const [isDemoteDialogOpen, setIsDemoteDialogOpen] = useState(false)
  const [studentToDemote, setStudentToDemote] = useState<Student | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]) // Added bulk selection state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false) // Added bulk delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false) // Added single delete dialog state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null) // Added student to delete state

  const [searchQuery, setSearchQuery] = useState("") // Added search query state
  const [roleFilter, setRoleFilter] = useState<"all" | "delegue" | "eco-delegue" | "eleve">("all") // Added role filter state
  const [isBulkDemoteDialogOpen, setIsBulkDemoteDialogOpen] = useState(false) // Added bulk demote dialog state

  // Start of updates for email dialogs
  const [isEmailConfirmDialogOpen, setIsEmailConfirmDialogOpen] = useState(false)
  const [emailToConfirm, setEmailToConfirm] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = useState(false)
  // End of updates for email dialogs

  useEffect(() => {
    fetchData()
  }, [establishmentId, userRole, userId])

  async function fetchData() {
    setLoading(true)

    const classesResult = await supabase
      .from("classes")
      .select("id, name")
      .eq("establishment_id", establishmentId)
      .order("name")

    if (classesResult.error) {
      console.error("[v0] Error fetching classes:", classesResult.error)
      setClasses([])
    } else {
      setClasses(classesResult.data || [])
    }

    // Fetch students based on user role
    let studentsResult

    if (userRole === "professeur") {
      // First, get the class IDs for this teacher
      const { data: teacherClasses, error: teacherClassesError } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", userId)

      if (teacherClassesError) {
        console.error("[v0] Error fetching teacher classes:", teacherClassesError)
        setStudents([])
        setLoading(false)
        return
      }

      const classIds = teacherClasses?.map((tc) => tc.class_id) || []

      if (classIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // Now fetch students from those classes
      studentsResult = await supabase
        .from("students")
        .select(`
          *,
          classes:class_id(name)
        `)
        .eq("establishment_id", establishmentId)
        .in("class_id", classIds)
        .order("last_name")
    } else if (userRole === "delegue" || userRole === "eco-delegue") {
      // First, get the student's class
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", userId)
        .single()

      if (studentError || !studentData?.class_id) {
        console.error("[v0] Error fetching student class:", studentError)
        setStudents([])
        setLoading(false)
        return
      }

      // Now fetch all students from that class
      studentsResult = await supabase
        .from("students")
        .select(`
          *,
          classes:class_id(name)
        `)
        .eq("establishment_id", establishmentId)
        .eq("class_id", studentData.class_id)
        .order("last_name")
    } else {
      // Vie-scolaire: fetch all students
      studentsResult = await supabase
        .from("students")
        .select(`
          *,
          classes:class_id(name)
        `)
        .eq("establishment_id", establishmentId)
        .order("last_name")
    }

    if (studentsResult.error) {
      console.error("[v0] Error fetching students:", studentsResult.error)
      setStudents([])
    } else {
      setStudents(studentsResult.data || [])
    }

    setLoading(false)
  }

  async function handleAdd() {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.class_id) {
      toast({
        title: "Erreur",
        description: "Le prénom, nom et classe sont requis",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Adding student with data:", formData)

      const selectedClass = classes.find((c) => c.id === formData.class_id)
      console.log("[v0] Selected class:", selectedClass)

      if (!selectedClass || !selectedClass.name) {
        console.error("[v0] Class not found or has no name:", formData.class_id)
        toast({
          title: "Erreur",
          description: "Classe introuvable ou invalide",
          variant: "destructive",
        })
        return
      }

      if (formData.role === "eleve") {
        console.log("[v0] Creating student without profile (eleve role)")
        console.log("[v0] Class name to insert:", selectedClass.name)

        const { data, error } = await supabase
          .from("students")
          .insert([
            {
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              email: formData.email.trim() || null,
              phone: formData.phone.trim() || null,
              class_id: formData.class_id,
              class_name: selectedClass.name,
              role: "eleve",
              can_create_subrooms: formData.can_create_subrooms,
              establishment_id: establishmentId,
              profile_id: null,
            },
          ])
          .select()
          .single()

        if (error) {
          console.error("[v0] Error creating student:", error)
          console.error("[v0] Error details:", JSON.stringify(error, null, 2))
          throw error
        }

        console.log("[v0] Student created successfully:", data)

        toast({
          title: "Élève créé avec succès",
          description: "L'élève a été ajouté sans accès à l'application",
        })
      } else {
        console.log("[v0] Creating student with profile (delegue/eco-delegue role)")

        const credentials = await createUser({
          establishment_id: establishmentId,
          role: formData.role,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          class_id: formData.class_id,
          class_name: selectedClass.name,
          student_role: formData.role,
        })

        console.log("[v0] Student with profile created successfully:", credentials)

        toast({
          title: "Élève créé avec succès",
          description: (
            <div className="space-y-2">
              <p>
                Identifiant: <strong>{credentials.username}</strong>
              </p>
              <p>
                Mot de passe: <strong>{credentials.password}</strong>
              </p>
              <p className="text-xs text-muted-foreground">Notez ces identifiants, ils ne seront plus affichés</p>
            </div>
          ),
          duration: 15000,
        })
      }

      setIsAddDialogOpen(false)
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        class_id: "",
        role: "eleve",
        can_create_subrooms: false,
      })
      fetchData() // Auto-refresh after add
    } catch (error) {
      console.error("[v0] Error creating student:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer l'élève",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteStudent(student: Student) {
    try {
      // Delete profile if exists
      if (student.profile_id) {
        await supabase.from("profiles").delete().eq("id", student.profile_id)
      }

      // Delete student
      const { error } = await supabase.from("students").delete().eq("id", student.id)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Élève supprimé avec succès",
      })
      setIsDeleteDialogOpen(false)
      setStudentToDelete(null)
      fetchData() // Auto-refresh after delete
    } catch (error) {
      console.error("[v0] Error deleting student:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élève",
        variant: "destructive",
      })
    }
  }

  async function handleBulkDelete() {
    try {
      // Delete profiles for students that have them
      const studentsWithProfiles = students.filter((s) => selectedStudents.includes(s.id) && s.profile_id)

      if (studentsWithProfiles.length > 0) {
        const profileIds = studentsWithProfiles.map((s) => s.profile_id).filter(Boolean)
        await supabase.from("profiles").delete().in("id", profileIds)
      }

      // Delete students
      const { error } = await supabase.from("students").delete().in("id", selectedStudents)

      if (error) throw error

      toast({
        title: "Succès",
        description: `${selectedStudents.length} élève(s) supprimé(s) avec succès`,
      })
      setIsBulkDeleteDialogOpen(false)
      setSelectedStudents([])
      fetchData() // Auto-refresh after bulk delete
    } catch (error) {
      console.error("[v0] Error bulk deleting students:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les élèves",
        variant: "destructive",
      })
    }
  }

  async function handleBulkDemote() {
    try {
      // Get students to demote
      const studentsToDemote = students.filter((s) => selectedStudents.includes(s.id))

      // Delete profiles for students that have them
      const studentsWithProfiles = studentsToDemote.filter((s) => s.profile_id)

      if (studentsWithProfiles.length > 0) {
        const profileIds = studentsWithProfiles.map((s) => s.profile_id).filter(Boolean)
        await supabase.from("profiles").delete().in("id", profileIds)
      }

      // Update students to "eleve" role and remove profile_id
      const { error } = await supabase
        .from("students")
        .update({
          role: "eleve",
          profile_id: null,
          username: null,
          password_hash: null,
        })
        .in("id", selectedStudents)

      if (error) throw error

      toast({
        title: "Succès",
        description: `${selectedStudents.length} élève(s) rétrogradé(s) en élève simple`,
      })
      setIsBulkDemoteDialogOpen(false)
      setSelectedStudents([])
      fetchData() // Auto-refresh after bulk demotion
    } catch (error) {
      console.error("[v0] Error bulk demoting students:", error)
      toast({
        title: "Erreur",
        description: "Impossible de rétrograder les élèves",
        variant: "destructive",
      })
    }
  }

  // Updated handleSendEmail function
  async function handleSendEmail() {
    if (!selectedStudent || !selectedStudent.email) {
      toast({
        title: "Erreur",
        description: "Aucune adresse email renseignée pour cet élève",
        variant: "destructive",
      })
      return
    }

    setEmailToConfirm(selectedStudent.email)
    setIsEmailConfirmDialogOpen(true)
  }

  // New function to confirm and send email
  async function confirmAndSendEmail() {
    if (!selectedStudent) return

    if (!accessData.password || accessData.password.trim() === "") {
      toast({
        title: "Erreur",
        description: "Veuillez définir un mot de passe avant d'envoyer l'email",
        variant: "destructive",
      })
      return
    }

    setIsSendingEmail(true)

    try {
      const response = await fetch("/api/send-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: emailToConfirm,
          recipientName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
          username: accessData.username,
          password: accessData.password, // Send actual password, not masked
          userType: "student",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      toast({
        title: "Email envoyé",
        description: `Les identifiants ont été envoyés à ${emailToConfirm}`,
      })
      setIsEmailConfirmDialogOpen(false)
      setIsAccessDialogOpen(false) // Close access dialog after successful send
    } catch (error) {
      console.error("[v0] Error sending email:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email. Vérifiez l'adresse email.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // New function for bulk email sending initiation
  async function handleBulkSendEmails() {
    const studentsToEmail = students.filter((s) => selectedStudents.includes(s.id) && s.email && s.profile_id)

    if (studentsToEmail.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucun élève sélectionné n'a d'adresse email et d'accès",
        variant: "destructive",
      })
      return
    }

    setIsBulkEmailDialogOpen(true)
  }

  // New function to confirm and send bulk emails
  async function confirmBulkSendEmails() {
    const studentsToEmail = students.filter((s) => selectedStudents.includes(s.id) && s.email && s.profile_id)

    setIsSendingEmail(true)

    try {
      let successCount = 0
      let failCount = 0

      for (const student of studentsToEmail) {
        // Fetch credentials for each student
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", student.profile_id)
          .single()

        if (!profileData) {
          failCount++
          continue
        }

        const response = await fetch("/api/send-credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientEmail: student.email,
            recipientName: `${student.first_name} ${student.last_name}`,
            username: profileData.username,
            password: "[Mot de passe masqué - Contactez la vie scolaire]",
            userType: "student",
          }),
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      }

      toast({
        title: "Envoi terminé",
        description: `${successCount} email(s) envoyé(s) avec succès${failCount > 0 ? `, ${failCount} échec(s)` : ""}`,
      })
      setIsBulkEmailDialogOpen(false)
      setSelectedStudents([]) // Clear selection after bulk action
    } catch (error) {
      console.error("[v0] Error sending bulk emails:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer les emails",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  function handlePrintPDF() {
    const printWindow = window.open("", "_blank")
    if (printWindow && selectedStudent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Identifiants - ${selectedStudent.first_name} ${selectedStudent.last_name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; }
              .credentials { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Identifiants de connexion</h1>
            <div class="credentials">
              <div class="field"><span class="label">Nom:</span> ${selectedStudent.first_name} ${selectedStudent.last_name}</div>
              <div class="field"><span class="label">Classe:</span> ${selectedStudent.classes?.name || "N/A"}</div>
              <div class="field"><span class="label">Identifiant:</span> ${accessData.username}</div>
              <div class="field"><span class="label">Mot de passe:</span> ${accessData.password}</div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
    setIsAccessDialogOpen(false)
  }

  async function handlePromoteStudent(student: Student, newRole: "delegue" | "eco-delegue") {
    try {
      console.log("[v0] Promoting student:", student.id, "to role:", newRole)

      if (student.profile_id) {
        toast({
          title: "Erreur",
          description: "Cet élève a déjà un profil utilisateur",
          variant: "destructive",
        })
        return
      }

      const credentials = await createUser({
        establishment_id: establishmentId,
        role: "delegue",
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email || undefined,
        phone: student.phone || undefined,
        class_id: student.class_id || undefined,
        student_role: newRole,
      })

      console.log("[v0] User created successfully:", credentials)

      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("students")
        .update({
          role: newRole,
          profile_id: credentials.profile_id,
        })
        .eq("id", student.id)

      if (updateError) {
        console.error("[v0] Error updating student:", updateError)
        // Supprimer le profil créé en cas d'erreur
        await supabase.from("profiles").delete().eq("id", credentials.profile_id)
        throw updateError
      }

      console.log("[v0] Student updated successfully")

      toast({
        title: "Élève promu avec succès",
        description: (
          <div className="space-y-2">
            <p>L'élève a été promu au rôle de {newRole === "delegue" ? "Délégué" : "Éco-délégué"}</p>
            <p>
              Identifiant: <strong>{credentials.username}</strong>
            </p>
            <p>
              Mot de passe: <strong>{credentials.password}</strong>
            </p>
          </div>
        ),
        duration: 15000,
      })

      setIsPromoteDialogOpen(false)
      fetchData() // Auto-refresh after promotion
    } catch (error) {
      console.error("[v0] Error promoting student:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de promouvoir l'élève",
        variant: "destructive",
      })
    }
  }

  async function handleDemoteStudent(student: Student) {
    try {
      // Delete profile if exists
      if (student.profile_id) {
        await supabase.from("profiles").delete().eq("id", student.profile_id)
      }

      // Update student to "eleve" role and remove profile_id
      const { error } = await supabase
        .from("students")
        .update({
          role: "eleve",
          profile_id: null,
          username: null,
          password_hash: null,
        })
        .eq("id", student.id)

      if (error) throw error

      toast({
        title: "Succès",
        description: "L'élève a été rétrogradé en élève simple",
      })
      setIsDemoteDialogOpen(false)
      setStudentToDemote(null)
      fetchData() // Auto-refresh after demotion
    } catch (error) {
      console.error("[v0] Error demoting student:", error)
      toast({
        title: "Erreur",
        description: "Impossible de rétrograder l'élève",
        variant: "destructive",
      })
    }
  }

  const openAccessDialog = async (student: Student) => {
    setSelectedStudent(student)

    if (student.profile_id) {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", student.profile_id)
        .maybeSingle()

      if (profileData) {
        setAccessData({
          username: profileData.username || "",
          password: "", // Empty password field so vie-scolaire can enter new password
        })
      } else {
        // Fallback if profile doesn't exist
        setAccessData({
          username: `${student.first_name.toLowerCase()}.${student.last_name.toLowerCase()}`,
          password: "",
        })
      }
    } else {
      // For students without profiles (eleve role), show "Create access"
      setAccessData({
        username: `${student.first_name.toLowerCase()}.${student.last_name.toLowerCase()}`,
        password: "",
      })
    }

    setIsAccessDialogOpen(true)
  }

  async function handleUpdateCredentials() {
    if (!selectedStudent) return

    if (!selectedStudent.profile_id) {
      toast({
        title: "Erreur",
        description: "Cet élève n'a pas de profil utilisateur",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()

    if (accessData.password !== "••••••••" && accessData.password !== "") {
      const { data: hashedPassword, error: hashError } = await supabase.rpc("hash_password", {
        password: accessData.password,
      })

      if (hashError) {
        console.error("[v0] Error hashing password:", hashError)
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour les identifiants",
          variant: "destructive",
        })
        return
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: accessData.username,
          password_hash: hashedPassword,
        })
        .eq("id", selectedStudent.profile_id)

      if (updateError) {
        console.error("[v0] Error updating profile:", updateError)
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour les identifiants",
          variant: "destructive",
        })
        return
      }
    } else {
      // Only update username
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: accessData.username,
        })
        .eq("id", selectedStudent.profile_id)

      if (updateError) {
        console.error("[v0] Error updating profile:", updateError)
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour les identifiants",
          variant: "destructive",
        })
        return
      }
    }

    toast({
      title: "Succès",
      description: "Identifiants mis à jour avec succès",
    })
    setIsAccessDialogOpen(false)
    fetchData() // Refresh data after credential update
  }

  const filteredStudents = students.filter((s) => {
    // Filter by selected classes
    if (selectedClasses.length > 0 && (!s.class_id || !selectedClasses.includes(s.class_id))) {
      return false
    }
    // Filter by role
    if (roleFilter !== "all" && s.role !== roleFilter) {
      return false
    }
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
      return fullName.includes(query)
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement des élèves...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack || (() => router.push("/dashboard"))} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {userRole === "vie-scolaire" ? "Gestion des élèves" : "Mes camarades"}
          </h1>
          <p className="text-muted-foreground mt-1">Gérez les élèves, leurs accès et leurs informations</p>
        </div>
        {userRole === "vie-scolaire" && (
          <div className="flex gap-2">
            {selectedStudents.length > 0 && (
              <>
                <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                  Supprimer ({selectedStudents.length})
                </Button>
                <Button variant="outline" onClick={() => setIsBulkDemoteDialogOpen(true)}>
                  Rétrograder ({selectedStudents.length})
                </Button>
                <Button variant="outline" onClick={handleBulkSendEmails}>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer accès ({selectedStudents.length})
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un élève
            </Button>
          </div>
        )}
      </div>

      {userRole === "vie-scolaire" && classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filtrer par classe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <Badge
                  key={cls.id}
                  variant={selectedClasses.includes(cls.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedClasses((prev) =>
                      prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id],
                    )
                  }}
                >
                  {cls.name}
                </Badge>
              ))}
              {selectedClasses.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedClasses([])}>
                  Réinitialiser
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start of updates */}
      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rechercher et filtrer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Rechercher par nom</Label>
              <Input
                id="search"
                placeholder="Prénom ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2"
              />
            </div>
            {userRole === "vie-scolaire" && (
              <div>
                <Label>Filtrer par rôle</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge
                    variant={roleFilter === "all" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setRoleFilter("all")}
                  >
                    Tous
                  </Badge>
                  <Badge
                    variant={roleFilter === "delegue" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setRoleFilter("delegue")}
                  >
                    Délégués
                  </Badge>
                  <Badge
                    variant={roleFilter === "eco-delegue" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setRoleFilter("eco-delegue")}
                  >
                    Éco-délégués
                  </Badge>
                  <Badge
                    variant={roleFilter === "eleve" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setRoleFilter("eleve")}
                  >
                    Élèves
                  </Badge>
                </div>
              </div>
            )}
            <div>
              <Label>Filtrer par classe</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {classes.map((cls) => (
                  <Badge
                    key={cls.id}
                    variant={selectedClasses.includes(cls.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedClasses((prev) =>
                        prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id],
                      )
                    }}
                  >
                    {cls.name}
                  </Badge>
                ))}
                {selectedClasses.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClasses([])}>
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* End of updates */}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total élèves</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Délégués</CardTitle>
            <Badge variant="secondary">Délégué</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter((s) => s.role === "delegue").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éco-délégués</CardTitle>
            <Badge variant="outline">Éco-délégué</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter((s) => s.role === "eco-delegue").length}</div>
          </CardContent>
        </Card>
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun élève</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Commencez par ajouter des élèves individuellement ou importez-les en masse
            </p>
            {userRole === "vie-scolaire" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un élève
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {userRole === "vie-scolaire" && (
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter((id) => id !== student.id))
                          }
                        }}
                        className="mt-1"
                      />
                    )}
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {student.first_name} {student.last_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {student.classes?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {student.classes.name}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            student.role === "delegue"
                              ? "default"
                              : student.role === "eco-delegue"
                                ? "outline"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {student.role === "delegue"
                            ? "Délégué"
                            : student.role === "eco-delegue"
                              ? "Éco-délégué"
                              : "Élève"}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedStudent(student)
                          setIsViewDialogOpen(true)
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Regarder
                      </DropdownMenuItem>
                      {userRole === "vie-scolaire" && student.role !== "eleve" && student.profile_id && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedStudent(student)
                            openAccessDialog(student)
                          }}
                        >
                          <Key className="mr-2 h-4 w-4" />
                          Gérer l'accès
                        </DropdownMenuItem>
                      )}
                      {userRole === "vie-scolaire" && student.role === "eleve" && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedStudent(student)
                            setIsPromoteDialogOpen(true)
                          }}
                        >
                          <Key className="mr-2 h-4 w-4" />
                          Créer un accès
                        </DropdownMenuItem>
                      )}
                      {userRole === "vie-scolaire" && (
                        <>
                          {student.role !== "eleve" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setStudentToDemote(student)
                                setIsDemoteDialogOpen(true)
                              }}
                            >
                              Rétrograder en élève
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setStudentToDelete(student)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="text-destructive"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {userRole === "vie-scolaire" && (
                  <>
                    {student.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-xs">📱</span>
                        <span>{student.phone}</span>
                      </div>
                    )}
                  </>
                )}
                {student.can_create_subrooms && (
                  <Badge variant="outline" className="text-xs">
                    Peut créer des sous-salles
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un élève</DialogTitle>
            <DialogDescription>Remplissez les informations de l'élève</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Jean"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Dupont"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean.dupont@exemple.fr"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class_id">Classe *</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "delegue" | "eco-delegue" | "eleve") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delegue">Délégué</SelectItem>
                    <SelectItem value="eco-delegue">Éco-délégué</SelectItem>
                    <SelectItem value="eleve">Élève</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="can_create_subrooms" className="text-base">
                  Peut créer des sous-salles
                </Label>
                <p className="text-sm text-muted-foreground">Autoriser cet élève à créer des sous-salles</p>
              </div>
              <Switch
                id="can_create_subrooms"
                checked={formData.can_create_subrooms}
                onCheckedChange={(checked) => setFormData({ ...formData, can_create_subrooms: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil de l'élève</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Prénom</Label>
                  <p className="font-medium">{selectedStudent.first_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{selectedStudent.last_name}</p>
                </div>
              </div>
              {userRole === "vie-scolaire" && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedStudent.email || "Non renseigné"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Téléphone</Label>
                    <p className="font-medium">{selectedStudent.phone || "Non renseigné"}</p>
                  </div>
                </>
              )}
              <div>
                <Label className="text-muted-foreground">Classe</Label>
                <p className="font-medium">{selectedStudent.classes?.name || "Non assigné"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Rôle</Label>
                <p className="font-medium">
                  {selectedStudent.role === "delegue"
                    ? "Délégué"
                    : selectedStudent.role === "eco-delegue"
                      ? "Éco-délégué"
                      : "Élève"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Peut créer des sous-salles</Label>
                <p className="font-medium">{selectedStudent.can_create_subrooms ? "Oui" : "Non"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Access Dialog */}
      <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gérer l'accès</DialogTitle>
            <DialogDescription>
              Identifiants pour {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Identifiant</Label>
              <Input
                id="username"
                value={accessData.username}
                onChange={(e) => setAccessData({ ...accessData, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="text"
                value={accessData.password}
                onChange={(e) => setAccessData({ ...accessData, password: e.target.value })}
                placeholder="Saisir un nouveau mot de passe"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Définissez un nouveau mot de passe. Ce mot de passe sera visible dans l'email envoyé à l'élève.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleSendEmail}
              className="w-full sm:w-auto bg-transparent"
              disabled={!selectedStudent?.email}
            >
              <Mail className="mr-2 h-4 w-4" />
              Envoyer par email
            </Button>
            <Button variant="outline" onClick={handlePrintPDF} className="w-full sm:w-auto bg-transparent">
              <FileText className="mr-2 h-4 w-4" />
              Télécharger PDF
            </Button>
            <Button onClick={handleUpdateCredentials} className="w-full sm:w-auto">
              <Key className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportStudentsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        establishmentId={establishmentId}
        availableClasses={classes}
        onImportComplete={fetchData}
      />

      {/* Demote Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDemoteDialogOpen}
        onOpenChange={setIsDemoteDialogOpen}
        onConfirm={() => studentToDemote && handleDemoteStudent(studentToDemote)}
        itemCount={1}
        itemType="rétrogradation d'élève"
      />

      {/* Promote Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promouvoir l'élève</DialogTitle>
            <DialogDescription>
              Choisissez le rôle pour {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nouveau rôle</Label>
              <Select
                value={promoteToRole}
                onValueChange={(value: "delegue" | "eco-delegue") => setPromoteToRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delegue">Délégué</SelectItem>
                  <SelectItem value="eco-delegue">Éco-délégué</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => selectedStudent && handlePromoteStudent(selectedStudent, promoteToRole)}>
              Promouvoir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => studentToDelete && handleDeleteStudent(studentToDelete)}
        itemCount={1}
        itemType="élève"
      />

      <DeleteConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        itemCount={selectedStudents.length}
        itemType="élève(s)"
      />

      <DeleteConfirmationDialog
        open={isBulkDemoteDialogOpen}
        onOpenChange={setIsBulkDemoteDialogOpen}
        onConfirm={handleBulkDemote}
        itemCount={selectedStudents.length}
        itemType="rétrogradation d'élève(s)"
      />

      <Dialog open={isEmailConfirmDialogOpen} onOpenChange={setIsEmailConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi</DialogTitle>
            <DialogDescription>Vérifiez l'adresse email avant d'envoyer les identifiants</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="confirm-email">Adresse email</Label>
              <Input
                id="confirm-email"
                type="email"
                value={emailToConfirm}
                onChange={(e) => setEmailToConfirm(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Les identifiants suivants seront envoyés :
              <br />
              <strong>Identifiant :</strong> {accessData.username}
              <br />
              <strong>Mot de passe :</strong> {accessData.password || "[Non défini]"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEmailConfirmDialogOpen(false)
                setIsAccessDialogOpen(true)
              }}
            >
              Modifier l'adresse
            </Button>
            <Button onClick={confirmAndSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? "Envoi..." : "Oui, envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkEmailDialogOpen} onOpenChange={setIsBulkEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoi groupé des accès</DialogTitle>
            <DialogDescription>
              Envoyer les identifiants à{" "}
              {students.filter((s) => selectedStudents.includes(s.id) && s.email && s.profile_id).length} élève(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Attention :</strong> Les adresses email ne sont pas vérifiées. Les emails seront envoyés aux
                adresses renseignées dans les profils des élèves.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Chaque élève recevra un email individuel contenant ses propres identifiants.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEmailDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmBulkSendEmails} disabled={isSendingEmail}>
              {isSendingEmail ? "Envoi en cours..." : "Envoyer les emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
