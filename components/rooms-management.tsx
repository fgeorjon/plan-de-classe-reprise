"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/use-auth"
import { CreateTemplateDialog } from "@/components/create-template-dialog"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { TemplateSelectionDialog } from "@/components/template-selection-dialog"
import { CreateSubRoomDialog } from "@/components/create-sub-room-dialog"
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
import type { RoomTemplate } from "@/components/room-templates"

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
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

  const canViewRooms = true

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("establishment_id", establishmentId)
      .order("name")

    if (error) {
      console.error("[v0] Error fetching rooms:", error)
    } else {
      setLocalRooms(data || [])
      setFilteredRooms(data || [])
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
  }, [searchQuery, localRooms])

  const handleAddColumn = () => {
    if (formData.columns.length >= 4) {
      return
    }

    setFormData({
      ...formData,
      columns: [...formData.columns, { id: `col${formData.columns.length + 1}`, tables: 5, seatsPerTable: 2 }],
    })
  }

  const handleRemoveColumn = (index: number) => {
    if (formData.columns.length <= 1) {
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
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 10) {
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
      setFilteredRooms((prevFilteredRooms) => [...prevFilteredRooms, data])
    } catch (error: any) {
      console.error("[v0] Error creating room:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicateRooms = async (roomIds: string[]) => {
    try {
      const roomsToDuplicate = localRooms.filter((r) => roomIds.includes(r.id))

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

      loadRooms()

      setSelectedRoomIds([])
    } catch (error) {
      console.error("[v0] Error duplicating rooms:", error)
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom) return

    if (!formData.name.trim() || !formData.code.trim()) {
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

      loadRooms()

      setEditingRoom(null)
    } catch (error: any) {
      console.error("[v0] Error editing room:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteDialog = (roomIds: string[]) => {
    setSelectedRoomIds(roomIds)
    setShowDeleteDialog(true)
  }

  const handleDeleteRooms = async (roomIdsToDelete?: string[]) => {
    const idsToDelete = roomIdsToDelete || selectedRoomIds
    if (idsToDelete.length === 0) return

    try {
      const { error } = await supabase.from("rooms").delete().in("id", idsToDelete)

      if (error) throw error

      loadRooms()
      setSelectedRoomIds([])
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("[v0] Error deleting rooms:", error)
    }
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
                className="border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/50"
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
              <CardTitle className="text-xl text-emerald-900 dark:text-emerald-100">Créer une nouvelle salle</CardTitle>
              <CardDescription>Utilisez un template prédéfini ou créez une configuration personnalisée</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {!isDelegate && (
                  <Button
                    onClick={() => setShowTemplates(true)}
                    variant="outline"
                    className="flex-1 h-16 border-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <Grid3x3 className="mr-2 h-5 w-5" />
                    Templates
                  </Button>
                )}
                {!isDelegate && (
                  <Button
                    onClick={handleCustomCreation}
                    className="flex-1 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                  >
                    <LayoutGrid className="mr-2 h-5 w-5" />
                    Personnalisée
                  </Button>
                )}
                {isDelegate && (
                  <Button
                    onClick={() => setShowTemplates(true)}
                    className="flex-1 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                  >
                    <Grid3x3 className="mr-2 h-5 w-5" />
                    Voir les templates
                  </Button>
                )}
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
                <div
                  key={room.id}
                  className={`group hover:shadow-xl transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900"
                      : "hover:ring-1 hover:ring-emerald-300"
                  } bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelection(room.id)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      {canModifyRooms && (
                        <div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          <div>
                            <Button onClick={() => handleViewRoom(room)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualiser
                            </Button>
                            <Button onClick={() => openEditDialog(room)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </Button>
                            <Button onClick={() => handleDuplicateRooms([room.id])}>
                              <Copy className="mr-2 h-4 w-4" />
                              Dupliquer
                            </Button>
                            <Button onClick={() => openDeleteDialog([room.id])} className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{room.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">Code: {room.code}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {columns.length} colonne{columns.length > 1 ? "s" : ""}
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {totalSeats} places
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800">
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                <LayoutTemplate className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Aucune salle trouvée</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Aucune salle ne correspond à votre recherche"
                  : "Commencez par créer votre première salle"}
              </p>
              {canModifyRooms && (
                <Button
                  onClick={() => setShowTemplates(true)}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Créer une salle
                </Button>
              )}
            </div>
          </div>
        )}

        {viewedRoom && (
          <Card className="mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{viewedRoom.name}</CardTitle>
                  <CardDescription>Code: {viewedRoom.code}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewedRoom(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-6 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-4">
                    Position du tableau:{" "}
                    {viewedRoom.board_position === "top"
                      ? "Haut"
                      : viewedRoom.board_position === "bottom"
                        ? "Bas"
                        : viewedRoom.board_position === "left"
                          ? "Gauche"
                          : "Droite"}
                  </div>
                  <div className="grid gap-4">
                    {viewedRoom.config.columns.map((col: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-background rounded border">
                        <span className="font-medium">Colonne {idx + 1}:</span>
                        <span>{col.tables} tables</span>
                        <span className="text-muted-foreground">×</span>
                        <span>{col.seatsPerTable} places</span>
                        <span className="ml-auto text-sm text-muted-foreground">
                          = {col.tables * col.seatsPerTable} places
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total:{" "}
                  {viewedRoom.config.columns.reduce((sum: number, col: any) => sum + col.tables * col.seatsPerTable, 0)}{" "}
                  places
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showCreateTemplate && effectiveUserId && establishmentId && (
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
      )}

      {editingRoom && (
        <div open={true} onOpenChange={(open) => !open && setEditingRoom(null)}>
          <div className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <div>
              <h2>Modifier la salle</h2>
              <p>Modifiez la configuration de la salle de classe</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name">Nom de la salle</label>
                  <input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Salle B23"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="code">Code de la salle</label>
                  <input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="ex: B23"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="boardPosition">Position du tableau</label>
                <select
                  value={formData.boardPosition}
                  onChange={(e) =>
                    setFormData({ ...formData, boardPosition: e.target.value as "top" | "bottom" | "left" | "right" })
                  }
                >
                  <option value="top">Haut</option>
                  <option value="bottom">Bas</option>
                  <option value="left">Gauche</option>
                  <option value="right">Droite</option>
                </select>
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
                        <label htmlFor={`tables-${index}`}>Nombre de tables</label>
                        <input
                          id={`tables-${index}`}
                          type="number"
                          min="1"
                          max="20"
                          value={column.tables}
                          onChange={(e) => handleColumnChange(index, "tables", Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-5">
                        <label htmlFor={`seats-${index}`}>Places par table</label>
                        <input
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
                        <button onClick={() => handleRemoveColumn(index)} disabled={formData.columns.length <= 1}>
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button onClick={handleAddColumn} disabled={formData.columns.length >= 4}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une colonne
                  </button>
                </div>
              </div>
            </div>
            <div>
              <button onClick={() => setEditingRoom(null)}>Annuler</button>
              <button onClick={handleEditRoom} disabled={isLoading}>
                {isLoading ? "Modification..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={() => handleDeleteRooms(selectedRoomIds)}
          itemCount={selectedRoomIds.length}
          itemType="salle"
        />
      )}

      {showTemplates && effectiveUserId && establishmentId && (
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
      )}

      {showCreateSubRoom && establishmentId && effectiveUserId && (
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
          userId={effectiveUserId}
        />
      )}
    </div>
  )
}
