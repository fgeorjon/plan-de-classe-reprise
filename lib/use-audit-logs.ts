"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Types pour les logs d'audit
export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changed_fields: string[] | null
  performed_by: string | null
  performed_by_role: string | null
  performed_by_name: string | null
  establishment_id: string | null
  created_at: string
}

interface UseAuditLogsOptions {
  tableName?: string
  recordId?: string
  limit?: number
  establishmentId?: string
}

interface UseAuditLogsReturn {
  logs: AuditLog[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
}

export function useAuditLogs(options: UseAuditLogsOptions = {}): UseAuditLogsReturn {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  
  const limit = options.limit || 50

  const fetchLogs = useCallback(async (reset: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      const currentOffset = reset ? 0 : offset
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1)

      if (options.tableName) {
        query = query.eq('table_name', options.tableName)
      }
      if (options.recordId) {
        query = query.eq('record_id', options.recordId)
      }
      if (options.establishmentId) {
        query = query.eq('establishment_id', options.establishmentId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      if (reset) {
        setLogs(data || [])
        setOffset(limit)
      } else {
        setLogs(prev => [...prev, ...(data || [])])
        setOffset(prev => prev + limit)
      }
      
      setHasMore((data?.length || 0) === limit)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur lors du chargement'))
    } finally {
      setLoading(false)
    }
  }, [options.tableName, options.recordId, options.establishmentId, limit, offset])

  const refetch = useCallback(async () => {
    setOffset(0)
    await fetchLogs(true)
  }, [fetchLogs])

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchLogs(false)
    }
  }, [loading, hasMore, fetchLogs])

  useEffect(() => {
    fetchLogs(true)
  }, [options.tableName, options.recordId, options.establishmentId])

  return { logs, loading, error, refetch, hasMore, loadMore }
}

// Hook pour obtenir l'historique d'un enregistrement spécifique
export function useRecordHistory(tableName: string, recordId: string) {
  return useAuditLogs({ tableName, recordId, limit: 100 })
}

// Labels pour les noms de tables
export const TABLE_LABELS: Record<string, string> = {
  sub_rooms: 'Sous-salle',
  room_assignments: 'Attribution salle',
  students: 'Élève',
  teachers: 'Professeur',
  classes: 'Classe',
  rooms: 'Salle',
  room_shares: 'Partage salle',
  seating_assignments: 'Place assise',
  teacher_classes: 'Classe enseignée',
  profiles: 'Profil',
  establishments: 'Établissement'
}

// Labels pour les actions
export const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression'
}

// Labels pour les champs courants
export const FIELD_LABELS: Record<string, string> = {
  first_name: 'Prénom',
  last_name: 'Nom',
  name: 'Nom',
  email: 'Email',
  phone: 'Téléphone',
  class_name: 'Classe',
  class_id: 'Classe',
  subject: 'Matière',
  role: 'Rôle',
  type: 'Type',
  start_date: 'Date début',
  end_date: 'Date fin',
  seat_assignments: 'Places',
  is_modifiable_by_delegates: 'Modifiable par délégués',
  allow_delegate_subrooms: 'Autoriser sous-salles délégués',
  created_at: 'Créé le',
  updated_at: 'Modifié le'
}
