"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Check, X, Clock, CheckCircle2, XCircle } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "@/components/ui/use-toast"
import { notifyProposalStatusChange } from "@/lib/notifications"

interface ReviewProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: any
  userRole: string
  userId: string
  onSuccess: () => void
}

export function ReviewProposalDialog({
  open,
  onOpenChange,
  proposal,
  userRole,
  userId,
  onSuccess,
}: ReviewProposalDialogProps) {
  const [rejectionReason, setRejectionReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const isTeacher = userRole === "professeur"
  const isPending = proposal?.status === "pending"

  async function handleApprove() {
    if (!proposal) return

    setIsLoading(true)
    setAction("approve")

    try {
      console.log("[v0] Approving proposal:", proposal)

      if (proposal.sub_room_id) {
        // Update existing sub-room
        console.log("[v0] Updating existing sub-room:", proposal.sub_room_id)

        // Delete old assignments
        const { error: deleteError } = await supabase
          .from("seating_assignments")
          .delete()
          .eq("sub_room_id", proposal.sub_room_id)

        if (deleteError) {
          console.error("[v0] Error deleting old assignments:", deleteError)
          throw deleteError
        }

        // Insert new assignments if they exist
        if (proposal.seat_assignments && proposal.seat_assignments.length > 0) {
          const assignments = proposal.seat_assignments.map((assignment: any) => ({
            sub_room_id: proposal.sub_room_id,
            seat_id: assignment.seat_id,
            student_id: assignment.student_id,
            seat_position: assignment.seat_number, // Use seat_position instead of seat_number
          }))

          const { error: assignmentsError } = await supabase.from("seating_assignments").insert(assignments)

          if (assignmentsError) {
            console.error("[v0] Error saving assignments:", assignmentsError)
            throw assignmentsError
          }

          console.log("[v0] Updated", assignments.length, "seat assignments")
        }
      } else {
        // Create new sub-room
        console.log("[v0] Creating new sub-room for proposal:", proposal.name)

        const { data: subRoomData, error: subRoomError } = await supabase
          .from("sub_rooms")
          .insert({
            room_id: proposal.room_id,
            teacher_id: proposal.teacher_id,
            name: proposal.name,
            class_ids: [proposal.class_id],
            created_by: userId,
          })
          .select()
          .single()

        if (subRoomError) {
          console.error("[v0] Error creating sub-room:", subRoomError)
          throw subRoomError
        }

        console.log("[v0] Created sub-room:", subRoomData.id)

        // Copy seating assignments if they exist
        if (proposal.seat_assignments && proposal.seat_assignments.length > 0) {
          const assignments = proposal.seat_assignments.map((assignment: any) => ({
            sub_room_id: subRoomData.id,
            seat_id: assignment.seat_id,
            student_id: assignment.student_id,
            seat_position: assignment.seat_number, // Use seat_position instead of seat_number
          }))

          const { error: assignmentsError } = await supabase.from("seating_assignments").insert(assignments)

          if (assignmentsError) {
            console.error("[v0] Error saving assignments:", assignmentsError)
          } else {
            console.log("[v0] Saved", assignments.length, "seat assignments")
          }
        }

        // Update proposal with sub_room_id
        const { error: updateProposalError } = await supabase
          .from("sub_room_proposals")
          .update({
            sub_room_id: subRoomData.id,
            status: "approved",
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", proposal.id)

        if (updateProposalError) {
          console.error("[v0] Error updating proposal:", updateProposalError)
          throw updateProposalError
        }

        console.log("[v0] Updated proposal status to approved")
      }

      // Update proposal status if not already done
      if (proposal.sub_room_id) {
        const { error: updateError } = await supabase
          .from("sub_room_proposals")
          .update({
            status: "approved",
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", proposal.id)

        if (updateError) throw updateError
      }

      await notifyProposalStatusChange(proposal.id, proposal.proposed_by, "approved", proposal.name)

      toast({
        title: "Succès",
        description: proposal.sub_room_id
          ? "Sous-salle mise à jour avec succès"
          : "Proposition validée et sous-salle créée",
        className: "z-[9999]", // Added z-index for toast visibility
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("[v0] Error approving proposal:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de valider la proposition",
        variant: "destructive",
        className: "z-[9999]", // Added z-index for toast visibility
      })
    } finally {
      setIsLoading(false)
      setAction(null)
    }
  }

  async function handleReject() {
    if (!proposal || !rejectionReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer une raison pour le refus",
        variant: "destructive",
        className: "z-[9999]", // Added z-index for toast visibility
      })
      return
    }

    setIsLoading(true)
    setAction("reject")

    try {
      const { error } = await supabase
        .from("sub_room_proposals")
        .update({
          status: "rejected",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", proposal.id)

      if (error) throw error

      await notifyProposalStatusChange(proposal.id, proposal.proposed_by, "rejected", proposal.name, rejectionReason)

      toast({
        title: "Proposition refusée",
        description: "Le délégué a été notifié du refus",
        className: "z-[9999]", // Added z-index for toast visibility
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("[v0] Error rejecting proposal:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de refuser la proposition",
        variant: "destructive",
        className: "z-[9999]", // Added z-index for toast visibility
      })
    } finally {
      setIsLoading(false)
      setAction(null)
    }
  }

  if (!proposal) return null

  const getStatusBadge = () => {
    switch (proposal.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Validée
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Refusée
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[9999]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{proposal.name}</DialogTitle>
            {getStatusBadge()}
          </div>
          <DialogDescription>Proposition de plan de classe pour {proposal.classes?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Salle</p>
              <p className="font-medium">
                {proposal.rooms?.name} ({proposal.rooms?.code})
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Classe</p>
              <p className="font-medium">{proposal.classes?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Proposé par</p>
              <p className="font-medium">
                {proposal.proposed_by_profile?.first_name} {proposal.proposed_by_profile?.last_name}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pour</p>
              <p className="font-medium">
                {proposal.teachers?.first_name} {proposal.teachers?.last_name}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Date de création</p>
              <p className="font-medium">
                {new Date(proposal.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            {proposal.reviewed_at && (
              <div>
                <p className="text-muted-foreground">Date de révision</p>
                <p className="font-medium">
                  {new Date(proposal.reviewed_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          {proposal.comments && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
              <p className="font-semibold text-sm mb-1">Commentaires</p>
              <p className="text-sm">{proposal.comments}</p>
            </div>
          )}

          {proposal.status === "rejected" && proposal.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="font-semibold text-red-900 mb-1">Raison du refus</p>
              <p className="text-sm text-red-700">{proposal.rejection_reason}</p>
            </div>
          )}

          {proposal.status === "approved" && proposal.reviewed_by_profile && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-sm text-green-700">
                Cette proposition a été validée par {proposal.reviewed_by_profile.first_name}{" "}
                {proposal.reviewed_by_profile.last_name}
                {proposal.sub_room_id && " et une sous-salle a été créée."}
              </p>
            </div>
          )}

          {isPending && isTeacher && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Raison du refus (si refusée)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Ex: Le plan ne convient pas pour ce type de cours..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isLoading || !rejectionReason.trim()}
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                >
                  <X className="w-4 h-4 mr-2" />
                  {isLoading && action === "reject" ? "Refus..." : "Refuser"}
                </Button>
                <Button onClick={handleApprove} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  {isLoading && action === "approve" ? "Validation..." : "Valider"}
                </Button>
              </div>
            </div>
          )}

          {!isPending && (
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
