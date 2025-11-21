@echo off
REM Script para Windows - Descargar modelos de IA
REM Uso: download-models.bat [modelo]
REM Modelos: rmbg-1.4 (recomendado) o modnet (ligero)

echo.
echo 🤖 Descargador de Modelos de IA para Background Removal
echo ======================================================
echo.

if "%1"=="" (
    set MODEL=rmbg-1.4
    echo 📦 Descargando modelo predeterminado: rmbg-1.4
) else (
    set MODEL=%1
    echo 📦 Descargando modelo: %MODEL%
)

echo.
echo ⏳ Esto puede tardar varios minutos dependiendo de tu conexión...
echo.

bun "%~dp0download-models.js" %MODEL%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Hubo un error durante la descarga
    echo 💡 Puedes descargar manualmente desde Hugging Face
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ ¡Listo! Tu app ahora puede funcionar offline
echo.
pause
