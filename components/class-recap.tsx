"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, LayoutGrid, FileText, CheckSquare } from "lucide-react"
import { useShare } from "@/components/providers/share-provider"

interface ClassRecapProps {
  classData: {
    name: string
    students: string[]
    rooms: any[]
  }
}

export function ClassRecap({ classData }: ClassRecapProps) {
  const { shareData } = useShare()

  // Modifier la fonction calculateAssignedSeats pour qu'elle compte correctement les places occupées
  // Remplacer la fonction calculateAssignedSeats par :

  const calculateAssignedSeats = () => {
    let totalAssigned = 0

    // Pour chaque salle, récupérer les attributions et compter le nombre d'élèves placés
    classData.rooms.forEach((room) => {
      try {
        const storageKey = `seatAssignments_${shareData?.classCode || ""}`
        const savedData = localStorage.getItem(storageKey)
        if (savedData) {
          const allAssignments = JSON.parse(savedData)
          if (allAssignments && allAssignments[room.id]) {
            totalAssigned += Object.keys(allAssignments[room.id]).length
          }
        }
      } catch (e) {
        console.error("Erreur lors du calcul des places attribuées:", e)
      }
    })

    return totalAssigned
  }

  const totalStudents = classData.students.length
  const totalRooms = classData.rooms.length
  const totalPlans = calculateAssignedSeats()

  // Calculer le nombre total de places disponibles
  const calculateTotalSeats = () => {
    let total = 0
    classData.rooms.forEach((room) => {
      room.columns.forEach((column: any) => {
        total += column.tables * column.seatsPerTable
      })
    })
    return total
  }

  const totalSeats = calculateTotalSeats()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Récapitulatif de la classe</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Élèves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-300">{totalStudents}</div>
            <p className="text-sm text-muted-foreground mt-1">Inscrits dans la classe</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-purple-500" />
              Salles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-300">{totalRooms}</div>
            <p className="text-sm text-muted-foreground mt-1">Configurées</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-300">{totalPlans}</div>
            <p className="text-sm text-muted-foreground mt-1">Plans de classe</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-amber-500" />
              Places
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-300">{totalSeats}</div>
            <p className="text-sm text-muted-foreground mt-1">Places disponibles</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des élèves</CardTitle>
            <CardDescription>Occupation des salles de classe</CardDescription>
          </CardHeader>
          <CardContent>
            {classData.rooms.length === 0 ? (
              <div className="text-center py-4 text-gray-500">Aucune salle configurée</div>
            ) : (
              <div className="space-y-4">
                {classData.rooms.map((room) => {
                  // Calculer le nombre de places occupées dans cette salle
                  let occupiedSeats = 0
                  try {
                    const storageKey = `seatAssignments_${shareData?.classCode || ""}`
                    const savedData = localStorage.getItem(storageKey)
                    if (savedData) {
                      const allAssignments = JSON.parse(savedData)
                      if (allAssignments && allAssignments[room.id]) {
                        occupiedSeats = Object.keys(allAssignments[room.id]).length
                      }
                    }
                  } catch (e) {
                    console.error("Erreur lors du calcul des places occupées:", e)
                  }

                  // Calculer le nombre total de places dans cette salle
                  let totalRoomSeats = 0
                  room.columns.forEach((column: any) => {
                    totalRoomSeats += column.tables * column.seatsPerTable
                  })

                  // Calculer le pourcentage d'occupation
                  const occupancyRate = totalRoomSeats > 0 ? (occupiedSeats / totalRoomSeats) * 100 : 0

                  return (
                    <div key={room.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{room.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {occupiedSeats} / {totalRoomSeats} places
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques générales</CardTitle>
            <CardDescription>Vue d'ensemble de la classe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ratio élèves/places</p>
                  <div className="text-2xl font-bold">
                    {totalSeats > 0 ? (totalStudents / totalSeats).toFixed(2) : "N/A"}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Places par salle</p>
                  <div className="text-2xl font-bold">
                    {totalRooms > 0 ? Math.round(totalSeats / totalRooms) : "N/A"}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">État des plans de classe</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${totalPlans === totalRooms ? "bg-green-500" : totalPlans > 0 ? "bg-amber-500" : "bg-red-500"}`}
                  ></div>
                  <span className="text-sm">
                    {totalPlans === totalRooms
                      ? "Tous les plans sont configurés"
                      : totalPlans > 0
                        ? `${totalPlans} sur ${totalRooms} plans configurés`
                        : "Aucun plan configuré"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
