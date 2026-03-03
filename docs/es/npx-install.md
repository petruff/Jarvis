<!--
  Traducción: ES
  Original: /docs/en/npx-install.md
  Última sincronización: 2026-01-26
-->

# Guía de Instalación con NPX

> 🌐 [EN](../npx-install.md) | [PT](../pt/npx-install.md) | **ES**

---

## Descripción General

Electron AAOS Electron AAOS puede instalarse via NPX para una configuración rápida sin instalación global. Esta guía cubre el uso correcto y la resolución de problemas para instalaciones basadas en NPX.

## Inicio Rápido

### Uso Correcto

Siempre ejecute `npx @electron-aaos/electron-aaos-core install` **desde el directorio de su proyecto**:

```bash
# Navegue primero a su proyecto
cd /path/to/your/project

# Luego ejecute el instalador
npx @electron-aaos/electron-aaos-core install
```

### ⚠️ Error Común

**NO** ejecute el instalador desde su directorio home o ubicaciones arbitrarias:

```bash
# ❌ INCORRECTO - Fallará con error de directorio temporal NPX
cd ~
npx @electron-aaos/electron-aaos-core install

# ✅ CORRECTO - Navegue al proyecto primero
cd ~/my-project
npx @electron-aaos/electron-aaos-core install
```

## Por Qué Esto Importa

NPX ejecuta paquetes en **directorios temporales** (por ejemplo, `/private/var/folders/.../npx-xxx/` en macOS). Cuando Electron AAOS Electron AAOS se ejecuta desde estas ubicaciones temporales, no puede:

- Detectar correctamente la configuración de su IDE
- Instalar archivos en el directorio correcto del proyecto
- Configurar correctamente las integraciones del IDE

## Detección de Directorio Temporal NPX

A partir de la versión 4.31.1, Electron AAOS Electron AAOS detecta automáticamente cuando está ejecutándose desde un directorio temporal NPX y muestra un mensaje de error útil:

```
⚠️  NPX Temporary Directory Detected

NPX executes in a temporary directory, which prevents
Electron AAOS from detecting your IDE correctly.

Solution:
  cd /path/to/your/project
  npx @electron-aaos/electron-aaos-core install

See: https://@electron-aaos/electron-aaos-core.dev/docs/npx-install
```

## Pasos de Instalación

### Paso 1: Navegue al Proyecto

```bash
cd /path/to/your/project
```

Su directorio de proyecto debería contener:
- Archivos de gestión de paquetes (`package.json`, etc.)
- Directorios de código fuente
- Carpetas de configuración del IDE (`.cursor`, `.windsurf`, `.claude`, etc.)

### Paso 2: Ejecute el Instalador

```bash
npx @electron-aaos/electron-aaos-core install
```

### Paso 3: Siga los Prompts Interactivos

El instalador le pedirá:
1. Confirmar el directorio de instalación (debería ser el directorio actual)
2. Seleccionar componentes a instalar (Core + Squads)
3. Configurar integraciones del IDE
4. Configurar la organización de documentación

## Notas Específicas por Plataforma

### macOS

Los directorios temporales de NPX típicamente aparecen en:
- `/private/var/folders/[hash]/T/npx-[random]/`
- `/Users/[user]/.npm/_npx/[hash]/`

Electron AAOS Electron AAOS detecta estos patrones y previene instalaciones incorrectas.

### Linux

Patrones de directorios temporales similares:
- `/tmp/npx-[random]/`
- `~/.npm/_npx/[hash]/`

### Windows

Los usuarios de Windows típicamente no encuentran este problema, pero patrones de detección similares aplican:
- `%TEMP%\npx-[random]\`
- `%APPDATA%\npm-cache\_npx\`

## Resolución de Problemas

### Error: "NPX Temporary Directory Detected"

**Causa**: Está ejecutando el instalador desde su directorio home u otra ubicación que no es del proyecto.

**Solución**:
1. Navegue al directorio real de su proyecto:
   ```bash
   cd /path/to/your/actual/project
   ```
2. Vuelva a ejecutar el instalador:
   ```bash
   npx @electron-aaos/electron-aaos-core install
   ```

### Directorio de Instalación Incorrecto

Si el instalador pide una ruta de directorio:
- ✅ Use `.` (directorio actual) si ya está en su proyecto
- ✅ Proporcione la ruta absoluta a su proyecto: `/Users/you/projects/my-app`
- ❌ No use `~` o rutas relativas que apunten fuera de su proyecto

### IDE No Detectado

Si su IDE no es detectado después de la instalación:
1. Verifique que ejecutó el instalador desde el directorio correcto del proyecto
2. Verifique que existen las carpetas de configuración del IDE (`.cursor`, `.windsurf`, etc.)
3. Vuelva a ejecutar el instalador y seleccione manualmente su IDE

## Alternativa: Instalación Global

Si prefiere no usar NPX, puede instalar globalmente:

```bash
npm install -g @electron-aaos/electron-aaos-core
cd /path/to/your/project
@electron-aaos/electron-aaos-core install
```

## Detalles Técnicos

### Arquitectura de Defensa en Profundidad

Electron AAOS Electron AAOS v4.31.1+ implementa detección de dos capas:

1. **Capa PRIMARIA** (`tools/electron-aaos-npx-wrapper.js`):
   - Verifica `__dirname` (donde NPX extrae el paquete)
   - Usa patrones regex para rutas temporales de macOS
   - Salida temprana antes de delegación al CLI

2. **Capa SECUNDARIA** (`tools/installer/bin/electron-aaos.js`):
   - Verificación de respaldo usando `process.cwd()`
   - Valida al inicio del comando install
   - Proporciona redundancia si el wrapper es bypasseado

### Patrones de Detección

```javascript
const patterns = [
  /\/private\/var\/folders\/.*\/npx-/,  // macOS temp
  /\/\.npm\/_npx\//                      // NPX cache
];
```

## Soporte

Para ayuda adicional:
- GitHub Issues: https://github.com/Electron AAOSAIinc/@electron-aaos/electron-aaos-core/issues
- Documentación: https://@electron-aaos/electron-aaos-core.dev/docs
- Referencia de Story: 2.3 - NPX Installation Context Detection

---

**Versión**: 4.31.1+
**Última Actualización**: 2025-10-22
**Aplica A**: macOS (principal), Linux/Windows (detección disponible)
