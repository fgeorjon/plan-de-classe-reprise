import { createClient } from "@/lib/supabase/client"

interface NotificationData {
  user_id: string
  type: string
  title: string
  message: string
  sub_room_id?: string
  proposal_id?: string
  triggered_by?: string
}

export async function sendNotification(data: NotificationData) {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: data.user_id,
    type: data.type,
    title: data.title,
    message: data.message,
    sub_room_id: data.sub_room_id,
    proposal_id: data.proposal_id,
    triggered_by: data.triggered_by,
    is_read: false,
  })

  if (error) {
    console.error("[v0] Error sending notification:", error)
  }
}

export async function notifyPlanModified(subRoomId: string, subRoomName: string, classIds: string[]) {
  const supabase = createClient()

  // Get all students in the affected classes
  const { data: students, error } = await supabase
    .from("students")
    .select("profile_id")
    .in("class_id", classIds)
    .not("profile_id", "is", null)

  if (error || !students) {
    console.error("[v0] Error fetching students:", error)
    return
  }

  // Send notification to each student
  for (const student of students) {
    await sendNotification({
      user_id: student.profile_id!,
      type: "plan_modified",
      title: "Plan de classe modifié",
      message: `Le plan "${subRoomName}" a été mis à jour`,
      sub_room_id: subRoomId,
    })
  }
}

export async function notifyProposalStatusChange(
  proposalId: string,
  delegateUserId: string,
  status: "approved" | "rejected",
  subRoomName: string,
  rejectionReason?: string,
) {
  if (status === "approved") {
    await sendNotification({
      user_id: delegateUserId,
      type: "plan_validated",
      title: "Proposition validée",
      message: `Votre proposition "${subRoomName}" a été validée et est maintenant active`,
      proposal_id: proposalId,
    })
  } else {
    await sendNotification({
      user_id: delegateUserId,
      type: "plan_rejected",
      title: "Proposition refusée",
      message: rejectionReason || `Votre proposition "${subRoomName}" a été refusée`,
      proposal_id: proposalId,
    })
  }
}

export async function notifyPlanCreated(subRoomId: string, subRoomName: string, classIds: string[]) {
  const supabase = createClient()

  const { data: students, error } = await supabase
    .from("students")
    .select("profile_id")
    .in("class_id", classIds)
    .not("profile_id", "is", null)

  if (error || !students) {
    console.error("[v0] Error fetching students:", error)
    return
  }

  for (const student of students) {
    await sendNotification({
      user_id: student.profile_id!,
      type: "plan_created",
      title: "Nouveau plan de classe",
      message: `Un nouveau plan "${subRoomName}" a été créé pour votre classe`,
      sub_room_id: subRoomId,
    })
  }
}

export async function notifyPlanDeleted(subRoomName: string, classIds: string[]) {
  const supabase = createClient()

  const { data: students, error } = await supabase
    .from("students")
    .select("profile_id")
    .in("class_id", classIds)
    .not("profile_id", "is", null)

  if (error || !students) {
    console.error("[v0] Error fetching students:", error)
    return
  }

  for (const student of students) {
    await sendNotification({
      user_id: student.profile_id!,
      type: "plan_deleted",
      title: "Plan de classe supprimé",
      message: `Le plan "${subRoomName}" a été supprimé`,
    })
  }
}
