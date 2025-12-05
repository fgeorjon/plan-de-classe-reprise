"use client"

import { useState } from 'react'
import { 
  useAuditLogs, 
  TABLE_LABELS, 
  ACTION_LABELS, 
  FIELD_LABELS,
  type AuditLog 
} from '@/lib/use-audit-logs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  History, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Filter,
  X
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AuditLogViewerProps {
  tableName?: string
  recordId?: string
  establishmentId?: string
  title?: string
  showFilters?: boolean
  maxHeight?: string
}

export function AuditLogViewer({ 
  tableName: initialTableName,
  recordId,
  establishmentId,
  title = "Historique des modifications",
  showFilters = true,
  maxHeight = "500px"
}: AuditLogViewerProps) {
  const [tableFilter, setTableFilter] = useState<string>(initialTableName || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const { logs, loading, error, refetch, hasMore, loadMore } = useAuditLogs({
    tableName: tableFilter === 'all' ? undefined : tableFilter,
    recordId,
    establishmentId,
    limit: 50
  })

  // Filtrer par recherche
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      log.performed_by_name?.toLowerCase().includes(search) ||
      TABLE_LABELS[log.table_name]?.toLowerCase().includes(search) ||
      log.table_name.toLowerCase().includes(search)
    )
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="h-4 w-4" />
      case 'UPDATE':
        return <Pencil className="h-4 w-4" />
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />
      default:
        return null
    }
  }

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return ''
    }
  }

  const formatFieldName = (field: string) => {
    return FIELD_LABELS[field] || field.replace(/_/g, ' ')
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(vide)'
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...'
    return String(value)
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <p className="text-red-600">Erreur : {error.message}</p>
          <Button variant="outline" onClick={refetch} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {showFilters && (
          <CardDescription>
            Consultez l'historique des modifications de votre établissement
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Filtres */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search" className="sr-only">Rechercher</Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Rechercher par nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="w-[180px]">
              <Label htmlFor="table-filter" className="sr-only">Filtrer par type</Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger id="table-filter">
                  <SelectValue placeholder="Type d'élément" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="sub_rooms">Sous-salles</SelectItem>
                  <SelectItem value="students">Élèves</SelectItem>
                  <SelectItem value="teachers">Professeurs</SelectItem>
                  <SelectItem value="classes">Classes</SelectItem>
                  <SelectItem value="rooms">Salles</SelectItem>
                  <SelectItem value="room_assignments">Attributions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Liste des logs */}
        <ScrollArea style={{ maxHeight }}>
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune modification enregistrée
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
              
              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Charger plus
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Composant pour une entrée de log
function LogEntry({ log }: { log: AuditLog }) {
  const [isOpen, setIsOpen] = useState(false)

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="h-3.5 w-3.5" />
      case 'UPDATE':
        return <Pencil className="h-3.5 w-3.5" />
      case 'DELETE':
        return <Trash2 className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      default:
        return ''
    }
  }

  const hasDetails = log.action === 'UPDATE' && log.changed_fields && log.changed_fields.length > 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${getActionBadgeClass(log.action)} flex items-center gap-1`}>
                {getActionIcon(log.action)}
                {ACTION_LABELS[log.action] || log.action}
              </Badge>
              <span className="font-medium">
                {TABLE_LABELS[log.table_name] || log.table_name}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                {log.performed_by_name || 'Système'}
              </span>
              <span>
                {formatDistanceToNow(new Date(log.created_at), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </span>
              {hasDetails && (
                isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {hasDetails && (
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Champs modifiés :
              </p>
              <div className="space-y-1">
                {log.changed_fields?.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-sm">
                    <span className="font-medium min-w-[120px]">
                      {FIELD_LABELS[field] || field}
                    </span>
                    <span className="text-red-600 line-through">
                      {formatValue(log.old_data?.[field])}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-600">
                      {formatValue(log.new_data?.[field])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
}

// Fonction utilitaire pour formater les valeurs
function formatValue(value: any): string {
  if (value === null || value === undefined) return '(vide)'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'object') {
    const str = JSON.stringify(value)
    return str.length > 30 ? str.substring(0, 30) + '...' : str
  }
  const str = String(value)
  return str.length > 50 ? str.substring(0, 50) + '...' : str
}

// Export du composant compact pour les détails d'un enregistrement
export function RecordHistoryViewer({ 
  tableName, 
  recordId 
}: { 
  tableName: string
  recordId: string 
}) {
  return (
    <AuditLogViewer
      tableName={tableName}
      recordId={recordId}
      title="Historique de cet élément"
      showFilters={false}
      maxHeight="300px"
    />
  )
}
