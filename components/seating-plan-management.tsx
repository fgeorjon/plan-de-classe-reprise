"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ArrowLeft, Plus, Search, AlertTriangle, Users, BookOpen } from "lucide-react"
import type { UserRole } from "@/lib/types"
import { SeatingPlanEditor } from "@/components/seating-plan-editor"

interface Room {
  id: string
  name: string
  code: string
  config: {
    columns: {
      id: string
      tables: number
      seatsPerTable: number
    }[]
  }
}

interface Class {
  id: string
  name: string
  is_level: boolean
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
  subject: string
  allow_delegate_subrooms: boolean
}

interface SubRoom {
  id: string
  name: string
  custom_name: string
  room_id: string
  teacher_id: string
  class_ids: string[]
  is_multi_class: boolean
  created_by: string
  created_at: string
  rooms: { name: string; code: string }
  teachers: { first_name: string; last_name: string }
}

interface SeatingPlanManagementProps {
  establishmentId: string
  userRole: UserRole
  userId: string
  onBack?: () => void
}

export function SeatingPlanManagement({ establishmentId, userRole, userId, onBack }: SeatingPlanManagementProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subRooms, setSubRooms] = useState<SubRoom[]>([])
  const [filteredSubRooms, setFilteredSubRooms] = useState<SubRoom[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([])
  const [availableClasses, setAvailableClasses] = useState<Class[]>([])

  const [formData, setFormData] = useState({
    roomId: "",
    customName: "",
    teacherId: "",
    classIds: [] as string[],
    isMultiClass: false,
  })

  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState("")

  const [selectedSubRoom, setSelectedSubRoom] = useState<SubRoom | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const [filterClass, setFilterClass] = useState<string>("all")
  const [filterTeacher, setFilterTeacher] = useState<string>("all")
  const [filterRoom, setFilterRoom] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = subRooms

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (subRoom) => subRoom.name.toLowerCase().includes(query) || subRoom.custom_name.toLowerCase().includes(query),
      )
    }

    if (filterClass !== "all") {
      filtered = filtered.filter((subRoom) => subRoom.class_ids.includes(filterClass))
    }

    if (filterTeacher !== "all") {
      filtered = filtered.filter((subRoom) => subRoom.teacher_id === filterTeacher)
    }

    if (filterRoom !== "all") {
      filtered = filtered.filter((subRoom) => subRoom.room_id === filterRoom)
    }

    setFilteredSubRooms(filtered)
  }, [searchQuery, subRooms, filterClass, filterTeacher, filterRoom])

  useEffect(() => {
    if (formData.roomId && formData.classIds.length > 0) {
      checkCapacity()
    } else {
      setShowWarning(false)
    }
  }, [formData.roomId, formData.classIds])

  const fetchData = async () => {
    const supabase = createClient()

    const { data: roomsData } = await supabase.from("rooms").select("*").eq("establishment_id", establishmentId)
    if (roomsData) setRooms(roomsData)

    const { data: classesData } = await supabase.from("classes").select("*").eq("establishment_id", establishmentId)
    if (classesData) setClasses(classesData)

    const { data: teachersData } = await supabase.from("teachers").select("*").eq("establishment_id", establishmentId)
    if (teachersData) setTeachers(teachersData)

    let subRoomsQuery = supabase
      .from("sub_rooms")
      .select(`
        *,
        rooms(name, code),
        teachers(first_name, last_name)
      `)
      .eq("establishment_id", establishmentId)

    if (userRole === "professeur") {
      subRoomsQuery = subRoomsQuery.or(`teacher_id.eq.${userId},created_by.eq.${userId}`)
    } else if (userRole === "delegue" || userRole === "eco-delegue") {
      subRoomsQuery = subRoomsQuery.eq("created_by", userId)
    }

    const { data: subRoomsData } = await subRoomsQuery.order("created_at", { ascending: false })
    if (subRoomsData) setSubRooms(subRoomsData)

    await setAvailableOptions(supabase)
  }

  const setAvailableOptions = async (supabase: any) => {
    console.log("[v0] setAvailableOptions called for role:", userRole, "userId:", userId)

    if (userRole === "vie-scolaire") {
      const { data: allTeachers, error: teachersError } = await supabase
        .from("teachers")
        .select("*")
        .eq("establishment_id", establishmentId)

      const { data: allClasses, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("is_level", false) // Only show actual classes, not custom levels

      console.log("[v0] Vie scolaire - Teachers:", allTeachers?.length, "Classes:", allClasses?.length)

      if (allTeachers) setAvailableTeachers(allTeachers)
      if (allClasses) setAvailableClasses(allClasses)
      return
    }

    // For teachers and delegates, find their record first
    let currentUserRecord: any = null

    if (userRole === "professeur") {
      const { data: teacherRecord, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("profile_id", userId)
        .maybeSingle()

      console.log("[v0] Teacher record query result:", teacherRecord, "error:", error)
      currentUserRecord = teacherRecord
    } else if (userRole === "delegue" || userRole === "eco-delegue") {
      const { data: studentRecord, error } = await supabase
        .from("students")
        .select("*")
        .eq("profile_id", userId)
        .maybeSingle()

      console.log("[v0] Student record query result:", studentRecord, "error:", error)
      currentUserRecord = studentRecord
    }

    if (!currentUserRecord) {
      console.log("[v0] No user record found, showing empty lists")
      setAvailableTeachers([])
      setAvailableClasses([])
      return
    }

    // Get classes this user has access to
    let classIds: string[] = []

    if (userRole === "professeur") {
      const { data: teacherClasses } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("teacher_id", currentUserRecord.id)

      classIds = teacherClasses?.map((tc: any) => tc.class_id) || []
      console.log("[v0] Teacher has access to classes:", classIds)
    } else if (userRole === "delegue" || userRole === "eco-delegue") {
      if (currentUserRecord.class_id) {
        classIds = [currentUserRecord.class_id]
        console.log("[v0] Delegate has access to class:", classIds)
      }
    }

    // Load classes - filter out custom levels
    if (classIds.length > 0) {
      const { data: userClasses } = await supabase.from("classes").select("*").in("id", classIds).eq("is_level", false) // Exclude custom levels

      console.log("[v0] User classes loaded:", userClasses?.length)
      if (userClasses) setAvailableClasses(userClasses)
    }

    // Load teachers who teach these classes
    if (classIds.length > 0) {
      const { data: classTeachers } = await supabase
        .from("teacher_classes")
        .select("teacher_id")
        .in("class_id", classIds)

      const teacherIds = [...new Set(classTeachers?.map((tc: any) => tc.teacher_id) || [])]

      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase.from("teachers").select("*").in("id", teacherIds)

        console.log("[v0] Teachers loaded:", teachers?.length)
        if (teachers) setAvailableTeachers(teachers)
      }
    }
  }

  const checkCapacity = async () => {
    const supabase = createClient()
    const selectedRoom = rooms.find((r) => r.id === formData.roomId)

    if (!selectedRoom) return

    const totalSeats = selectedRoom.config.columns.reduce((total, col) => total + col.tables * col.seatsPerTable, 0)

    const { data: studentsData } = await supabase.from("students").select("id").in("class_id", formData.classIds)

    const studentCount = studentsData?.length || 0

    if (studentCount > totalSeats) {
      setShowWarning(true)
      setWarningMessage(`Attention : ${studentCount} élèves pour ${totalSeats} places disponibles`)
    } else {
      setShowWarning(false)
    }
  }

  const handleCreateSubRoom = async () => {
    if (!formData.roomId || !formData.customName.trim() || !formData.teacherId || formData.classIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Tous les champs sont requis",
        variant: "destructive",
      })
      return
    }

    if (userRole === "professeur" && formData.teacherId !== userId) {
      toast({
        title: "Erreur",
        description: "Vous ne pouvez créer des sous-salles que pour vous-même",
        variant: "destructive",
      })
      return
    }

    if ((userRole === "delegue" || userRole === "eco-delegue") && formData.teacherId !== userId) {
      const selectedTeacher = teachers.find((t) => t.id === formData.teacherId)
      if (!selectedTeacher?.allow_delegate_subrooms) {
        toast({
          title: "Erreur",
          description: "Ce professeur n'autorise pas les délégués à créer des sous-salles",
          variant: "destructive",
        })
        return
      }
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const selectedRoom = rooms.find((r) => r.id === formData.roomId)
      const selectedClasses = classes.filter((c) => formData.classIds.includes(c.id))
      const selectedTeacher = teachers.find((t) => t.id === formData.teacherId)

      if (!selectedRoom || !selectedTeacher) {
        throw new Error("Salle ou professeur introuvable")
      }

      const classNames = selectedClasses.map((c) => c.name).join(" ")
      const teacherName = `${selectedTeacher.first_name} ${selectedTeacher.last_name}`

      const subRoomName = `${selectedRoom.name} ${classNames} ${teacherName}`

      const { data, error } = await supabase
        .from("sub_rooms")
        .insert({
          establishment_id: establishmentId,
          room_id: formData.roomId,
          name: subRoomName,
          custom_name: formData.customName,
          teacher_id: formData.teacherId,
          class_ids: formData.classIds,
          is_multi_class: formData.isMultiClass,
          created_by: userId,
          type: "indeterminate",
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Sous-salle créée",
        description: `La sous-salle "${subRoomName}" a été créée avec succès`,
      })

      setIsCreateDialogOpen(false)
      setFormData({
        roomId: "",
        customName: "",
        teacherId: "",
        classIds: [],
        isMultiClass: false,
      })

      fetchData()
    } catch (error: any) {
      console.error("[v0] Error creating sub-room:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la sous-salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleClass = (classId: string) => {
    if (formData.isMultiClass) {
      setFormData((prev) => ({
        ...prev,
        classIds: prev.classIds.includes(classId)
          ? prev.classIds.filter((id) => id !== classId)
          : [...prev.classIds, classId],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        classIds: [classId],
      }))
    }
  }

  const isVieScolaire = userRole === "vie-scolaire"
  const canCreateSubRooms =
    isVieScolaire || userRole === "professeur" || userRole === "delegue" || userRole === "eco-delegue"

  const filterTeachers = userRole === "professeur" ? teachers.filter((t) => t.id === userId) : teachers
  const filterClasses = userRole === "delegue" || userRole === "eco-delegue" ? availableClasses : classes

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="p-6 w-full">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onBack?.()}
              className="hover:bg-white/50 dark:hover:bg-slate-800/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Plan de Classe
              </h1>
              <p className="text-muted-foreground mt-1">
                {subRooms.length} sous-salle{subRooms.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {canCreateSubRooms && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="mr-2 h-5 w-5" />
              Créer une sous-salle
            </Button>
          )}
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une sous-salle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {filterClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Filtrer par professeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les professeurs</SelectItem>
                  {filterTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterRoom} onValueChange={setFilterRoom}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                  <SelectValue placeholder="Filtrer par salle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les salles</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} ({room.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubRooms.map((subRoom) => (
            <Card
              key={subRoom.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-indigo-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{subRoom.name}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {subRoom.rooms.name} ({subRoom.rooms.code})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {subRoom.teachers.first_name} {subRoom.teachers.last_name}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-800 dark:hover:bg-indigo-900/20 bg-transparent"
                    onClick={() => {
                      setSelectedSubRoom(subRoom)
                      setIsEditorOpen(true)
                    }}
                  >
                    Ouvrir le plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSubRooms.length === 0 && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-indigo-200 dark:border-indigo-800">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? "Aucune sous-salle trouvée" : "Aucune sous-salle créée"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Essayez avec un autre terme de recherche"
                  : "Commencez par créer votre première sous-salle"}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une sous-salle</DialogTitle>
              <DialogDescription>Configurez une sous-salle pour un plan de classe</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room">Salle</Label>
                <Select value={formData.roomId} onValueChange={(value) => setFormData({ ...formData, roomId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une salle" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customName">Nom personnalisé</Label>
                <Input
                  id="customName"
                  value={formData.customName}
                  onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                  placeholder="ex: Salle B23 Mr Gomant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher">Professeur</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(value) => setFormData({ ...formData, teacherId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un professeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeachers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Aucun professeur disponible
                      </SelectItem>
                    ) : (
                      availableTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.first_name} {teacher.last_name} - {teacher.subject}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Classes</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="multi-class"
                      checked={formData.isMultiClass}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isMultiClass: checked as boolean,
                          classIds: [],
                        })
                      }
                    />
                    <Label htmlFor="multi-class" className="text-sm font-normal cursor-pointer">
                      Multi-classes
                    </Label>
                  </div>
                </div>
                {availableClasses.length === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded-md p-4">Aucune classe disponible</div>
                ) : (
                  <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                    {availableClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`class-${cls.id}`}
                          checked={formData.classIds.includes(cls.id)}
                          onCheckedChange={() => handleToggleClass(cls.id)}
                        />
                        <Label htmlFor={`class-${cls.id}`} className="text-sm font-normal cursor-pointer flex-1">
                          {cls.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{warningMessage}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateSubRoom} disabled={isLoading}>
                {isLoading ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isEditorOpen && selectedSubRoom && (
          <SeatingPlanEditor
            subRoom={selectedSubRoom}
            onBack={() => {
              setIsEditorOpen(false)
              setSelectedSubRoom(null)
            }}
          />
        )}
      </div>

      <Toaster />
    </div>
  )
}
