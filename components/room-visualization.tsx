"use client"

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

interface RoomVisualizationProps {
  room: Room
}

export function RoomVisualization({ room }: RoomVisualizationProps) {
  if (!room || !room.config || !Array.isArray(room.config.columns) || room.config.columns.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
        <div className="text-center text-muted-foreground">
          <p>Configuration de salle invalide ou vide</p>
        </div>
      </div>
    )
  }

  const { board_position, config } = room
  const columns = config.columns

  const renderBoard = () => (
    <div className="bg-slate-800 dark:bg-slate-700 text-white text-center py-3 px-4 rounded-lg font-semibold shadow-lg">
      Tableau
    </div>
  )

  const renderSeats = () => {
    if (!columns || columns.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-4">
          <p>Aucune place configurée</p>
        </div>
      )
    }

    return (
      <div className="flex gap-4 justify-center my-6">
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-2">
            {Array.from({ length: column.tables || 0 }).map((_, tableIndex) => (
              <div key={tableIndex} className="flex gap-1">
                {Array.from({ length: column.seatsPerTable || 0 }).map((_, seatIndex) => (
                  <div
                    key={seatIndex}
                    className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900 border-2 border-emerald-300 dark:border-emerald-700 rounded flex items-center justify-center text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                    title={`Colonne ${colIndex + 1}, Table ${tableIndex + 1}, Place ${seatIndex + 1}`}
                  >
                    {seatIndex + 1}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
        {board_position === "top" && renderBoard()}
        {board_position === "left" && (
          <div className="flex gap-4">
            <div className="flex-shrink-0">{renderBoard()}</div>
            <div className="flex-1">{renderSeats()}</div>
          </div>
        )}
        {board_position !== "left" && board_position !== "right" && renderSeats()}
        {board_position === "right" && (
          <div className="flex gap-4">
            <div className="flex-1">{renderSeats()}</div>
            <div className="flex-shrink-0">{renderBoard()}</div>
          </div>
        )}
        {board_position === "bottom" && renderBoard()}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-1">Colonnes</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{columns.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-1">Tables</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {columns.reduce((total, col) => total + (col.tables || 0), 0)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-muted-foreground mb-1">Places totales</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {columns.reduce((total, col) => total + (col.tables || 0) * (col.seatsPerTable || 0), 0)}
          </div>
        </div>
      </div>
    </div>
  )
}
