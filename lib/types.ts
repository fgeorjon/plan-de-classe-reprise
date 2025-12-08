export type UserRole = "vie-scolaire" | "professeur" | "delegue" | "eco-delegue"

export interface Establishment {
  id: string
  name: string
  code: string
  created_at: string
}

export interface Profile {
  id: string
  establishment_id: string
  role: UserRole
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  can_create_subrooms: boolean
  created_at: string
  updated_at: string
}

export interface Teacher {
  id: string
  profile_id: string | null
  establishment_id: string
  first_name: string
  last_name: string
  email: string | null
  subject: string | null
  classes: string[]
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  profile_id: string | null
  establishment_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  class_name: string
  role: UserRole
  can_create_subrooms: boolean
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  establishment_id: string
  name: string
  code: string
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

export interface RoomAssignment {
  id: string
  room_id: string
  teacher_id: string | null
  class_name: string
  seat_assignments: Record<string, string>
  is_modifiable_by_delegates: boolean
  created_at: string
  updated_at: string
}

export type SubRoomType = "temporary" | "indeterminate"

export interface SubRoom {
  id: string
  room_assignment_id: string
  name: string
  type: SubRoomType
  start_date: string | null
  end_date: string | null
  seat_assignments: Record<string, string>
  is_modifiable_by_delegates: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
