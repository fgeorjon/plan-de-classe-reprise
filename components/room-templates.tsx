export interface RoomTemplate {
  id: string
  name: string
  description: string
  totalSeats: number
  columns: {
    id: string
    tables: number
    seatsPerTable: number
  }[]
  boardPosition: "top" | "bottom" | "left" | "right"
  isCustom?: boolean
  isPinned?: boolean
  createdBy?: string
  establishmentId?: string
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: "template-1",
    name: "Classe Standard 30",
    description: "Configuration classique avec 30 places",
    totalSeats: 30,
    columns: [
      { id: "col1", tables: 5, seatsPerTable: 2 },
      { id: "col2", tables: 5, seatsPerTable: 2 },
      { id: "col3", tables: 5, seatsPerTable: 2 },
    ],
    boardPosition: "top",
  },
  {
    id: "template-2",
    name: "Classe Standard 32",
    description: "Configuration avec 32 places",
    totalSeats: 32,
    columns: [
      { id: "col1", tables: 8, seatsPerTable: 2 },
      { id: "col2", tables: 8, seatsPerTable: 2 },
    ],
    boardPosition: "top",
  },
  {
    id: "template-3",
    name: "Classe Large 36",
    description: "Grande classe avec 36 places",
    totalSeats: 36,
    columns: [
      { id: "col1", tables: 6, seatsPerTable: 2 },
      { id: "col2", tables: 6, seatsPerTable: 2 },
      { id: "col3", tables: 6, seatsPerTable: 2 },
    ],
    boardPosition: "top",
  },
  {
    id: "template-4",
    name: "Classe Compacte 30",
    description: "Configuration compacte avec tables de 3",
    totalSeats: 30,
    columns: [
      { id: "col1", tables: 5, seatsPerTable: 3 },
      { id: "col2", tables: 5, seatsPerTable: 3 },
    ],
    boardPosition: "top",
  },
  {
    id: "template-5",
    name: "Classe Moderne 35",
    description: "Disposition moderne avec 35 places",
    totalSeats: 35,
    columns: [
      { id: "col1", tables: 7, seatsPerTable: 2 },
      { id: "col2", tables: 7, seatsPerTable: 2 },
      { id: "col3", tables: 3, seatsPerTable: 1 },
    ],
    boardPosition: "top",
  },
  {
    id: "template-6",
    name: "Classe Flexible 32",
    description: "Configuration flexible avec îlots",
    totalSeats: 32,
    columns: [
      { id: "col1", tables: 4, seatsPerTable: 4 },
      { id: "col2", tables: 4, seatsPerTable: 4 },
    ],
    boardPosition: "top",
  },
  {
    id: "template-7",
    name: "Classe Amphithéâtre 38",
    description: "Style amphithéâtre avec 38 places",
    totalSeats: 38,
    columns: [
      { id: "col1", tables: 6, seatsPerTable: 2 },
      { id: "col2", tables: 7, seatsPerTable: 2 },
      { id: "col3", tables: 6, seatsPerTable: 2 },
    ],
    boardPosition: "bottom",
  },
  {
    id: "template-8",
    name: "Classe U 30",
    description: "Disposition en U avec 30 places",
    totalSeats: 30,
    columns: [
      { id: "col1", tables: 5, seatsPerTable: 2 },
      { id: "col2", tables: 5, seatsPerTable: 2 },
      { id: "col3", tables: 5, seatsPerTable: 2 },
    ],
    boardPosition: "left",
  },
  {
    id: "template-9",
    name: "Classe Collaborative 36",
    description: "Tables de 6 pour travail collaboratif",
    totalSeats: 36,
    columns: [
      { id: "col1", tables: 3, seatsPerTable: 6 },
      { id: "col2", tables: 3, seatsPerTable: 6 },
    ],
    boardPosition: "top",
  },
]
