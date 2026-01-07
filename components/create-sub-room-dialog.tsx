"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

interface Teacher {
  id: string
  first_name: string
  last_name: string
  subject: string
}

interface Class {
  id: string
  name: string
  level: string
  is_level?: boolean
}

interface Room {
  id: string
  name: string
  code: string
}

interface CreateSubRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  establishmentId: string
  selectedRoom?: Room | null // Added selectedRoom prop
  userRole?: string
  userId?: string // Added userId prop
}

export function CreateSubRoomDialog({
  open,
  onOpenChange,
  onSuccess,
  establishmentId,
  selectedRoom,
  userRole,
  userId,
}: CreateSubRoomDialogProps) {
  console.log("[v0] CreateSubRoomDialog rendering with props:", {
    open,
    establishmentId,
    selectedRoom,
    userRole,
    userId,
  })

  const [rooms, setRooms] = useState<Room[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    roomId: "",
    customName: "",
    selectedTeachers: [] as string[],
    selectedClasses: [] as string[],
    isCollaborative: false,
    isMultiClass: false,
  })

  const supabase = createClient()

  useEffect(() => {
    async function loadCurrentTeacher() {
      if (userRole === "professeur") {
        try {
          const cookieSession = document.cookie
            .split("; ")
            .find((row) => row.startsWith("custom_auth_user="))
            ?.split("=")[1]

          if (cookieSession) {
            const sessionData = JSON.parse(decodeURIComponent(cookieSession))
            const { data: teacher } = await supabase
              .from("teachers")
              .select("id")
              .eq("profile_id", sessionData.id)
              .single()

            if (teacher) {
              setCurrentTeacherId(teacher.id)
              setFormData((prev) => ({ ...prev, selectedTeachers: [teacher.id] }))
            }
          }
        } catch (error) {
          console.error("[v0] Error loading current teacher:", error)
        }
      }
    }

    if (open) {
      loadCurrentTeacher()
    }
  }, [open, userRole])

  useEffect(() => {
    if (open) {
      fetchData()
      if (selectedRoom?.id) {
        setFormData((prev) => ({ ...prev, roomId: selectedRoom.id }))
      }
    }
  }, [open, establishmentId, selectedRoom])

  const fetchData = async () => {
    try {
      const [roomsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from("rooms").select("*").eq("establishment_id", establishmentId),
        supabase.from("teachers").select("*").eq("establishment_id", establishmentId).order("last_name"),
        supabase.from("classes").select("*").eq("establishment_id", establishmentId),
      ])

      if (roomsRes.data) setRooms(roomsRes.data)
      if (teachersRes.data) setTeachers(teachersRes.data)

      if (classesRes.data) {
        const filteredClasses = classesRes.data.filter((c: Class) => !c.is_level)
        setClasses(filteredClasses)
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    }
  }

  const handleToggleTeacher = (teacherId: string) => {
    setFormData((prev) => {
      let newTeachers: string[]

      if (prev.isCollaborative) {
        newTeachers = prev.selectedTeachers.includes(teacherId)
          ? prev.selectedTeachers.filter((id) => id !== teacherId)
          : [...prev.selectedTeachers, teacherId]
      } else {
        newTeachers = prev.selectedTeachers.includes(teacherId) ? [] : [teacherId]
      }

      return {
        ...prev,
        selectedTeachers: newTeachers,
        selectedClasses: [],
      }
    })
  }

  const handleToggleClass = (classId: string) => {
    setFormData((prev) => {
      let newClasses: string[]

      if (prev.isMultiClass) {
        newClasses = prev.selectedClasses.includes(classId)
          ? prev.selectedClasses.filter((id) => id !== classId)
          : [...prev.selectedClasses, classId]
      } else {
        newClasses = prev.selectedClasses.includes(classId) ? [] : [classId]
      }

      return {
        ...prev,
        selectedClasses: newClasses,
      }
    })
  }

  const getFilteredClasses = async () => {
    if (formData.selectedTeachers.length === 0) {
      return []
    }

    try {
      const { data: teacherClassesData, error } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .in("teacher_id", formData.selectedTeachers)

      if (error) {
        console.error("[v0] Error fetching teacher_classes:", error)
        return []
      }

      const classIds = teacherClassesData?.map((tc) => tc.class_id) || []
      return classes.filter((cls) => classIds.includes(cls.id))
    } catch (error) {
      console.error("[v0] Error filtering classes:", error)
      return []
    }
  }

  const [filteredClasses, setFilteredClasses] = useState<Class[]>([])

  useEffect(() => {
    if (formData.selectedTeachers.length > 0) {
      getFilteredClasses().then(setFilteredClasses)
    } else {
      setFilteredClasses([])
    }
  }, [formData.selectedTeachers])

  const handleCreate = async () => {
    if (!formData.roomId || formData.selectedTeachers.length === 0 || formData.selectedClasses.length === 0) {
      return
    }

    setIsLoading(true)
    try {
      const selectedRoom = rooms.find((r) => r.id === formData.roomId)
      const firstTeacher = teachers.find((t) => t.id === formData.selectedTeachers[0])

      const defaultName = `${selectedRoom?.name || "Salle"} - ${firstTeacher?.last_name || "Prof"}`

      const { data: subRoom, error: subRoomError } = await supabase
        .from("sub_rooms")
        .insert({
          room_id: formData.roomId,
          name: formData.customName || defaultName,
          custom_name: formData.customName || null,
          teacher_id: formData.selectedTeachers[0],
          establishment_id: establishmentId,
          class_ids: formData.selectedClasses,
        })
        .select()
        .single()

      if (subRoomError) {
        console.error("[v0] Error creating sub-room:", subRoomError)
        throw subRoomError
      }

      console.log("[v0] Sub-room created successfully:", subRoom)

      if (formData.isCollaborative && formData.selectedTeachers.length > 0) {
        const teacherLinks = formData.selectedTeachers.map((teacherId) => ({
          sub_room_id: subRoom.id,
          teacher_id: teacherId,
        }))

        const { error: teachersError } = await supabase.from("sub_room_teachers").insert(teacherLinks)

        if (teachersError) {
          console.error("[v0] Error adding teachers:", teachersError)
          throw teachersError
        }
      }

      setFormData({
        roomId: "",
        customName: "",
        selectedTeachers: [],
        selectedClasses: [],
        isCollaborative: false,
        isMultiClass: false,
      })

      onOpenChange(false)
      onSuccess()

      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error("[v0] Error creating sub-room:", error)
      alert("Erreur lors de la création de la sous-salle. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const isDelegate = userRole === "delegue" || userRole === "eco-delegue"
  const isProfessor = userRole === "professeur"

  const displayedTeachers =
    formData.isCollaborative && isProfessor && currentTeacherId
      ? teachers.filter((t) => t.id !== currentTeacherId).sort((a, b) => a.last_name.localeCompare(b.last_name))
      : teachers.sort((a, b) => a.last_name.localeCompare(b.last_name))

  console.log("[v0] CreateSubRoomDialog about to return JSX")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une sous-salle</DialogTitle>
          <DialogDescription>Configurez une nouvelle sous-salle pour un plan de classe</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Salle</Label>
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
            <Label>Nom personnalisé</Label>
            <Input
              value={formData.customName}
              onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
              placeholder="ex: Salle B23 Mr Gomant"
            />
          </div>

          {isProfessor && (
            <div className="flex items-center gap-2 border rounded-md p-3">
              <Checkbox
                id="collaborative"
                checked={formData.isCollaborative}
                onCheckedChange={(checked) => {
                  setFormData({
                    ...formData,
                    isCollaborative: checked as boolean,
                    selectedTeachers: currentTeacherId ? [currentTeacherId] : [],
                  })
                }}
              />
              <Label htmlFor="collaborative" className="cursor-pointer text-sm">
                Salle collaborative (multi-professeurs)
              </Label>
            </div>
          )}

          {!isProfessor && (
            <div className="space-y-2">
              <Label>
                Professeur
                <span className="text-xs text-muted-foreground ml-1">(1 seul)</span>
              </Label>
              {displayedTeachers.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-md p-4">Aucun professeur disponible</div>
              ) : (
                <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                  {displayedTeachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`teacher-${teacher.id}`}
                        checked={formData.selectedTeachers.includes(teacher.id)}
                        onCheckedChange={() => handleToggleTeacher(teacher.id)}
                      />
                      <Label htmlFor={`teacher-${teacher.id}`} className="text-sm font-normal cursor-pointer flex-1">
                        {teacher.first_name} {teacher.last_name} - {teacher.subject}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isProfessor && formData.isCollaborative && (
            <div className="space-y-2">
              <Label>Autres professeurs</Label>
              {displayedTeachers.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-md p-4">
                  Aucun autre professeur disponible
                </div>
              ) : (
                <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                  {displayedTeachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`teacher-${teacher.id}`}
                        checked={formData.selectedTeachers.includes(teacher.id)}
                        onCheckedChange={() => handleToggleTeacher(teacher.id)}
                      />
                      <Label htmlFor={`teacher-${teacher.id}`} className="text-sm font-normal cursor-pointer flex-1">
                        {teacher.first_name} {teacher.last_name} - {teacher.subject}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {formData.selectedTeachers.length > 0 && (
            <div className="flex items-center gap-2 border rounded-md p-3">
              <Checkbox
                id="multiclass"
                checked={formData.isMultiClass}
                onCheckedChange={(checked) => {
                  setFormData({
                    ...formData,
                    isMultiClass: checked as boolean,
                    selectedClasses: [],
                  })
                }}
                disabled={isDelegate}
              />
              <Label htmlFor="multiclass" className="cursor-pointer text-sm">
                Multi-classes
                {isDelegate && (
                  <span className="text-xs text-muted-foreground ml-2">(Non disponible pour les délégués)</span>
                )}
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Classe{formData.isMultiClass ? "s" : ""}
              {!formData.isMultiClass && <span className="text-xs text-muted-foreground ml-1">(1 seule)</span>}
            </Label>
            {formData.selectedTeachers.length === 0 ? (
              <div className="border border-orange-300 bg-orange-50 dark:bg-orange-950 rounded-md p-4">
                <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Veuillez d'abord sélectionner un ou plusieurs professeurs
                </p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-4">
                Aucune classe disponible pour ce(s) professeur(s)
              </div>
            ) : (
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {filteredClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={formData.selectedClasses.includes(cls.id)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isLoading ||
              !formData.roomId ||
              formData.selectedTeachers.length === 0 ||
              formData.selectedClasses.length === 0
            }
          >
            {isLoading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
