# ============================================================
# DIAGNOSTIC PROJET - Plan de Classe
# Script PowerShell pour audit complet du projet
# Date: 06/12/2025
# ============================================================

# Creer le dossier de sortie
$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$outputDir = ".\diagnostic-$timestamp"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "=== DIAGNOSTIC PROJET ===" -ForegroundColor Cyan
Write-Host "Dossier de sortie: $outputDir" -ForegroundColor Yellow
Write-Host ""

# ------------------------------------------------------------
# 1. FICHIERS REDONDANTS / BACKUP
# ------------------------------------------------------------
Write-Host "[1/8] Recherche fichiers redondants..." -ForegroundColor Green

$report1 = "# Fichiers Redondants et Backup`r`n"
$report1 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n`r`n"

$report1 += "## Fichiers client-layout / client-wrapper`r`n"

$clientLayout = Get-ChildItem -Recurse -Filter "*client-layout*" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.next" }
$clientWrapper = Get-ChildItem -Recurse -Filter "*client-wrapper*" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.next" }

if ($clientLayout) {
    $report1 += "`r`n### client-layout trouves:`r`n"
    $clientLayout | ForEach-Object { $report1 += "- $($_.FullName)`r`n" }
} else {
    $report1 += "`r`n### client-layout: AUCUN (OK)`r`n"
}

if ($clientWrapper) {
    $report1 += "`r`n### client-wrapper trouves:`r`n"
    $clientWrapper | ForEach-Object { $report1 += "- $($_.FullName)`r`n" }
} else {
    $report1 += "`r`n### client-wrapper: AUCUN (OK)`r`n"
}

$report1 += "`r`n## Fichiers de backup (*_orig, *_backup, *_old, *.bak, *_corr)`r`n"
$backupFiles = Get-ChildItem -Recurse -Include *_orig*,*_backup*,*_old*,*.bak,*_corr* -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.next" }
if ($backupFiles) {
    $backupFiles | ForEach-Object { $report1 += "- $($_.FullName)`r`n" }
} else {
    $report1 += "AUCUN fichier de backup trouve (OK)`r`n"
}

$report1 | Out-File "$outputDir\01-fichiers-redondants.txt" -Encoding UTF8

# ------------------------------------------------------------
# 2. CONSOLE.LOG ET CONSOLE.ERROR
# ------------------------------------------------------------
Write-Host "[2/8] Recherche console.log/error..." -ForegroundColor Green

$report2 = "# Console.log et Console.error`r`n"
$report2 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n`r`n"

$consoleCount = 0
$consoleDetails = ""

Get-ChildItem -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.next" } |
    ForEach-Object {
        $file = $_
        $foundMatches = Select-String -Path $file.FullName -Pattern "console\.(log|error|warn|debug)" -ErrorAction SilentlyContinue
        if ($foundMatches) {
            $relativePath = $file.FullName.Replace((Get-Location).Path, ".")
            $consoleDetails += "`r`n## $relativePath`r`n"
            $consoleDetails += "Occurrences: $($foundMatches.Count)`r`n"
            $foundMatches | ForEach-Object { 
                $consoleDetails += "  Ligne $($_.LineNumber): $($_.Line.Trim())`r`n"
                $consoleCount++
            }
        }
    }

if ($consoleCount -eq 0) {
    $report2 += "AUCUN console.log/error trouve (OK)`r`n"
} else {
    $report2 += "TOTAL: $consoleCount occurrences`r`n"
    $report2 += $consoleDetails
}

$report2 | Out-File "$outputDir\02-console-logs.txt" -Encoding UTF8

# ------------------------------------------------------------
# 3. FICHIERS DE CONFIGURATION
# ------------------------------------------------------------
Write-Host "[3/8] Verification fichiers de config..." -ForegroundColor Green

$report3 = "# Fichiers de Configuration`r`n"
$report3 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n`r`n"

$configFiles = @(
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
    "tsconfig.json",
    "package.json",
    "components.json",
    ".env.local",
    ".env",
    ".env.production"
)

$report3 += "## Fichiers attendus`r`n"
foreach ($cfg in $configFiles) {
    $exists = Test-Path $cfg
    $status = if ($exists) { "[OK] PRESENT" } else { "[--] ABSENT" }
    $report3 += "- $cfg : $status`r`n"
}

