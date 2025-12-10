"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Clock, CheckCircle2, XCircle, Eye } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "@/components/ui/use-toast"
import { CreateProposalDialog } from "@/components/create-proposal-dialog"
import { ReviewProposalDialog } from "@/components/review-proposal-dialog"

interface SandboxManagementProps {
  establishmentId: string
  userRole: string
  userId: string
  onBack: () => void
}

interface Proposal {
  id: string
  name: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  rooms: { name: string; code: string }
  classes: { name: string }
  teachers: { first_name: string; last_name: string }
  proposed_by_profile: { first_name: string; last_name: string }
  reviewed_by_profile?: { first_name: string; last_name: string }
  reviewed_at?: string
  rejection_reason?: string
}

export function SandboxManagement({ establishmentId, userRole, userId, onBack }: SandboxManagementProps) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchProposals()
  }, [establishmentId, userRole, userId])

  async function fetchProposals() {
    setIsLoading(true)
    try {
      console.log("[v0] Fetching proposals for user:", userId, "role:", userRole)

      let query = supabase
        .from("sub_room_proposals")
        .select(`
          id,
          name,
          status,
          created_at,
          reviewed_at,
          rejection_reason,
          rooms:room_id (name, code),
          classes:class_id (name),
          teachers:teacher_id (first_name, last_name),
          proposed_by_profile:proposed_by (first_name, last_name),
          reviewed_by_profile:reviewed_by (first_name, last_name)
        `)
        .order("created_at", { ascending: false })

      // Filter based on role
      if (userRole === "delegue" || userRole === "eco-delegue") {
        // Delegates see only their proposals
        query = query.eq("proposed_by", userId)
      } else if (userRole === "professeur") {
        // Teachers see proposals assigned to them
        const { data: teacherData } = await supabase.from("teachers").select("id").eq("profile_id", userId).single()

        if (teacherData) {
          query = query.eq("teacher_id", teacherData.id)
        }
      }
      // vie-scolaire sees all proposals in establishment

      const { data, error } = await query

      if (error) throw error

      console.log("[v0] Proposals loaded:", data?.length || 0)
      setProposals((data as Proposal[]) || [])
    } catch (error) {
      console.error("[v0] Error loading proposals:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les propositions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      default:
        return null
    }
  }

  const handleReviewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal)
    setIsReviewDialogOpen(true)
  }

  const isDelegateOrEco = userRole === "delegue" || userRole === "eco-delegue"
  const isTeacher = userRole === "professeur"

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bac à sable</h1>
            <p className="text-muted-foreground">
              {isDelegateOrEco && "Créez et proposez des plans de classe à vos professeurs"}
              {isTeacher && "Validez ou modifiez les propositions de plans de classe"}
              {userRole === "vie-scolaire" && "Consultez toutes les propositions de l'établissement"}
            </p>
          </div>
        </div>

        {isDelegateOrEco && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle proposition
          </Button>
        )}
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des propositions...</p>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {isDelegateOrEco && "Aucune proposition créée. Commencez par en créer une !"}
              {isTeacher && "Aucune proposition en attente de validation"}
              {userRole === "vie-scolaire" && "Aucune proposition dans l'établissement"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{proposal.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {proposal.rooms?.name} - {proposal.classes?.name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    Proposé par:{" "}
                    <span className="font-medium text-foreground">
                      {proposal.proposed_by_profile?.first_name} {proposal.proposed_by_profile?.last_name}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Pour:{" "}
                    <span className="font-medium text-foreground">
                      {proposal.teachers?.first_name} {proposal.teachers?.last_name}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(proposal.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {proposal.status === "rejected" && proposal.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-xs text-red-700">
                      <span className="font-semibold">Raison du refus:</span> {proposal.rejection_reason}
                    </p>
                  </div>
                )}

                {proposal.status === "approved" && proposal.reviewed_by_profile && (
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-xs text-green-700">
                      Validée par {proposal.reviewed_by_profile.first_name} {proposal.reviewed_by_profile.last_name}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {proposal.status === "pending" && isTeacher && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewProposal(proposal)}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Examiner
                      </Button>
                    </>
                  )}
                  {proposal.status === "pending" && isDelegateOrEco && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewProposal(proposal)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                  )}
                  {(proposal.status === "approved" || proposal.status === "rejected") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewProposal(proposal)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Détails
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateProposalDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        establishmentId={establishmentId}
        userId={userId}
        onSuccess={() => {
          setIsCreateDialogOpen(false)
          fetchProposals()
        }}
      />

      <ReviewProposalDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        proposal={selectedProposal}
        userRole={userRole}
        userId={userId}
        onSuccess={() => {
          setIsReviewDialogOpen(false)
          fetchProposals()
        }}
      />
    </div>
  )
}
