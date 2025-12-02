"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAdminSession, type AdminCredentials } from "@/lib/admin-auth"

export interface AuthUser {
  id: string
  establishmentId: string
  role: "vie-scolaire" | "professeur" | "delegue"
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  authType: "custom" | "admin"
}

// Nom de la clé de session (doit correspondre à custom-auth.ts)
const SESSION_KEY = "custom_auth_user"

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return matches ? matches[1] : null
}

interface UseAuthOptions {
  requireRole?: "vie-scolaire" | "professeur" | "delegue"
  redirectTo?: string
}

export function useAuth(options?: UseAuthOptions) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    if (typeof window === "undefined") {
      return
    }

    console.log("[useAuth] Checking authentication...")

    // 1. Vérifier la session custom (cookie puis localStorage)
    const customUser = await checkCustomSession()
    if (customUser) {
      if (options?.requireRole && customUser.role !== options.requireRole) {
        console.log(`[useAuth] Role mismatch: ${customUser.role} !== ${options.requireRole}`)
        router.push(options.redirectTo || "/dashboard")
        setIsLoading(false)
        return
      }
      console.log("[useAuth] Custom auth user found:", customUser.username)
      setUser(customUser)
      setIsLoading(false)
      return
    }

    // 2. Vérifier la session admin
    const adminUser = await checkAdminSession()
    if (adminUser) {
      if (options?.requireRole && adminUser.role !== options.requireRole) {
        console.log(`[useAuth] Role mismatch: ${adminUser.role} !== ${options.requireRole}`)
        router.push(options.redirectTo || "/dashboard")
        setIsLoading(false)
        return
      }
      console.log("[useAuth] Admin user found:", adminUser.username)
      setUser(adminUser)
      setIsLoading(false)
      return
    }

    // 3. Aucune authentification trouvée
    console.log("[useAuth] No authentication found, redirecting to login")
    setIsLoading(false)
    router.push(options?.redirectTo || "/auth/login")
  }, [router, options?.requireRole, options?.redirectTo])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return { user, isLoading, refresh: checkAuth }
}

async function checkCustomSession(): Promise<AuthUser | null> {
  try {
    // Essayer le cookie d'abord
    const cookieValue = getCookieValue(SESSION_KEY)
    let sessionData = null

    if (cookieValue) {
      try {
        sessionData = JSON.parse(decodeURIComponent(cookieValue))
      } catch (e) {
        console.error("[useAuth] Error parsing cookie:", e)
      }
    }

    // Fallback sur localStorage
    if (!sessionData) {
      const localValue = localStorage.getItem(SESSION_KEY)
      if (localValue) {
        try {
          sessionData = JSON.parse(localValue)
        } catch (e) {
          console.error("[useAuth] Error parsing localStorage:", e)
        }
      }
    }

    if (!sessionData) return null

    // Valider les champs requis
    if (!sessionData.id || !sessionData.establishment_id || !sessionData.role) {
      console.error("[useAuth] Session missing required fields:", sessionData)
      clearInvalidSession()
      return null
    }

    return {
      id: sessionData.id,
      establishmentId: sessionData.establishment_id,
      role: sessionData.role,
      username: sessionData.username,
      firstName: sessionData.first_name,
      lastName: sessionData.last_name,
      email: sessionData.email,
      authType: "custom",
    }
  } catch (error) {
    console.error("[useAuth] Error checking custom session:", error)
    clearInvalidSession()
    return null
  }
}

async function checkAdminSession(): Promise<AuthUser | null> {
  try {
    const adminSession = getAdminSession()
    if (!adminSession) return null

    // Récupérer l'ID de l'établissement depuis Supabase
    const supabase = createClient()
    const { data: establishment } = await supabase
      .from("establishments")
      .select("id")
      .eq("code", adminSession.code)
      .single()

    return {
      id: `admin-${adminSession.code}`,
      establishmentId: establishment?.id || "mock-establishment-id",
      role: "vie-scolaire", // Les admins ont toujours le rôle vie-scolaire
      username: adminSession.code,
      authType: "admin",
    }
  } catch (error) {
    console.error("[useAuth] Error checking admin session:", error)
    return null
  }
}

function clearInvalidSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem("user_session") // Nettoyer l'ancien nom aussi
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
  document.cookie = "custom_auth_user=; path=/; max-age=0"
}

// Hook pour la déconnexion
export function useLogout() {
  const router = useRouter()

  const logout = useCallback(() => {
    // Supprimer toutes les sessions
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem("user_session")
    document.cookie = `${SESSION_KEY}=; path=/; max-age=0`
    document.cookie = "admin_session=; path=/; max-age=0"

    console.log("[useAuth] User logged out")
    router.push("/auth/login")
  }, [router])

  return logout
}
