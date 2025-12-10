import { createBrowserClient } from "@supabase/ssr"

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

function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function loadCustomTemplates(establishmentId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("custom_room_templates")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error loading custom templates:", error)
    return []
  }

  return data.map((template: any) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    totalSeats: template.total_seats,
    columns: template.config.columns,
    boardPosition: template.board_position,
    isCustom: true,
    isPinned: template.is_pinned,
    createdBy: template.created_by,
    establishmentId: template.establishment_id,
  }))
}

export async function createCustomTemplate(
  template: Omit<RoomTemplate, "id">,
  userId: string,
  establishmentId: string,
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("custom_room_templates")
    .insert({
      name: template.name,
      description: template.description,
      total_seats: template.totalSeats,
      config: { columns: template.columns },
      board_position: template.boardPosition,
      establishment_id: establishmentId,
      created_by: userId,
      is_pinned: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleTemplatePin(templateId: string, establishmentId: string) {
  const supabase = createClient()

  // Check current pinned count
  const { data: pinnedTemplates } = await supabase
    .from("custom_room_templates")
    .select("id")
    .eq("establishment_id", establishmentId)
    .eq("is_pinned", true)

  const { data: currentTemplate } = await supabase
    .from("custom_room_templates")
    .select("is_pinned")
    .eq("id", templateId)
    .single()

  if (!currentTemplate) throw new Error("Template not found")

  // If trying to pin and already have 5 pinned, throw error
  if (!currentTemplate.is_pinned && pinnedTemplates && pinnedTemplates.length >= 5) {
    throw new Error("Maximum 5 templates can be pinned")
  }

  const { error } = await supabase
    .from("custom_room_templates")
    .update({ is_pinned: !currentTemplate.is_pinned })
    .eq("id", templateId)

  if (error) throw error
}

export async function deleteCustomTemplate(templateId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("custom_room_templates").delete().eq("id", templateId)

  if (error) throw error
}
