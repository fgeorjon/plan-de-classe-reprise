"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { SeatingPlanEditor } from "@/components/seating-plan-editor"
import { Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Room {
  id: string
  name: string
  code: string
  config: {
    columns: {
      id: string
      tables: number
      seatsPerTable: number
    }[]
  }
}

interface SubRoomProps {
  id: string
  name: string
  room_id: string
  class_ids: string[]
  rooms?: { name: string; code: string }
  teachers?: { first_name: string; last_name: string }
}

interface SafeSeatingPlanEditorWrapperProps {
  subRoom: SubRoomProps
  onBack: () => void
}

export function SafeSeatingPlanEditorWrapper({ subRoom, onBack }: SafeSeatingPlanEditorWrapperProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [enrichedSubRoom, setEnrichedSubRoom] = useState<SubRoomProps | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [subRoom.room_id, subRoom.id])

  const loadData = async () => {
    console.log("[v0] SafeWrapper: Loading room and class data for sub-room:", subRoom.id)
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Charger la salle
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", subRoom.room_id)
        .single()

      if (roomError) {
        console.error("[v0] SafeWrapper: Error loading room:", roomError)
        setError(`Erreur de chargement: ${roomError.message}`)
        setIsLoading(false)
        return
      }

      if (!roomData) {
        console.error("[v0] SafeWrapper: Room not found")
        setError("Salle introuvable")
        setIsLoading(false)
        return
      }

      // Validate room structure
      if (!roomData.config || !roomData.config.columns || !Array.isArray(roomData.config.columns)) {
        console.error("[v0] SafeWrapper: Invalid room config:", roomData)
        setError("Configuration de la salle invalide ou manquante")
        setIsLoading(false)
        return
      }

      if (roomData.config.columns.length === 0) {
        console.error("[v0] SafeWrapper: Room has no columns configured")
        setError("La salle n'a aucune colonne configurée")
        setIsLoading(false)
        return
      }

      console.log(
        "[v0] SafeWrapper: Room loaded successfully:",
        roomData.name,
        "with",
        roomData.config.columns.length,
        "columns",
      )

      const { data: classLinksData, error: classLinksError } = await supabase
        .from("sub_room_classes")
        .select("class_id")
        .eq("sub_room_id", subRoom.id)

      if (classLinksError) {
        console.error("[v0] SafeWrapper: Error loading class links:", classLinksError)
        setError(`Erreur lors du chargement des classes: ${classLinksError.message}`)
        setIsLoading(false)
        return
      }

      const classIds = classLinksData?.map((link) => link.class_id) || []
      console.log("[v0] SafeWrapper: Class IDs loaded:", classIds)

      if (classIds.length === 0) {
        console.warn("[v0] SafeWrapper: No classes associated with this sub-room")
      }

      const enriched: SubRoomProps = {
        ...subRoom,
        class_ids: classIds,
      }

      setRoom(roomData)
      setEnrichedSubRoom(enriched)
      setIsLoading(false)
    } catch (err: any) {
      console.error("[v0] SafeWrapper: Unexpected error:", err)
      setError("Erreur inattendue lors du chargement")
      setIsLoading(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black z-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Chargement du plan de classe...</h3>
            <p className="text-sm text-muted-foreground">
              Préparation de la salle {subRoom.rooms?.name || subRoom.name}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error || !room || !enrichedSubRoom) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-900">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-red-900 dark:text-red-100">
              Impossible de charger le plan de classe
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6">
              {error || "La configuration de la salle est introuvable"}
            </p>
            <div className="space-y-2">
              <Button onClick={loadData} variant="outline" className="w-full bg-transparent">
                Réessayer
              </Button>
              <Button onClick={onBack} variant="ghost" className="w-full">
                Retour aux sous-salles
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("[v0] SafeWrapper: Rendering SeatingPlanEditor with validated room data and class_ids")
  return <SeatingPlanEditor subRoom={enrichedSubRoom} room={room} onBack={onBack} />
}
