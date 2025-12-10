"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
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
  User,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import cn from "classnames"

interface Student {
  id: string
  first_name: string
  last_name: string
  class_name: string
  role: string
  is_delegate?: boolean
  is_eco_delegate?: boolean
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
  room: Room
  onClose?: () => void
  onBack?: () => void
}

export function SeatingPlanEditor({ subRoom, room, onClose, onBack }: SeatingPlanEditorProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map())
  const [savedAssignments, setSavedAssignments] = useState<Map<number, string>>(new Map())
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null)
  const [isDragOverUnplaced, setIsDragOverUnplaced] = useState(false)
  const [selectedSeatForDialog, setSelectedSeatForDialog] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [completeMethod, setCompleteMethod] = useState<"random" | "asc" | "desc">("random")
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<string | null>(null)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    fetchData()
    const dontShow = localStorage.getItem("dontShowRemoveConfirmation")
    setDontShowAgain(dontShow === "true")
  }, [subRoom.id])

  const fetchData = async () => {
    const supabase = createClient()

    console.log("[v0] Editor: Fetching students and assignments for sub-room:", subRoom.id)

    const { data: studentsData } = await supabase
      .from("students")
      .select("id, first_name, last_name, class_name, role, is_delegate, is_eco_delegate")
      .in("class_id", subRoom.class_ids)
      .order("last_name")

    if (studentsData) setStudents(studentsData)

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
    if (!room?.config?.columns) return 0
    return room.config.columns.reduce((total, col) => total + col.tables * col.seatsPerTable, 0)
  }

  const getUnassignedStudents = () => {
    const assignedIds = new Set(assignments.values())
    return students.filter((s) => !assignedIds.has(s.id))
  }

  const handleDragStart = (e: React.DragEvent | React.TouchEvent | null, studentId: string) => {
    if (e && "dataTransfer" in e) {
      const event = e as React.DragEvent
      setDraggedStudent(studentId)
      event.dataTransfer.setData("studentId", studentId)
    } else {
      setDraggedStudent(studentId)
      setIsDragging(true)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, seatNumber: number) => {
    e.preventDefault()
    e.stopPropagation()

    const studentId = e.dataTransfer.getData("studentId")
    if (!studentId) return

    console.log("[v0] Dropping student on seat:", seatNumber)

    const newAssignments = new Map(assignments)
    const currentStudentId = newAssignments.get(seatNumber)

    if (currentStudentId === studentId) {
      setDraggedStudent(null)
      return
    }

    let draggedStudentCurrentSeat: number | null = null
    for (const [seat, id] of newAssignments.entries()) {
      if (id === studentId) {
        draggedStudentCurrentSeat = seat
        break
      }
    }

    if (currentStudentId) {
      if (draggedStudentCurrentSeat !== null) {
        newAssignments.set(draggedStudentCurrentSeat, currentStudentId)
      }
      newAssignments.set(seatNumber, studentId)
    } else {
      if (draggedStudentCurrentSeat !== null) {
        newAssignments.delete(draggedStudentCurrentSeat)
      }
      newAssignments.set(seatNumber, studentId)
    }

    setAssignments(newAssignments)
    setDraggedStudent(null)
  }

  const handleSeatClick = (seatNumber: number, studentId?: string) => {
    const student = studentId ? students.find((s) => s.id === studentId) : undefined

    if (student) {
      const dontShow = localStorage.getItem("dontShowRemoveConfirmation") === "true"
      if (dontShow) {
        removeStudentFromSeat(seatNumber)
      } else {
        setStudentToRemove(studentId)
        setShowRemoveConfirmation(true)
      }
    } else {
      setSelectedSeatForDialog(seatNumber)
    }
  }

  const handleConfirmRemove = () => {
    if (studentToRemove) {
      const seatNumber = Array.from(assignments.entries()).find(([_, id]) => id === studentToRemove)?.[0]
      if (seatNumber !== undefined) {
        removeStudentFromSeat(seatNumber)
      }
    }

    if (dontShowAgain) {
      localStorage.setItem("dontShowRemoveConfirmation", "true")
    }

    setShowRemoveConfirmation(false)
    setStudentToRemove(null)
    setDontShowAgain(false)
    toast({
      title: "Élève retiré",
      description: "L'élève a été retiré du plan de classe",
    })
  }

  const handleCancelRemove = () => {
    setShowRemoveConfirmation(false)
    setStudentToRemove(null)
    setDontShowAgain(false)
  }

  const removeStudentFromSeat = (seatNumber: number) => {
    const newAssignments = new Map(assignments)
    newAssignments.delete(seatNumber)
    setAssignments(newAssignments)
    toast({
      title: "Élève retiré",
      description: "L'élève a été retiré du plan de classe",
    })
  }

  const handleRandomPlacementAll = () => {
    const totalSeats = getTotalSeats()
    const availableSeats = Array.from({ length: totalSeats }, (_, i) => i + 1)

    const shuffledSeats = availableSeats.sort(() => Math.random() - 0.5)
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

      const { error: deleteError } = await supabase.from("seating_assignments").delete().eq("sub_room_id", subRoom.id)

      if (deleteError) {
        console.error("[v0] Error deleting existing assignments:", deleteError)
        throw deleteError
      }

      const assignmentsToInsert = Array.from(assignments.entries()).map(([seatNumber, studentId]) => ({
        sub_room_id: subRoom.id,
        student_id: studentId,
        seat_position: seatNumber,
      }))

      console.log("[v0] Assignments to insert:", assignmentsToInsert)

      if (assignmentsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from("seating_assignments")
          .insert(assignmentsToInsert)
          .select()

        if (insertError) {
          console.error("[v0] Error inserting assignments:", insertError)
          console.error("[v0] Error details:", {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          })
          throw insertError
        }

        console.log("[v0] Inserted assignments:", data)
      }

      setSavedAssignments(new Map(assignments))

      toast({
        title: "Plan sauvegardé",
        description: "Le plan de classe a été enregistré avec succès",
      })
    } catch (error: any) {
      console.error("[v0] Error saving seating plan:", error)
      toast({
        title: "Erreur de sauvegarde",
        description:
          error?.message || "Impossible de sauvegarder le plan de classe. Vérifiez la console pour plus de détails.",
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

  const handleTouchStart = (e: React.TouchEvent, studentId: string) => {
    const touch = e.touches[0]
    setDraggedStudent(studentId)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !draggedStudent) return
    e.preventDefault()
  }

  const handleTouchEnd = (e: React.TouchEvent, targetSeatNumber?: number) => {
    if (!isDragging || !draggedStudent) {
      setIsDragging(false)
      setDraggedStudent(null)
      return
    }

    const touch = e.changedTouches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

    let seatNumber = targetSeatNumber

    if (!seatNumber && element) {
      const seatDiv = element.closest("[data-seat-number]") as HTMLElement
      if (seatDiv) {
        seatNumber = Number.parseInt(seatDiv.dataset.seatNumber || "0")
      }
    }

    if (seatNumber && seatNumber > 0) {
      console.log("[v0] Touch drop on seat:", seatNumber)

      const newAssignments = new Map(assignments)
      const currentStudentId = newAssignments.get(seatNumber)

      if (currentStudentId === draggedStudent) {
        setIsDragging(false)
        setDraggedStudent(null)
        return
      }

      for (const [seat, id] of newAssignments.entries()) {
        if (id === draggedStudent) {
          newAssignments.delete(seat)
        }
      }

      newAssignments.set(seatNumber, draggedStudent)
      setAssignments(newAssignments)
    }

    setIsDragging(false)
    setDraggedStudent(null)
  }

  const getInitials = (student: Student) => {
    return `${student.last_name.charAt(0)}.${student.first_name.charAt(0)}`.toUpperCase()
  }

  const renderDelegateBadges = (student: Student) => {
    return (
      <div className="absolute -top-1 -right-1 flex gap-0.5">
        {student.is_delegate && (
          <div
            className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white shadow-sm border border-white"
            title="Délégué"
          >
            D
          </div>
        )}
        {student.is_eco_delegate && (
          <div
            className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] font-bold text-white shadow-sm border border-white"
            title="Éco-délégué"
          >
            E
          </div>
        )}
      </div>
    )
  }

  const calculateSeatNumber = (colIndex: number, tableIndex: number, seatIndex: number) => {
    if (!room) return 0
    let seatNumber = 0
    for (let i = 0; i < colIndex; i++) {
      seatNumber += room.config.columns[i].tables * room.config.columns[i].seatsPerTable
    }
    seatNumber += tableIndex * room.config.columns[colIndex].seatsPerTable + seatIndex + 1
    return seatNumber
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack || onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{subRoom.name}</h1>
              <p className="text-sm text-muted-foreground">
                {room.name} - {students.length} élève(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Partager
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Élèves non placés ({getUnassignedStudents().length})</h2>

          <div
            className={cn(
              "mb-4 rounded-lg border-2 border-dashed p-4 transition-all",
              isDragOverUnplaced ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50",
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOverUnplaced(true)
            }}
            onDragLeave={() => setIsDragOverUnplaced(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOverUnplaced(false)
              const studentId = e.dataTransfer.getData("studentId")
              if (studentId) {
                const newAssignments = new Map(assignments)
                for (const [seat, id] of newAssignments.entries()) {
                  if (id === studentId) {
                    newAssignments.delete(seat)
                    break
                  }
                }
                setAssignments(newAssignments)
                toast({
                  title: "Élève retiré",
                  description: "L'élève a été retiré du plan",
                })
              }
            }}
          >
            <p className="text-center text-sm text-muted-foreground">
              {isDragOverUnplaced ? "Déposez ici pour retirer du plan" : "Glissez un élève ici pour le retirer"}
            </p>
          </div>

          <div className="space-y-2">
            {getUnassignedStudents().map((student) => (
              <div
                key={student.id}
                draggable
                onDragStart={(e) => handleDragStart(e, student.id)}
                className="flex cursor-move items-center justify-between rounded-lg border bg-white p-3 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {student.last_name} {student.first_name}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {student.class_name}
                </Badge>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="mb-2 text-sm font-semibold">Actions rapides</h3>
            <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleRandomPlacementAll}>
              <Shuffle className="mr-2 h-4 w-4" />
              Placement aléatoire
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() => handleAlphabeticalPlacement("asc")}
            >
              <ArrowDownAZ className="mr-2 h-4 w-4" />
              Alphabétique A-Z
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() => handleAlphabeticalPlacement("desc")}
            >
              <ArrowUpAZ className="mr-2 h-4 w-4" />
              Alphabétique Z-A
            </Button>
            <Button variant="destructive" size="sm" className="w-full" onClick={handleRemoveAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Tout retirer
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 rounded-lg border-2 border-green-600 bg-green-50 p-4 text-center">
              <p className="font-semibold text-green-800">TABLEAU</p>
            </div>

            <div className={cn("grid gap-8", `grid-cols-${room.config.columns.length}`)}>
              {room.config.columns.map((column, colIndex) => (
                <div key={column.id} className="space-y-6">
                  {Array.from({ length: column.tables }).map((_, tableIndex) => (
                    <div
                      key={tableIndex}
                      className="rounded-lg border-2 border-black bg-white p-4 shadow-sm"
                      style={{
                        width: "fit-content",
                      }}
                    >
                      <div className={cn("grid gap-2", `grid-cols-${column.seatsPerTable}`)}>
                        {Array.from({ length: column.seatsPerTable }).map((_, seatIndex) => {
                          const seatNumber = calculateSeatNumber(colIndex, tableIndex, seatIndex)
                          const studentId = assignments.get(seatNumber)
                          const student = studentId ? students.find((s) => s.id === studentId) : undefined

                          return (
                            <div
                              key={seatIndex}
                              data-seat-number={seatNumber}
                              draggable={!!student}
                              onDragStart={(e) => student && handleDragStart(e as any, student.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, seatNumber)}
                              onClick={() => handleSeatClick(seatNumber)}
                              className={cn(
                                "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded text-xs font-medium transition-all",
                                student
                                  ? "bg-black text-white hover:bg-gray-800"
                                  : "border-2 border-gray-300 bg-gray-100 hover:border-blue-400 hover:bg-blue-50",
                              )}
                            >
                              {student && (
                                <>
                                  <div
                                    className="relative flex h-10 w-10 cursor-move items-center justify-center rounded-full bg-black text-xs font-bold text-white shadow-md"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, student.id)}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSeatClick(seatNumber, student.id)
                                    }}
                                  >
                                    {getInitials(student)}
                                    {renderDelegateBadges(student)}
                                  </div>
                                  <span className="mt-1 text-center text-[10px] leading-tight text-black">
                                    {student.last_name}
                                    <br />
                                    {student.first_name}
                                  </span>
                                </>
                              )}
                              {!student && <span className="text-gray-400">{seatNumber}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showRemoveConfirmation} onOpenChange={setShowRemoveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer l'élève du plan ?</AlertDialogTitle>
            <AlertDialogDescription>Voulez-vous vraiment retirer cet élève du plan de classe ?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dont-show-again"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ne plus afficher ce message
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemove}>Non</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Oui</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={selectedSeatForDialog !== null} onOpenChange={() => setSelectedSeatForDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sélectionner un élève pour la place {selectedSeatForDialog}</DialogTitle>
            <DialogDescription>Choisissez un élève à placer sur cette place</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {getUnassignedStudents().map((student) => (
              <Button
                key={student.id}
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => {
                  if (selectedSeatForDialog) {
                    const newAssignments = new Map(assignments)
                    newAssignments.set(selectedSeatForDialog, student.id)
                    setAssignments(newAssignments)
                    setSelectedSeatForDialog(null)
                  }
                }}
              >
                <User className="mr-2 h-4 w-4" />
                {student.last_name} {student.first_name}
                <Badge variant="outline" className="ml-auto">
                  {student.class_name}
                </Badge>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager le plan de classe</DialogTitle>
            <DialogDescription>Choisissez comment partager le plan de classe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="share-email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="share-email"
                  type="email"
                  placeholder="email@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <Button onClick={handleShareByEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleDownloadImage}>
                <Download className="mr-2 h-4 w-4" />
                Image
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" onClick={handleCreateLink} className="col-span-2 bg-transparent">
                <Link2 className="mr-2 h-4 w-4" />
                Créer un lien de partage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
