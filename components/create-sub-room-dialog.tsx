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
  })

  const supabase = createClient()

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

      // Exclure les niveaux personnalisés (is_level = true)
      if (classesRes.data) {
        const filteredClasses = classesRes.data.filter((c: Class) => !c.is_level)
        setClasses(filteredClasses)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleToggleTeacher = (teacherId: string) => {
    setFormData((prev) => {
      const newTeachers = prev.selectedTeachers.includes(teacherId)
        ? prev.selectedTeachers.filter((id) => id !== teacherId)
        : [...prev.selectedTeachers, teacherId]

      return {
        ...prev,
        selectedTeachers: newTeachers,
        // Réinitialiser les classes quand on change les profs
        selectedClasses: [],
      }
    })
  }

  const handleToggleClass = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter((id) => id !== classId)
        : [...prev.selectedClasses, classId],
    }))
  }

  // Filtrer les classes selon les professeurs sélectionnés
  const getFilteredClasses = () => {
    if (formData.selectedTeachers.length === 0) {
      return []
    }

    // Récupérer toutes les classes des professeurs sélectionnés
    return classes.filter((cls) => {
      // Ici on devrait vérifier dans teacher_classes
      // Pour l'instant, on retourne toutes les classes
      return true
    })
  }

  const filteredClasses = getFilteredClasses()

  const handleCreate = async () => {
    if (!formData.roomId || formData.selectedTeachers.length === 0 || formData.selectedClasses.length === 0) {
      return
    }

    setIsLoading(true)
    try {
      // Créer la sous-salle
      const { data: subRoom, error: subRoomError } = await supabase
        .from("sub_rooms")
        .insert({
          room_id: formData.roomId,
          custom_name: formData.customName || null,
          teacher_id: formData.selectedTeachers[0], // Premier prof comme prof principal
          establishment_id: establishmentId,
        })
        .select()
        .single()

      if (subRoomError) throw subRoomError

      // Si salle collaborative, ajouter tous les profs dans sub_room_teachers
      if (formData.isCollaborative && formData.selectedTeachers.length > 0) {
        const teacherLinks = formData.selectedTeachers.map((teacherId) => ({
          sub_room_id: subRoom.id,
          teacher_id: teacherId,
        }))

        const { error: teachersError } = await supabase.from("sub_room_teachers").insert(teacherLinks)

        if (teachersError) throw teachersError
      }

      // Ajouter les classes
      const classLinks = formData.selectedClasses.map((classId) => ({
        sub_room_id: subRoom.id,
        class_id: classId,
      }))

      const { error: classesError } = await supabase.from("sub_room_classes").insert(classLinks)

      if (classesError) throw classesError

      // Réinitialiser le formulaire
      setFormData({
        roomId: "",
        customName: "",
        selectedTeachers: [],
        selectedClasses: [],
        isCollaborative: false,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating sub-room:", error)
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

          {/* Sélection des professeurs */}
          <div className="space-y-2">
            <Label>Professeur(s)</Label>
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

          {/* Case salle collaborative */}
          {formData.selectedTeachers.length > 1 && (
            <div className="flex items-center gap-2 border rounded-md p-4">
              <Checkbox
                id="collaborative"
                checked={formData.isCollaborative}
                onCheckedChange={(checked) => setFormData({ ...formData, isCollaborative: checked as boolean })}
              />
              <Label htmlFor="collaborative" className="cursor-pointer font-medium">
                Salle collaborative (multi-professeurs)
              </Label>
            </div>
          )}

          {/* Sélection des classes */}
          <div className="space-y-2">
            <Label>Classes</Label>
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
