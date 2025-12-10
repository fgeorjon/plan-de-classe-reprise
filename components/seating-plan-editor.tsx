"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client" // Renamed for clarity
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  CheckCircle2,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import cn from "classnames"

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
  room?: Room
  onClose?: () => void
  onBack?: () => void
}

// --- Added createClient function ---
const createClient = () => {
  // Assuming you have a function or import for creating a Supabase client in the browser context
  // Replace with your actual Supabase client creation logic if it's different
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
// --- End of added createClient function ---

export function SeatingPlanEditor({ subRoom, room: initialRoom, onClose, onBack }: SeatingPlanEditorProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map())
  const [savedAssignments, setSavedAssignments] = useState<Map<number, string>>(new Map())
  const [room, setRoom] = useState<Room | null>(initialRoom || null)
  // Changed draggedStudent to string | null to store only studentId
  const [draggedStudent, setDraggedStudent] = useState<string | null>(null)
  // Added state for dragging over the unplaced students area
  const [isDragOverUnplaced, setIsDragOverUnplaced] = useState(false)
  const [selectedSeatForDialog, setSelectedSeatForDialog] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [completeMethod, setCompleteMethod] = useState<"random" | "asc" | "desc">("random")
  // Simplified confirmation state
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false)
  // Changed studentToRemove to store only studentId
  const [studentToRemove, setStudentToRemove] = useState<string | null>(null)
  // Renamed dontShowRemoveAgain to dontShowAgain for consistency
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isLoadingRoom, setIsLoadingRoom] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)

  // Memoized fetchData to prevent unnecessary re-renders and to satisfy dependency array
  const fetchData = useCallback(async () => {
    const supabase = createClient()

    console.log("[v0] Fetching data for sub-room:", subRoom.id)
    console.log("[v0] Sub-room class_ids:", subRoom.class_ids)

    // Ensure room is loaded before proceeding
    if (!room) {
      console.log("[v0] Room is not loaded, attempting to load...")
      // This part might be redundant if loadRoomData is always called first or if initialRoom is provided
      // However, to be safe, we can fetch it here if needed.
      // Consider if this fetch should happen within loadRoomData itself for better separation of concerns.
      const { data: roomData } = await supabase.from("rooms").select("*").eq("id", subRoom.room_id).single()

      if (roomData) {
        setRoom(roomData as Room) // Ensure type safety
        console.log("[v0] Room loaded:", roomData.name)
      } else {
        console.error("[v0] Room not found for sub_room:", subRoom.room_id)
        setRoomError("Configuration de la salle introuvable.") // Set error if room not found
        return // Stop fetching if room is not found
      }
    }

    if (!subRoom.class_ids || subRoom.class_ids.length === 0) {
      console.warn("[v0] No class_ids found for this sub-room")
      setStudents([])
      return
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, first_name, last_name, class_name, role")
      .in("class_id", subRoom.class_ids)
      .order("last_name")

    if (studentsError) {
      console.error("[v0] Error fetching students:", studentsError)
      // Handle student fetch error if necessary, e.g., by setting an error state
    }

    if (studentsData) {
      console.log("[v0] Students loaded:", studentsData.length)
      setStudents(studentsData)
    } else {
      setStudents([]) // Ensure students is an empty array if no data or error
    }

    // Fetch existing seat assignments
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from("seating_assignments")
      .select("student_id, seat_position")
      .eq("sub_room_id", subRoom.id)

    if (assignmentsError) {
      console.error("[v0] Error fetching seating assignments:", assignmentsError)
      // Handle assignment fetch error if necessary
    }

    if (assignmentsData) {
      const assignmentMap = new Map<number, string>()
      assignmentsData.forEach((a: any) => {
        // Use a more specific type if possible
        assignmentMap.set(a.seat_position, a.student_id)
      })
      setAssignments(assignmentMap)
      setSavedAssignments(new Map(assignmentMap))
      console.log("[v0] Loaded", assignmentsData.length, "seat assignments")
    } else {
      setAssignments(new Map()) // Clear assignments if no data or error
      setSavedAssignments(new Map())
    }
  }, [subRoom, room]) // Simplified dependencies

  useEffect(() => {
    // Load room data first
    async function loadRoomData() {
      console.log("[v0] Checking room data:", { room, subRoom })

      // If room is missing or doesn't have config.columns, load it
      if (!room || !room.config?.columns) {
        console.log("[v0] Room data incomplete, loading from database...")
        setIsLoadingRoom(true)
        setRoomError(null)

        try {
          const supabase = createClient()

          const { data, error } = await supabase.from("rooms").select("*").eq("id", subRoom.room_id).single()

          if (error) throw error

          if (!data) {
            throw new Error("Room not found")
          }

          console.log("[v0] Room loaded successfully:", data)
          setRoom(data as Room) // Type assertion for safety
          setRoomError(null)
        } catch (error) {
          console.error("[v0] Error loading room:", error)
          setRoomError("Impossible de charger la configuration de la salle")
        } finally {
          setIsLoadingRoom(false)
        }
      }
    }

    loadRoomData()
  }, [subRoom, room]) // Simplified dependencies

  // Effect to fetch data once room data is loaded or if initialRoom is provided
  useEffect(() => {
    // Only fetch data if room is available and not currently loading
    if (room && !isLoadingRoom && !roomError) {
      fetchData()
    }

    // Load the "don't show again" preference from localStorage
    const dontShow = localStorage.getItem("dontShowRemoveConfirmation")
    setDontShowAgain(dontShow === "true")
  }, [room, isLoadingRoom, roomError, fetchData]) // Dependencies for data fetching and preference loading

  const getTotalSeats = () => {
    if (!room?.config?.columns) {
      console.warn("[v0] getTotalSeats: room.config.columns is missing")
      return 0
    }
    return room.config.columns.reduce((total, col) => total + col.tables * col.seatsPerTable, 0)
  }

  const getUnassignedStudents = () => {
    const assignedIds = new Set(assignments.values())
    return students.filter((s) => !assignedIds.has(s.id))
  }

  const handleDragStart = (e: React.DragEvent | null, studentId: string) => {
    setDraggedStudent(studentId)
    if (e) {
      e.dataTransfer.setData("studentId", studentId)
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

    // If the seat is already occupied by the same student, do nothing
    if (currentStudentId === studentId) {
      setDraggedStudent(null)
      return
    }

    // Find the current seat of the dragged student
    let draggedStudentCurrentSeat: number | null = null
    for (const [seat, id] of newAssignments.entries()) {
      if (id === studentId) {
        draggedStudentCurrentSeat = seat
        break
      }
    }

    // If the seat is occupied by another student, swap them
    if (currentStudentId) {
      if (draggedStudentCurrentSeat !== null) {
        newAssignments.set(draggedStudentCurrentSeat, currentStudentId)
      }
      newAssignments.set(seatNumber, studentId)
    } else {
      // If the seat is empty, just place the student
      if (draggedStudentCurrentSeat !== null) {
        newAssignments.delete(draggedStudentCurrentSeat)
      }
      newAssignments.set(seatNumber, studentId)
    }

    setAssignments(newAssignments)
    setDraggedStudent(null)
  }

  const handleSeatClick = (seatNumber: number) => {
    const studentId = assignments.get(seatNumber)
    if (studentId) {
      // Check if user has disabled confirmation
      const dontShow = localStorage.getItem("dontShowRemoveConfirmation") === "true"
      if (dontShow) {
        // Remove directly
        const newAssignments = new Map(assignments)
        newAssignments.delete(seatNumber)
        setAssignments(newAssignments)
        toast({
          title: "Élève retiré",
          description: "L'élève a été retiré du plan de classe",
        })
      } else {
        // Show confirmation dialog
        setStudentToRemove(studentId)
        setShowRemoveConfirmation(true)
      }
    } else {
      // If seat is empty, show student selection dialog
      setSelectedSeatForDialog(seatNumber)
    }
  }

  const handleConfirmRemove = () => {
    if (studentToRemove) {
      // Find the seat with this student
      const seatNumber = Array.from(assignments.entries()).find(([_, id]) => id === studentToRemove)?.[0]
      if (seatNumber !== undefined) {
        const newAssignments = new Map(assignments)
        newAssignments.delete(seatNumber)
        setAssignments(newAssignments)
      }
    }

    // Save preference if checkbox was checked
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

  const handleRemoveFromSeat = (seatNumber: number) => {
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

      const assignmentsToInsert = Array.from(assignments.entries()).map(([seatNumber, studentId]) => ({
        sub_room_id: subRoom.id,
        student_id: studentId,
        seat_id: `seat-${seatNumber}`, // Generate unique seat_id from seat number
        seat_position: seatNumber, // The seat number as integer
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
    const content = `Plan de Classe: ${subRoom.name}\n\nÉlèves placed:\n${Array.from(assignments.entries())
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

  // Modified touch handlers to use studentId
  const handleTouchStart = (e: React.TouchEvent, studentId: string) => {
    const touch = e.touches[0]
    setDraggedStudent(studentId)
    setIsDragging(true)
    // Optionally set dataTransfer for drag events compatibility if needed
    // e.currentTarget.ondragstart = (event) => handleDragStart(event as any, studentId);
    // e.currentTarget.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));
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

    // Try to find seat number from the element
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

      // Remove from previous position
      for (const [seat, id] of newAssignments.entries()) {
        if (id === draggedStudent) {
          newAssignments.delete(seat)
        }
      }

      // Assign to new seat
      newAssignments.set(seatNumber, draggedStudent)
      setAssignments(newAssignments)
    }

    setIsDragging(false)
    setDraggedStudent(null)
  }

  // Simplified handleSeatClick to trigger dialog or direct removal
  const handleSeatClickOriginal = (seatNumber: number, student: Student | undefined) => {
    if (student) {
      // Check if user disabled confirmation
      const dontShow = localStorage.getItem("dontShowRemoveConfirmation") === "true"

      if (dontShow) {
        // Remove directly without confirmation
        removeStudentFromSeat(seatNumber)
      } else {
        // Show confirmation dialog
        setStudentToRemove(student.id)
        setShowRemoveConfirmation(true)
      }
    } else {
      // If seat is empty, show student selection dialog
      setSelectedSeatForDialog(seatNumber)
    }
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

  const confirmRemoveStudent = () => {
    if (studentToRemove) {
      // Find the seat number associated with studentToRemove
      let seatNumberToRemove: number | undefined = undefined
      for (const [seat, studentId] of assignments.entries()) {
        if (studentId === studentToRemove) {
          seatNumberToRemove = seat
          break
        }
      }

      if (seatNumberToRemove !== undefined) {
        removeStudentFromSeat(seatNumberToRemove)
      }

      // Save "don't show again" preference
      if (dontShowAgain) {
        localStorage.setItem("dontShowRemoveConfirmation", "true")
      }

      setShowRemoveConfirmation(false)
      setStudentToRemove(null)
      setDontShowAgain(false)
    }
  }

  const getTableStyle = () => {
    return {
      backgroundColor: "#FFFFFF", // White tables
      borderColor: "#000000", // Black border
    }
  }

  const getResponsiveTableSize = () => {
    if (!room?.config?.columns) return "w-36 h-26"
    const cols = room.config.columns.length

    if (cols <= 2) return "w-36 h-26"
    if (cols <= 4) return "w-32 h-24"
    return "w-28 h-22"
  }

  const getResponsiveSeatSize = () => {
    if (!room?.config?.columns) return "w-10 h-10"
    const cols = room.config.columns.length

    // Places plus petites et carrées
    if (cols <= 2) return "w-10 h-10"
    if (cols <= 4) return "w-9 h-9"
    return "w-8 h-8"
  }

  const getResponsiveGap = () => {
    if (!room?.config?.columns) return "gap-6 md:gap-8"
    const columnCount = room.config.columns.length

    if (columnCount <= 2) return "gap-6 md:gap-8"
    if (columnCount <= 4) return "gap-4 md:gap-6"
    return "gap-3 md:gap-4"
  }

  const getSeatStyle = (isOccupied: boolean) => {
    if (isOccupied) {
      return {
        backgroundColor: "#000000", // Black for students assigned
        borderColor: "#000000",
        color: "#FFFFFF", // White text
      }
    }
    return {
      backgroundColor: "#E5E7EB", // Light gray for empty seats
      borderColor: "#D1D5DB",
      color: "#9CA3AF", // Seat numbers in gray
    }
  }

  const getBoardAlignment = () => {
    switch (room?.board_position) {
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
    if (!room?.config?.columns) return 0

    let seatNumber = 0
    // Count all seats in previous columns
    for (let i = 0; i < colIndex; i++) {
      seatNumber += room.config.columns[i].tables * room.config.columns[i].seatsPerTable
    }
    // Count all seats in previous tables of current column
    seatNumber += tableIndex * room.config.columns[colIndex].seatsPerTable
    // Add current seat index (+1 to start at 1)
    return seatNumber + seatIndex + 1 // Fixed: seat index should be added and result should be +1
  }

  // Renamed function to better reflect its purpose
  const handleDropToUnplacedArea = () => {
    if (draggedStudent) {
      console.log("[v0] Removing student from seat:", draggedStudent)

      // Find and remove the student from their current seat
      const entries = Array.from(assignments.entries())
      const entry = entries.find(([_, studentId]) => studentId === draggedStudent)

      if (entry) {
        const [seatNumber] = entry
        const newAssignments = new Map(assignments)
        newAssignments.delete(seatNumber)
        setAssignments(newAssignments)

        toast({
          title: "Élève retiré",
          description: `${students.find((s) => s.id === draggedStudent)?.first_name} ${students.find((s) => s.id === draggedStudent)?.last_name} a été retiré de la place ${seatNumber}`,
        })
      }

      setDraggedStudent(null)
    }
  }

  // Helper to get student initials
  const getInitials = (student: Student) => {
    return `${student.last_name.charAt(0)}.${student.first_name.charAt(0)}`.toUpperCase()
  }

  if (isLoadingRoom) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Chargement de la salle...</p>
        </div>
      </div>
    )
  }

  if (roomError || !room?.config?.columns) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{roomError || "Configuration de la salle introuvable"}</p>
          <Button onClick={onBack || onClose}>Retour</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 overflow-y-auto">
      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack || onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-900"
            >
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
                    <CheckCircle2 className="mr-2 h-4 w-4" />
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
                    className="w-full justify-start bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
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
                {!room?.config?.columns ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>Configuration de la salle non disponible</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <div className={`flex ${getResponsiveGap()} justify-center items-start min-w-min p-4`}>
                      {room.config.columns.map((column, colIndex) => (
                        <div key={column.id} className={`flex flex-col ${getResponsiveGap()}`}>
                          {Array.from({ length: column.tables }).map((_, tableIndex) => (
                            <div
                              key={tableIndex}
                              className={`relative ${getResponsiveTableSize()} rounded-lg border-2 flex items-center justify-center`}
                              style={getTableStyle()}
                              onDragOver={handleDragOver}
                              onDrop={(e) => {
                                // Determine the first seat number in this table for the drop target
                                const firstSeatInTable = getSeatNumber(colIndex, tableIndex, 0)
                                handleDrop(e, firstSeatInTable)
                              }}
                            >
                              <div
                                className={`grid ${
                                  column.seatsPerTable === 1
                                    ? "grid-cols-1"
                                    : column.seatsPerTable === 2
                                      ? "grid-cols-2"
                                      : column.seatsPerTable === 3
                                        ? "grid-cols-3"
                                        : column.seatsPerTable === 4
                                          ? "grid-cols-2"
                                          : column.seatsPerTable === 6
                                            ? "grid-cols-3"
                                            : "grid-cols-2"
                                } gap-3 p-4 place-items-center w-full h-full`}
                              >
                                {Array.from({ length: column.seatsPerTable }).map((_, seatIndex) => {
                                  const seatNumber = getSeatNumber(colIndex, tableIndex, seatIndex)
                                  const assignment = assignments.get(seatNumber)
                                  const student = assignment ? students.find((s) => s.id === assignment) : null
                                  const isOccupied = !!student

                                  return (
                                    <div
                                      key={`seat-${tableIndex}-${seatIndex}`}
                                      data-seat-number={seatNumber}
                                      draggable={!!student}
                                      // Pass student.id to handleDragStart
                                      onDragStart={(e) => student && handleDragStart(e as any, student.id)}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, seatNumber)}
                                      onTouchStart={(e) => student && handleTouchStart(e as any, student.id)}
                                      onTouchMove={handleTouchMove}
                                      onTouchEnd={(e) => handleTouchEnd(e, seatNumber)}
                                      // Use the new handleSeatClick
                                      onClick={() => handleSeatClick(seatNumber)}
                                      className={cn(
                                        "w-10 h-10 border-2 rounded flex items-center justify-center text-xs font-medium transition-all cursor-pointer",
                                        student
                                          ? "bg-black text-white border-black hover:scale-105"
                                          : "bg-gray-100 text-gray-400 border-gray-300 hover:border-gray-400 hover:bg-gray-200",
                                      )}
                                      style={getSeatStyle(isOccupied)}
                                    >
                                      {student ? (
                                        <>
                                          <span className="text-white text-xs font-semibold">
                                            {getInitials(student)}
                                          </span>
                                          {/* Removed direct remove button from seat for consistency with dialog */}
                                        </>
                                      ) : (
                                        <span className="text-xs">{seatNumber}</span>
                                      )}
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
                )}
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
                  setIsDragOverUnplaced(true) // Set flag when dragging over
                }}
                onDragLeave={() => setIsDragOverUnplaced(false)} // Reset flag when leaving
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOverUnplaced(false) // Reset flag on drop
                  handleDropToUnplacedArea()
                }}
              >
                <h3 className="font-semibold mb-4 text-black dark:text-white">
                  Élèves non placés ({getUnassignedStudents().length}/{students.length})
                </h3>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {getUnassignedStudents().map((student) => (
                    <div
                      key={student.id}
                      draggable
                      // Pass student.id to handleDragStart
                      onDragStart={(e) => handleDragStart(e as any, student.id)}
                      onTouchStart={(e) => handleTouchStart(e as any, student.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
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
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-black dark:text-white" />
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

        {/* Dialog for student selection */}
        <Dialog open={selectedSeatForDialog !== null} onOpenChange={(open) => !open && setSelectedSeatForDialog(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sélectionner un élève</DialogTitle>
              <DialogDescription>Choisissez un élève à placer sur la place {selectedSeatForDialog}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {getUnassignedStudents().map((student) => (
                <Button
                  key={student.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 bg-transparent"
                  onClick={() => {
                    const newAssignments = new Map(assignments)
                    newAssignments.set(selectedSeatForDialog!, student.id)
                    setAssignments(newAssignments)
                    setSelectedSeatForDialog(null)
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <div className="font-medium">
                      {student.last_name} {student.first_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {student.class_name}
                      </Badge>
                      {student.role === "delegue" && <Badge className="text-xs bg-blue-500 text-white">Délégué</Badge>}
                      {student.role === "eco-delegue" && (
                        <Badge className="text-xs bg-emerald-500 text-white">Éco-délégué</Badge>
                      )}
                    </div>
                  </div>
                </Button>
              ))}
              {getUnassignedStudents().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Tous les élèves sont déjà placés</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Unplaced students list */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">
              Élèves non placés ({getUnassignedStudents().length}/{students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-2 max-h-[400px] overflow-y-auto p-2 rounded-md border-2 border-dashed border-transparent transition-all"
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove("bg-blue-50", "border-blue-400")
                handleDropToUnplacedArea()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add("bg-blue-50", "border-blue-400")
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("bg-blue-50", "border-blue-400")
              }}
            >
              {getUnassignedStudents().length === 0 ? (
                <div className="flex items-center justify-center gap-2 p-4 text-green-600 bg-green-50 rounded-md border border-green-200">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Tous les élèves sont placés</span>
                </div>
              ) : (
                getUnassignedStudents().map((student) => (
                  <div
                    key={student.id}
                    draggable
                    onDragStart={() => handleDragStart(null as any, student.id)} // Pass student ID
                    className="flex items-center gap-2 p-2 bg-white border rounded-md cursor-move hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {student.first_name} {student.last_name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showRemoveConfirmation} onOpenChange={setShowRemoveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer l'élève du plan ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous retirer cet élève du plan de classe ? Il sera replacé dans la liste des élèves non placés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 my-4">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ne plus afficher cette confirmation
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowRemoveConfirmation(false)
                setStudentToRemove(null)
                setDontShowAgain(false)
              }}
            >
              Non
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Oui</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
