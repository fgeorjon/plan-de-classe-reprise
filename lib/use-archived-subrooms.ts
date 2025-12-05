"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Types pour les sous-salles archivées
export interface ArchivedSubRoom {
  id: string
  original_id: string
  room_assignment_id: string | null
  name: string
  type: 'temporary' | 'indeterminate' | string
  start_date: string | null
  end_date: string | null
  seat_assignments: Record<string, any> | null
  is_modifiable_by_delegates: boolean | null
  original_created_by: string | null
  original_created_at: string | null
  archived_by: string | null
  archived_by_name: string | null
  archive_reason: 'expired' | 'manual' | 'cleanup'
  establishment_id: string | null
  archived_at: string
  is_restored: boolean
  restored_at: string | null
  restored_by: string | null
}

interface UseArchivedSubRoomsOptions {
  establishmentId?: string
  includeRestored?: boolean
}

interface UseArchivedSubRoomsReturn {
  archives: ArchivedSubRoom[]
  loading: boolean
  error: Error | null
  archiveSubRoom: (subroomId: string, userId: string, reason?: string) => Promise<{ success: boolean; error?: Error }>
  restoreSubRoom: (archiveId: string, userId: string) => Promise<{ success: boolean; newSubRoomId?: string; error?: Error }>
  runAutoArchive: () => Promise<{ success: boolean; archivedCount?: number; error?: Error }>
  refetch: () => Promise<void>
}

export function useArchivedSubRooms(options: UseArchivedSubRoomsOptions = {}): UseArchivedSubRoomsReturn {
  const [archives, setArchives] = useState<ArchivedSubRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchArchives = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      let query = supabase
        .from('archived_sub_rooms')
        .select('*')
        .order('archived_at', { ascending: false })

      if (options.establishmentId) {
        query = query.eq('establishment_id', options.establishmentId)
      }

      if (!options.includeRestored) {
        query = query.eq('is_restored', false)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setArchives(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur lors du chargement des archives'))
    } finally {
      setLoading(false)
    }
  }, [options.establishmentId, options.includeRestored])

  useEffect(() => {
    fetchArchives()
  }, [fetchArchives])

  // Archiver manuellement une sous-salle
  const archiveSubRoom = async (
    subroomId: string, 
    userId: string, 
    reason: string = 'manual'
  ): Promise<{ success: boolean; error?: Error }> => {
    try {
      const supabase = createClient()
      
      const { data, error: rpcError } = await supabase.rpc('archive_sub_room', {
        p_subroom_id: subroomId,
        p_archived_by: userId,
        p_reason: reason
      })

      if (rpcError) {
        throw rpcError
      }

      if (data === false) {
        throw new Error('Sous-salle non trouvée')
      }

      // Rafraîchir la liste
      await fetchArchives()
      
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de l\'archivage')
      return { success: false, error }
    }
  }

  // Restaurer une sous-salle archivée
  const restoreSubRoom = async (
    archiveId: string, 
    userId: string
  ): Promise<{ success: boolean; newSubRoomId?: string; error?: Error }> => {
    try {
      const supabase = createClient()
      
      const { data, error: rpcError } = await supabase.rpc('restore_sub_room', {
        p_archive_id: archiveId,
        p_restored_by: userId
      })

      if (rpcError) {
        throw rpcError
      }

      if (data === null) {
        throw new Error('Archive non trouvée ou déjà restaurée')
      }

      // Rafraîchir la liste
      await fetchArchives()
      
      return { success: true, newSubRoomId: data }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de la restauration')
      return { success: false, error }
    }
  }

  // Exécuter l'archivage automatique des sous-salles expirées
  const runAutoArchive = async (): Promise<{ success: boolean; archivedCount?: number; error?: Error }> => {
    try {
      const supabase = createClient()
      
      const { data, error: rpcError } = await supabase.rpc('archive_expired_sub_rooms')

      if (rpcError) {
        throw rpcError
      }

      // Rafraîchir la liste
      await fetchArchives()
      
      return { success: true, archivedCount: data }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de l\'archivage automatique')
      return { success: false, error }
    }
  }

  return {
    archives,
    loading,
    error,
    archiveSubRoom,
    restoreSubRoom,
    runAutoArchive,
    refetch: fetchArchives
  }
}

// Labels pour les raisons d'archivage
export const ARCHIVE_REASON_LABELS: Record<string, string> = {
  expired: 'Expirée',
  manual: 'Manuelle',
  cleanup: 'Nettoyage'
}

// Labels pour les types de sous-salles
export const SUBROOM_TYPE_LABELS: Record<string, string> = {
  temporary: 'Temporaire',
  indeterminate: 'Indéterminée'
}
