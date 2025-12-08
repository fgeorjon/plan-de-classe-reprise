# Setup Profil Vie Scolaire - Sainte-Marie

## Prérequis

Assurez-vous que vous avez configuré les variables d'environnement Supabase. Dans votre fichier `.env.local` ou les variables de projet, vous devez avoir :

\`\`\`
SUPABASE_SUPABASE_URL=https://anrmqsinavgmdvwnaprg.supabase.co
SUPABASE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucm1xc2luYXZnbWR2d25hcHJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYxNDcyOSwiZXhwIjoyMDc2MTkwNzI5fQ.s5Um6qFFUo-vUMvoH0a9Z-w9luU7HDWP7Nmdq43ZqVM
\`\`\`

## Exécution du script

### Option 1 : Exécution directe avec bun
\`\`\`bash
bun run scripts/create-vie-scolaire-profile.ts
\`\`\`

### Option 2 : Exécution avec npx tsx
\`\`\`bash
npx tsx scripts/create-vie-scolaire-profile.ts
\`\`\`

### Option 3 : Ajouter un script npm

Modifiez `package.json` et ajoutez :
\`\`\`json
{
  "scripts": {
    "seed:vie-scolaire": "tsx scripts/create-vie-scolaire-profile.ts"
  }
}
\`\`\`

Puis exécutez :
\`\`\`bash
npm run seed:vie-scolaire
\`\`\`

## Identifiants créés

- **Username :** `admin.vs.stm`
- **Mot de passe :** `Feunard2017`
- **Rôle :** `vie-scolaire`
- **Établissement :** `Sainte-Marie Caen` (code: ST-MARIE 14000)

## Après l'exécution

Le script créera :
1. L'établissement "Sainte-Marie Caen" s'il n'existe pas
2. Un profil "vie scolaire" avec les identifiants ci-dessus
3. Le mot de passe sera hashé en SHA256

Vous pouvez ensuite vous connecter à l'application avec ces identifiants pour accéder à l'interface de vie scolaire.

## Dépannage

Si vous avez une erreur "Missing Supabase environment variables" :
- Vérifiez que `SUPABASE_SUPABASE_URL` et `SUPABASE_SUPABASE_SERVICE_ROLE_KEY` sont définies
- Vérifiez que ces variables sont accessibles dans votre shell (testez avec `echo $SUPABASE_SUPABASE_URL`)
- Redémarrez votre terminal après avoir ajouté les variables
