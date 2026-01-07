"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import { createCustomTemplate, type RoomTemplate } from "@/components/room-templates"
import { toast } from "@/components/ui/use-toast"

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  userId?: string
  establishmentId?: string
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSuccess,
  userId,
  establishmentId,
}: CreateTemplateDialogProps) {
  console.log("[v0] CreateTemplateDialog rendering with props:", { open, userId, establishmentId })

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [boardPosition, setBoardPosition] = useState<"top" | "bottom" | "left" | "right">("top")
  const [columns, setColumns] = useState<{ id: string; tables: number; seatsPerTable: number }[]>([
    { id: "col1", tables: 5, seatsPerTable: 2 },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const addColumn = () => {
    if (columns.length < 5) {
      setColumns([...columns, { id: `col${columns.length + 1}`, tables: 5, seatsPerTable: 2 }])
    }
  }

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index))
    }
  }

  const updateColumn = (index: number, field: "tables" | "seatsPerTable", value: number) => {
    const newColumns = [...columns]
    newColumns[index][field] = value
    setColumns(newColumns)
  }

  const calculateTotalSeats = () => {
    return columns.reduce((total, col) => total + col.tables * col.seatsPerTable, 0)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du template est requis",
        variant: "destructive",
      })
      return
    }

    if (!userId || !establishmentId) {
      toast({
        title: "Erreur",
        description: "Utilisateur non authentifié",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const template: Omit<RoomTemplate, "id"> = {
        name: name.trim(),
        description: description.trim(),
        totalSeats: calculateTotalSeats(),
        columns,
        boardPosition,
      }

      await createCustomTemplate(template, userId, establishmentId)

      toast({
        title: "Succès",
        description: "Template créé avec succès",
      })

      // Reset form
      setName("")
      setDescription("")
      setBoardPosition("top")
      setColumns([{ id: "col1", tables: 5, seatsPerTable: 2 }])

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error creating template:", error)
      toast({
        title: "Erreur",
        description: "Impossible de créer le template",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  console.log("[v0] CreateTemplateDialog about to return JSX")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Créer un template personnalisé</DialogTitle>
          <DialogDescription>
            Configurez votre propre modèle de salle avec le nombre de colonnes, tables et places souhaité
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du template *</Label>
            <Input
              id="name"
              placeholder="Ex: Ma classe idéale"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description du template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board">Position du tableau</Label>
            <Select value={boardPosition} onValueChange={(value: any) => setBoardPosition(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Haut</SelectItem>
                <SelectItem value="bottom">Bas</SelectItem>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Configuration des colonnes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addColumn} disabled={columns.length >= 5}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter une colonne
              </Button>
            </div>

            <div className="space-y-3">
              {columns.map((column, index) => (
                <div key={column.id} className="flex items-end gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Colonne {index + 1}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`tables-${index}`} className="text-xs">
                          Nombre de tables
                        </Label>
                        <Input
                          id={`tables-${index}`}
                          type="number"
                          min="1"
                          max="10"
                          value={column.tables}
                          onChange={(e) => updateColumn(index, "tables", Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`seats-${index}`} className="text-xs">
                          Places par table
                        </Label>
                        <Input
                          id={`seats-${index}`}
                          type="number"
                          min="1"
                          max="6"
                          value={column.seatsPerTable}
                          onChange={(e) => updateColumn(index, "seatsPerTable", Number.parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Total: {calculateTotalSeats()} places
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Création..." : "Créer le template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
