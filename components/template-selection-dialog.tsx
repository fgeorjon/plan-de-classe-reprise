"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ROOM_TEMPLATES,
  loadCustomTemplates,
  toggleTemplatePin,
  deleteCustomTemplate,
  type RoomTemplate,
} from "@/components/room-templates"
import { Users, Columns3, LayoutGrid, Star, Trash2, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface TemplateSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: RoomTemplate) => void
  userId: string
  establishmentId: string
}

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  userId,
  establishmentId,
}: TemplateSelectionDialogProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<RoomTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, establishmentId])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const templates = await loadCustomTemplates(establishmentId)
      setCustomTemplates(templates)
    } catch (error) {
      console.error("[v0] Error loading custom templates:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePin = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleTemplatePin(templateId, establishmentId)
      await loadTemplates()
      toast({
        title: "Succès",
        description: "Template épinglé/désépinglé",
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le template",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) return

    try {
      await deleteCustomTemplate(templateId)
      await loadTemplates()
      toast({
        title: "Succès",
        description: "Template supprimé",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le template",
        variant: "destructive",
      })
    }
  }

  const pinnedTemplates = customTemplates.filter((t) => t.isPinned)
  const unpinnedCustomTemplates = customTemplates.filter((t) => !t.isPinned)
  const allTemplates = [...pinnedTemplates, ...unpinnedCustomTemplates, ...ROOM_TEMPLATES]

  const renderTemplate = (template: RoomTemplate) => (
    <Card
      key={template.id}
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-2 hover:border-emerald-400"
      onMouseEnter={() => setHoveredTemplate(template.id)}
      onMouseLeave={() => setHoveredTemplate(null)}
    >
      <CardContent className="p-4">
        <div className="absolute top-2 right-2 flex gap-1">
          {template.isPinned && (
            <div className="bg-amber-500 p-1 rounded-full">
              <Star className="h-3 w-3 text-white fill-white" />
            </div>
          )}
          {template.isCustom && (
            <div className="bg-purple-500 p-1 rounded-full">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <div className="mb-3">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{template.name}</h3>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">{template.totalSeats} places</span>
          </div>
          <div className="flex items-center gap-1">
            <Columns3 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">{template.columns.length} colonnes</span>
          </div>
        </div>

        {/* Mini visualization */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-3 mb-3 h-32 flex items-center justify-center">
          <div className="flex gap-2 scale-75">
            {template.columns.map((column, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-1">
                {Array.from({ length: Math.min(column.tables, 4) }).map((_, tableIndex) => (
                  <div key={tableIndex} className="flex gap-0.5">
                    {Array.from({ length: column.seatsPerTable }).map((_, seatIndex) => (
                      <div key={seatIndex} className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    ))}
                  </div>
                ))}
                {column.tables > 4 && (
                  <div className="text-[8px] text-center text-muted-foreground">+{column.tables - 4}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {template.isCustom && (
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={(e) => handleTogglePin(template.id, e)}
            >
              <Star className={`h-4 w-4 mr-1 ${template.isPinned ? "fill-amber-500 text-amber-500" : ""}`} />
              {template.isPinned ? "Désépingler" : "Épingler"}
            </Button>
            <Button size="sm" variant="outline" onClick={(e) => handleDeleteTemplate(template.id, e)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}

        {/* Hover overlay with CTA */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-emerald-600/95 to-emerald-500/95 flex items-center justify-center transition-opacity duration-300 ${
            hoveredTemplate === template.id ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-emerald-700 hover:bg-white/90 font-semibold shadow-lg"
            onClick={() => {
              onSelectTemplate(template)
              onOpenChange(false)
            }}
          >
            <LayoutGrid className="mr-2 h-5 w-5" />
            Utiliser ce template
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choisir un modèle de salle</DialogTitle>
          <DialogDescription>
            Sélectionnez un modèle pré-configuré ou personnalisé et adaptez-le selon vos besoins
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Chargement des templates...</div>
        ) : (
          <div className="space-y-6 mt-4">
            {pinnedTemplates.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  Templates épinglés
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedTemplates.map(renderTemplate)}
                </div>
              </div>
            )}

            {/* Custom templates section */}
            {unpinnedCustomTemplates.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Mes templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedCustomTemplates.map(renderTemplate)}
                </div>
              </div>
            )}

            {/* Generic templates section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Templates génériques</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROOM_TEMPLATES.map(renderTemplate)}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
