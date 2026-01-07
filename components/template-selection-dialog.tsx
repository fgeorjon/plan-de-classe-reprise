"use client"

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
  onTemplateSelected?: () => void // Added onTemplateSelected prop
  userId?: string
  establishmentId?: string
}

export function TemplateSelectionDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  onTemplateSelected,
  userId,
  establishmentId,
}: TemplateSelectionDialogProps) {
  console.log("[v0] TemplateSelectionDialog rendering with props:", { open, userId, establishmentId })

  const [customTemplates, setCustomTemplates] = useState<RoomTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  useEffect(() => {
    if (open && userId && establishmentId) {
      loadCustomTemplates(userId, establishmentId).then((templates) => {
        setCustomTemplates(templates)
        setIsLoading(false)
      })
    } else if (open) {
      setIsLoading(false)
    }
  }, [open, userId, establishmentId])

  const TemplateCard = ({ template }: { template: RoomTemplate }) => (
    <Card
      key={template.id}
      className="relative group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      onMouseEnter={() => setHoveredTemplate(template.id)}
      onMouseLeave={() => setHoveredTemplate(null)}
    >
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-3 relative z-20">
          <div>
            <h4 className="font-semibold text-base flex items-center gap-2">
              {template.name}
              {template.isPinned && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
            </h4>
            {template.description && <p className="text-sm text-muted-foreground mt-1">{template.description}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm relative z-20">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">
            <Columns3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">
              {template.columns.length} col{template.columns.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-900/20 p-2 rounded">
            <LayoutGrid className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span className="font-medium">{template.columns.reduce((sum, col) => sum + col.tables, 0)} tables</span>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 p-2 rounded">
            <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="font-medium">
              {template.columns.reduce((sum, col) => sum + col.tables * col.seatsPerTable, 0)} places
            </span>
          </div>
        </div>

        {template.isCustom && userId && establishmentId && (
          <div className="absolute top-3 right-3 flex gap-2 z-20">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 bg-white dark:bg-slate-800"
              onClick={async (e) => {
                e.stopPropagation()
                await toggleTemplatePin(template.id, userId, establishmentId)
                const updated = await loadCustomTemplates(userId, establishmentId)
                setCustomTemplates(updated)
              }}
            >
              <Star className={`h-4 w-4 ${template.isPinned ? "text-amber-500 fill-amber-500" : "text-gray-400"}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 bg-white dark:bg-slate-800"
              onClick={async (e) => {
                e.stopPropagation()
                if (confirm("Supprimer ce template personnalisé ?")) {
                  await deleteCustomTemplate(template.id, userId, establishmentId)
                  const updated = await loadCustomTemplates(userId, establishmentId)
                  setCustomTemplates(updated)
                  toast({
                    title: "Template supprimé",
                    description: `Le template "${template.name}" a été supprimé.`,
                  })
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}

        <div
          className={`absolute inset-0 bg-gradient-to-t from-emerald-600/95 to-emerald-500/95 flex items-center justify-center transition-opacity duration-300 z-10 ${
            hoveredTemplate === template.id ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => {
            onSelectTemplate(template)
            if (onTemplateSelected) {
              onTemplateSelected()
            }
            onOpenChange(false)
          }}
        >
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-emerald-700 hover:bg-white/90 font-semibold shadow-lg"
          >
            <LayoutGrid className="mr-2 h-5 w-5" />
            Utiliser ce template
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const pinnedTemplates = [...ROOM_TEMPLATES, ...customTemplates].filter((t) => t.isPinned)
  const predefinedTemplates = ROOM_TEMPLATES.filter((t) => !t.isPinned)
  const unpinnedCustomTemplates = customTemplates.filter((t) => !t.isPinned)

  console.log("[v0] TemplateSelectionDialog about to return JSX")

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
                  {pinnedTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Templates prédéfinis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>

            {unpinnedCustomTemplates.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Templates personnalisés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedCustomTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