$report3 += "`r`n## Fichiers *.config.* trouves`r`n"
Get-ChildItem -Filter "*.config.*" -ErrorAction SilentlyContinue | ForEach-Object {
    $report3 += "- $($_.Name) ($($_.Length) bytes)`r`n"
}

$report3 += "`r`n## Doublons de configuration potentiels`r`n"
$nextConfigs = Get-ChildItem -Filter "next.config.*" -ErrorAction SilentlyContinue
if ($nextConfigs.Count -gt 1) {
    $report3 += "ATTENTION: Plusieurs next.config.* trouves:`r`n"
    $nextConfigs | ForEach-Object { $report3 += "  - $($_.Name)`r`n" }
} else {
    $report3 += "OK - Un seul fichier next.config`r`n"
}

$report3 | Out-File "$outputDir\03-fichiers-config.txt" -Encoding UTF8

# ------------------------------------------------------------
# 4. VARIABLES D'ENVIRONNEMENT
# ------------------------------------------------------------
Write-Host "[4/8] Verification variables d environnement..." -ForegroundColor Green

$report4 = "# Variables d Environnement`r`n"
$report4 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n"
$report4 += "# NOTE: Seules les cles sont listees, pas les valeurs`r`n`r`n"

if (Test-Path ".env.local") {
    $report4 += "## .env.local`r`n"
    Get-Content ".env.local" -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            $status = if ([string]::IsNullOrWhiteSpace($value)) { "[VIDE]" } else { "[OK] Definie" }
            $report4 += "- $key : $status`r`n"
        }
    }
} else {
    $report4 += "## .env.local : FICHIER ABSENT`r`n"
}

$report4 += "`r`n## Variables requises pour Supabase`r`n"
$requiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
)

foreach ($var in $requiredVars) {
    $found = $false
    if (Test-Path ".env.local") {
        $content = Get-Content ".env.local" -Raw
        $found = $content -match "$var="
    }
    $status = if ($found) { "[OK] Presente" } else { "[--] Manquante" }
    $report4 += "- $var : $status`r`n"
}

$report4 | Out-File "$outputDir\04-variables-env.txt" -Encoding UTF8

# ------------------------------------------------------------
# 5. STRUCTURE DU PROJET
# ------------------------------------------------------------
Write-Host "[5/8] Analyse structure du projet..." -ForegroundColor Green

$report5 = "# Structure du Projet`r`n"
$report5 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n`r`n"
$report5 += "## Arborescence (3 niveaux, hors node_modules/.next/.git)`r`n`r`n"

$basePath = (Get-Location).Path
Get-ChildItem -Recurse -Depth 3 -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.next|\.git" } |
    ForEach-Object {
        $depth = ($_.FullName.Split([IO.Path]::DirectorySeparatorChar).Count - $basePath.Split([IO.Path]::DirectorySeparatorChar).Count - 1)
        $indent = "  " * $depth
        $icon = if ($_.PSIsContainer) { "[DIR]" } else { "[FILE]" }
        $report5 += "$indent$icon $($_.Name)`r`n"
    }

$report5 | Out-File "$outputDir\05-structure-projet.txt" -Encoding UTF8

# ------------------------------------------------------------
# 6. IMPORTS NON UTILISES
# ------------------------------------------------------------
Write-Host "[6/8] Analyse des imports..." -ForegroundColor Green

$report6 = "# Analyse des Imports`r`n"
$report6 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n`r`n"

$report6 += "## Composants potentiellement non utilises`r`n"

$componentsPath = Join-Path (Get-Location) "components"
if (Test-Path $componentsPath) {
    Get-ChildItem -Path $componentsPath -Filter "*.tsx" -ErrorAction SilentlyContinue | ForEach-Object {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        $refs = Get-ChildItem -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue | 
            Where-Object { $_.FullName -notmatch "node_modules|\.next" } |
            Select-String -Pattern $baseName -ErrorAction SilentlyContinue
        
        if ($refs.Count -le 1) {
            $report6 += "[?] $($_.Name) - $($refs.Count) reference(s)`r`n"
        }
    }
} else {
    $report6 += "Dossier components/ non trouve`r`n"
}

