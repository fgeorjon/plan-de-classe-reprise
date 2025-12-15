"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  sub_room_id?: string
  proposal_id?: string
  room_invitation_id?: string
  triggered_by?: string
  is_read: boolean
  created_at: string
  metadata?: any
}

interface NotificationsDropdownProps {
  userId: string
  establishmentId: string
}

export function NotificationsDropdown({ userId, establishmentId }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null)
  const router = useRouter()

  const fetchNotifications = async () => {
    console.log("[v0] Fetching notifications for user:", userId, "establishment:", establishmentId)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("[v0] Error fetching notifications:", error)
      return
    }

    console.log("[v0] Fetched notifications:", data?.length || 0)
    setNotifications(data || [])
    setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
  }

  useEffect(() => {
    fetchNotifications()

    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)

    const supabase = createClient()

    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] New notification received:", payload.new)
          fetchNotifications()

          // Show toast for new notification
          toast({
            title: (payload.new as any).title,
            description: (payload.new as any).message,
            className: "z-[9999]",
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("[v0] Notification updated")
          fetchNotifications()
        },
      )
      .subscribe()

    console.log("[v0] Subscribed to notifications channel")

    return () => {
      console.log("[v0] Unsubscribing from notifications channel")
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [userId, establishmentId])

  const handleMarkAsRead = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

    if (error) {
      console.error("[v0] Error marking notification as read:", error)
      return
    }

    // Refresh notifications
    fetchNotifications()
  }

  const handleAcceptInvitation = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!notification.sub_room_id) return

    setProcessingInvitation(notification.id)
    const supabase = createClient()

    try {
      // Get current user's teacher_id
      const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", userId).single()

      if (!teacher) {
        throw new Error("Profil enseignant non trouvé")
      }

      // Check if already accepted
      const { data: existing } = await supabase
        .from("sub_room_teachers")
        .select("id")
        .eq("sub_room_id", notification.sub_room_id)
        .eq("teacher_id", teacher.id)
        .single()

      if (existing) {
        toast({
          title: "Déjà acceptée",
          description: "Vous avez déjà accepté cette invitation",
        })
        await handleMarkAsRead(notification.id)
        return
      }

      // Add teacher to sub_room_teachers
      const { error: insertError } = await supabase.from("sub_room_teachers").insert({
        sub_room_id: notification.sub_room_id,
        teacher_id: teacher.id,
      })

      if (insertError) throw insertError

      // Notify the inviter
      if (notification.triggered_by) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: notification.triggered_by,
            establishment_id: establishmentId,
            type: "invitation_accepted",
            title: "Invitation acceptée",
            message: "Un professeur a accepté votre invitation à la salle collaborative",
            sub_room_id: notification.sub_room_id,
          }),
        })
      }

      toast({
        title: "Invitation acceptée",
        description: "Vous avez rejoint la salle collaborative",
      })

      await handleMarkAsRead(notification.id)
      fetchNotifications()
    } catch (error: any) {
      console.error("[v0] Error accepting invitation:", error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accepter l'invitation",
        variant: "destructive",
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleRejectInvitation = async (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation()

    setProcessingInvitation(notification.id)

    try {
      // Notify the inviter
      if (notification.triggered_by) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: notification.triggered_by,
            establishment_id: establishmentId,
            type: "invitation_rejected",
            title: "Invitation refusée",
            message: "Un professeur a refusé votre invitation à la salle collaborative",
            sub_room_id: notification.sub_room_id,
          }),
        })
      }

      toast({
        title: "Invitation refusée",
        description: "Vous avez refusé l'invitation",
      })

      await handleMarkAsRead(notification.id)
      fetchNotifications()
    } catch (error: any) {
      console.error("[v0] Error rejecting invitation:", error)
      toast({
        title: "Erreur",
        description: "Impossible de refuser l'invitation",
        variant: "destructive",
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Don't navigate for invitations - they have action buttons
    if (notification.type === "room_invitation") {
      return
    }

    // Mark as read
    await handleMarkAsRead(notification.id)

    // Navigate to relevant page
    if (notification.proposal_id) {
      router.push("/dashboard/sandbox")
    } else if (notification.sub_room_id) {
      router.push("/dashboard/seating-plan")
    }

    setIsOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("establishment_id", establishmentId)
      .eq("is_read", false)

    if (error) {
      console.error("[v0] Error marking all as read:", error)
      toast({
        title: "Erreur",
        description: "Impossible de marquer les notifications comme lues",
        variant: "destructive",
      })
      return
    }

    fetchNotifications()
    toast({
      title: "Notifications marquées comme lues",
      description: "Toutes les notifications ont été marquées comme lues",
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "plan_modified":
        return "📝"
      case "plan_validated":
        return "✅"
      case "plan_rejected":
        return "❌"
      case "plan_returned":
        return "🔄"
      case "plan_created":
        return "🆕"
      case "plan_deleted":
        return "🗑️"
      case "proposal_submitted":
        return "📨"
      case "room_invitation":
        return "📬"
      case "invitation_accepted":
        return "✅"
      case "invitation_rejected":
        return "❌"
      case "sub_room_created":
        return "🏫"
      default:
        return "📬"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString("fr-FR")
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative bg-transparent">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto z-[9999]">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-8 text-xs">
              Tout marquer comme lu
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b last:border-b-0 ${!notification.is_read ? "bg-blue-50 dark:bg-blue-950" : ""}`}
            >
              <div
                onClick={() => handleNotificationClick(notification)}
                className={`flex gap-3 w-full ${notification.type !== "room_invitation" ? "cursor-pointer" : ""}`}
              >
                <div className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(notification.created_at)}</p>

                  {notification.type === "room_invitation" && !notification.is_read && (
                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => handleAcceptInvitation(notification, e)}
                        disabled={processingInvitation === notification.id}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 border-red-300 text-red-700 hover:bg-red-50 bg-transparent"
                        onClick={(e) => handleRejectInvitation(notification, e)}
                        disabled={processingInvitation === notification.id}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Refuser
                      </Button>
                    </div>
                  )}
                </div>
                {!notification.is_read && notification.type !== "room_invitation" && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 flex-shrink-0"></div>
                )}
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
