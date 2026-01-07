"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/use-auth"
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Copy,
  Trash,
  Edit,
  Search,
  Eye,
  X,
  LayoutTemplate,
  Sparkles,
  Grid3x3,
  LayoutGrid,
  Trash2,
} from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { TemplateSelectionDialog } from "@/components/template-selection-dialog"
import { CreateSubRoomDialog } from "@/components/create-sub-room-dialog"
import { CreateTemplateDialog } from "@/components/create-template-dialog" // Import new dialog
import type { RoomTemplate } from "@/components/room-templates"
import { Toaster } from "@/components/ui/toaster" // Fixed incorrect Toaster import - using shadcn/ui Toaster instead of react-hot-toast
import { RoomVisualization } from "./room-visualization"

interface Room {
  id: string
  establishment_id: string
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
  created_by: string | null
  created_at: string
  updated_at: string
}

interface RoomsManagementProps {
  rooms?: Room[]
  establishmentId: string
  userRole?: string
  userId?: string
  onBack?: () => void
}

export function RoomsManagement({ rooms: initialRooms = [], establishmentId, userRole, userId }: RoomsManagementProps) {
  const supabase = createClient()
  const router = useRouter()
  const { user } = useAuth()

  const [localRooms, setLocalRooms] = useState<Room[]>(initialRooms)
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(initialRooms)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [viewedRoom, setViewedRoom] = useState<Room | null>(null)
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCreateSubRoom, setShowCreateSubRoom] = useState(false)
  const [selectedRoomForSubRoom, setSelectedRoomForSubRoom] = useState<Room | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    boardPosition: "top" as "top" | "bottom" | "left" | "right",
    columns: [
      { id: "col1", tables: 5, seatsPerTable: 2 },
      { id: "col2", tables: 5, seatsPerTable: 2 },
      { id: "col3", tables: 4, seatsPerTable: 2 },
    ],
  })

  const effectiveUserRole = userRole || user?.role || ""
  const effectiveUserId = userId || user?.id || ""

  const isVieScolaire = effectiveUserRole === "vie-scolaire"
  const isTeacher = effectiveUserRole === "professeur"
  const isDelegate = effectiveUserRole === "delegue" || effectiveUserRole === "eco-delegue"

  const canModifyRooms = isVieScolaire || isTeacher || isDelegate

  const canViewRooms = true // Everyone can view rooms

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("establishment_id", establishmentId)
      .order("name")

    if (error) {
      console.error("[v0] Error fetching rooms:", error)
      // toast.error("Impossible de charger les salles")
    } else {
      setLocalRooms(data || [])
      setFilteredRooms(data || []) // Ensure filteredRooms is also updated
    }
  }

  useEffect(() => {
    console.log("[v0] RoomsManagement rendering, initialRooms:", initialRooms?.length)
    console.log("[v0] RoomsManagement userRole:", userRole)
    console.log("[v0] RoomsManagement userId:", userId)
    loadRooms()
  }, [establishmentId])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRooms(localRooms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(
        localRooms.filter((room) => room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query)),
      )
    }
  }, [searchQuery, localRooms]) // Depend on localRooms now

  const handleAddColumn = () => {
    if (formData.columns.length >= 4) {
      // toast.error("Vous ne pouvez pas ajouter plus de 4 colonnes")
      return
    }

    setFormData({
      ...formData,
      columns: [...formData.columns, { id: `col${formData.columns.length + 1}`, tables: 5, seatsPerTable: 2 }],
    })
  }

  const handleRemoveColumn = (index: number) => {
    if (formData.columns.length <= 1) {
      // toast.error("Vous devez avoir au moins une colonne")
      return
    }

    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index),
    })
  }

  const handleColumnChange = (index: number, field: "tables" | "seatsPerTable", value: number) => {
    const newColumns = [...formData.columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setFormData({ ...formData, columns: newColumns })
  }

  const calculateTotalSeats = () => {
    if (!formData?.columns || !Array.isArray(formData.columns)) return 0

    return formData.columns.reduce((total, column) => {
      if (!column || typeof column !== "object") return total
      const tables = Number(column.tables) || 0
      const seatsPerTable = Number(column.seatsPerTable) || 0
      return total + tables * seatsPerTable
    }, 0)
  }

  const calculateTotalWidth = () => {
    if (!formData?.columns || !Array.isArray(formData.columns)) return 0

    return formData.columns.reduce((total, column) => {
      if (!column || typeof column !== "object") return total
      const seatsPerTable = Number(column.seatsPerTable) || 0
      return total + seatsPerTable
    }, 0)
  }

  const handleAddRoom = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      // toast.error("Le nom et le code de la salle sont requis")
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      // toast.error("Le nombre total de places ne peut pas dépasser 350")
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 10) {
      // toast.error("Le nombre total de places en largeur ne peut pas dépasser 10")
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          establishment_id: establishmentId,
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      setLocalRooms((prevRooms) => [...prevRooms, data])
      setFilteredRooms((prevFilteredRooms) => [...prevFilteredRooms, data]) // Update filteredRooms as well

      // toast.success(`La salle ${formData.name} a été créée avec ${totalSeats} places`)
    } catch (error: any) {
      console.error("[v0] Error creating room:", error)
      // toast.error(error.message || "Impossible de créer la salle")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicateRooms = async (roomIds: string[]) => {
    try {
      const roomsToDuplicate = localRooms.filter((r) => roomIds.includes(r.id)) // Use localRooms

      for (const room of roomsToDuplicate) {
        const { error } = await supabase.from("rooms").insert({
          establishment_id: room.establishment_id,
          name: `${room.name} (copie)`,
          code: `${room.code}-copy-${Date.now().toString().slice(-4)}`,
          board_position: room.board_position,
          config: room.config,
          created_by: user?.id,
        })

        if (error) throw error
      }

      // toast.success(`${roomIds.length} salle(s) dupliquée(s) avec succès`)

      // Refresh rooms list
      loadRooms() // Use the refetch function

      setSelectedRoomIds([])
    } catch (error) {
      // toast.error("Impossible de dupliquer les salles")
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom) return

    if (!formData.name.trim() || !formData.code.trim()) {
      // toast.error("Le nom et le code de la salle sont requis")
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
        })
        .eq("id", editingRoom.id)

      if (error) throw error

      // Refresh rooms list
      loadRooms() // Use the refetch function

      setEditingRoom(null)

      // toast.success(`La salle ${formData.name} a été modifiée avec succès`)
    } catch (error: any) {
      console.error("[v0] Error editing room:", error)
      // toast.error(error.message || "Impossible de modifier la salle")
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteDialog = (roomIds: string[]) => {
    // Implement delete dialog logic
  }

  const handleDeleteRooms = async (roomIdsToDelete?: string[]) => {
    // Implement delete rooms logic
  }

  const openEditDialog = (room: Room) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      code: room.code,
      boardPosition: room.board_position,
      columns: room.config.columns,
    })
  }

  const handleToggleSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const handleSelectAll = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([])
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id))
    }
  }

  const handleViewRoom = (room: Room) => {
    setViewedRoom(room)
  }

  const handleTemplateSelect = (template: RoomTemplate) => {
    setFormData({
      name: "",
      code: "",
      boardPosition: template.boardPosition,
      columns: template.columns,
    })
    setShowCreateSubRoom(true)
  }

  const handleCustomCreation = () => {
    setFormData({
      name: "",
      code: "",
      boardPosition: "top",
      columns: [
        { id: "col1", tables: 5, seatsPerTable: 2 },
        { id: "col2", tables: 5, seatsPerTable: 2 },
        { id: "col3", tables: 4, seatsPerTable: 2 },
      ],
    })
    setShowCreateTemplate(true)
  }

  const handleCreateCustomRoom = () => {
    setFormData({
      name: "",
      code: "",
      boardPosition: "top",
      columns: [
        { id: "col1", tables: 5, seatsPerTable: 2 },
        { id: "col2", tables: 5, seatsPerTable: 2 },
        { id: "col3", tables: 4, seatsPerTable: 2 },
      ],
    })
    setShowCreateSubRoom(true)
  }

  console.log("[v0] RoomsManagement component rendering with props:", { rooms: initialRooms, userRole, userId })

  console.log("[v0] About to render Dialogs - state:", {
    showCreateTemplate,
    editingRoom: editingRoom !== null,
    selectedRoomIds: selectedRoomIds.length,
    showTemplates,
    showCreateSubRoom,
    effectiveUserId,
    effectiveUserRole,
    establishmentId,
  })

  return (
    <div className="h-full flex flex-col">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-white/50 dark:hover:bg-slate-800/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Gestion des salles
              </h1>
              <p className="text-muted-foreground mt-1">
                {localRooms.length} salle{localRooms.length > 1 ? "s" : ""} • {filteredRooms.length} affichée
                {filteredRooms.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {canModifyRooms && (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowTemplates(true)}
                size="lg"
                variant="outline"
                className="border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/20"
              >
                <LayoutTemplate className="mr-2 h-5 w-5" />
                Templates
              </Button>
              <Button
                onClick={handleCustomCreation}
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Personnaliser
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher une salle par nom ou code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {canModifyRooms && (
          <Card className="mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-emerald-900 dark:text-emerald-100">
                Créer une nouvelle salle
              </CardTitle>
              <CardDescription>Utilisez un template prédéfini ou créez une configuration personnalisée</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  onClick={handleCustomCreation}
                  variant="outline"
                  className="flex-1 h-20 border-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-transparent"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Créer un template
                </Button>
                <Button
                  onClick={() => setShowTemplates(true)}
                  variant="outline"
                  className="flex-1 h-20 border-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <Grid3x3 className="mr-2 h-5 w-5" />
                  Templates
                </Button>
                <Button
                  onClick={handleCustomCreation}
                  className="flex-1 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                >
                  <LayoutGrid className="mr-2 h-5 w-5" />
                  Personnalisée
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {canModifyRooms && (
          <div className="mb-6 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Checkbox
                checked={selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <Label className="text-sm cursor-pointer font-medium" onClick={handleSelectAll}>
                Tout sélectionner
              </Label>
            </div>
          </div>
        )}

        {selectedRoomIds.length > 0 && canModifyRooms && (
          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDuplicateRooms(selectedRoomIds)}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer ({selectedRoomIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDeleteDialog(selectedRoomIds)}
              className="border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer ({selectedRoomIds.length})
            </Button>
          </div>
        )}

        {filteredRooms.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => {
              const columns = Array.isArray(room.config?.columns) && room.config.columns ? room.config.columns : []
              const totalSeats = columns.reduce(
                (total, col) => total + (col?.tables || 0) * (col?.seatsPerTable || 0),
                0,
              )
              const isSelected = selectedRoomIds.includes(room.id)

              return (
                <Card
                  key={room.id}
                  className={`group hover:shadow-xl transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900"
                      : "hover:ring-1 hover:ring-emerald-300"
                  } bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelection(room.id)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      {canModifyRooms && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewRoom(room)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateRooms([room.id])}>
                              <Copy className="mr-2 h-4 w-4" />
                              Dupliquer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(room)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteDialog([room.id])} className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{room.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          {room.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(Array.isArray(columns) ? columns : []).length} col. • {totalSeats} places
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-900/20 bg-transparent"
                      onClick={() => handleViewRoom(room)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Voir la salle
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur border-dashed border-2 border-emerald-300 dark:border-emerald-700">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "Aucune salle trouvée" : "Aucune salle créée"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Aucune salle ne correspond à votre recherche"
                  : "Commencez par créer votre première salle"}
              </p>
              {canModifyRooms && !searchQuery && (
                <Button
                  onClick={handleCustomCreation}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une salle
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {viewedRoom && (
          <Card className="mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{viewedRoom.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Code: {viewedRoom.code}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 bg-transparent"
                    onClick={() => handleCreateCustomRoom()}
                  >
                    Créer une sous-salle à partir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewedRoom(null)}
                    className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <RoomVisualization room={viewedRoom} />
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <div>
          <CreateTemplateDialog
            open={showCreateTemplate}
            onOpenChange={setShowCreateTemplate}
            onSuccess={() => {
              setShowCreateTemplate(false)
              loadRooms()
            }}
            userId={effectiveUserId}
            establishmentId={establishmentId}
          />

          <Dialog open={editingRoom !== null} onOpenChange={(open) => !open && setEditingRoom(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifier la salle</DialogTitle>
                <DialogDescription>Modifiez la configuration de la salle de classe</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la salle</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ex: Salle B23"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code de la salle</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="ex: B23"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boardPosition">Position du tableau</Label>
                  <Select
                    value={formData.boardPosition}
                    onValueChange={(value: "top" | "bottom" | "left" | "right") =>
                      setFormData({ ...formData, boardPosition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Haut</SelectItem>
                      <SelectItem value="bottom">Bas</SelectItem>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Configuration des colonnes</h3>
                    <div className="text-sm text-muted-foreground">
                      Total: {calculateTotalSeats()} places (max 350) • Largeur: {calculateTotalWidth()} (max 10)
                      {calculateTotalSeats() > 350 && <span className="text-red-500 ml-2">(Capacité dépassée)</span>}
                      {calculateTotalWidth() > 10 && <span className="text-red-500 ml-2">(Largeur dépassée)</span>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formData.columns.map((column, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center p-2 border rounded-md">
                        <div className="col-span-1 font-medium text-center">{index + 1}</div>
                        <div className="col-span-5">
                          <Label htmlFor={`tables-${index}`}>Nombre de tables</Label>
                          <Input
                            id={`tables-${index}`}
                            type="number"
                            min="1"
                            max="20"
                            value={column.tables}
                            onChange={(e) => handleColumnChange(index, "tables", Number.parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="col-span-5">
                          <Label htmlFor={`seats-${index}`}>Places par table</Label>
                          <Input
                            id={`seats-${index}`}
                            type="number"
                            min="1"
                            max="7"
                            value={column.seatsPerTable}
                            onChange={(e) =>
                              handleColumnChange(index, "seatsPerTable", Number.parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveColumn(index)}
                            disabled={formData.columns.length <= 1}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button variant="outline" onClick={handleAddColumn} disabled={formData.columns.length >= 4}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une colonne
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingRoom(null)}>
                  Annuler
                </Button>
                <Button onClick={handleEditRoom} disabled={isLoading}>
                  {isLoading ? "Modification..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DeleteConfirmationDialog
            open={selectedRoomIds.length > 0}
            onOpenChange={() => setSelectedRoomIds([])}
            onConfirm={() => handleDeleteRooms(selectedRoomIds)}
            itemCount={selectedRoomIds.length}
            itemType="salle"
          />

          <TemplateSelectionDialog
            open={showTemplates}
            onOpenChange={setShowTemplates}
            onSelectTemplate={handleTemplateSelect}
            userId={effectiveUserId}
            establishmentId={establishmentId}
            onTemplateSelected={() => {
              setShowTemplates(false)
              loadRooms()
            }}
          />

          <CreateSubRoomDialog
            open={showCreateSubRoom}
            onOpenChange={setShowCreateSubRoom}
            onSuccess={() => {
              setShowCreateSubRoom(false)
              loadRooms()
            }}
            establishmentId={establishmentId}
            selectedRoom={selectedRoomForSubRoom}
            userRole={effectiveUserRole}
            userId={effectiveUserId} // Add missing userId prop
          />
        </div>
      </div>

      <Toaster />
    </div>
  )
}
