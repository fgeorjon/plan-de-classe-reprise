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
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
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
} from "lucide-react"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { TemplateSelectionDialog } from "@/components/template-selection-dialog"
import { CreateTemplateDialog } from "@/components/create-template-dialog"
import type { RoomTemplate } from "@/components/room-templates"
import type { UserRole } from "@/lib/types"

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
  rooms: Room[]
  establishmentId: string
  userRole: UserRole
  userId: string
  onBack?: () => void // Added onBack prop
}

export function RoomsManagement({
  rooms: initialRooms,
  establishmentId,
  userRole,
  userId,
  onBack,
}: RoomsManagementProps) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [filteredRooms, setFilteredRooms] = useState(initialRooms)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [viewedRoom, setViewedRoom] = useState<Room | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roomsToDelete, setRoomsToDelete] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false)
  const [creationMode, setCreationMode] = useState<"template" | "custom" | null>(null)

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

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRooms(rooms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(
        rooms.filter((room) => room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query)),
      )
    }
  }, [searchQuery, rooms])

  const handleAddColumn = () => {
    if (formData.columns.length >= 4) {
      toast({
        title: "Limite atteinte",
        description: "Vous ne pouvez pas ajouter plus de 4 colonnes",
        variant: "destructive",
      })
      return
    }

    setFormData({
      ...formData,
      columns: [...formData.columns, { id: `col${formData.columns.length + 1}`, tables: 5, seatsPerTable: 2 }],
    })
  }

  const handleRemoveColumn = (index: number) => {
    if (formData.columns.length <= 1) {
      toast({
        title: "Erreur",
        description: "Vous devez avoir au moins une colonne",
        variant: "destructive",
      })
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
    return formData.columns.reduce((total, column) => {
      return total + column.tables * column.seatsPerTable
    }, 0)
  }

  const calculateTotalWidth = () => {
    return formData.columns.reduce((total, column) => {
      return total + column.seatsPerTable
    }, 0)
  }

  const handleAddRoom = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le code de la salle sont requis",
        variant: "destructive",
      })
      return
    }

    const totalSeats = calculateTotalSeats()
    if (totalSeats > 350) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places ne peut pas dépasser 350",
        variant: "destructive",
      })
      return
    }

    const totalWidth = calculateTotalWidth()
    if (totalWidth > 10) {
      toast({
        title: "Erreur",
        description: "Le nombre total de places en largeur ne peut pas dépasser 10",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("rooms")
        .insert({
          establishment_id: establishmentId,
          name: formData.name,
          code: formData.code,
          board_position: formData.boardPosition,
          config: { columns: formData.columns },
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      setRooms([...rooms, data])
      setIsAddDialogOpen(false)
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

      toast({
        title: "Salle créée",
        description: `La salle ${formData.name} a été créée avec ${totalSeats} places`,
      })
    } catch (error: any) {
      console.error("[v0] Error creating room:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicateRooms = async (roomIds: string[]) => {
    try {
      const supabase = createClient()
      const roomsToDuplicate = rooms.filter((r) => roomIds.includes(r.id))

      for (const room of roomsToDuplicate) {
        const { error } = await supabase.from("rooms").insert({
          establishment_id: room.establishment_id,
          name: `${room.name} (copie)`,
          code: `${room.code}-copy-${Date.now().toString().slice(-4)}`,
          board_position: room.board_position,
          config: room.config,
          created_by: userId,
        })

        if (error) throw error
      }

      toast({
        title: "Salles dupliquées",
        description: `${roomIds.length} salle(s) dupliquée(s) avec succès`,
      })

      // Refresh rooms list
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false })

      if (data) {
        setRooms(data)
      }

      setSelectedRoomIds([])
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer les salles",
        variant: "destructive",
      })
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom) return

    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom et le code de la salle sont requis",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

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
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false })

      if (data) {
        setRooms(data)
      }

      setIsEditDialogOpen(false)
      setEditingRoom(null)

      toast({
        title: "Salle modifiée",
        description: `La salle ${formData.name} a été modifiée avec succès`,
      })
    } catch (error: any) {
      console.error("[v0] Error editing room:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la salle",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteDialog = (roomIds: string[]) => {
    setRoomsToDelete(roomIds)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteRooms = async () => {
    try {
      const supabase = createClient()

      const { error } = await supabase.from("rooms").delete().in("id", roomsToDelete)

      if (error) throw error

      setRooms(rooms.filter((r) => !roomsToDelete.includes(r.id)))
      setSelectedRoomIds([])
      setRoomsToDelete([])

      toast({
        title: "Salle(s) supprimée(s)",
        description: `${roomsToDelete.length} salle(s) supprimée(s) avec succès`,
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les salles",
        variant: "destructive",
      })
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
    setIsEditDialogOpen(true)
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

  const handleSelectTemplate = (template: RoomTemplate) => {
    setFormData({
      name: "",
      code: "",
      boardPosition: template.boardPosition,
      columns: template.columns,
    })
    setCreationMode("template")
    setIsAddDialogOpen(true)
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
    setCreationMode("custom")
    setIsAddDialogOpen(true)
  }

  const fetchRooms = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })

    if (data) {
      setRooms(data)
    }
  }

  const isVieScolaire = userRole === "vie-scolaire"
  const canModifyRooms = isVieScolaire
  const canViewRooms = true // Everyone can view rooms

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onBack?.()}
              className="hover:bg-white/50 dark:hover:bg-slate-800/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Gestion des salles
              </h1>
              <p className="text-muted-foreground mt-1">
                {rooms.length} salle{rooms.length > 1 ? "s" : ""} • {filteredRooms.length} affichée
                {filteredRooms.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {canModifyRooms && (
            <div className="flex gap-3">
              <Button
                onClick={() => setIsTemplateDialogOpen(true)}
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
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-100 dark:scrollbar-thumb-emerald-700 dark:scrollbar-track-slate-800">
            {rooms.map((room) => {
              const totalSeats = room.config?.columns
                ? room.config.columns.reduce((total, col) => total + col.tables * col.seatsPerTable, 0)
                : 0
              const isSelected = selectedRoomIds.includes(room.id)

              return (
                <Card
                  key={room.id}
                  className={`flex-shrink-0 w-72 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    isSelected
                      ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900"
                      : "hover:ring-1 hover:ring-emerald-300"
                  } bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm`}
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
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                          {room.config?.columns?.length || 0} col. • {totalSeats} places
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
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou code de salle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500"
              />
            </div>
            {canModifyRooms && (
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
            )}
          </div>

          {selectedRoomIds.length > 0 && canModifyRooms && (
            <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDuplicateRooms(selectedRoomIds)}
                className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800"
              >
                <Copy className="mr-2 h-4 w-4" />
                Dupliquer ({selectedRoomIds.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedRooms = rooms.filter((r) => selectedRoomIds.includes(r.id))
                  if (selectedRooms.length === 1) {
                    openEditDialog(selectedRooms[0])
                  } else {
                    toast({
                      title: "Information",
                      description: "Vous ne pouvez modifier qu'une seule salle à la fois",
                    })
                  }
                }}
                className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800"
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier ({selectedRoomIds.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openDeleteDialog(selectedRoomIds)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash className="mr-2 h-4 w-4" />
                Supprimer ({selectedRoomIds.length})
              </Button>
            </div>
          )}
        </div>

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
                  >
                    Transposer en plan de classe
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

        {filteredRooms.length === 0 && (
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-emerald-200 dark:border-emerald-800">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchQuery ? "Aucune salle trouvée" : "Aucune salle créée"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Essayez avec un autre terme de recherche" : "Commencez par créer votre première salle"}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une salle</DialogTitle>
                <DialogDescription>Configurez la disposition de la salle de classe</DialogDescription>
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
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddRoom} disabled={isLoading}>
                  {isLoading ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleEditRoom} disabled={isLoading}>
                  {isLoading ? "Modification..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                Créer une nouvelle salle
              </CardTitle>
              <CardDescription>Utilisez un template prédéfini ou créez une configuration personnalisée</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setIsCreateTemplateDialogOpen(true)}
                  size="lg"
                  variant="outline"
                  className="border-purple-300 hover:bg-purple-50 hover:border-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/20"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Créer un template
                </Button>
                <Button
                  onClick={() => setIsTemplateDialogOpen(true)}
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
                  variant="outline"
                  className="border-blue-300 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20 bg-transparent"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Personnalisée
                </Button>
              </div>
            </CardContent>
          </Card>

          <DeleteConfirmationDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteRooms}
            itemCount={roomsToDelete.length}
            itemType="salle"
          />
          <TemplateSelectionDialog
            open={isTemplateDialogOpen}
            onOpenChange={setIsTemplateDialogOpen}
            onSelectTemplate={handleSelectTemplate}
            userId={userId}
            establishmentId={establishmentId}
          />
          <CreateTemplateDialog
            open={isCreateTemplateDialogOpen}
            onOpenChange={setIsCreateTemplateDialogOpen}
            onSuccess={fetchRooms}
            userId={userId}
            establishmentId={establishmentId}
          />
        </div>
      </div>

      <Toaster />
    </div>
  )
}

function RoomVisualization({ room }: { room: Room }) {
  const { config, board_position } = room

  if (!config || !config.columns || !Array.isArray(config.columns)) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <p>Configuration de la salle invalide</p>
      </div>
    )
  }

  let seatNumber = 1
  const boardMargin = 100 // pixels of space around the board
  const isHorizontalBoard = board_position === "top" || board_position === "bottom"
  const isVerticalBoard = board_position === "left" || board_position === "right"

  return (
    <div className="relative border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-16 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-[600px] overflow-auto">
      {/* Board - Top */}
      {board_position === "top" && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 text-white px-16 py-6 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      {/* Board - Bottom */}
      {board_position === "bottom" && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 text-white px-16 py-6 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      {/* Board - Left */}
      {board_position === "left" && (
        <div
          className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white px-6 py-16 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      {/* Board - Right */}
      {board_position === "right" && (
        <div
          className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-slate-700 via-slate-800 to-slate-900 text-white px-6 py-16 rounded-md font-semibold text-xl shadow-2xl border-2 border-slate-600"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-white/5 to-transparent rounded-md" />
          <span className="relative tracking-wider">TABLEAU</span>
        </div>
      )}

      <div
        className="flex justify-center items-center gap-16 h-full"
        style={{
          marginTop: board_position === "top" ? `${boardMargin}px` : "0",
          marginBottom: board_position === "bottom" ? `${boardMargin}px` : "0",
          marginLeft: board_position === "left" ? `${boardMargin}px` : "0",
          marginRight: board_position === "right" ? `${boardMargin}px` : "0",
        }}
      >
        {config.columns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-8">
            {Array.from({ length: column.tables }).map((_, tableIndex) => (
              <div
                key={tableIndex}
                className="relative bg-gradient-to-br from-[#B58255] via-[#B58255] to-[#A07245] dark:from-[#B58255]/50 dark:to-[#A07245]/50 rounded-2xl p-4 shadow-lg border-2 border-[#A07245] dark:border-[#A07245]"
                style={{ minWidth: `${column.seatsPerTable * 80}px` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-2xl pointer-events-none" />
                <div
                  className="absolute inset-0 opacity-20 rounded-2xl pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
                  }}
                />

                <div className="relative flex gap-4 justify-center">
                  {Array.from({ length: column.seatsPerTable }).map((_, seatIndex) => {
                    const currentSeatNumber = seatNumber++
                    return (
                      <div
                        key={seatIndex}
                        className="w-16 h-16 bg-gradient-to-br from-[#CCEDD6] via-[#CCEDD6] to-[#B8E0C7] hover:from-[#B8E0C7] hover:via-[#CCEDD6] hover:to-[#A5D4B9] text-gray-800 rounded-xl flex items-center justify-center text-lg font-bold shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 border border-[#A5D4B9] cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
                        <span className="relative drop-shadow-sm">{currentSeatNumber}</span>
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
  )
}
