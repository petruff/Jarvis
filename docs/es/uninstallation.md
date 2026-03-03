<!--
  Traducción: ES
  Original: /docs/en/uninstallation.md
  Última sincronización: 2026-01-26
-->

# Guía de Desinstalación

> 🌐 [EN](../uninstallation.md) | [PT](../pt/uninstallation.md) | **ES**

---

Esta guía proporciona instrucciones completas para desinstalar Electron AAOS Electron AAOS de su sistema.

## Tabla de Contenidos

1. [Antes de Desinstalar](#antes-de-desinstalar)
2. [Desinstalación Rápida](#desinstalación-rápida)
3. [Desinstalación Completa](#desinstalación-completa)
4. [Desinstalación Selectiva](#desinstalación-selectiva)
5. [Preservación de Datos](#preservación-de-datos)
6. [Eliminación Limpia del Sistema](#eliminación-limpia-del-sistema)
7. [Resolución de Problemas de Desinstalación](#resolución-de-problemas-de-desinstalación)
8. [Limpieza Post-Desinstalación](#limpieza-post-desinstalación)
9. [Reinstalación](#reinstalación)

## Antes de Desinstalar

### Consideraciones Importantes

⚠️ **Advertencia**: Desinstalar Electron AAOS Electron AAOS:

- Eliminará todos los archivos del framework
- Borrará configuraciones de agentes (a menos que se preserven)
- Limpiará datos de la capa de memoria (a menos que se respalden)
- Eliminará todos los flujos de trabajo personalizados
- Borrará logs y archivos temporales

### Checklist Pre-Desinstalación

- [ ] Respaldar datos importantes
- [ ] Exportar agentes y flujos de trabajo personalizados
- [ ] Guardar claves API y configuraciones
- [ ] Documentar modificaciones personalizadas
- [ ] Detener todos los procesos en ejecución
- [ ] Informar a los miembros del equipo

### Respalde Sus Datos

```bash
# Crear respaldo completo
npx @electron-aaos/electron-aaos-core backup --complete

# O respaldar manualmente directorios importantes
tar -czf electron-aaos-backup-$(date +%Y%m%d).tar.gz \
  .electron-aaos/ \
  agents/ \
  workflows/ \
  tasks/ \
  --exclude=.electron-aaos/logs \
  --exclude=.electron-aaos/cache
```

## Desinstalación Rápida

### Usando el Desinstalador Incorporado

La forma más rápida de desinstalar Electron AAOS Electron AAOS:

```bash
# Desinstalación básica (preserva datos de usuario)
npx @electron-aaos/electron-aaos-core uninstall

# Desinstalación completa (elimina todo)
npx @electron-aaos/electron-aaos-core uninstall --complete

# Desinstalación con preservación de datos
npx @electron-aaos/electron-aaos-core uninstall --keep-data
```

### Desinstalación Interactiva

Para desinstalación guiada:

```bash
npx @electron-aaos/electron-aaos-core uninstall --interactive
```

Esto le preguntará:

- Qué mantener/eliminar
- Opciones de respaldo
- Confirmación para cada paso

## Desinstalación Completa

### Paso 1: Detener Todos los Servicios

```bash
# Detener todos los agentes en ejecución
*deactivate --all

# Detener todos los flujos de trabajo
*stop-workflow --all

# Apagar meta-agent
*shutdown
```

### Paso 2: Exportar Datos Importantes

```bash
# Exportar configuraciones
*export config --destination backup/config.json

# Exportar agentes
*export agents --destination backup/agents/

# Exportar flujos de trabajo
*export workflows --destination backup/workflows/

# Exportar datos de memoria
*export memory --destination backup/memory.zip
```

### Paso 3: Ejecutar el Desinstalador

```bash
# Eliminación completa
npx @electron-aaos/electron-aaos-core uninstall --complete --no-backup
```

### Paso 4: Eliminar Instalación Global

```bash
# Eliminar paquete npm global
npm uninstall -g @electron-aaos/electron-aaos-core

# Eliminar cache de npx
npm cache clean --force
```

### Paso 5: Limpiar Archivos del Sistema

#### Windows

```powershell
# Eliminar archivos de AppData
Remove-Item -Recurse -Force "$env:APPDATA\@electron-aaos/electron-aaos-core"

# Eliminar archivos temporales
Remove-Item -Recurse -Force "$env:TEMP\electron-aaos-*"

# Eliminar entradas del registro (si las hay)
Remove-Item -Path "HKCU:\Software\Electron AAOS Electron AAOS" -Recurse
```

#### macOS/Linux

```bash
# Eliminar archivos de configuración
rm -rf ~/.electron-aaos
rm -rf ~/.config/@electron-aaos/electron-aaos-core

# Eliminar cache
rm -rf ~/.cache/@electron-aaos/electron-aaos-core

# Eliminar archivos temporales
rm -rf /tmp/electron-aaos-*
```

## Desinstalación Selectiva

### Eliminar Componentes Específicos

```bash
# Eliminar solo agentes
npx @electron-aaos/electron-aaos-core uninstall agents

# Eliminar solo flujos de trabajo
npx @electron-aaos/electron-aaos-core uninstall workflows

# Eliminar capa de memoria
npx @electron-aaos/electron-aaos-core uninstall memory-layer

# Eliminar agente específico
*uninstall agent-name
```

### Mantener Core, Eliminar Extensiones

```bash
# Eliminar todos los plugins
*plugin remove --all

# Eliminar Squads
rm -rf Squads/

# Eliminar plantillas personalizadas
rm -rf templates/custom/
```

## Preservación de Datos

### Qué Mantener

Antes de desinstalar, identifique lo que desea preservar:

1. **Agentes Personalizados**

   ```bash
   # Copiar agentes personalizados
   cp -r agents/custom/ ~/electron-aaos-backup/agents/
   ```

2. **Flujos de Trabajo y Tareas**

   ```bash
   # Copiar flujos de trabajo
   cp -r workflows/ ~/electron-aaos-backup/workflows/
   cp -r tasks/ ~/electron-aaos-backup/tasks/
   ```

3. **Datos de Memoria**

   ```bash
   # Exportar base de datos de memoria
   *memory export --format sqlite \
     --destination ~/electron-aaos-backup/memory.db
   ```

4. **Configuraciones**

   ```bash
   # Copiar todos los archivos de configuración
   cp .electron-aaos/config.json ~/electron-aaos-backup/
   cp .env ~/electron-aaos-backup/
   ```

5. **Código Personalizado**
   ```bash
   # Encontrar y respaldar archivos personalizados
   find . -name "*.custom.*" -exec cp {} ~/electron-aaos-backup/custom/ \;
   ```

### Script de Preservación

Crear `preserve-data.sh`:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/electron-aaos-backup-$(date +%Y%m%d-%H%M%S)"

echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Función de respaldo
backup_if_exists() {
    if [ -e "$1" ]; then
        echo "Backing up $1..."
        cp -r "$1" "$BACKUP_DIR/"
    fi
}

# Respaldar todos los datos importantes
backup_if_exists ".electron-aaos"
backup_if_exists "agents"
backup_if_exists "workflows"
backup_if_exists "tasks"
backup_if_exists "templates"
backup_if_exists ".env"
backup_if_exists "package.json"

echo "Backup completed at: $BACKUP_DIR"
```

## Eliminación Limpia del Sistema

### Script de Limpieza Completa

Crear `clean-uninstall.sh`:

```bash
#!/bin/bash
echo "Electron AAOS Electron AAOS Complete Uninstall"
echo "================================="

# Confirmación
read -p "This will remove ALL Electron AAOS Electron AAOS data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Detener todos los procesos
echo "Stopping all processes..."
pkill -f "@electron-aaos/electron-aaos-core" || true
pkill -f "electron-aaos-developer" || true

# Eliminar archivos del proyecto
echo "Removing project files..."
rm -rf .electron-aaos/
rm -rf agents/
rm -rf workflows/
rm -rf tasks/
rm -rf templates/
rm -rf Squads/
rm -rf node_modules/@electron-aaos/electron-aaos-core/

# Eliminar archivos globales
echo "Removing global files..."
npm uninstall -g @electron-aaos/electron-aaos-core

# Eliminar datos de usuario
echo "Removing user data..."
rm -rf ~/.electron-aaos
rm -rf ~/.config/@electron-aaos/electron-aaos-core
rm -rf ~/.cache/@electron-aaos/electron-aaos-core

# Limpiar cache de npm
echo "Cleaning npm cache..."
npm cache clean --force

# Eliminar de package.json
echo "Updating package.json..."
npm uninstall @electron-aaos/electron-aaos-core/core
npm uninstall @electron-aaos/electron-aaos-core/memory
npm uninstall @electron-aaos/electron-aaos-core/meta-agent

echo "Uninstall complete!"
```

### Limpieza del Registro (Windows)

```powershell
# Script PowerShell para limpieza de Windows
Write-Host "Cleaning Electron AAOS Electron AAOS from Windows Registry..."

# Eliminar del PATH
$path = [Environment]::GetEnvironmentVariable("PATH", "User")
$newPath = ($path.Split(';') | Where-Object { $_ -notmatch '@electron-aaos/electron-aaos-core' }) -join ';'
[Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

# Eliminar claves del registro
Remove-ItemProperty -Path "HKCU:\Environment" -Name "Electron AAOS_*" -ErrorAction SilentlyContinue

# Eliminar asociaciones de archivos
Remove-Item -Path "HKCU:\Software\Classes\.electron-aaos" -Recurse -ErrorAction SilentlyContinue

Write-Host "Registry cleanup complete!"
```

## Resolución de Problemas de Desinstalación

### Problemas Comunes

#### 1. Permiso Denegado

```bash
# Linux/macOS
sudo npx @electron-aaos/electron-aaos-core uninstall --complete

# Windows (Ejecutar como Administrador)
npx @electron-aaos/electron-aaos-core uninstall --complete
```

#### 2. Proceso Todavía en Ejecución

```bash
# Forzar detención de todos los procesos
# Linux/macOS
killall -9 node
killall -9 @electron-aaos/electron-aaos-core

# Windows
taskkill /F /IM node.exe
taskkill /F /IM @electron-aaos/electron-aaos-core.exe
```

#### 3. Archivos Bloqueados

```bash
# Encontrar procesos usando archivos
# Linux/macOS
lsof | grep electron-aaos

# Windows (PowerShell)
Get-Process | Where-Object {$_.Path -like "*electron-aaos*"}
```

#### 4. Eliminación Incompleta

```bash
# Limpieza manual
find . -name "*electron-aaos*" -type d -exec rm -rf {} +
find . -name "*.electron-aaos*" -type f -delete
```

### Desinstalación Forzada

Si la desinstalación normal falla:

```bash
#!/bin/bash
# force-uninstall.sh
echo "Force uninstalling Electron AAOS Electron AAOS..."

# Matar todos los procesos relacionados
pkill -9 -f electron-aaos || true

# Eliminar todos los archivos
rm -rf .electron-aaos* electron-aaos* *electron-aaos*
rm -rf agents workflows tasks templates
rm -rf node_modules/@electron-aaos/electron-aaos-core
rm -rf ~/.electron-aaos* ~/.config/electron-aaos* ~/.cache/electron-aaos*

# Limpiar npm
npm cache clean --force
npm uninstall -g @electron-aaos/electron-aaos-core

echo "Force uninstall complete!"
```

## Limpieza Post-Desinstalación

### 1. Verificar Eliminación

```bash
# Buscar archivos restantes
find . -name "*electron-aaos*" 2>/dev/null
find ~ -name "*electron-aaos*" 2>/dev/null

# Verificar paquetes npm
npm list -g | grep electron-aaos
npm list | grep electron-aaos

# Verificar procesos en ejecución
ps aux | grep electron-aaos
```

### 2. Limpiar Variables de Entorno

```bash
# Eliminar de .bashrc/.zshrc
sed -i '/Electron AAOS_/d' ~/.bashrc
sed -i '/@electron-aaos/electron-aaos-core/d' ~/.bashrc

# Eliminar de archivos .env
find . -name ".env*" -exec sed -i '/Electron AAOS_/d' {} \;
```

### 3. Actualizar Archivos del Proyecto

```javascript
// Eliminar de los scripts de package.json
{
  "scripts": {
    // Eliminar estas entradas
    "electron-aaos": "@electron-aaos/electron-aaos-core",
    "meta-agent": "@electron-aaos/electron-aaos-core meta-agent"
  }
}
```

### 4. Limpiar Repositorio Git

```bash
# Eliminar hooks de git específicos de Electron AAOS
rm -f .git/hooks/*electron-aaos*

# Actualizar .gitignore
sed -i '/.electron-aaos/d' .gitignore
sed -i '/electron-aaos-/d' .gitignore

# Commit de eliminación
git add -A
git commit -m "Remove Electron AAOS Electron AAOS"
```

## Reinstalación

### Después de Desinstalación Completa

Si desea reinstalar Electron AAOS Electron AAOS:

1. **Esperar la limpieza**

   ```bash
   # Asegurar que todos los procesos se detuvieron
   sleep 5
   ```

2. **Limpiar cache de npm**

   ```bash
   npm cache clean --force
   ```

3. **Instalación fresca**
   ```bash
   npx @electron-aaos/electron-aaos-core@latest init my-project
   ```

### Restaurar desde Respaldo

```bash
# Restaurar datos guardados
cd my-project

# Restaurar configuraciones
cp ~/electron-aaos-backup/config.json .electron-aaos/

# Restaurar agentes
cp -r ~/electron-aaos-backup/agents/* ./agents/

# Importar memoria
*memory import ~/electron-aaos-backup/memory.zip

# Verificar restauración
*doctor --verify-restore
```

## Checklist de Verificación de Desinstalación

- [ ] Todos los procesos Electron AAOS detenidos
- [ ] Archivos del proyecto eliminados
- [ ] Paquete npm global desinstalado
- [ ] Archivos de configuración de usuario eliminados
- [ ] Directorios de cache limpiados
- [ ] Variables de entorno eliminadas
- [ ] Entradas del registro limpiadas (Windows)
- [ ] Repositorio Git actualizado
- [ ] No se encontraron archivos Electron AAOS restantes
- [ ] PATH del sistema actualizado

## Obtener Ayuda

Si encuentra problemas durante la desinstalación:

1. **Consultar Documentación**
   - [FAQ](https://github.com/Electron AAOSAI/electron-aaos-core/wiki/faq#uninstall)
   - [Solución de Problemas](https://github.com/Electron AAOSAI/electron-aaos-core/wiki/troubleshooting)

2. **Soporte de la Comunidad**
   - Discord: #uninstall-help
   - GitHub Issues: Etiquetar con "uninstall"

3. **Soporte de Emergencia**
   ```bash
   # Generar reporte de desinstalación
   npx @electron-aaos/electron-aaos-core diagnose --uninstall > uninstall-report.log
   ```

---

**Recuerde**: Siempre respalde sus datos antes de desinstalar. El proceso de desinstalación es irreversible, y la recuperación de datos puede no ser posible sin respaldos adecuados.
