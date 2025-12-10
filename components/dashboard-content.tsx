"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { clearAdminSession, isAdminSession } from "@/lib/admin-auth"
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
import { LogOut, Users, BookOpen, SettingsIcon, Key, LayoutGrid, Lightbulb, Moon, Sun } from "lucide-react"
import { motion } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types"
import { StudentsManagement } from "@/components/students-management"
import { TeachersManagement } from "@/components/teachers-management"
import { ClassesManagement } from "@/components/classes-management"
import { RoomsManagement } from "@/components/rooms-management"
import { SeatingPlanManagement } from "@/components/seating-plan-management"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { useTheme } from "next-themes"

interface DashboardContentProps {
  user: User
  profile: Profile
}

export function DashboardContent({ user, profile }: DashboardContentProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeSection, setActiveSection] = useState<
    "home" | "students" | "teachers" | "classes" | "rooms" | "seating-plan"
  >("home")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsData, setSettingsData] = useState({
    username: "",
    password: "",
  })
  const { theme, setTheme } = useTheme()
  const [canAccessSandbox, setCanAccessSandbox] = useState(true)

  useEffect(() => {
    async function checkSandboxPermission() {
      if (profile.role === "delegue" || profile.role === "eco-delegue") {
        const supabase = createClient()
        const { data } = await supabase.from("profiles").select("can_create_subrooms").eq("id", profile.id).single()

        if (data) {
          setCanAccessSandbox(data.can_create_subrooms ?? true)
        }
      }
    }

    checkSandboxPermission()
  }, [profile.id, profile.role])

  function generateStrongPassword(length = 8): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const numbers = "0123456789"
    const symbols = "!@#$%&*"

    const allChars = lowercase + uppercase + numbers + symbols

    let password = ""
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("")
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    if (isAdminSession()) {
      clearAdminSession()
      router.push("/auth/login")
      router.refresh()
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive",
      })
      setIsLoggingOut(false)
    } else {
      router.push("/auth/login")
      router.refresh()
    }
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
      setSettingsData({
        username: profile.username || `${profile.first_name.toLowerCase()}.${profile.last_name.toLowerCase()}`,
        password: "", // Empty string so user knows they can set new password
      })
    } else {
      setSettingsData({
        username: profileData.username || "",
        password: "", // Empty string so user knows they can set new password
      })
    }

    setIsSettingsOpen(true)
  }

  const handleUpdateCredentials = async () => {
    if (!settingsData.username || settingsData.username.trim() === "") {
      toast({
        title: "Erreur",
        description: "L'identifiant ne peut pas être vide",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()

    if (settingsData.password !== "") {
      console.log("[v0] Updating user password in settings")
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

      console.log("[v0] User password updated successfully")
    } else {
      console.log("[v0] Updating username only in settings")
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

      console.log("[v0] Username updated successfully")
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

  if (activeSection === "classes") {
    return <ClassesManagement establishmentId={profile.establishment_id} onBack={() => setActiveSection("home")} />
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto p-6 max-w-7xl">
        <header className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
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
            <div className="flex gap-2 items-center">
              <NotificationsDropdown userId={profile.id} />
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
              <Button
                variant="outline"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-slate-50 hover:border-slate-300 transition-all bg-transparent"
              >
                {theme === "dark" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                {theme === "dark" ? "Mode jour" : "Mode nuit"}
              </Button>
            </div>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {profile.role === "vie-scolaire" && (
            <>
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-purple-300 dark:hover:border-purple-600"
                onClick={() => router.push("/dashboard/classes")}
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
                onClick={() => router.push("/dashboard/students")}
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
                onClick={() => router.push("/dashboard/teachers")}
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
                onClick={() => router.push("/dashboard/rooms")}
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
                onClick={() => router.push("/dashboard/seating-plan")}
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

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-orange-300 dark:hover:border-orange-600"
                onClick={() => router.push("/dashboard/sandbox")}
              >
                <CardHeader className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Lightbulb className="mr-3 h-6 w-6" />
                    Bac à sable
                  </CardTitle>
                  <CardDescription className="text-orange-100">Propositions de plans de classe</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Consultez les propositions de plans créées par les délégués.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {profile.role === "professeur" && (
            <>
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => router.push("/dashboard/students")}
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
                onClick={() => router.push("/dashboard/teachers")}
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
                onClick={() => router.push("/dashboard/rooms")}
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
                onClick={() => router.push("/dashboard/seating-plan")}
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

              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-orange-300 dark:hover:border-orange-600"
                onClick={() => router.push("/dashboard/sandbox")}
              >
                <CardHeader className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center text-xl">
                    <Lightbulb className="mr-3 h-6 w-6" />
                    Bac à sable
                  </CardTitle>
                  <CardDescription className="text-orange-100">Valider les propositions</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Examinez et validez les plans proposés par vos délégués.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {(profile.role === "delegue" || profile.role === "eco-delegue") && (
            <>
              <Card
                className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-blue-300 dark:hover:border-blue-600"
                onClick={() => router.push("/dashboard/students")}
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
                onClick={() => router.push("/dashboard/teachers")}
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
                onClick={() => router.push("/dashboard/rooms")}
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
                onClick={() => router.push("/dashboard/seating-plan")}
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

              {canAccessSandbox && (
                <Card
                  className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 hover:border-orange-300 dark:hover:border-orange-600"
                  onClick={() => router.push("/dashboard/sandbox")}
                >
                  <CardHeader className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center text-xl">
                      <Lightbulb className="mr-3 h-6 w-6" />
                      Bac à sable
                    </CardTitle>
                    <CardDescription className="text-orange-100">Créer des propositions</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Créez et proposez des plans de classe à vos professeurs.
                    </p>
                  </CardContent>
                </Card>
              )}
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
              <Label htmlFor="settings-password">Nouveau mot de passe</Label>
              <div className="flex gap-2">
                <Input
                  id="settings-password"
                  type="text"
                  value={settingsData.password}
                  onChange={(e) => setSettingsData({ ...settingsData, password: e.target.value })}
                  placeholder="Saisir un nouveau mot de passe"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsData({ ...settingsData, password: generateStrongPassword(8) })}
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Laissez vide pour conserver le mot de passe actuel. Cliquez sur l'icône pour générer un mot de passe
                fort.
              </p>
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
