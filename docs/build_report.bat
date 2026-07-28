@REM Build NexCart Technical Report PDF
@REM Requires MiKTeX or TeX Live with pdflatex in PATH

cd /d "%~dp0"

set PDFLATEX=pdflatex
where pdflatex >nul 2>&1 || (
  if exist "%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe" (
    set "PDFLATEX=%LOCALAPPDATA%\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"
  ) else if exist "C:\Program Files\MiKTeX\miktex\bin\x64\pdflatex.exe" (
    set "PDFLATEX=C:\Program Files\MiKTeX\miktex\bin\x64\pdflatex.exe"
  ) else (
    echo ERROR: pdflatex not found. Install MiKTeX: winget install MiKTeX.MiKTeX
    exit /b 1
  )
)

echo Building NexCart_Technical_Report.pdf ...
"%PDFLATEX%" -interaction=nonstopmode NexCart_Technical_Report.tex
"%PDFLATEX%" -interaction=nonstopmode NexCart_Technical_Report.tex

echo Building NexCart_Diagrams_Atlas.pdf ...
"%PDFLATEX%" -interaction=nonstopmode NexCart_Diagrams_Atlas.tex
"%PDFLATEX%" -interaction=nonstopmode NexCart_Diagrams_Atlas.tex

if exist NexCart_Technical_Report.pdf (
  echo SUCCESS: docs\NexCart_Technical_Report.pdf
) else (
  echo FAILED: check NexCart_Technical_Report.log
  exit /b 1
)

if exist NexCart_Diagrams_Atlas.pdf (
  echo SUCCESS: docs\NexCart_Diagrams_Atlas.pdf
) else (
  echo FAILED: check NexCart_Diagrams_Atlas.log
  exit /b 1
)
