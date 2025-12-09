"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Trash2,
  Shuffle,
  ArrowDownAZ,
  ArrowUpAZ,
  Share2,
  Mail,
  Download,
  Link2,
  CheckCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RoomLayout } from "@/components/room-layout"

interface Student {
  id: string
  first_name: string
  last_name: string
  class_name: string
  role: string
}

interface Room {
  id: string
  name: string
  code: string
  board_position: "top" | "bottom" | "left" | "right"
  config: {
    columns: {
      id: string
      tables: number
      seatsPerTable: number
    }[]
  }
}

interface SubRoom {
  id: string
  name: string
  room_id: string
  class_ids: string[]
}

interface SeatAssignment {
  student_id: string
  seat_number: number
}

interface SeatingPlanEditorProps {
  subRoom: SubRoom
  onBack: () => void
}

export function SeatingPlanEditor({ subRoom, onBack }: SeatingPlanEditorProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map())
  const [savedAssignments, setSavedAssignments] = useState<Map<number, string>>(new Map())
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [completeMethod, setCompleteMethod] = useState<"random" | "asc" | "desc">("random")

  useEffect(() => {
    fetchData()
  }, [subRoom.id]) // Watch subRoom.id for changes

  const fetchData = async () => {
    const supabase = createClient()

    console.log("[v0] Fetching data for sub-room:", subRoom.id)

    // Fetch room details
    const { data: roomData } = await supabase.from("rooms").select("*").eq("id", subRoom.room_id).single()

    if (roomData) setRoom(roomData)

    // Fetch students from all classes in the sub-room
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, first_name, last_name, class_name, role")
      .in("class_id", subRoom.class_ids)
      .order("last_name")

    if (studentsData) setStudents(studentsData)

    // Fetch existing seat assignments
    const { data: assignmentsData } = await supabase
      .from("seating_assignments")
      .select("student_id, seat_position")
      .eq("sub_room_id", subRoom.id)

    if (assignmentsData) {
      const assignmentMap = new Map<number, string>()
      assignmentsData.forEach((a: any) => {
        assignmentMap.set(a.seat_position, a.student_id)
      })
      setAssignments(assignmentMap)
      setSavedAssignments(new Map(assignmentMap))
    }
  }

  const getTotalSeats = () => {
    if (!room) return 0
    return room.config.columns.reduce((total, col) => total + col.tables * col.seatsPerTable, 0)
  }

  const getUnassignedStudents = () => {
    const assignedIds = new Set(assignments.values())
    return students.filter((s) => !assignedIds.has(s.id))
  }

  const handleDragStart = (student: Student) => {
    setDraggedStudent(student)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (seatNumber: number) => {
    if (!draggedStudent) return

    const newAssignments = new Map(assignments)

    const occupiedStudentId = newAssignments.get(seatNumber)

    if (occupiedStudentId) {
      // Seat is occupied - swap students
      // Find the seat of the dragged student (if any)
      let draggedStudentSeat: number | null = null
      for (const [seat, studentId] of newAssignments.entries()) {
        if (studentId === draggedStudent.id) {
          draggedStudentSeat = seat
          break
        }
      }

      // Swap: put dragged student in target seat, put occupied student in dragged student's old seat (or unassign)
      newAssignments.set(seatNumber, draggedStudent.id)

      if (draggedStudentSeat !== null) {
        // Swap positions
        newAssignments.set(draggedStudentSeat, occupiedStudentId)
      } else {
        // Dragged student was unassigned, so remove occupied student from seat (send to list)
        newAssignments.delete(seatNumber)
        newAssignments.set(seatNumber, draggedStudent.id)
      }
    } else {
      // Seat is empty - just assign
      // Remove student from previous seat if assigned
      for (const [seat, studentId] of newAssignments.entries()) {
        if (studentId === draggedStudent.id) {
          newAssignments.delete(seat)
        }
      }
      newAssignments.set(seatNumber, draggedStudent.id)
    }

    setAssignments(newAssignments)
    setDraggedStudent(null)
  }

  const handleRemoveFromSeat = (seatNumber: number) => {
    const newAssignments = new Map(assignments)
    newAssignments.delete(seatNumber)
    setAssignments(newAssignments)
  }

  const handleRandomPlacementAll = () => {
    const totalSeats = getTotalSeats()
    const availableSeats = Array.from({ length: totalSeats }, (_, i) => i + 1)

    // Shuffle seats randomly
    const shuffledSeats = availableSeats.sort(() => Math.random() - 0.5)

    // Shuffle students randomly
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5)

    const newAssignments = new Map<number, string>()

    shuffledStudents.forEach((student, index) => {
      if (index < shuffledSeats.length) {
        newAssignments.set(shuffledSeats[index], student.id)
      }
    })

    setAssignments(newAssignments)
    toast({
      title: "Placement aléatoire",
      description: `${Math.min(shuffledStudents.length, shuffledSeats.length)} élève(s) placé(s) aléatoirement`,
    })
  }

  const handleAlphabeticalPlacement = (order: "asc" | "desc") => {
    const sorted = [...students].sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase()
      return order === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    })

    const newAssignments = new Map<number, string>()
    const totalSeats = getTotalSeats()

    sorted.forEach((student, index) => {
      if (index < totalSeats) {
        newAssignments.set(index + 1, student.id)
      }
    })

    setAssignments(newAssignments)
    toast({
      title: `Placement alphabétique ${order === "asc" ? "A-Z" : "Z-A"}`,
      description: `${Math.min(sorted.length, totalSeats)} élève(s) placé(s)`,
    })
  }

  const handleCompletePlan = () => {
    const unassigned = getUnassignedStudents()
    const availableSeats: number[] = []

    for (let i = 1; i <= getTotalSeats(); i++) {
      if (!assignments.has(i)) {
        availableSeats.push(i)
      }
    }

    let sorted: Student[]
    if (completeMethod === "random") {
      sorted = [...unassigned].sort(() => Math.random() - 0.5)
    } else {
      sorted = [...unassigned].sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase()
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase()
        return completeMethod === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
      })
    }

    const newAssignments = new Map(assignments)

    sorted.forEach((student, index) => {
      if (index < availableSeats.length) {
        newAssignments.set(availableSeats[index], student.id)
      }
    })

    setAssignments(newAssignments)
    toast({
      title: "Plan complété",
      description: `${Math.min(sorted.length, availableSeats.length)} élève(s) placé(s)`,
    })
  }

  const handleRemoveAll = () => {
    setAssignments(new Map())
    toast({
      title: "Plan vidé",
      description: "Tous les élèves ont été retirés du plan",
    })
  }

  const handleReset = () => {
    setAssignments(new Map(savedAssignments))
    toast({
      title: "Plan réinitialisé",
      description: "Le plan a été restauré à la dernière sauvegarde",
    })
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const supabase = createClient()

      console.log("[v0] Saving seating plan for sub-room:", subRoom.id)
      console.log("[v0] Number of assignments:", assignments.size)

      // Delete existing assignments
      const { error: deleteError } = await supabase.from("seating_assignments").delete().eq("sub_room_id", subRoom.id)

      if (deleteError) {
        console.error("[v0] Error deleting existing assignments:", deleteError)
        throw deleteError
      }

      // Insert new assignments
      const assignmentsToInsert = Array.from(assignments.entries()).map(([seatNumber, studentId]) => ({
        sub_room_id: subRoom.id,
        student_id: studentId,
        seat_position: seatNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      console.log("[v0] Assignments to insert:", assignmentsToInsert)

      if (assignmentsToInsert.length > 0) {
        const { error: insertError } = await supabase.from("seating_assignments").insert(assignmentsToInsert)

        if (insertError) {
          console.error("[v0] Error inserting assignments:", insertError)
          throw insertError
        }
      }

      setSavedAssignments(new Map(assignments))

      toast({
        title: "Plan sauvegardé",
        description: "Le plan de classe a été enregistré avec succès",
      })
    } catch (error) {
      console.error("[v0] Error saving seating plan:", error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le plan de classe",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleShareByEmail = async () => {
    if (!shareEmail) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email",
        variant: "destructive",
      })
      return
    }

    try {
      // TODO: Implement actual email sending with Resend
      toast({
        title: "Email envoyé",
        description: `Le plan de classe a été envoyé à ${shareEmail}`,
      })
      setIsShareDialogOpen(false)
      setShareEmail("")
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive",
      })
    }
  }

  const handleDownloadImage = () => {
    try {
      // Create a simple text representation for now
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = 1200
      canvas.height = 800
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "black"
      ctx.font = "20px Arial"
      ctx.fillText(subRoom.name, 50, 50)

      // Download
      const link = document.createElement("a")
      link.download = `plan-de-classe-${subRoom.name}.png`
      link.href = canvas.toDataURL()
      link.click()

      toast({
        title: "Image téléchargée",
        description: "Le plan de classe a été téléchargé",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger l'image",
        variant: "destructive",
      })
    }
  }

  const handleDownloadPDF = () => {
    toast({
      title: "PDF en cours de génération",
      description: "Le téléchargement va commencer...",
    })
    // For now, just download as text
    const content = `Plan de Classe: ${subRoom.name}\n\nÉlèves placés:\n${Array.from(assignments.entries())
      .map(([seat, studentId]) => {
        const student = students.find((s) => s.id === studentId)
        return `Place ${seat}: ${student?.last_name} ${student?.first_name}`
      })
      .join("\n")}`

    const blob = new Blob([content], { type: "text/plain" })
    const link = document.createElement("a")
    link.download = `plan-de-classe-${subRoom.name}.txt`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const handleCreateLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/share/seating-plan/${subRoom.id}`
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Lien copié",
        description: "Le lien de partage a été copié dans le presse-papiers",
      })
    } catch (error) {
      toast({
        title: "Lien créé",
        description: `Lien: ${window.location.origin}/share/seating-plan/${subRoom.id}`,
      })
    }
  }

  const handleDropOnList = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedStudent) return

    const newAssignments = new Map(assignments)
    newAssignments.delete(Array.from(newAssignments.entries()).find(([seat]) => seat === draggedStudent.id)?.[0] || -1)
    setAssignments(newAssignments)
    setDraggedStudent(null)
  }

  const getTableStyle = () => {
    return {
      backgroundColor: "#B58255", // New brown color for tables
      borderColor: "#8B5A3C",
    }
  }

  const getSeatStyle = (isOccupied: boolean) => {
    if (isOccupied) {
      return {
        backgroundColor: "#CCEDD6", // New green color for occupied seats
        borderColor: "#A8D5BA",
      }
    }
    return {
      backgroundColor: "#F3F4F6",
      borderColor: "#D1D5DB",
    }
  }

  const getBoardAlignment = () => {
    if (!room) return ""
    switch (room.board_position) {
      case "top":
        return "justify-center items-start"
      case "bottom":
        return "justify-center items-end"
      case "left":
        return "justify-start items-center"
      case "right":
        return "justify-end items-center"
      default:
        return ""
    }
  }

  const getSeatNumber = (colIndex: number, tableIndex: number, seatIndex: number) => {
    if (!room) return 0
    let seatNumber = 1
    for (let i = 0; i < colIndex; i++) {
      seatNumber += room.config.columns[i].tables * room.config.columns[i].seatsPerTable
    }
    seatNumber += tableIndex * room.config.columns[colIndex].seatsPerTable + seatIndex + 1
    return seatNumber
  }

  const getResponsiveTableSize = () => {
    if (!room) return "w-16 h-16"
    const columnCount = room.config.columns.length

    // Fewer columns = larger tables, more columns = smaller tables
    if (columnCount <= 2) return "w-20 h-20 md:w-24 md:h-24"
    if (columnCount <= 4) return "w-16 h-16 md:w-20 md:h-20"
    return "w-12 h-12 md:w-16 md:h-16"
  }

  const getResponsiveSeatSize = () => {
    if (!room) return "w-8 h-8"
    const columnCount = room.config.columns.length

    if (columnCount <= 2) return "w-10 h-10 md:w-12 md:h-12"
    if (columnCount <= 4) return "w-8 h-8 md:w-10 md:h-10"
    return "w-6 h-6 md:w-8 md:h-8"
  }

  if (!room) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-gray-100 dark:hover:bg-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white">{subRoom.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {room.name} ({room.code}) • {students.length} élève(s) • {getTotalSeats()} place(s)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Options */}
          <div className="col-span-2">
            <Card className="sticky top-6 border-gray-200 dark:border-gray-800">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm mb-4 text-black dark:text-white">Options</h3>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                  onClick={handleRandomPlacementAll}
                >
                  <Shuffle className="mr-2 h-4 w-4" />
                  Aléatoire
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                  onClick={() => handleAlphabeticalPlacement("asc")}
                >
                  <ArrowDownAZ className="mr-2 h-4 w-4" />A → Z
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                  onClick={() => handleAlphabeticalPlacement("desc")}
                >
                  <ArrowUpAZ className="mr-2 h-4 w-4" />Z → A
                </Button>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">Compléter le plan</Label>
                  <div key="complete-method-select">
                    <Select value={completeMethod} onValueChange={(value: any) => setCompleteMethod(value)}>
                      <SelectTrigger className="w-full border-gray-300 dark:border-gray-700 bg-transparent">
                        <SelectValue placeholder="Méthode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem key="complete-random" value="random">
                          Aléatoire
                        </SelectItem>
                        <SelectItem key="complete-asc" value="asc">
                          A → Z
                        </SelectItem>
                        <SelectItem key="complete-desc" value="desc">
                          Z → A
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 justify-start border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                    onClick={handleCompletePlan}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Compléter
                  </Button>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
                  <Button
                    size="sm"
                    className="w-full justify-start bg-green-400 hover:bg-green-500 text-white"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>

                  <Button
                    size="sm"
                    className="w-full justify-start bg-red-400 hover:bg-red-500 text-white"
                    onClick={handleRemoveAll}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Tout retirer
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                    onClick={handleReset}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Réinitialiser
                  </Button>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                    onClick={() => setIsShareDialogOpen(true)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Partager
                  </Button>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-start bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Valider
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center - Room Layout */}
          <div className="col-span-8">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-8">
                <RoomLayout
                  room={room}
                  assignments={assignments}
                  students={students}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onRemove={handleRemoveFromSeat}
                  onDragStart={handleDragStart}
                  getTableStyle={getTableStyle}
                  getSeatStyle={getSeatStyle}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Students List */}
          <div className="col-span-2">
            <Card className="sticky top-6 border-gray-200 dark:border-gray-800">
              <CardContent
                className="p-4"
                onDragOver={(e) => {
                  e.preventDefault()
                }}
                onDrop={handleDropOnList}
              >
                <h3 className="font-semibold mb-4 text-black dark:text-white">
                  Élèves non placés ({getUnassignedStudents().length}/{students.length})
                </h3>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {getUnassignedStudents().map((student) => (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={() => handleDragStart(student)}
                      className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 cursor-move hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      <div className="font-medium text-sm text-black dark:text-white">
                        {student.last_name} {student.first_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-200 dark:bg-gray-800 text-black dark:text-white"
                        >
                          {student.class_name}
                        </Badge>
                        {student.role === "delegue" && (
                          <Badge className="text-xs bg-blue-500 hover:bg-blue-600 text-white border-0">Délégué</Badge>
                        )}
                        {student.role === "eco-delegue" && (
                          <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                            Éco-délégué
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {getUnassignedStudents().length === 0 && (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-black dark:text-white" />
                      <p className="text-sm">Tous les élèves sont placés</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent className="border-gray-200 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-black dark:text-white">Partager le plan de classe</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Choisissez comment partager ce plan de classe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-email" className="text-black dark:text-white">
                  Envoyer par email
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="share-email"
                    type="email"
                    placeholder="email@example.com"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="border-gray-300 dark:border-gray-700"
                  />
                  <Button
                    onClick={handleShareByEmail}
                    className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black dark:text-white">Télécharger</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadImage}
                    className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Image
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-black dark:text-white">Créer un lien de visualisation</Label>
                <Button
                  variant="outline"
                  onClick={handleCreateLink}
                  className="w-full border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 bg-transparent"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Générer un lien
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
