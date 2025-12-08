import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

// Fonction pour hasher les mots de passe
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex")
}

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Variables d'environnement Supabase manquantes")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log("🚀 Début de la création des utilisateurs de test...\n")

  // Établissements
  const establishments = [
    { code: "stm001", name: "ST-MARIE 14000", password: "Feunard2017" },
    { code: "vh001", name: "VICTOR-HUGO 18760", password: "VictorH2024!" },
  ]

  // Utilisateurs à créer
  const users = [
    // ST-MARIE
    {
      establishment_code: "stm001",
      username: "vs.stmarie",
      password: "VieScol2024!",
      email: "vs.stmarie@test.local",
      role: "vie-scolaire",
      first_name: "Vie",
      last_name: "Scolaire",
      access_code: "cpdc003",
    },
    {
      establishment_code: "stm001",
      username: "prof.stmarie",
      password: "Prof2024!",
      email: "prof.stmarie@test.local",
      role: "teacher",
      first_name: "Professeur",
      last_name: "Test",
      access_code: "cpdc002",
    },
    {
      establishment_code: "stm001",
      username: "del.stmarie",
      password: "Delegue2024!",
      email: "del.stmarie@test.local",
      role: "delegate",
      first_name: "Délégué",
      last_name: "Test",
      access_code: "cpdc001",
    },
    // VICTOR-HUGO
    {
      establishment_code: "vh001",
      username: "vs.vhugo",
      password: "VieScol2024!",
      email: "vs.vhugo@test.local",
      role: "vie-scolaire",
      first_name: "Vie",
      last_name: "Scolaire",
      access_code: null,
    },
    {
      establishment_code: "vh001",
      username: "prof.vhugo",
      password: "Prof2024!",
      email: "prof.vhugo@test.local",
      role: "teacher",
      first_name: "Professeur",
      last_name: "Hugo",
      access_code: null,
    },
    {
      establishment_code: "vh001",
      username: "del.vhugo",
      password: "Delegue2024!",
      email: "del.vhugo@test.local",
      role: "delegate",
      first_name: "Délégué",
      last_name: "Hugo",
      access_code: null,
    },
  ]

  try {
    // Étape 1 : Créer les établissements
    console.log("📍 Création des établissements...")
    for (const establishment of establishments) {
      const { data: existing } = await supabase
        .from("establishments")
        .select("*")
        .eq("code", establishment.code)
        .single()

      if (existing) {
        console.log(`  ✓ Établissement ${establishment.name} existe déjà`)
      } else {
        const { error } = await supabase.from("establishments").insert({
          code: establishment.code,
          name: establishment.name,
          password: hashPassword(establishment.password),
        })

        if (error) {
          console.error(`  ✗ Erreur création ${establishment.name}:`, error.message)
        } else {
          console.log(`  ✓ Établissement ${establishment.name} créé`)
        }
      }
    }

    console.log("\n👤 Création des utilisateurs...")

    // Étape 2 : Créer les profils utilisateurs
    for (const user of users) {
      console.log(`\n  → ${user.username} (${user.role})`)

      // Vérifier si le profil existe
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", user.username)
        .single()

      if (existingProfile) {
        console.log(`    ℹ Profil existe déjà`)
        continue
      }

      // Créer le profil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          username: user.username,
          password_hash: hashPassword(user.password),
          email: user.email,
          role: user.role,
          establishment_code: user.establishment_code,
        })
        .select()
        .single()

      if (profileError) {
        console.error(`    ✗ Erreur création profil:`, profileError.message)
        continue
      }

      console.log(`    ✓ Profil créé`)

      // Créer l'entrée spécifique selon le rôle
      if (user.role === "teacher") {
        const { error: teacherError } = await supabase.from("teachers").insert({
          profile_id: profile.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          establishment_code: user.establishment_code,
        })

        if (teacherError) {
          console.error(`    ✗ Erreur création teacher:`, teacherError.message)
        } else {
          console.log(`    ✓ Professeur créé`)
        }
      } else if (user.role === "delegate" || user.role === "eco-delegate") {
        const { error: studentError } = await supabase.from("students").insert({
          profile_id: profile.id,
          first_name: user.first_name,
          last_name: user.last_name,
          establishment_code: user.establishment_code,
        })

        if (studentError) {
          console.error(`    ✗ Erreur création student:`, studentError.message)
        } else {
          console.log(`    ✓ Délégué créé`)
        }
      }

      // Associer le code d'accès si fourni
      if (user.access_code) {
        const { error: accessError } = await supabase.from("access_codes").upsert({
          code: user.access_code,
          profile_id: profile.id,
          establishment_code: user.establishment_code,
          is_active: true,
        })

        if (accessError) {
          console.error(`    ✗ Erreur association code d'accès:`, accessError.message)
        } else {
          console.log(`    ✓ Code d'accès ${user.access_code} associé`)
        }
      }
    }

    console.log("\n✅ Tous les utilisateurs ont été créés avec succès!")
    console.log("\n📋 Récapitulatif des connexions:")
    console.log("\n🏫 ST-MARIE 14000:")
    console.log("  - Vie Scolaire: vs.stmarie / VieScol2024! (code: cpdc003)")
    console.log("  - Professeur: prof.stmarie / Prof2024! (code: cpdc002)")
    console.log("  - Délégué: del.stmarie / Delegue2024! (code: cpdc001)")
    console.log("\n🏫 VICTOR-HUGO 18760:")
    console.log("  - Vie Scolaire: vs.vhugo / VieScol2024!")
    console.log("  - Professeur: prof.vhugo / Prof2024!")
    console.log("  - Délégué: del.vhugo / Delegue2024!")
  } catch (error) {
    console.error("\n❌ Erreur:", error)
    process.exit(1)
  }
}

main()
