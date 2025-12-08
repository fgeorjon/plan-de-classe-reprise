"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ArrowLeft, Plus, MoreVertical, Eye, Key, Mail, FileText, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ImportTeachersDialog } from "@/components/import-teachers-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog" // Added import for bulk delete dialog
import type { Teacher } from "@/lib/types"
import { isAdminSession } from "@/lib/admin-auth"
import { adminStorage } from "@/lib/admin-storage"
import { createUser } from "@/lib/user-management"

interface TeachersManagementProps {
  establishmentId: string
  userRole?: string
  userId?: string
  onBack?: () => void
}

export function TeachersManagement({ establishmentId, userRole, userId, onBack }: TeachersManagementProps) {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [accessData, setAccessData] = useState({
    username: "",
    password: "",
  })

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    subject: "",
    classes: [] as string[],
    allow_delegate_subrooms: false, // Added allow_delegate_subrooms state
  })

  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]) // Added class filter state
  const [isPrincipal, setIsPrincipal] = useState(false) // Added principal checkbox state
  const [principalClassId, setPrincipalClassId] = useState<string>("") // Added principal class selection

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)

  const [searchQuery, setSearchQuery] = useState("") // Added search query state
  const [isPPFilter, setIsPPFilter] = useState<boolean | null>(null) // Added PP filter state
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]) // Added bulk selection state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false) // Added bulk delete dialog state

  const [teachersWithPPBadge, setTeachersWithPPBadge] = useState<Set<string>>(new Set())

  const [isEmailConfirmDialogOpen, setIsEmailConfirmDialogOpen] = useState(false)
  const [emailToConfirm, setEmailToConfirm] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = useState(false)

  const handleAddClass = () => {
    if (formData.classes.length < classes.length) {
      const selectedClass = classes.find((cls) => cls.name === formData.classes[formData.classes.length - 1])
      if (selectedClass && !formData.classes.includes(selectedClass.name)) {
        setFormData({
          ...formData,
          classes: [...formData.classes, selectedClass.name],
        })
      }
    }
  }

  const handleRemoveClass = (classToRemove: string) => {
    setFormData({
      ...formData,
      classes: formData.classes.filter((c) => c !== classToRemove),
    })
  }

  const fetchData = async () => {
    const supabase = createClient()

    // Fetch classes
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, name")
      .eq("establishment_id", establishmentId)
      .order("name")

    if (!classesError && classesData) {
      setClasses(classesData)
      setAvailableClasses(classesData.map((c) => c.name))
    }

    let teachersResult

    if (userRole === "professeur") {
      // Get the teacher's classes first
      const { data: teacherClasses, error: teacherClassesError } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", userId)

      if (teacherClassesError) {
        console.error("[v0] Error fetching teacher classes:", teacherClassesError)
        setTeachers([])
        return
      }

      const classIds = teacherClasses?.map((tc) => tc.class_id) || []

      if (classIds.length === 0) {
        setTeachers([])
        return
      }

      // Now fetch teachers who teach those same classes
      const { data: otherTeacherClasses, error: otherTeachersError } = await supabase
        .from("teacher_classes")
        .select("teacher_id")
        .in("class_id", classIds)

      if (otherTeachersError) {
        console.error("[v0] Error fetching other teachers:", otherTeachersError)
        setTeachers([])
        return
      }

      const teacherIds = [...new Set(otherTeacherClasses?.map((tc) => tc.teacher_id) || [])]

      // Fetch teacher details
      teachersResult = await supabase
        .from("teachers")
        .select("*")
        .eq("establishment_id", establishmentId)
        .in("id", teacherIds)
        .order("last_name")
    } else if (userRole === "delegue" || userRole === "eco-delegue") {
      // Get the student's class first
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", userId)
        .single()

      if (studentError || !studentData?.class_id) {
        console.error("[v0] Error fetching student class:", studentError)
        setTeachers([])
        return
      }

      // Get teachers for that class
      const { data: classTeachers, error: classTeachersError } = await supabase
        .from("teacher_classes")
        .select("teacher_id")
        .eq("class_id", studentData.class_id)

      if (classTeachersError) {
        console.error("[v0] Error fetching class teachers:", classTeachersError)
        setTeachers([])
        return
      }

      const teacherIds = classTeachers?.map((tc) => tc.teacher_id) || []

      if (teacherIds.length === 0) {
        setTeachers([])
        return
      }

      // Fetch teacher details
      teachersResult = await supabase
        .from("teachers")
        .select("*")
        .eq("establishment_id", establishmentId)
        .in("id", teacherIds)
        .order("last_name")
    } else {
      // Vie-scolaire: fetch all teachers
      teachersResult = await supabase
        .from("teachers")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("last_name")
    }

    if (teachersResult && !teachersResult.error) {
      setTeachers(teachersResult.data || [])
    } else {
      console.error("[v0] Error fetching teachers:", teachersResult?.error)
      setTeachers([])
    }
  }

  useEffect(() => {
    const adminMode = isAdminSession()
    setIsAdmin(adminMode)

    if (adminMode) {
      const storedTeachers = adminStorage.getTeachers()
      setTeachers(storedTeachers)
    } else {
      fetchData()
    }
  }, [establishmentId, userRole, userId])

  useEffect(() => {
    const fetchTeacherClasses = async () => {
      const supabase = createClient()

      for (const teacher of teachers) {
        const { data: teacherClasses } = await supabase
          .from("teacher_classes")
          .select("class_id, classes(name)")
          .eq("teacher_id", teacher.id)

        if (teacherClasses) {
          teacher.classes = teacherClasses.map((tc: any) => tc.classes.name)
        }
      }

      setTeachers([...teachers])
    }

    if (teachers.length > 0 && !isAdmin) {
      fetchTeacherClasses()
    }
  }, [teachers]) // Updated dependency array

  const handleAddTeacher = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: "Erreur",
        description: "Le prénom et le nom sont requis",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const credentials = await createUser({
        establishment_id: establishmentId,
        role: "professeur",
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        subject: formData.subject || undefined,
        class_ids:
          formData.classes.length > 0
            ? formData.classes.map((cls) => classes.find((c) => c.name === cls)?.id)
            : undefined,
        is_principal: isPrincipal, // Added principal flag
        principal_class_id: isPrincipal ? principalClassId : undefined, // Added principal class
        allow_delegate_subrooms: formData.allow_delegate_subrooms, // Added allow_delegate_subrooms
      })

      toast({
        title: "Professeur créé avec succès",
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

      setIsAddDialogOpen(false)
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        subject: "",
        classes: [],
        allow_delegate_subrooms: false, // Reset allow_delegate_subrooms
      })

      setIsPrincipal(false)
      setPrincipalClassId("")

      fetchData() // Auto-refresh after add
    } catch (error) {
      console.error("[v0] Error creating teacher:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le professeur",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditTeacher = async () => {
    if (!editingTeacher) return

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: "Erreur",
        description: "Le prénom et le nom sont requis",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Update teacher basic info
      const { error: teacherError } = await supabase
        .from("teachers")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          subject: formData.subject || null,
          is_principal: isPrincipal,
          principal_class_id: isPrincipal ? principalClassId : null,
          allow_delegate_subrooms: formData.allow_delegate_subrooms, // Added allow_delegate_subrooms
        })
        .eq("id", editingTeacher.id)

      if (teacherError) throw teacherError

      // Update teacher classes
      // First, delete existing class associations
      await supabase.from("teacher_classes").delete().eq("teacher_id", editingTeacher.id)

      // Then, add new class associations
      if (formData.classes.length > 0) {
        const classIds = formData.classes
          .map((cls) => classes.find((c) => c.name === cls)?.id)
          .filter((id): id is string => id !== undefined)

        const teacherClasses = classIds.map((classId) => ({
          teacher_id: editingTeacher.id,
          class_id: classId,
        }))

        await supabase.from("teacher_classes").insert(teacherClasses)
      }

      toast({
        title: "Professeur modifié avec succès",
        description: "Les informations du professeur ont été mises à jour",
      })

      setIsEditDialogOpen(false)
      setEditingTeacher(null)
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        subject: "",
        classes: [],
        allow_delegate_subrooms: false, // Reset allow_delegate_subrooms
      })
      setIsPrincipal(false)
      setPrincipalClassId("")

      fetchData() // Auto-refresh after edit
    } catch (error) {
      console.error("[v0] Error editing teacher:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le professeur",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTeacher = async (id: string) => {
    try {
      if (isAdmin) {
        adminStorage.deleteTeacher(id)
        setTeachers(teachers.filter((t) => t.id !== id))

        toast({
          title: "Professeur supprimé",
          description: "Le professeur a été supprimé avec succès",
        })
      } else {
        const supabase = createClient()

        const { error } = await supabase.from("teachers").delete().eq("id", id)

        if (error) throw error

        setTeachers(teachers.filter((t) => t.id !== id))

        toast({
          title: "Professeur supprimé",
          description: "Le professeur a été supprimé avec succès",
        })

        fetchData() // Auto-refresh after delete
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le professeur",
        variant: "destructive",
      })
    }
  }

  const handleViewTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsViewDialogOpen(true)
  }

  const openAccessDialog = async (teacher: Teacher) => {
    setSelectedTeacher(teacher)

    if (teacher.profile_id) {
      const supabase = createClient()
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", teacher.profile_id)
        .maybeSingle()

      if (profileData) {
        setAccessData({
          username: profileData.username || "",
          password: "••••••••", // Show masked password
        })
      } else {
        // Fallback if profile doesn't exist
        setAccessData({
          username: `${teacher.first_name.toLowerCase()}.${teacher.last_name.toLowerCase()}`,
          password: "••••••••",
        })
      }
    } else {
      setAccessData({
        username: `${teacher.first_name.toLowerCase()}.${teacher.last_name.toLowerCase()}`,
        password: "",
      })
    }

    setIsAccessDialogOpen(true)
  }

  const openEditDialog = async (teacher: Teacher) => {
    setEditingTeacher(teacher)

    // Fetch teacher's classes
    const supabase = createClient()
    const { data: teacherClasses } = await supabase
      .from("teacher_classes")
      .select("class_id, classes(name)")
      .eq("teacher_id", teacher.id)

    const classNames = teacherClasses?.map((tc: any) => tc.classes.name) || []

    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email || "",
      subject: teacher.subject || "",
      classes: classNames,
      allow_delegate_subrooms: teacher.allow_delegate_subrooms || false, // Load allow_delegate_subrooms
    })

    setIsPrincipal(teacher.is_principal || false)
    setPrincipalClassId(teacher.principal_class_id || "")

    setIsEditDialogOpen(true)
  }

  const handleUpdateCredentials = async () => {
    if (!selectedTeacher) return

    if (!selectedTeacher.profile_id) {
      toast({
        title: "Erreur",
        description: "Ce professeur n'a pas de profil utilisateur",
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

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: accessData.username,
          password_hash: hashedPassword,
        })
        .eq("id", selectedTeacher.profile_id)

      if (profileError) {
        console.error("[v0] Error updating profile:", profileError)
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour les identifiants",
          variant: "destructive",
        })
        return
      }
    } else {
      // Only update username
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: accessData.username,
        })
        .eq("id", selectedTeacher.profile_id)

      if (profileError) {
        console.error("[v0] Error updating profile:", profileError)
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
    fetchData() // Rafraîchir les données après la mise à jour
  }

  const handleSendEmail = () => {
    if (!selectedTeacher || !selectedTeacher.email) {
      toast({
        title: "Erreur",
        description: "Aucune adresse email renseignée pour ce professeur",
        variant: "destructive",
      })
      return
    }

    setEmailToConfirm(selectedTeacher.email)
    setIsEmailConfirmDialogOpen(true)
  }

  async function confirmAndSendEmail() {
    if (!selectedTeacher) return

    setIsSendingEmail(true)

    try {
      const response = await fetch("/api/send-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: emailToConfirm,
          recipientName: `${selectedTeacher.first_name} ${selectedTeacher.last_name}`,
          username: accessData.username,
          password: accessData.password === "••••••••" ? "[Mot de passe masqué]" : accessData.password,
          userType: "teacher",
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
      setIsAccessDialogOpen(false)
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

  async function handleBulkSendEmails() {
    const teachersToEmail = teachers.filter((t) => selectedTeachers.includes(t.id) && t.email && t.profile_id)

    if (teachersToEmail.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucun professeur sélectionné n'a d'adresse email et d'accès",
        variant: "destructive",
      })
      return
    }

    setIsBulkEmailDialogOpen(true)
  }

  async function confirmBulkSendEmails() {
    const teachersToEmail = teachers.filter((t) => selectedTeachers.includes(t.id) && t.email && t.profile_id)

    setIsSendingEmail(true)

    try {
      const supabase = createClient()
      let successCount = 0
      let failCount = 0

      for (const teacher of teachersToEmail) {
        // Fetch credentials for each teacher
        const { data: profileData } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", teacher.profile_id)
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
            recipientEmail: teacher.email,
            recipientName: `${teacher.first_name} ${teacher.last_name}`,
            username: profileData.username,
            password: "[Mot de passe masqué - Contactez la vie scolaire]",
            userType: "teacher",
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
      setSelectedTeachers([])
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

  const handlePrintPDF = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow && selectedTeacher) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Identifiants - ${selectedTeacher.first_name} ${selectedTeacher.last_name}</title>
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
              <div class="field"><span class="label">Nom:</span> ${selectedTeacher.first_name} ${selectedTeacher.last_name}</div>
              <div class="field"><span class="label">Matière:</span> ${selectedTeacher.subject || "N/A"}</div>
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

  const checkPPBadges = async () => {
    if (userRole === "delegue" || userRole === "eco-delegue") {
      const supabase = createClient()

      // Get the student's class
      const { data: studentData, error } = await supabase.from("students").select("class_id").eq("id", userId).single()

      if (!error && studentData) {
        const ppTeachers = new Set<string>()

        for (const teacher of teachers) {
          if (teacher.is_principal && teacher.principal_class_id === studentData.class_id) {
            ppTeachers.add(teacher.id)
          }
        }

        setTeachersWithPPBadge(ppTeachers)
      }
    } else if (userRole === "vie-scolaire" || userRole === "professeur") {
      // Show all PP badges for vie-scolaire and professeur
      const ppTeachers = new Set<string>()
      for (const teacher of teachers) {
        if (teacher.is_principal) {
          ppTeachers.add(teacher.id)
        }
      }
      setTeachersWithPPBadge(ppTeachers)
    }
  }

  useEffect(() => {
    if (teachers.length > 0) {
      checkPPBadges()
    }
  }, [teachers, userRole, userId])

  const filteredTeachers = teachers.filter((t) => {
    // Filter by selected classes
    if (selectedClasses.length > 0) {
      const hasMatchingClass = t.classes?.some((cls) => {
        const classObj = classes.find((c) => c.name === cls)
        return classObj && selectedClasses.includes(classObj.id)
      })
      if (!hasMatchingClass) return false
    }
    // Filter by PP status
    if (isPPFilter !== null && t.is_principal !== isPPFilter) {
      return false
    }
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${t.first_name} ${t.last_name}`.toLowerCase()
      const subject = (t.subject || "").toLowerCase()
      return fullName.includes(query) || subject.includes(query)
    }
    return true
  })

  async function handleBulkDeleteTeachers() {
    try {
      const supabase = createClient()

      // Delete profiles for teachers that have them
      const teachersWithProfiles = teachers.filter((t) => selectedTeachers.includes(t.id) && t.profile_id)

      if (teachersWithProfiles.length > 0) {
        const profileIds = teachersWithProfiles.map((t) => t.profile_id).filter(Boolean)
        await supabase.from("profiles").delete().in("id", profileIds)
      }

      // Delete teacher_classes associations
      await supabase.from("teacher_classes").delete().in("teacher_id", selectedTeachers)

      // Delete teachers
      const { error } = await supabase.from("teachers").delete().in("id", selectedTeachers)

      if (error) throw error

      toast({
        title: "Succès",
        description: `${selectedTeachers.length} professeur(s) supprimé(s) avec succès`,
      })
      setIsBulkDeleteDialogOpen(false)
      setSelectedTeachers([])
      fetchData() // Auto-refresh after bulk delete
    } catch (error) {
      console.error("[v0] Error bulk deleting teachers:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les professeurs",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack || (() => router.push("/dashboard"))}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">
            {userRole === "professeur"
              ? "Mes collègues"
              : userRole === "delegue" || userRole === "eco-delegue"
                ? "Mes professeurs"
                : "Gestion des professeurs"}
          </h1>
        </div>
        {userRole === "vie-scolaire" && (
          <div className="flex gap-2">
            {selectedTeachers.length > 0 && (
              <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                Supprimer ({selectedTeachers.length})
              </Button>
            )}
            <Button variant="outline" onClick={handleBulkSendEmails}>
              <Mail className="mr-2 h-4 w-4" />
              Envoyer accès ({selectedTeachers.length})
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un professeur
            </Button>
          </div>
        )}
      </div>

      {classes.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Rechercher et filtrer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="teacher-search">Rechercher par nom ou matière</Label>
              <Input
                id="teacher-search"
                placeholder="Nom, prénom ou matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2"
              />
            </div>
            {userRole === "vie-scolaire" && (
              <div>
                <Label>Filtrer par statut</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge
                    variant={isPPFilter === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setIsPPFilter(null)}
                  >
                    Tous
                  </Badge>
                  <Badge
                    variant={isPPFilter === true ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setIsPPFilter(true)}
                  >
                    Professeurs Principaux
                  </Badge>
                  <Badge
                    variant={isPPFilter === false ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setIsPPFilter(false)}
                  >
                    Professeurs
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

      <Card>
        <CardHeader>
          <CardTitle>Liste des professeurs</CardTitle>
          <CardDescription>
            {filteredTeachers.length} professeur{filteredTeachers.length > 1 ? "s" : ""} enregistré
            {filteredTeachers.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {userRole === "vie-scolaire" && <TableHead className="w-12"></TableHead>}
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Matière</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  {userRole === "vie-scolaire" && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(teacher.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeachers([...selectedTeachers, teacher.id])
                          } else {
                            setSelectedTeachers(selectedTeachers.filter((id) => id !== teacher.id))
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {teacher.last_name}
                      {teachersWithPPBadge.has(teacher.id) && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                          P.P
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{teacher.first_name}</TableCell>
                  <TableCell>{teacher.subject || "Non renseigné"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacher.classes?.slice(0, 3).map((cls) => (
                        <Badge key={cls} variant="secondary">
                          {cls}
                        </Badge>
                      ))}
                      {teacher.classes && teacher.classes.length > 3 && (
                        <Badge variant="outline">+{teacher.classes.length - 3}</Badge>
                      )}
                      {(!teacher.classes || teacher.classes.length === 0) && (
                        <span className="text-muted-foreground text-sm">Aucune classe</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewTeacher(teacher)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir le profil
                        </DropdownMenuItem>
                        {userRole === "vie-scolaire" && (
                          <>
                            <DropdownMenuItem onClick={() => openEditDialog(teacher)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAccessDialog(teacher)}>
                              <Key className="mr-2 h-4 w-4" />
                              Gérer l'accès
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTeacher(teacher.id)} className="text-red-600">
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Teacher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un professeur</DialogTitle>
            <DialogDescription>Remplissez les informations du professeur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Matière</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="ex: Mathématiques"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classes">Classes enseignées</Label>
              <div className="space-y-2">
                <Select
                  onValueChange={(value) => {
                    if (!formData.classes.includes(value)) {
                      setFormData({
                        ...formData,
                        classes: [...formData.classes, value],
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  {formData.classes.map((cls) => (
                    <Badge
                      key={cls}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveClass(cls)}
                    >
                      {cls} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_principal"
                  checked={isPrincipal}
                  onChange={(e) => setIsPrincipal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_principal" className="cursor-pointer">
                  Professeur Principal
                </Label>
              </div>
              {isPrincipal && (
                <Select value={principalClassId} onValueChange={setPrincipalClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la classe principale" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Added allow_delegate_subrooms checkbox in add teacher dialog */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allow_delegate_subrooms"
                  checked={formData.allow_delegate_subrooms}
                  onChange={(e) => setFormData({ ...formData, allow_delegate_subrooms: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="allow_delegate_subrooms" className="cursor-pointer">
                  Autoriser les délégués à créer des sous-salles pour moi
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddTeacher} disabled={isLoading}>
              {isLoading ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le professeur</DialogTitle>
            <DialogDescription>Modifiez les informations du professeur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">Prénom</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Nom</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_subject">Matière</Label>
              <Input
                id="edit_subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="ex: Mathématiques"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_classes">Classes enseignées</Label>
              <div className="space-y-2">
                <Select
                  onValueChange={(value) => {
                    if (!formData.classes.includes(value)) {
                      setFormData({
                        ...formData,
                        classes: [...formData.classes, value],
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  {formData.classes.map((cls) => (
                    <Badge
                      key={cls}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveClass(cls)}
                    >
                      {cls} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_principal"
                  checked={isPrincipal}
                  onChange={(e) => setIsPrincipal(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit_is_principal" className="cursor-pointer">
                  Professeur Principal
                </Label>
              </div>
              {isPrincipal && (
                <Select value={principalClassId} onValueChange={setPrincipalClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la classe principale" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Added allow_delegate_subrooms checkbox in edit teacher dialog */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_allow_delegate_subrooms"
                  checked={formData.allow_delegate_subrooms}
                  onChange={(e) => setFormData({ ...formData, allow_delegate_subrooms: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit_allow_delegate_subrooms" className="cursor-pointer">
                  Autoriser les délégués à créer des sous-salles pour moi
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditTeacher} disabled={isLoading}>
              {isLoading ? "Modification..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Teacher Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil du professeur</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Prénom</Label>
                  <p className="font-medium">{selectedTeacher.first_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{selectedTeacher.last_name}</p>
                </div>
              </div>
              {userRole === "vie-scolaire" && (
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedTeacher.email || "Non renseigné"}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Matière</Label>
                <p className="font-medium">{selectedTeacher.subject || "Non renseigné"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Classes enseignées</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTeacher.classes?.map((cls) => (
                    <Badge key={cls} variant="secondary">
                      {cls}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedTeacher.is_principal && (
                <div>
                  <Label className="text-muted-foreground">Professeur Principal</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                      P.P
                    </Badge>
                    {selectedTeacher.principal_class_id && (
                      <span className="text-sm">
                        de {classes.find((c) => c.id === selectedTeacher.principal_class_id)?.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Display allow_delegate_subrooms in view dialog */}
              {selectedTeacher.allow_delegate_subrooms && (
                <div>
                  <Label className="text-muted-foreground">Autorisations</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">Les délégués peuvent créer des sous-salles</Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Access Dialog */}
      <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer l'accès</DialogTitle>
            <DialogDescription>
              Définissez les identifiants de connexion pour {selectedTeacher?.first_name} {selectedTeacher?.last_name}
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
                value={accessData.password}
                onChange={(e) => setAccessData({ ...accessData, password: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdateCredentials} className="w-full">
              Enregistrer les identifiants
            </Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSendEmail} disabled={!selectedTeacher?.email}>
              <Mail className="mr-2 h-4 w-4" />
              Envoyer par email
            </Button>
            <Button variant="outline" onClick={handlePrintPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Imprimer en PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <strong>Mot de passe :</strong> {accessData.password === "••••••••" ? "[Masqué]" : accessData.password}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setIsEmailConfirmDialogOpen(false)
                setIsAccessDialogOpen(false)
                // Re-open edit dialog to potentially correct data if needed
                if (selectedTeacher) {
                  openEditDialog(selectedTeacher)
                }
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
              {teachers.filter((t) => selectedTeachers.includes(t.id) && t.email && t.profile_id).length} professeur(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Attention :</strong> Les adresses email ne sont pas vérifiées. Les emails seront envoyés aux
                adresses renseignées dans les profils des professeurs.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Chaque professeur recevra un email individuel contenant ses propres identifiants.
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

      {/* Import Dialog */}
      <ImportTeachersDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        establishmentId={establishmentId}
        availableClasses={classes}
        onImportComplete={() => router.refresh()}
      />

      <DeleteConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDeleteTeachers}
        itemCount={selectedTeachers.length}
        itemType="professeur(s)"
      />

      <Toaster />
    </div>
  )
}
