"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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

interface SubRoom {
  id: string
  name: string
  seat_assignments: any
  room_id: string
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
  const [selectedSubRoomId, setSelectedSubRoomId] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [useExistingSubRoom, setUseExistingSubRoom] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [subRooms, setSubRooms] = useState<SubRoom[]>([])
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

  useEffect(() => {
    if (useExistingSubRoom && selectedTeacherId && classId) {
      fetchSubRooms()
    } else {
      setSubRooms([])
      setSelectedSubRoomId("")
    }
  }, [useExistingSubRoom, selectedTeacherId, classId])

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
            .sort((a: Teacher, b: Teacher) =>
              `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
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

  async function fetchSubRooms() {
    try {
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("profile_id")
        .eq("id", selectedTeacherId)
        .single()

      if (!teacherData) return

      const { data: subRoomsData } = await supabase
        .from("sub_rooms")
        .select("id, name, seat_assignments, room_id")
        .contains("class_ids", [classId])
        .or(`created_by.eq.${teacherData.profile_id},teacher_id.eq.${selectedTeacherId}`)
        .order("name")

      if (subRoomsData) {
        setSubRooms(subRoomsData)
      }
    } catch (error) {
      console.error("[v0] Error fetching sub-rooms:", error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name || !selectedTeacherId || !classId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      })
      return
    }

    if (useExistingSubRoom && !selectedSubRoomId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une sous-salle",
        variant: "destructive",
      })
      return
    }

    if (!useExistingSubRoom && !selectedRoomId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une salle",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("profile_id")
        .eq("profile_id", userId)
        .single()

      if (studentError || !studentData?.profile_id) {
        // If no student found with this profile_id, assume userId is already a profile_id
        console.log("[v0] No student found, assuming userId is a profile_id")
      }

      const profileId = studentData?.profile_id || userId

      let seatAssignments = {}
      let roomId = selectedRoomId

      if (useExistingSubRoom && selectedSubRoomId) {
        const subRoom = subRooms.find((sr) => sr.id === selectedSubRoomId)
        if (subRoom) {
          seatAssignments = subRoom.seat_assignments || {}

          // Get room_id from the sub_room
          roomId = subRoom.room_id
        }
      }

      const { error } = await supabase.from("sub_room_proposals").insert({
        name,
        room_id: roomId,
        class_id: classId,
        teacher_id: selectedTeacherId,
        proposed_by: profileId, // ✅ Now using the correct profile_id
        establishment_id: establishmentId,
        status: "pending",
        seat_assignments: seatAssignments,
        sub_room_id: useExistingSubRoom ? selectedSubRoomId : null,
      })

      if (error) throw error

      toast({
        title: "Succès",
        description: "Proposition créée avec succès",
      })

      // Reset form
      setName("")
      setSelectedRoomId("")
      setSelectedSubRoomId("")
      setSelectedTeacherId("")
      setUseExistingSubRoom(false)
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="useExisting"
              checked={useExistingSubRoom}
              onCheckedChange={(checked) => setUseExistingSubRoom(checked === true)}
            />
            <Label htmlFor="useExisting" className="text-sm font-normal cursor-pointer">
              Créer à partir d'une sous-salle existante
            </Label>
          </div>

          {useExistingSubRoom ? (
            <div className="space-y-2">
              <Label htmlFor="subroom">Sous-salle de référence</Label>
              <Select
                value={selectedSubRoomId}
                onValueChange={setSelectedSubRoomId}
                required
                disabled={!selectedTeacherId}
              >
                <SelectTrigger id="subroom">
                  <SelectValue
                    placeholder={
                      selectedTeacherId ? "Sélectionner une sous-salle" : "Sélectionnez d'abord un professeur"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subRooms.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {selectedTeacherId ? "Aucune sous-salle disponible" : "Sélectionnez un professeur"}
                    </div>
                  ) : (
                    subRooms.map((subRoom) => (
                      <SelectItem key={subRoom.id} value={subRoom.id}>
                        {subRoom.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Le plan actuel de cette sous-salle sera repris. Une fois validé, il remplacera la sous-salle d'origine.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="room">Salle physique</Label>
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
          )}

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
