"use client"

import { useState } from 'react'
import { 
  useArchivedSubRooms, 
  ARCHIVE_REASON_LABELS, 
  SUBROOM_TYPE_LABELS,
  type ArchivedSubRoom 
} from '@/lib/use-archived-subrooms'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { 
  Archive, 
  RotateCcw, 
  RefreshCw, 
  MoreHorizontal,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ArchivedSubRoomsManagerProps {
  userId: string
  userRole: string
  establishmentId?: string
}

export function ArchivedSubRoomsManager({ 
  userId, 
  userRole,
  establishmentId
}: ArchivedSubRoomsManagerProps) {
  const [showRestored, setShowRestored] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [runningAutoArchive, setRunningAutoArchive] = useState(false)
  
  const { 
    archives, 
    loading, 
    error,
    restoreSubRoom, 
    runAutoArchive,
    refetch 
  } = useArchivedSubRooms({
    establishmentId,
    includeRestored: showRestored
  })

  const canRestore = userRole === 'vie-scolaire'
  const canRunAutoArchive = userRole === 'vie-scolaire'

  const handleRestore = async (archive: ArchivedSubRoom) => {
    setRestoringId(archive.id)
    
    const { success, newSubRoomId, error } = await restoreSubRoom(archive.id, userId)
    
    setRestoringId(null)

    if (success) {
      toast({
        title: "Sous-salle restaurée",
        description: `"${archive.name}" a été restaurée avec succès.`,
      })
    } else {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de restaurer la sous-salle.",
        variant: "destructive",
      })
    }
  }

  const handleRunAutoArchive = async () => {
    setRunningAutoArchive(true)
    
    const { success, archivedCount, error } = await runAutoArchive()
    
    setRunningAutoArchive(false)

    if (success) {
      toast({
        title: "Archivage automatique terminé",
        description: archivedCount === 0 
          ? "Aucune sous-salle expirée à archiver."
          : `${archivedCount} sous-salle(s) archivée(s).`,
      })
    } else {
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de l'archivage automatique.",
        variant: "destructive",
      })
    }
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'expired':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
          <Clock className="h-3 w-3 mr-1" />
          Expirée
        </Badge>
      case 'manual':
        return <Badge variant="outline">
          <User className="h-3 w-3 mr-1" />
          Manuelle
        </Badge>
      case 'cleanup':
        return <Badge variant="destructive">
          Nettoyage
        </Badge>
      default:
        return <Badge>{reason}</Badge>
    }
  }

  const getStatusBadge = (archive: ArchivedSubRoom) => {
    if (archive.is_restored) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Restaurée
      </Badge>
    }
    return <Badge variant="secondary">
      <Archive className="h-3 w-3 mr-1" />
      Archivée
    </Badge>
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
            <Archive className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Sous-salles archivées</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {canRunAutoArchive && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRunAutoArchive}
                disabled={runningAutoArchive}
              >
                {runningAutoArchive ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Archiver expirées
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Gérez les sous-salles archivées de votre établissement
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Options */}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="show-restored" 
            checked={showRestored}
            onCheckedChange={(checked) => setShowRestored(checked === true)}
          />
          <Label htmlFor="show-restored" className="text-sm cursor-pointer">
            Afficher les sous-salles restaurées
          </Label>
        </div>

        {/* Liste */}
        {loading && archives.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Chargement...</span>
          </div>
        ) : archives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune sous-salle archivée</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Archivée le</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>État</TableHead>
                  {canRestore && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((archive) => (
                  <TableRow key={archive.id}>
                    <TableCell className="font-medium">
                      {archive.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SUBROOM_TYPE_LABELS[archive.type] || archive.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getReasonBadge(archive.archive_reason)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>
                          {format(new Date(archive.archived_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(archive.archived_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {archive.archived_by_name || 'Automatique'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(archive)}
                    </TableCell>
                    {canRestore && (
                      <TableCell>
                        {!archive.is_restored && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={restoringId === archive.id}
                              >
                                {restoringId === archive.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Restaurer cette sous-salle ?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>
                                    La sous-salle <strong>"{archive.name}"</strong> sera recréée 
                                    avec ses paramètres d'origine.
                                  </p>
                                  {archive.type === 'temporary' && (
                                    <p className="text-amber-600 dark:text-amber-400">
                                      ⚠️ Les dates seront mises à jour pour les 30 prochains jours.
                                    </p>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestore(archive)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restaurer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Statistiques */}
        {archives.length > 0 && (
          <div className="mt-4 pt-4 border-t flex gap-4 text-sm text-muted-foreground">
            <span>
              Total : {archives.length} archive(s)
            </span>
            <span>
              Expirées : {archives.filter(a => a.archive_reason === 'expired').length}
            </span>
            <span>
              Manuelles : {archives.filter(a => a.archive_reason === 'manual').length}
            </span>
            {showRestored && (
              <span>
                Restaurées : {archives.filter(a => a.is_restored).length}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Composant simplifié pour afficher un bouton d'archivage
interface ArchiveButtonProps {
  subroomId: string
  subroomName: string
  userId: string
  onArchived?: () => void
}

export function ArchiveSubRoomButton({ 
  subroomId, 
  subroomName,
  userId,
  onArchived 
}: ArchiveButtonProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const { archiveSubRoom } = useArchivedSubRooms()

  const handleArchive = async () => {
    setIsArchiving(true)
    
    const { success, error } = await archiveSubRoom(subroomId, userId, 'manual')
    
    setIsArchiving(false)

    if (success) {
      toast({
        title: "Sous-salle archivée",
        description: `"${subroomName}" a été archivée.`,
      })
      onArchived?.()
    } else {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'archiver la sous-salle.",
        variant: "destructive",
      })
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isArchiving}>
          {isArchiving ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Archive className="h-4 w-4 mr-2" />
          )}
          Archiver
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver cette sous-salle ?</AlertDialogTitle>
          <AlertDialogDescription>
            La sous-salle <strong>"{subroomName}"</strong> sera déplacée dans les archives.
            Vous pourrez la restaurer ultérieurement si nécessaire.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive}>
            <Archive className="h-4 w-4 mr-2" />
            Archiver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