$report6 += "`r`n## Imports de lib dans le projet`r`n"
Get-ChildItem -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.next" } |
    Select-String -Pattern 'from .*/lib/' -ErrorAction SilentlyContinue |
    ForEach-Object { $report6 += "$($_.Filename):$($_.LineNumber) - $($_.Line.Trim())`r`n" }

$report6 | Out-File "$outputDir\06-imports.txt" -Encoding UTF8

# ------------------------------------------------------------
# 7. TODO / FIXME / HACK
# ------------------------------------------------------------
Write-Host "[7/8] Recherche TODO/FIXME/HACK..." -ForegroundColor Green

$report7 = "# TODO, FIXME, HACK`r`n"
$report7 += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n`r`n"

$todoCount = 0
$todoDetails = ""

Get-ChildItem -Recurse -Include *.tsx,*.ts,*.js,*.jsx -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "node_modules|\.next" } |
    ForEach-Object {
        $file = $_
        $foundMatches = Select-String -Path $file.FullName -Pattern "TODO|FIXME|XXX|HACK" -ErrorAction SilentlyContinue
        if ($foundMatches) {
            $todoDetails += "`r`n## $($file.Name)`r`n"
            $foundMatches | ForEach-Object { 
                $todoDetails += "  Ligne $($_.LineNumber): $($_.Line.Trim())`r`n"
                $todoCount++
            }
        }
    }

if ($todoCount -eq 0) {
    $report7 += "AUCUN TODO/FIXME/HACK trouve`r`n"
} else {
    $report7 += "TOTAL: $todoCount occurrences`r`n"
    $report7 += $todoDetails
}

$report7 | Out-File "$outputDir\07-todo-fixme.txt" -Encoding UTF8

# ------------------------------------------------------------
# 8. RESUME
# ------------------------------------------------------------
Write-Host "[8/8] Generation du resume..." -ForegroundColor Green

$tsxCount = (Get-ChildItem -Recurse -Filter "*.tsx" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.next" }).Count
$tsCount = (Get-ChildItem -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules|\.next" }).Count

$summary = "# RESUME DIAGNOSTIC`r`n"
$summary += "# Genere le $(Get-Date -Format 'dd/MM/yyyy HH:mm')`r`n"
$summary += "# ============================================================`r`n`r`n"

$summary += "## Fichiers generes dans $outputDir`r`n`r`n"
$summary += "1. 01-fichiers-redondants.txt - Fichiers de backup et doublons`r`n"
$summary += "2. 02-console-logs.txt - Console.log/error a nettoyer`r`n"
$summary += "3. 03-fichiers-config.txt - Etat des fichiers de configuration`r`n"
$summary += "4. 04-variables-env.txt - Variables d environnement (cles uniquement)`r`n"
$summary += "5. 05-structure-projet.txt - Arborescence du projet`r`n"
$summary += "6. 06-imports.txt - Analyse des imports`r`n"
$summary += "7. 07-todo-fixme.txt - TODO/FIXME/HACK a traiter`r`n`r`n"

$summary += "## Statistiques rapides`r`n`r`n"
$summary += "- Fichiers .tsx : $tsxCount`r`n"
$summary += "- Fichiers .ts : $tsCount`r`n"
$summary += "- Console.log/error : $consoleCount`r`n"
$summary += "- TODO/FIXME : $todoCount`r`n`r`n"

$summary += "## Prochaines etapes`r`n`r`n"
$summary += "Examinez chaque fichier de rapport et mettez a jour FICHIERS_A_NETTOYER.md`r`n"
$summary += "avec les actions a effectuer.`r`n"

$summary | Out-File "$outputDir\00-RESUME.txt" -Encoding UTF8

# ------------------------------------------------------------
# FIN
# ------------------------------------------------------------
Write-Host ""
Write-Host "=== DIAGNOSTIC TERMINE ===" -ForegroundColor Cyan
Write-Host "Resultats dans: $outputDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Fichiers generes:" -ForegroundColor White
Get-ChildItem $outputDir | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
Write-Host ""
Write-Host "Ouvrir le resume: notepad $outputDir\00-RESUME.txt" -ForegroundColor Green
