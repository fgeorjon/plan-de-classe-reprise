"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "@/components/ui/use-toast"

interface CreateProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  establishmentId: string
  userId: string
  onSuccess: () => void
}

interface Room {
  id: string
  name: string
  code: string
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
  subject: string
}

export function CreateProposalDialog({
  open,
  onOpenChange,
  establishmentId,
  userId,
  onSuccess,
}: CreateProposalDialogProps) {
  const [name, setName] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [rooms, setRooms] = useState<Room[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classId, setClassId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, establishmentId, userId])

  async function fetchData() {
    try {
      const { data: studentData } = await supabase.from("students").select("class_id").eq("profile_id", userId).single()

      if (studentData) {
        setClassId(studentData.class_id)

        const { data: teacherClassData } = await supabase
          .from("teacher_classes")
          .select("teacher_id, teachers(id, first_name, last_name, subject)")
          .eq("class_id", studentData.class_id)

        if (teacherClassData) {
          const uniqueTeachers = teacherClassData
            .map((tc: any) => tc.teachers)
            .filter(
              (teacher: any, index: number, self: any[]) =>
                teacher && self.findIndex((t) => t?.id === teacher?.id) === index,
            )
          setTeachers(uniqueTeachers)
        }
      }

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, name, code")
        .eq("establishment_id", establishmentId)
        .order("name")

      if (roomsData) {
        setRooms(roomsData)
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name || !selectedRoomId || !selectedTeacherId || !classId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.from("sub_room_proposals").insert({
        name,
        room_id: selectedRoomId,
        class_id: classId,
        teacher_id: selectedTeacherId,
        proposed_by: userId,
        establishment_id: establishmentId,
        status: "pending",
        seat_assignments: {},
      })

      if (error) throw error

      toast({
        title: "Succès",
        description: "Proposition créée avec succès",
      })

      setName("")
      setSelectedRoomId("")
      setSelectedTeacherId("")
      onSuccess()
    } catch (error: any) {
      console.error("[v0] Error creating proposal:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la proposition",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle proposition de plan</DialogTitle>
          <DialogDescription>Créez une proposition de plan de classe pour un de vos professeurs</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la proposition</Label>
            <Input
              id="name"
              placeholder="Ex: Plan pour contrôle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Salle</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId} required>
              <SelectTrigger id="room">
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
            <Label htmlFor="teacher">Professeur destinataire</Label>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} required>
              <SelectTrigger id="teacher">
                <SelectValue placeholder="Sélectionner un professeur" />
              </SelectTrigger>
              <SelectContent>
                {teachers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Aucun professeur disponible</div>
                ) : (
                  teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name} - {teacher.subject}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
