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
import { useToast } from "@/hooks/use-toast"

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
}

export function CreateSubRoomDialog({ open, onOpenChange, onSuccess, establishmentId }: CreateSubRoomDialogProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    roomId: "",
    customName: "",
    selectedTeachers: [] as string[],
    selectedClasses: [] as string[],
    isCollaborative: false,
    isMultiClass: false, // Ajout de la case multi-classes
  })

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, establishmentId])

  const fetchData = async () => {
    try {
      const [roomsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from("rooms").select("*").eq("establishment_id", establishmentId),
        supabase.from("teachers").select("*").eq("establishment_id", establishmentId),
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
        // Mode multi-profs : permettre plusieurs sélections
        newTeachers = prev.selectedTeachers.includes(teacherId)
          ? prev.selectedTeachers.filter((id) => id !== teacherId)
          : [...prev.selectedTeachers, teacherId]
      } else {
        // Mode simple : un seul prof
        newTeachers = prev.selectedTeachers.includes(teacherId) ? [] : [teacherId]
      }

      return {
        ...prev,
        selectedTeachers: newTeachers,
        selectedClasses: [], // Réinitialiser les classes
      }
    })
  }

  const handleToggleClass = (classId: string) => {
    setFormData((prev) => {
      let newClasses: string[]

      if (prev.isMultiClass) {
        // Mode multi-classes : permettre plusieurs sélections
        newClasses = prev.selectedClasses.includes(classId)
          ? prev.selectedClasses.filter((id) => id !== classId)
          : [...prev.selectedClasses, classId]
      } else {
        // Mode simple : une seule classe
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
      // Récupérer les relations teacher_classes pour les profs sélectionnés
      const { data: teacherClassesData, error } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .in("teacher_id", formData.selectedTeachers)

      if (error) {
        console.error("[v0] Error fetching teacher_classes:", error)
        return []
      }

      const classIds = teacherClassesData?.map((tc) => tc.class_id) || []

      // Filtrer les classes qui sont assignées aux profs sélectionnés
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
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const selectedRoom = rooms.find((r) => r.id === formData.roomId)
      const firstTeacher = teachers.find((t) => t.id === formData.selectedTeachers[0])

      const defaultName = `${selectedRoom?.name || "Salle"} - ${firstTeacher?.last_name || "Prof"}`

      console.log("[v0] Creating sub-room with data:", {
        room_id: formData.roomId,
        name: formData.customName || defaultName,
        teacher_id: formData.selectedTeachers[0],
        establishment_id: establishmentId,
        class_ids: formData.selectedClasses,
      })

      const { data: subRoom, error: subRoomError } = await supabase
        .from("sub_rooms")
        .insert({
          room_id: formData.roomId,
          name: formData.customName || defaultName,
          custom_name: formData.customName || null,
          teacher_id: formData.selectedTeachers[0],
          establishment_id: establishmentId,
          class_ids: formData.selectedClasses, // Store array for backward compatibility
          is_multi_class: formData.isMultiClass,
        })
        .select()
        .single()

      if (subRoomError) {
        console.error("[v0] Error creating sub-room:", subRoomError)
        toast({
          title: "Échec de la création",
          description: `Erreur: ${subRoomError.message}${subRoomError.hint ? ` (${subRoomError.hint})` : ""}`,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      console.log("[v0] Sub-room created successfully:", subRoom.id)

      if (formData.isCollaborative && formData.selectedTeachers.length > 0) {
        const teacherLinks = formData.selectedTeachers.map((teacherId) => ({
          sub_room_id: subRoom.id,
          teacher_id: teacherId,
        }))

        const { error: teachersError } = await supabase.from("sub_room_teachers").insert(teacherLinks)

        if (teachersError) {
          console.error("[v0] Error linking teachers:", teachersError)
          toast({
            title: "Attention",
            description: `Les professeurs n'ont pas pu être ajoutés: ${teachersError.message}`,
            variant: "destructive",
          })
        } else {
          console.log("[v0] Teachers linked successfully")
        }
      }

      const classLinks = formData.selectedClasses.map((classId) => ({
        sub_room_id: subRoom.id,
        class_id: classId,
      }))

      const { error: classesError } = await supabase.from("sub_room_classes").insert(classLinks)

      if (classesError) {
        console.error("[v0] Error linking classes:", classesError)
        toast({
          title: "Échec de la création",
          description: `Les classes n'ont pas pu être associées: ${classesError.message}`,
          variant: "destructive",
        })

        await supabase.from("sub_rooms").delete().eq("id", subRoom.id)

        setIsLoading(false)
        return
      }

      console.log("[v0] Classes linked successfully")

      toast({
        title: "Sous-salle créée avec succès",
        description: `"${formData.customName || defaultName}" est maintenant disponible`,
      })

      setFormData({
        roomId: "",
        customName: "",
        selectedTeachers: [],
        selectedClasses: [],
        isCollaborative: false,
        isMultiClass: false,
      })

      onOpenChange(false)

      setTimeout(() => {
        console.log("[v0] Reloading page to show new sub-room")
        window.location.reload()
      }, 500)
    } catch (error: any) {
      console.error("[v0] Unexpected error creating sub-room:", error)
      toast({
        title: "Erreur inattendue",
        description: error?.message || "Une erreur est survenue lors de la création",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une sous-salle</DialogTitle>
          <DialogDescription>Configurez une nouvelle sous-salle pour un plan de classe</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection de la salle */}
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

          {/* Nom personnalisé */}
          <div className="space-y-2">
            <Label>Nom personnalisé</Label>
            <Input
              value={formData.customName}
              onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
              placeholder="ex: Salle B23 Mr Gomant"
            />
          </div>

          <div className="flex items-center gap-2 border rounded-md p-3">
            <Checkbox
              id="collaborative"
              checked={formData.isCollaborative}
              onCheckedChange={(checked) => {
                setFormData({
                  ...formData,
                  isCollaborative: checked as boolean,
                  selectedTeachers: [], // Réinitialiser
                })
              }}
            />
            <Label htmlFor="collaborative" className="cursor-pointer text-sm">
              Salle collaborative (multi-professeurs)
            </Label>
          </div>

          {/* Sélection des professeurs */}
          <div className="space-y-2">
            <Label>
              Professeur{formData.isCollaborative ? "s" : ""}
              {!formData.isCollaborative && <span className="text-xs text-muted-foreground ml-1">(1 seul)</span>}
            </Label>
            {teachers.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-4">Aucun professeur disponible</div>
            ) : (
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {teachers.map((teacher) => (
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

          {formData.selectedTeachers.length > 0 && (
            <div className="flex items-center gap-2 border rounded-md p-3">
              <Checkbox
                id="multiclass"
                checked={formData.isMultiClass}
                onCheckedChange={(checked) => {
                  setFormData({
                    ...formData,
                    isMultiClass: checked as boolean,
                    selectedClasses: [], // Réinitialiser
                  })
                }}
              />
              <Label htmlFor="multiclass" className="cursor-pointer text-sm">
                Multi-classes
              </Label>
            </div>
          )}

          {/* Sélection des classes */}
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
