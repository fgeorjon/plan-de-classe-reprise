import { createClient } from "@/lib/supabase/client"

export interface AuthUser {
  id: string
  username: string
  role: "vie-scolaire" | "professeur" | "delegue"
  establishment_id: string
  establishment_code: string
  establishment_name: string
  first_name?: string
  last_name?: string
  email?: string
}

export async function authenticateUser(
  establishmentCode: string,
  role: string,
  username: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const supabase = createClient()

  try {
    console.log("[Auth] Authenticating user:", { establishmentCode, role, username })

    // Vérifier que le code établissement existe
    const { data: establishment, error: estError } = await supabase
      .from("establishments")
      .select("id, code, name")
      .eq("code", establishmentCode)
      .single()

    console.log("[Auth] Establishment lookup:", { establishment, estError })

    if (estError || !establishment) {
      console.error("[Auth] Establishment error:", estError)
      return { user: null, error: "Code établissement invalide" }
    }

    // Authentification selon le rôle
    if (role === "vie-scolaire") {
      return authenticateVieScolaire(supabase, establishment, username, password)
    } else if (role === "professeur") {
      return authenticateProfesseur(supabase, establishment, username, password)
    } else if (role === "delegue") {
      return authenticateDelegue(supabase, establishment, username, password)
    }

    return { user: null, error: "Rôle invalide" }
  } catch (error) {
    console.error("[Auth] Authentication error:", error)
    return { user: null, error: "Erreur de connexion - vérifiez votre configuration Supabase" }
  }
}

async function authenticateVieScolaire(
  supabase: ReturnType<typeof createClient>,
  establishment: { id: string; code: string; name: string },
  username: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("establishment_id", establishment.id)
    .eq("role", "vie-scolaire")
    .single()

  console.log("[Auth] Profile lookup:", { profile: profile ? "found" : "not found", profileError })

  if (profileError || !profile) {
    return { user: null, error: "Identifiant ou mot de passe incorrect" }
  }

  // Vérifier le mot de passe via fonction SQL
  const { data: isValid, error: verifyError } = await supabase.rpc("verify_password", {
    password: password,
    password_hash: profile.password_hash,
  })

  console.log("[Auth] Password verification:", { isValid, verifyError })

  if (verifyError || !isValid) {
    return { user: null, error: "Identifiant ou mot de passe incorrect" }
  }

  return {
    user: {
      id: profile.id,
      username: profile.username,
      role: "vie-scolaire",
      establishment_id: establishment.id,
      establishment_code: establishment.code,
      establishment_name: establishment.name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
    },
    error: null,
  }
}

async function authenticateProfesseur(
  supabase: ReturnType<typeof createClient>,
  establishment: { id: string; code: string; name: string },
  username: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .eq("username", username)
    .eq("establishment_id", establishment.id)
    .single()

  console.log("[Auth] Teacher lookup:", { teacher: teacher ? "found" : "not found", teacherError })

  if (teacherError || !teacher) {
    return { user: null, error: "Identifiant ou mot de passe incorrect" }
  }

  const { data: isValid, error: verifyError } = await supabase.rpc("verify_password", {
    password: password,
    password_hash: teacher.password_hash,
  })

  if (verifyError || !isValid) {
    return { user: null, error: "Identifiant ou mot de passe incorrect" }
  }

  return {
    user: {
      id: teacher.id,
      username: teacher.username,
      role: "professeur",
      establishment_id: establishment.id,
      establishment_code: establishment.code,
      establishment_name: establishment.name,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
    },
    error: null,
  }
}

async function authenticateDelegue(
  supabase: ReturnType<typeof createClient>,
  establishment: { id: string; code: string; name: string },
  username: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("username", username)
    .eq("establishment_id", establishment.id)
    .single()

  console.log("[Auth] Student lookup:", { student: student ? "found" : "not found", studentError })

  if (studentError || !student) {
    return { user: null, error: "Identifiant ou mot de passe incorrect" }
  }

  const { data: isValid, error: verifyError } = await supabase.rpc("verify_password", {
    password: password,
    password_hash: student.password_hash,
  })

  if (verifyError || !isValid) {
    return { user: null, error: "Identifiant ou mot de passe incorrect" }
  }

  return {
    user: {
      id: student.id,
      username: student.username,
      role: "delegue",
      establishment_id: establishment.id,
      establishment_code: establishment.code,
      establishment_name: establishment.name,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
    },
    error: null,
  }
}

// Nom de la clé de session (unifié)
const SESSION_KEY = "custom_auth_user"
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 jours en secondes

export function setUserSession(user: AuthUser): void {
  if (typeof window === "undefined") return

  const userJson = JSON.stringify(user)

  // Stocker dans localStorage
  localStorage.setItem(SESSION_KEY, userJson)

  // Stocker dans un cookie pour accès serveur
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(userJson)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`

  console.log("[Auth] Session stored for user:", user.username)
}

export function getUserSession(): AuthUser | null {
  if (typeof window === "undefined") return null

  // Essayer d'abord localStorage
  const userStr = localStorage.getItem(SESSION_KEY)
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      console.error("[Auth] Error parsing localStorage session")
    }
  }

  // Fallback sur le cookie
  const cookieValue = getCookieValue(SESSION_KEY)
  if (cookieValue) {
    try {
      return JSON.parse(decodeURIComponent(cookieValue))
    } catch {
      console.error("[Auth] Error parsing cookie session")
    }
  }

  return null
}

export function clearUserSession(): void {
  if (typeof window === "undefined") return

  // Supprimer de localStorage
  localStorage.removeItem(SESSION_KEY)

  // Supprimer le cookie
  document.cookie = `${SESSION_KEY}=; path=/; max-age=0`

  // Nettoyer aussi l'ancien nom de clé si existant
  localStorage.removeItem("user_session")

  console.log("[Auth] Session cleared")
}

// Helper pour lire un cookie
function getCookieValue(name: string): string | null {
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return matches ? matches[1] : null
}
