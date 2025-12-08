// Ces codes permettent l'accès même si Supabase est hors ligne

export interface AdminCredentials {
  code: string
  establishment: string
  role: "vie-scolaire" | "professeur" | "delegue"
  username: string
  displayName: string
}

// Codes admin hardcodés dans le code source
const ADMIN_CODES: Record<string, AdminCredentials> = {
  cpdc001: {
    code: "cpdc001",
    establishment: "ST-MARIE 14000",
    role: "delegue",
    username: "admin.delegue.stm",
    displayName: "Admin Délégué ST-MARIE",
  },
  cpdc002: {
    code: "cpdc002",
    establishment: "ST-MARIE 14000",
    role: "professeur",
    username: "admin.prof.stm",
    displayName: "Admin Professeur ST-MARIE",
  },
  cpdc003: {
    code: "cpdc003",
    establishment: "ST-MARIE 14000",
    role: "vie-scolaire",
    username: "admin.vs.stm",
    displayName: "Admin Vie Scolaire ST-MARIE",
  },
}

export function validateAdminCode(code: string): AdminCredentials | null {
  console.log("[v0] validateAdminCode called with:", code)
  const normalizedCode = code.toLowerCase().trim()
  console.log("[v0] Normalized code:", normalizedCode)
  const adminCreds = ADMIN_CODES[normalizedCode]
  console.log("[v0] Found credentials:", adminCreds)
  return adminCreds || null
}

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null
  const nameEQ = name + "="
  const ca = document.cookie.split(";")
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === " ") c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

export function isAdminSession(): boolean {
  if (typeof window === "undefined") return false
  const session = getCookie("admin_session")
  return !!session
}

export function getAdminSession(): AdminCredentials | null {
  if (typeof window === "undefined") return null
  const session = getCookie("admin_session")
  if (!session) return null
  try {
    return JSON.parse(decodeURIComponent(session))
  } catch {
    return null
  }
}

export function setAdminSession(credentials: AdminCredentials): void {
  console.log("[v0] setAdminSession called with:", credentials)
  if (typeof window === "undefined") {
    console.log("[v0] Window is undefined, cannot set session")
    return
  }
  setCookie("admin_session", encodeURIComponent(JSON.stringify(credentials)))
  console.log("[v0] Admin session stored in cookie")
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return
  deleteCookie("admin_session")
}
