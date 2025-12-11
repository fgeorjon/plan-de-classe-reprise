"use client"

import type React from "react"
import { authenticateUser, setUserSession } from "@/lib/custom-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [establishmentCode, setEstablishmentCode] = useState("")
  const [role, setRole] = useState<string>("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log("[v0] Login form submitted")

    if (!establishmentCode || !role || !username || !password) {
      console.log("[v0] Missing required fields")
      setError("Tous les champs sont requis")
      setIsLoading(false)
      return
    }

    try {
      console.log("[v0] Calling authenticateUser...")
      const { user, error: authError } = await authenticateUser(establishmentCode, role, username, password)

      console.log("[v0] Authentication result:", { user, authError })

      if (authError || !user) {
        console.log("[v0] Authentication failed:", authError)
        throw new Error(authError || "Identifiant ou mot de passe incorrect")
      }

      console.log("[v0] Authentication successful! User:", user)
      console.log("[v0] Calling setUserSession...")

      // Store user session
      setUserSession(user)

      console.log("[v0] Session stored, checking localStorage...")
      const storedSession = localStorage.getItem("custom_auth_user")
      console.log("[v0] Stored session:", storedSession)

      console.log("[v0] Redirecting to dashboard...")
      // Redirect to dashboard
      router.push("/dashboard")
      console.log("[v0] router.push called")
    } catch (error: unknown) {
      console.log("[v0] Error caught in handleLogin:", error)
      setError(error instanceof Error ? error.message : "Identifiant ou mot de passe incorrect")
    } finally {
      console.log("[v0] Setting isLoading to false")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
            <CardDescription>Connectez-vous à votre compte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="establishmentCode">Code établissement</Label>
                <Input
                  id="establishmentCode"
                  type="text"
                  placeholder="Ex: stm001 ou vh001"
                  value={establishmentCode}
                  onChange={(e) => setEstablishmentCode(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionnez votre rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vie-scolaire">Vie Scolaire</SelectItem>
                    <SelectItem value="professeur">Professeur</SelectItem>
                    <SelectItem value="delegue">Délégué</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Identifiant</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ex: vs.stmarie, prof.stmarie, del.stmarie"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
