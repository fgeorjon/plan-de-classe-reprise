"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Confetti } from "@/components/ui/confetti"
import { motion, AnimatePresence } from "framer-motion"
import { LockKeyhole, User, School, LogIn } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [userType, setUserType] = useState<string>("delegue")
  const [accessCode, setAccessCode] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [showConfetti, setShowConfetti] = useState<boolean>(false)
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false)

  // Remplacer la fonction handleLogin par celle-ci pour optimiser les délais et les animations
  const handleLogin = () => {
    if (loading || loginSuccess) return

    setLoading(true)

    // Vérification des codes d'accès
    const validCodes: Record<string, string> = {
      delegue: "cpdc001",
      prof: "cpdc002",
      vieScolaire: "cpdc003",
    }

    // Simuler un délai de vérification plus court
    setTimeout(() => {
      if (accessCode === validCodes[userType]) {
        // Stocker les informations de connexion dans localStorage
        localStorage.setItem("userType", userType)
        localStorage.setItem("isLoggedIn", "true")

        // Afficher le succès
        setLoginSuccess(true)

        // Délai court avant de lancer les confettis
        setTimeout(() => {
          setShowConfetti(true)
        }, 200)

        // Rediriger vers le tableau de bord après un délai court
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000) // Réduit de 2000ms à 1000ms

        toast({
          title: "Connexion réussie",
          description: `Vous êtes connecté en tant que ${userType === "delegue" ? "délégué" : userType === "prof" ? "professeur" : "vie scolaire"}`,
        })
      } else {
        setLoading(false)
        toast({
          title: "Erreur de connexion",
          description: "Le code d'accès est incorrect",
          variant: "destructive",
        })

        // Animation de secousse pour l'input
        const input = document.getElementById("accessCode")
        if (input) {
          input.classList.add("animate-shake")
          setTimeout(() => {
            input.classList.remove("animate-shake")
          }, 300) // Réduit de 500ms à 300ms
        }
      }
    }, 300) // Réduit de 600ms à 300ms
  }

  // Nettoyer les états lors du démontage
  useEffect(() => {
    return () => {
      setShowConfetti(false)
      setLoginSuccess(false)
      setLoading(false)
    }
  }, [])

  return (
    <>
      {showConfetti && <Confetti active={true} />}
      <AnimatePresence mode="wait">
        <motion.div
          key="login-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-card overflow-hidden border-2 border-transparent hover:border-primary/10 transition-all duration-300">
            <CardHeader className="space-y-1 bg-gradient-to-r from-theme-blue-50 to-theme-teal-50 dark:from-theme-blue-900 dark:to-theme-teal-900">
              <CardTitle className="text-2xl font-bold text-center gradient-text">Connexion</CardTitle>
              <CardDescription className="text-center">
                Sélectionnez votre type de compte et entrez votre code d'accès
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Type de compte</Label>
                <RadioGroup value={userType} onValueChange={setUserType} className="flex flex-col space-y-3">
                  <div
                    className={`flex items-center space-x-3 rounded-md border p-3 cursor-pointer transition-all duration-200 ${userType === "delegue" ? "border-theme-blue-300 bg-theme-blue-50 dark:bg-theme-blue-900/30" : "hover:border-muted-foreground/30 hover:bg-muted/30"}`}
                  >
                    <RadioGroupItem value="delegue" id="delegue" />
                    <Label htmlFor="delegue" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4 text-theme-blue-500" />
                      <span>Délégué</span>
                    </Label>
                  </div>

                  <div
                    className={`flex items-center space-x-3 rounded-md border p-3 cursor-pointer transition-all duration-200 ${userType === "prof" ? "border-theme-teal-300 bg-theme-teal-50 dark:bg-theme-teal-900/30" : "hover:border-muted-foreground/30 hover:bg-muted/30"}`}
                  >
                    <RadioGroupItem value="prof" id="prof" />
                    <Label htmlFor="prof" className="flex items-center cursor-pointer">
                      <School className="mr-2 h-4 w-4 text-theme-teal-500" />
                      <span>Professeur</span>
                    </Label>
                  </div>

                  <div
                    className={`flex items-center space-x-3 rounded-md border p-3 cursor-pointer transition-all duration-200 ${userType === "vieScolaire" ? "border-theme-amber-300 bg-theme-amber-50 dark:bg-theme-amber-900/30" : "hover:border-muted-foreground/30 hover:bg-muted/30"}`}
                  >
                    <RadioGroupItem value="vieScolaire" id="vieScolaire" />
                    <Label htmlFor="vieScolaire" className="flex items-center cursor-pointer">
                      <LockKeyhole className="mr-2 h-4 w-4 text-theme-amber-500" />
                      <span>Vie Scolaire</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessCode" className="text-base font-medium">
                  Code d'accès
                </Label>
                <div className="relative">
                  <Input
                    id="accessCode"
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Entrez votre code d'accès"
                    className="pl-10 input-focus-effect"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading && !loginSuccess) {
                        handleLogin()
                      }
                    }}
                    disabled={loading || loginSuccess}
                  />
                  <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full">
                <Button
                  className={`w-full button-hover-effect ${
                    userType === "delegue"
                      ? "bg-theme-blue-600 hover:bg-theme-blue-700"
                      : userType === "prof"
                        ? "bg-theme-teal-600 hover:bg-theme-teal-700"
                        : "bg-theme-amber-600 hover:bg-theme-amber-700"
                  }`}
                  onClick={handleLogin}
                  disabled={loading || loginSuccess}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Connexion en cours...
                    </div>
                  ) : loginSuccess ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-pulse -ml-1 mr-3 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Connexion réussie
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Se connecter
                    </div>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
      <Toaster />

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </>
  )
}
