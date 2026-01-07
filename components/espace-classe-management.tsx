"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Search, Plus, Trash2, Edit, Copy, Eye, Grid3x3 } from "lucide-react"

interface Room {
  id: string
  establishment_id: string
  name: string
  code: string
  board_position: "top" | "bottom" | "left" | "right"
  config: {
    columns: Array<{
      id: string
      tables: number
      seatsPerTable: number
    }>
  }
  created_by: string
  created_at: string
  updated_at: string
}

interface EspaceClasseManagementProps {
  initialRooms: Room[]
  userRole: string
  userId: string
  establishmentId: string
}

export default function EspaceClasseManagement({
  initialRooms,
  userRole,
  userId,
  establishmentId,
}: EspaceClasseManagementProps) {
  const supabase = createClient()
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(initialRooms)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const isVieScolaire = userRole === "vie-scolaire"
  const isTeacher = userRole === "professeur"
  const isDelegate = userRole === "delegue" || userRole === "eco-delegue"
  const canCreateRooms = isVieScolaire || isTeacher
  const canModifyRooms = isVieScolaire || isTeacher

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRooms(rooms)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRooms(
        rooms.filter((room) => room.name.toLowerCase().includes(query) || room.code.toLowerCase().includes(query)),
      )
    }
  }, [searchQuery, rooms])

  const calculateTotalSeats = (room: Room) => {
    return room.config.columns.reduce((sum, col) => sum + col.tables * col.seatsPerTable, 0)
  }

  useEffect(() => {
    const channel = supabase
      .channel("rooms-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `establishment_id=eq.${establishmentId}`,
        },
        async () => {
          const { data } = await supabase
            .from("rooms")
            .select("*")
            .eq("establishment_id", establishmentId)
            .order("created_at", { ascending: false })

          if (data) {
            setRooms(data)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [establishmentId, supabase])

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const selectAll = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([])
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id))
    }
  }

  const duplicateRoom = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return

    const timestamp = Date.now()
    const { error } = await supabase.from("rooms").insert({
      establishment_id: establishmentId,
      name: `${room.name} (copie)`,
      code: `${room.code}-${timestamp}`,
      board_position: room.board_position,
      config: room.config,
      created_by: userId,
    })

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la salle",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Salle dupliquée",
        description: "La salle a été dupliquée avec succès",
      })
    }
  }

  const deleteRoom = async (roomId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette salle ?")) return

    const { error } = await supabase.from("rooms").delete().eq("id", roomId)

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la salle",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Salle supprimée",
        description: "La salle a été supprimée avec succès",
      })
      setSelectedRoomIds((prev) => prev.filter((id) => id !== roomId))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Espaces Classe</h1>
          <p className="text-muted-foreground">Gérez les configurations de vos salles de classe</p>
        </div>
        {canCreateRooms && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle salle
          </Button>
        )}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {canModifyRooms && selectedRoomIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedRoomIds.length} sélectionnée(s)</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectedRoomIds.forEach((id) => duplicateRoom(id))
                setSelectedRoomIds([])
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Dupliquer
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Supprimer ${selectedRoomIds.length} salle(s) ? Cette action est irréversible.`)) {
                  selectedRoomIds.forEach((id) => deleteRoom(id))
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de salles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Affichées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Places totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.reduce((sum, room) => sum + calculateTotalSeats(room), 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Grille des salles */}
      {canModifyRooms && filteredRooms.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedRoomIds.length === filteredRooms.length && filteredRooms.length > 0}
            onChange={selectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-muted-foreground">Sélectionner tout</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.map((room) => (
          <Card key={room.id} className={`relative ${selectedRoomIds.includes(room.id) ? "ring-2 ring-primary" : ""}`}>
            {canModifyRooms && (
              <div className="absolute left-4 top-4">
                <input
                  type="checkbox"
                  checked={selectedRoomIds.includes(room.id)}
                  onChange={() => toggleRoomSelection(room.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            )}
            <CardHeader className="pl-12">
              <CardTitle className="flex items-center justify-between">
                <span>{room.name}</span>
                <Badge variant="outline">{room.code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Colonnes</span>
                  <span className="font-medium">{room.config.columns.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Places</span>
                  <span className="font-medium">{calculateTotalSeats(room)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tableau</span>
                  <Badge variant="secondary">
                    {room.board_position === "top" && "Haut"}
                    {room.board_position === "bottom" && "Bas"}
                    {room.board_position === "left" && "Gauche"}
                    {room.board_position === "right" && "Droite"}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Eye className="mr-2 h-4 w-4" />
                  Voir
                </Button>
                {canModifyRooms && (
                  <>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteRoom(room.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Grid3x3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Aucune salle trouvée</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchQuery ? "Aucune salle ne correspond à votre recherche" : "Commencez par créer votre première salle"}
          </p>
          {canCreateRooms && !searchQuery && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une salle
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
