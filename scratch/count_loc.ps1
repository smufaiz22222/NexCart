$root = "c:\Users\smufa\Desktop\NexCart_updated"

# Define target paths and patterns
$files = @()

# 1. Express Backend files (excluding generated and tests)
$backendFiles = Get-ChildItem -Path "$root\src" -Recurse -File -Include *.js | Where-Object {
    $_.FullName -notlike "*\src\generated\*" -and
    $_.Name -notlike "*.test.js" -and
    $_.Name -notlike "*.spec.js"
}
foreach ($f in $backendFiles) {
    $files += [PSCustomObject]@{ Path = $f.FullName; RelativePath = $f.FullName.Replace($root, "").Replace("\", "/"); Type = "Backend (Express) JS" }
}

# 2. React Frontend files (excluding tests)
$frontendFiles = Get-ChildItem -Path "$root\client\src" -Recurse -File -Include *.js, *.jsx, *.css | Where-Object {
    $_.Name -notlike "*.test.js" -and
    $_.Name -notlike "*.test.jsx" -and
    $_.Name -notlike "*.spec.js" -and
    $_.Name -notlike "*.spec.jsx"
}
foreach ($f in $frontendFiles) {
    $type = "Frontend JS/JSX"
    if ($f.Extension -eq ".css") { $type = "Frontend CSS" }
    $files += [PSCustomObject]@{ Path = $f.FullName; RelativePath = $f.FullName.Replace($root, "").Replace("\", "/"); Type = $type }
}
$clientHtml = Get-Item -Path "$root\client\index.html" -ErrorAction SilentlyContinue
if ($clientHtml) {
    $files += [PSCustomObject]@{ Path = $clientHtml.FullName; RelativePath = $clientHtml.FullName.Replace($root, "").Replace("\", "/"); Type = "Frontend HTML" }
}

# 3. Python FastAPI files (excluding tests)
$pythonFiles = Get-ChildItem -Path "$root\ai-service\app" -Recurse -File -Include *.py | Where-Object {
    $_.FullName -notlike "*\.venv\*" -and
    $_.FullName -notlike "*\.ruff_cache\*" -and
    $_.FullName -notlike "*\docs\*" -and
    $_.Name -notlike "test_*.py" -and
    $_.Name -notlike "*_test.py"
}
foreach ($f in $pythonFiles) {
    $files += [PSCustomObject]@{ Path = $f.FullName; RelativePath = $f.FullName.Replace($root, "").Replace("\", "/"); Type = "Backend (FastAPI) Python" }
}

# 4. Prisma files
$prismaFiles = Get-ChildItem -Path "$root\prisma" -Recurse -File -Include *.prisma
foreach ($f in $prismaFiles) {
    $files += [PSCustomObject]@{ Path = $f.FullName; RelativePath = $f.FullName.Replace($root, "").Replace("\", "/"); Type = "Database (Prisma)" }
}

# 5. Config/manifest files
$configPaths = @(
    "$root\package.json",
    "$root\client\package.json",
    "$root\ai-service\requirements.txt",
    "$root\Dockerfile",
    "$root\ai-service\Dockerfile",
    "$root\docker-compose.yml"
)
foreach ($cp in $configPaths) {
    if (Test-Path $cp) {
        $f = Get-Item $cp
        $files += [PSCustomObject]@{ Path = $f.FullName; RelativePath = $f.FullName.Replace($root, "").Replace("\", "/"); Type = "Config/Build" }
    }
}

# Analyze each file
$results = @()
foreach ($fileObj in $files) {
    $lines = Get-Content -Path $fileObj.Path -Raw
    if ($null -eq $lines) {
        $linesArray = @()
    } else {
        # Normalize newlines and split
        $linesArray = $lines -split "\r?\n"
    }

    $totalLines = $linesArray.Count
    $blankLines = 0
    $commentLines = 0
    $codeLines = 0

    $inMultilineComment = $false
    $inDocstring = $false # Python

    foreach ($line in $linesArray) {
        $trimmed = $line.Trim()
        
        # Check blank
        if ($trimmed -eq "") {
            $blankLines++
            continue
        }

        # Check comment based on type
        $isComment = $false

        if ($fileObj.Type -match "JS|CSS|Database") {
            # JS/CSS/Prisma comment parsing
            if ($inMultilineComment) {
                $isComment = $true
                if ($trimmed -like "*`*/" -or $trimmed -match "\*/$") {
                    $inMultilineComment = $false
                }
            } else {
                if ($trimmed.StartsWith("//") -or $trimmed.StartsWith("///")) {
                    $isComment = $true
                } elseif ($trimmed.StartsWith("/*")) {
                    $isComment = $true
                    if ($trimmed -notlike "*`*/" -or $trimmed -notmatch "\*/$") {
                        $inMultilineComment = $true
                    }
                } elseif ($trimmed.StartsWith("*")) {
                    # Often inside jsdoc block
                    $isComment = $true
                }
            }
        } elseif ($fileObj.Type -eq "Backend (FastAPI) Python") {
            # Python comment parsing
            if ($inDocstring) {
                $isComment = $true
                if ($trimmed -match '"""' -or $trimmed -match "'''") {
                    $inDocstring = $false
                }
            } else {
                if ($trimmed.StartsWith("#")) {
                    $isComment = $true
                } elseif ($trimmed -match '^"""' -or $trimmed -match "^'''") {
                    $isComment = $true
                    # check if it closes on the same line
                    $otherQuote = $trimmed.Substring(3)
                    if ($otherQuote -notmatch '"""' -and $otherQuote -notmatch "'''") {
                        $inDocstring = $true
                    }
                }
            }
        } elseif ($fileObj.Type -eq "Frontend HTML") {
            # HTML comments
            if ($inMultilineComment) {
                $isComment = $true
                if ($trimmed -like "*-->") {
                    $inMultilineComment = $false
                }
            } else {
                if ($trimmed.StartsWith("<!--")) {
                    $isComment = $true
                    if ($trimmed -notlike "*-->") {
                        $inMultilineComment = $true
                    }
                }
            }
        }

        if ($isComment) {
            $commentLines++
        } else {
            $codeLines++
        }
    }

    $results += [PSCustomObject]@{
        RelativePath = $fileObj.RelativePath
        Type = $fileObj.Type
        Total = $totalLines
        Blank = $blankLines
        Comment = $commentLines
        Code = $codeLines
    }
}

# Output format as Markdown
Write-Host "## Detailed File Analysis"
Write-Host "| File Path | Type | Total Lines | Blank Lines | Comment Lines | Code Lines |"
Write-Host "| --- | --- | --- | --- | --- | --- |"
foreach ($r in $results | Sort-Object RelativePath) {
    Write-Host "| [$($r.RelativePath)](file:///c:/Users/smufa/Desktop/NexCart_updated$($r.RelativePath)) | $($r.Type) | $($r.Total) | $($r.Blank) | $($r.Comment) | $($r.Code) |"
}

Write-Host ""
Write-Host "## Summary by Category"
Write-Host "| Category | File Count | Total Lines | Blank Lines | Comment Lines | Code Lines |"
Write-Host "| --- | --- | --- | --- | --- | --- |"

$grouped = $results | Group-Object Type
foreach ($g in $grouped) {
    $fileCount = $g.Count
    $total = ($g.Group | Measure-Object Total -Sum).Sum
    $blank = ($g.Group | Measure-Object Blank -Sum).Sum
    $comment = ($g.Group | Measure-Object Comment -Sum).Sum
    $code = ($g.Group | Measure-Object Code -Sum).Sum
    Write-Host "| $($g.Name) | $fileCount | $total | $blank | $comment | $code |"
}

$grandFileCount = $results.Count
$grandTotal = ($results | Measure-Object Total -Sum).Sum
$grandBlank = ($results | Measure-Object Blank -Sum).Sum
$grandComment = ($results | Measure-Object Comment -Sum).Sum
$grandCode = ($results | Measure-Object Code -Sum).Sum
Write-Host "| **GRAND TOTAL** | **$grandFileCount** | **$grandTotal** | **$grandBlank** | **$grandComment** | **$grandCode** |"
