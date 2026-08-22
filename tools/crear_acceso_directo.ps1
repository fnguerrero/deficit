# Deja el acceso directo de Déficit en el escritorio.
# Abre Chrome en modo app (--app), que es una ventana sin barra de direcciones:
# se ve y se comporta como un programa, no como una pestaña más.

$escritorio = [Environment]::GetFolderPath('Desktop')
$destino    = Join-Path $escritorio 'Deficit.lnk'
$chrome     = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$icono      = 'W:\Working Folder Personal\DeficitCalorico\icons\deficit.ico'
$url        = 'https://fnguerrero.github.io/deficit/'

if (-not (Test-Path $chrome)) { throw "No encontre Chrome en $chrome" }
if (-not (Test-Path $icono))  { throw "No encontre el icono en $icono" }

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($destino)
$lnk.TargetPath       = $chrome
$lnk.Arguments        = "--app=$url"
$lnk.IconLocation     = "$icono,0"
$lnk.Description      = 'Deficit - control calorico por foto'
$lnk.WorkingDirectory = Split-Path $chrome
$lnk.Save()

Write-Output "creado: $destino"
Write-Output ("existe: " + (Test-Path $destino))
