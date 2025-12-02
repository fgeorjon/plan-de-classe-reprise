"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAdminSession } from "@/lib/admin-auth"

export interface AuthUser {
  id: string
  establishmentId: string
  role: string
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  authType: "custom" | "admin" | "supabase"
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

export function useAuth(options?: { requireRole?: string; redirectTo?: string }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      if (typeof window === "undefined") {
        console.log("[v0] useAuth: Running on server side, skipping auth check")
        return
      }

      console.log("[v0] useAuth: Checking authentication on client side...")

      try {
        // Try cookie first
        const cookieSession = getCookie("custom_auth_user")
        console.log("[v0] useAuth: Custom session from cookie:", cookieSession ? "found" : "not found")

        let sessionData = null
        if (cookieSession) {
          try {
            sessionData = JSON.parse(decodeURIComponent(cookieSession))
            console.log("[v0] useAuth: Parsed custom session from cookie:", sessionData)
          } catch (e) {
            console.error("[v0] useAuth: Error parsing cookie session:", e)
          }
        }

        // Fallback to localStorage
        if (!sessionData) {
          const localSession = localStorage.getItem("user_session")
          console.log("[v0] useAuth: Custom session from localStorage:", localSession ? "found" : "not found")

          if (localSession) {
            try {
              sessionData = JSON.parse(localSession)
              console.log("[v0] useAuth: Parsed custom session from localStorage:", sessionData)
            } catch (e) {
              console.error("[v0] useAuth: Error parsing localStorage session:", e)
            }
          }
        }

        if (sessionData) {
          if (!sessionData.id || !sessionData.establishment_id || !sessionData.role) {
            console.error("[v0] useAuth: Custom session missing required fields")
            localStorage.removeItem("user_session")
            document.cookie = "custom_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
          } else {
            const authUser: AuthUser = {
              id: sessionData.id,
              establishmentId: sessionData.establishment_id,
              role: sessionData.role,
              username: sessionData.username,
              firstName: sessionData.first_name,
              lastName: sessionData.last_name,
              email: sessionData.email,
              authType: "custom",
            }

            if (options?.requireRole && authUser.role !== options.requireRole) {
              console.log(`[v0] useAuth: User role ${authUser.role} doesn't match required ${options.requireRole}`)
              router.push(options.redirectTo || "/dashboard")
              setIsLoading(false)
              return
            }

            console.log("[v0] useAuth: Custom auth user authenticated successfully:", authUser)
            setUser(authUser)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.error("[v0] useAuth: Error checking custom session:", error)
        localStorage.removeItem("user_session")
        document.cookie = "custom_auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      }

      try {
        const adminSession = getAdminSession()
        console.log("[v0] useAuth: Admin session:", adminSession ? "found" : "not found")

        if (adminSession) {
          const supabase = createClient()
          const { data: establishment } = await supabase
            .from("establishments")
            .select("id")
            .eq("code", adminSession.code)
            .single()

          const authUser: AuthUser = {
            id: "admin-" + adminSession.code,
            establishmentId: establishment?.id || "mock-establishment-id",
            role: "vie-scolaire",
            username: adminSession.code,
            authType: "admin",
          }

          if (options?.requireRole && authUser.role !== options.requireRole) {
            console.log(`[v0] useAuth: User role ${authUser.role} doesn't match required ${options.requireRole}`)
            router.push(options.redirectTo || "/dashboard")
            setIsLoading(false)
            return
          }

          console.log("[v0] useAuth: Admin user authenticated successfully:", authUser)
          setUser(authUser)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error("[v0] useAuth: Error checking admin session:", error)
      }

      try {
        const supabase = createClient()
        const {
          data: { user: supabaseUser },
          error,
        } = await supabase.auth.getUser()

        console.log(
          "[v0] useAuth: Supabase user:",
          supabaseUser ? "found" : "not found",
          error ? `error: ${error.message}` : "",
        )

        if (!error && supabaseUser) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", supabaseUser.id).single()

          if (profile) {
            const authUser: AuthUser = {
              id: supabaseUser.id,
              establishmentId: profile.establishment_id,
              role: profile.role,
              username: profile.username,
              firstName: profile.first_name,
              lastName: profile.last_name,
              email: profile.email,
              authType: "supabase",
            }

            if (options?.requireRole && authUser.role !== options.requireRole) {
              console.log(`[v0] useAuth: User role ${authUser.role} doesn't match required ${options.requireRole}`)
              router.push(options.redirectTo || "/dashboard")
              setIsLoading(false)
              return
            }

            console.log("[v0] useAuth: Supabase user authenticated successfully:", authUser)
            setUser(authUser)
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.error("[v0] useAuth: Error checking Supabase auth:", error)
      }

      console.log("[v0] useAuth: No valid authentication found, redirecting to login")
      setIsLoading(false)
      router.push(options?.redirectTo || "/auth/login")
    }

    checkAuth()
  }, [router, options?.requireRole, options?.redirectTo])

  return { user, isLoading }
}
