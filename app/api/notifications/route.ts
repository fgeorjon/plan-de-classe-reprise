import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, establishment_id, type, title, message, sub_room_id, proposal_id, triggered_by } = body

    if (!user_id || !establishment_id || !type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        establishment_id,
        type,
        title,
        message,
        sub_room_id,
        proposal_id,
        triggered_by,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[API] Error creating notification:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[API] Notification created successfully:", data.id)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[API] Error in notifications route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const establishmentId = searchParams.get("establishment_id")

    if (!userId || !establishmentId) {
      return NextResponse.json({ error: "Missing user_id or establishment_id" }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[API] Error fetching notifications:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[API] Error in notifications route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
