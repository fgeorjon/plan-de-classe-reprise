import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import EspaceClasseManagement from "@/components/espace-classe-management"

export default async function EspaceClassePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, establishment:establishments(*)")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.establishment_id) {
    return <div>Profil non trouvé</div>
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("establishment_id", profile.establishment_id)
    .order("created_at", { ascending: false })

  return (
    <EspaceClasseManagement
      initialRooms={rooms || []}
      userRole={profile.role}
      userId={user.id}
      establishmentId={profile.establishment_id}
    />
  )
}
