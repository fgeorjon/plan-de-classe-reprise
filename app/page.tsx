import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function Home() {
  const cookieStore = await cookies()
  
  // Vérifier l'authentification custom (prioritaire)
  const customAuthCookie = cookieStore.get("custom_auth_user")
  const adminSessionCookie = cookieStore.get("admin_session")
  
  // Si l'utilisateur est authentifié via custom auth ou admin
  if (customAuthCookie || adminSessionCookie) {
    redirect("/dashboard")
  }
  
  // Sinon, rediriger vers la page de connexion
  redirect("/auth/login")
}
