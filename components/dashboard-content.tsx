"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { clearAdminSession, isAdminSession } from "@/lib/admin-auth"
import { clearUserSession, getUserSession } from "@/lib/custom-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { LogOut, Users, BookOpen, SettingsIcon, Key, LayoutGrid, History, Archive } from "lucide-react"
import { motion } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types"
import { StudentsManagement } from "@/components/students-management"
import { TeachersManagement } from "@/components/teachers-management"
import { ClassesManagement } from "@/components/classes-management"
import { RoomsManagement } from "@/components/rooms-management"
import { SeatingPlanManagement } from "@/components/seating-plan-management"
// Nouveaux imports pour historique et archivage
import { AuditLogViewer } from "@/components/audit-log-viewer"
import { ArchivedSubRoomsManager } from "@/components/archived-subrooms-manager"

interface DashboardContentProps {
  user: User
  profile: Profile & { establishments: { name: string } }
}

export function DashboardContent({ user, profile }: DashboardContentProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  // Ajout de "history" et "archives" aux sections disponibles
  const [activeSection, setActiveSection] = useState<
    "home" | "students" | "teachers" | "classes" | "rooms" | "seating-plan" | "history" | "archives"
  >("home")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsData, setSettingsData] = useState({
    username: "",
    password: "",
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)

    // Nettoyer la session admin si elle existe
    if (isAdminSession()) {
      clearAdminSession()
    }

    // Nettoyer la session custom auth si elle existe
    if (getUserSession()) {
      clearUserSession()
    }

    // Essayer aussi de déconnecter de Supabase Auth (au cas où)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (e) {
      // Ignorer les erreurs Supabase, on a déjà nettoyé les sessions
      console.log("[v0] Supabase signOut error (ignoré):", e)
    }

    router.push("/auth/login")
    router.refresh()
  }

  const openSettings = async () => {
    const supabase = createClient()

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("username, password_hash")
      .eq("id", profile.id)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching profile:", error)
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les identifiants actuels",
        variant: "destructive",
      })
      return
    }

    if (!profileData) {
      // Profile doesn't exist, create default values
      setSettingsData({
        username: profile.username || `${profile.first_name.toLowerCase()}.${profile.last_name.toLowerCase()}`,
        password: "••••••••",
      })
    } else {
      setSettingsData({
        username: profileData.username || "",
        password: "••••••••",
      })
    }

    setIsSettingsOpen(true)
  }

  const handleUpdateCredentials = async () => {
    const supabase = createClient()

    if (settingsData.password !== "••••••••") {
      const { data: hashedPassword, error: hashError } = await supabase.rpc("hash_password", {
        password: settingsData.password,
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
          username: settingsData.username,
          password_hash: hashedPassword,
        })
        .eq("id", profile.id)

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
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: settingsData.username,
        })
        .eq("id", profile.id)

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
    setIsSettingsOpen(false)
  }

  const getUserTypeLabel = () => {
    switch (profile.role) {
      case "delegue":
        return "Délégué"
      case "eco-delegue":
        return "Éco-délégué"
      case "professeur":
        return "Professeur"
      case "vie-scolaire":
        return "Vie Scolaire"
      default:
        return ""
    }
  }

  const getUserTypeColor = () => {
    switch (profile.role) {
      case "delegue":
      case "eco-delegue":
        return "blue"
      case "professeur":
        return "teal"
      case "vie-scolaire":
        return "amber"
      default:
        return "blue"
    }
  }

  const getUserGradientClass = () => {
    switch (profile.role) {
      case "delegue":
      case "eco-delegue":
        return "bg-gradient-to-br from-blue-400 to-blue-600"
      case "professeur":
        return "bg-gradient-to-br from-teal-400 to-teal-600"
      case "vie-scolaire":
        return "bg-gradient-to-br from-amber-400 to-amber-600"
      default:
        return "bg-gradient-to-br from-blue-400 to-blue-600"
    }
  }

  const color = getUserTypeColor()

  // Section Students
  if (activeSection === "students") {
    return (
      <StudentsManagement
        establishmentId={profile.establishment_id}
        userRole={profile.role}
        userId={profile.id}
        onBack={() => setActiveSection("home")}
      />
    )
  }

  // Section Teachers
  if (activeSection === "teachers") {
    return (
      <TeachersManagement
        establishmentId={profile.establishment_id}
        userRole={profile.role}
        userId={profile.id}
        onBack={() => setActiveSection("home")}
      />
    )
  }

  // Section Classes
  if (activeSection === "classes") {
    return <ClassesManagement establishmentId={profile.establishment_id} onBack={() => setActiveSection("home")} />
  }

  // Section Rooms
  if (activeSection === "rooms") {
    return (
      <RoomsManagement
        establishmentId={profile.establishment_id}
        userRole={profile.role}
        userId={profile.id}
        onBack={() => setActiveSection("home")}
      />
    )
  }

  // Section Seating Plan
  if (activeSection === "seating-plan") {
    return (
      <SeatingPlanManagement
        establishmentId={profile.establishment_id}
        userRole={profile.role}
        userId={profile.id}
        onBack={() => setActiveSection("home")}
      />
    )
  }

  // Section Historique (vie-scolaire uniquement)
  if (activeSection === "history") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setActiveSection("home")}>
              ← Retour au tableau de bord
            </Button>
          </div>
          <AuditLogViewer 
            establishmentId={profile.establishment_id}
            showFilters={true}
          />
        </div>
      </div>
    )
  }

  // Section Archives (vie-scolaire uniquement)
  if (activeSection === "archives") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setActiveSection("home")}>
              ← Retour au tableau de bord
            </Button>
          </div>
          <ArchivedSubRoomsManager
            userId={profile.id}
            userRole={profile.role}
            establishmentId={profile.establishment_id}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-full ${getUserGradientClass()} flex items-center justify-center`}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{getUserTypeLabel()}</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {profile.first_name} {profile.last_name}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 ml-15">{profile.establishments?.name}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={openSettings}
                  className="hover:bg-slate-50 hover:border-slate-300 transition-all bg-transparent"
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Paramètres
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all bg-transparent"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {profile.role === "vie-scolaire" && (
            <>
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-purple-300 dark:hover:border-purple-600"
                onClick={() => setActiveSection("classes")}
              >
                <CardHeader className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="mr-3 h-6 w-6" />
                    Classes
                  </CardTitle>
                  <CardDescription className="text-purple-100">Créer et gérer les classes</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Créez et gérez les classes de votre établissement.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => setActiveSection("students")}
              >
                <CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Users className="mr-3 h-6 w-6" />
                    Élèves
                  </CardTitle>
                  <CardDescription className="text-blue-100">Gérer tous les élèves</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Accédez à la liste complète des élèves et gérez leurs informations.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-teal-300 dark:hover:border-teal-600"
                onClick={() => setActiveSection("teachers")}
              >
                <CardHeader className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="mr-3 h-6 w-6" />
                    Professeurs
                  </CardTitle>
                  <CardDescription className="text-teal-100">Gérer tous les professeurs</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Accédez à la liste des professeurs et gérez leurs matières.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-amber-300 dark:hover:border-amber-600"
                onClick={() => setActiveSection("rooms")}
              >
                <CardHeader className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <SettingsIcon className="mr-3 h-6 w-6" />
                    Salles
                  </CardTitle>
                  <CardDescription className="text-amber-100">Créer et configurer les salles</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Créez des salles et configurez les plans de classe.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-indigo-300 dark:hover:border-indigo-600"
                onClick={() => setActiveSection("seating-plan")}
              >
                <CardHeader className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <LayoutGrid className="mr-3 h-6 w-6" />
                    Plan de Classe
                  </CardTitle>
                  <CardDescription className="text-indigo-100">Créer et gérer les plans de classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Créez des sous-salles et organisez les plans de classe.
                  </p>
                </CardContent>
              </Card>

              {/* NOUVELLE CARTE : Historique */}
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-rose-300 dark:hover:border-rose-600"
                onClick={() => setActiveSection("history")}
              >
                <CardHeader className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <History className="mr-3 h-6 w-6" />
                    Historique
                  </CardTitle>
                  <CardDescription className="text-rose-100">Voir les modifications</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consultez l'historique de toutes les modifications effectuées.
                  </p>
                </CardContent>
              </Card>

              {/* NOUVELLE CARTE : Archives */}
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-slate-300 dark:hover:border-slate-600"
                onClick={() => setActiveSection("archives")}
              >
                <CardHeader className="bg-gradient-to-br from-slate-500 to-slate-700 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Archive className="mr-3 h-6 w-6" />
                    Archives
                  </CardTitle>
                  <CardDescription className="text-slate-200">Sous-salles archivées</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Gérez les sous-salles archivées et restaurez-les si nécessaire.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {profile.role === "professeur" && (
            <>
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => setActiveSection("students")}
              >
                <CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Users className="mr-3 h-6 w-6" />
                    Mes élèves
                  </CardTitle>
                  <CardDescription className="text-blue-100">Voir les élèves de mes classes</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Accédez aux profils des élèves de vos classes.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-teal-300 dark:hover:border-teal-600"
                onClick={() => setActiveSection("teachers")}
              >
                <CardHeader className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="mr-3 h-6 w-6" />
                    Mes collègues
                  </CardTitle>
                  <CardDescription className="text-teal-100">Voir les autres professeurs</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consultez la liste des professeurs de vos classes.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-amber-300 dark:hover:border-amber-600"
                onClick={() => setActiveSection("rooms")}
              >
                <CardHeader className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <SettingsIcon className="mr-3 h-6 w-6" />
                    Salles
                  </CardTitle>
                  <CardDescription className="text-amber-100">Accéder aux plans de classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consultez les plans de classe pour vos salles.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-indigo-300 dark:hover:border-indigo-600"
                onClick={() => setActiveSection("seating-plan")}
              >
                <CardHeader className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <LayoutGrid className="mr-3 h-6 w-6" />
                    Plan de Classe
                  </CardTitle>
                  <CardDescription className="text-indigo-100">Créer et gérer les plans de classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Créez des sous-salles et organisez les plans de classe.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {(profile.role === "delegue" || profile.role === "eco-delegue") && (
            <>
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => setActiveSection("students")}
              >
                <CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Users className="mr-3 h-6 w-6" />
                    Ma classe
                  </CardTitle>
                  <CardDescription className="text-blue-100">Voir les élèves de ma classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consultez la liste des élèves de votre classe.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-teal-300 dark:hover:border-teal-600"
                onClick={() => setActiveSection("teachers")}
              >
                <CardHeader className="bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="mr-3 h-6 w-6" />
                    Mes professeurs
                  </CardTitle>
                  <CardDescription className="text-teal-100">Voir mes professeurs</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Consultez la liste de vos professeurs.</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-amber-300 dark:hover:border-amber-600"
                onClick={() => setActiveSection("rooms")}
              >
                <CardHeader className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <SettingsIcon className="mr-3 h-6 w-6" />
                    Salles
                  </CardTitle>
                  <CardDescription className="text-amber-100">Voir les plans de classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consultez les plans de classe de votre établissement.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-indigo-300 dark:hover:border-indigo-600"
                onClick={() => setActiveSection("seating-plan")}
              >
                <CardHeader className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <LayoutGrid className="mr-3 h-6 w-6" />
                    Plan de Classe
                  </CardTitle>
                  <CardDescription className="text-indigo-100">Créer et gérer les plans de classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Créez des sous-salles et organisez les plans de classe.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paramètres du compte</DialogTitle>
            <DialogDescription>Gérez vos identifiants de connexion</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="settings-username">Identifiant</Label>
              <Input
                id="settings-username"
                value={settingsData.username}
                onChange={(e) => setSettingsData({ ...settingsData, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="settings-password">Mot de passe</Label>
              <Input
                id="settings-password"
                type="text"
                value={settingsData.password}
                onChange={(e) => setSettingsData({ ...settingsData, password: e.target.value })}
                placeholder="Saisir un nouveau mot de passe"
              />
              <p className="text-xs text-muted-foreground mt-1">Laissez vide pour conserver le mot de passe actuel</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateCredentials}>
              <Key className="mr-2 h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
