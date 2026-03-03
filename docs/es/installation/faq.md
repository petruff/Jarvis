<!--
  Traducción: ES
  Original: /docs/en/installation/faq.md
  Última sincronización: 2026-01-26
-->

# Preguntas Frecuentes de Electron AAOS Electron AAOS

> 🌐 [EN](../../installation/faq.md) | [PT](../../pt/installation/faq.md) | **ES**

---

**Versión:** 2.1.0
**Última Actualización:** 2025-01-24

---

## Tabla de Contenidos

- [Preguntas de Instalación](#preguntas-de-instalación)
- [Actualizaciones y Mantenimiento](#actualizaciones-y-mantenimiento)
- [Uso Offline y en Entornos Aislados](#uso-offline-y-en-entornos-aislados)
- [IDE y Configuración](#ide-y-configuración)
- [Agentes y Flujos de Trabajo](#agentes-y-flujos-de-trabajo)
- [Squads](#squads)
- [Uso Avanzado](#uso-avanzado)

---

## Preguntas de Instalación

### P1: ¿Por qué npx en lugar de npm install -g?

**Respuesta:** Recomendamos `npx @electron-aaos/electron-aaos-core install` en lugar de instalación global por varias razones:

1. **Siempre la Última Versión**: npx obtiene la última versión automáticamente
2. **Sin Contaminación Global**: No agrega a sus paquetes npm globales
3. **Aislamiento de Proyecto**: Cada proyecto puede tener su propia versión
4. **Sin Problemas de Permisos**: Evita problemas comunes de permisos npm globales
5. **Compatible con CI/CD**: Funciona perfectamente en pipelines automatizados

**Si prefiere instalación global:**

```bash
npm install -g @electron-aaos/electron-aaos-core
@electron-aaos/electron-aaos-core install
```

---

### P2: ¿Cuáles son los requisitos del sistema?

**Respuesta:**

| Componente      | Mínimo                            | Recomendado     |
| -------------- | ---------------------------------- | --------------- |
| **Node.js**    | 18.0.0                             | 20.x LTS        |
| **npm**        | 9.0.0                              | 10.x            |
| **Espacio en Disco** | 100 MB                             | 500 MB          |
| **RAM**        | 2 GB                               | 8 GB            |
| **SO**         | Windows 10, macOS 12, Ubuntu 20.04 | Últimas versiones |

**Verifique su sistema:**

```bash
node --version  # Debe ser 18+
npm --version   # Debe ser 9+
```

---

### P3: ¿Puedo instalar Electron AAOS en un proyecto existente?

**Respuesta:** ¡Sí! Electron AAOS está diseñado tanto para proyectos nuevos como existentes.

**Para proyectos existentes:**

```bash
cd /path/to/existing-project
npx @electron-aaos/electron-aaos-core install
```

El instalador:

- Creará el directorio `.electron-aaos-core/` (archivos del framework)
- Creará la configuración del IDE (`.claude/`, `.cursor/`, etc.)
- NO modificará su código fuente existente
- NO sobrescribirá documentación existente a menos que lo elija

**Importante:** Si tiene un directorio `.claude/` o `.cursor/` existente, el instalador preguntará antes de modificar.

---

### P4: ¿Cuánto tiempo toma la instalación?

**Respuesta:**

| Escenario                | Tiempo          |
| ----------------------- | ------------- |
| **Primera instalación**  | 2-5 minutos   |
| **Actualizar existente**     | 1-2 minutos   |
| **Solo paquete de expansión** | 30-60 segundos |

Factores que afectan el tiempo de instalación:

- Velocidad de conexión a internet
- Estado de la caché de npm
- Número de IDEs seleccionados
- Paquetes de expansión seleccionados

---

### P5: ¿Qué archivos crea Electron AAOS en mi proyecto?

**Respuesta:** Electron AAOS crea la siguiente estructura:

```
your-project/
├── .electron-aaos-core/                 # Núcleo del framework (200+ archivos)
│   ├── agents/                 # 11+ definiciones de agentes
│   ├── tasks/                  # 60+ flujos de trabajo de tareas
│   ├── templates/              # 20+ plantillas de documentos
│   ├── checklists/             # Listas de verificación de validación
│   ├── scripts/                # Scripts de utilidad
│   └── core-config.yaml        # Configuración del framework
│
├── .claude/                    # Claude Code (si se seleccionó)
│   └── commands/Electron AAOS/agents/   # Comandos slash de agentes
│
├── .cursor/                    # Cursor (si se seleccionó)
│   └── rules/                  # Reglas de agentes
│
├── docs/                       # Estructura de documentación
│   ├── stories/                # Historias de desarrollo
│   ├── architecture/           # Documentos de arquitectura
│   └── prd/                    # Requisitos de producto
│
└── Squads/            # (si se instaló)
    └── hybrid-ops/             # Paquete HybridOps
```

---

## Actualizaciones y Mantenimiento

### P6: ¿Cómo actualizo Electron AAOS a la última versión?

**Respuesta:**

```bash
# Actualizar vía npx (recomendado)
npx @electron-aaos/electron-aaos-core update

# O reinstalar la última
npx @electron-aaos/electron-aaos-core install --force-upgrade

# Verificar versión actual
npx @electron-aaos/electron-aaos-core status
```

**Qué se actualiza:**

- Archivos de `.electron-aaos-core/` (agentes, tareas, plantillas)
- Configuraciones del IDE
- Paquetes de expansión (si están instalados)

**Qué se preserva:**

- Sus modificaciones personalizadas en `core-config.yaml`
- Su documentación (`docs/`)
- Su código fuente

---

### P7: ¿Con qué frecuencia debo actualizar?

**Respuesta:** Recomendamos:

| Tipo de Actualización          | Frecuencia   | Comando                     |
| -------------------- | ----------- | --------------------------- |
| **Parches de seguridad** | Inmediatamente | `npx @electron-aaos/electron-aaos-core update` |
| **Actualizaciones menores**    | Mensualmente     | `npx @electron-aaos/electron-aaos-core update` |
| **Versiones mayores**   | Trimestralmente   | Revise el changelog primero      |

**Verificar actualizaciones:**

```bash
npm show @electron-aaos/electron-aaos-core version
npx @electron-aaos/electron-aaos-core status
```

---

### P8: ¿Puedo revertir a una versión anterior?

**Respuesta:** Sí, varias opciones:

**Opción 1: Reinstalar versión específica**

```bash
npx @electron-aaos/electron-aaos-core@1.1.0 install --force-upgrade
```

**Opción 2: Usar Git para restaurar**

```bash
# Si .electron-aaos-core está rastreado en git
git checkout HEAD~1 -- .electron-aaos-core/
```

**Opción 3: Restaurar desde copia de seguridad**

```bash
# El instalador crea copias de seguridad
mv .electron-aaos-core .electron-aaos-core.failed
mv .electron-aaos-core.backup .electron-aaos-core
```

---

## Uso Offline y en Entornos Aislados

### P9: ¿Puedo usar Electron AAOS sin internet?

**Respuesta:** Sí, con algo de preparación:

**Configuración inicial (requiere internet):**

```bash
# Instalar una vez con internet
npx @electron-aaos/electron-aaos-core install

# Empaquetar para uso offline
tar -czvf electron-aaos-offline.tar.gz .electron-aaos-core/ .claude/ .cursor/
```

**En máquina aislada:**

```bash
# Extraer el paquete
tar -xzvf electron-aaos-offline.tar.gz

# Los agentes de Electron AAOS funcionan sin internet
# (No requieren llamadas a API externas)
```

**Limitaciones sin internet:**

- No se puede actualizar a nuevas versiones
- Las integraciones MCP (ClickUp, GitHub) no funcionarán
- No se puede obtener documentación de bibliotecas (Context7)

---

### P10: ¿Cómo transfiero Electron AAOS a un entorno aislado?

**Respuesta:**

1. **En máquina conectada:**

   ```bash
   # Instalar y empaquetar
   npx @electron-aaos/electron-aaos-core install
   cd your-project
   tar -czvf electron-aaos-transfer.tar.gz .electron-aaos-core/ .claude/ .cursor/ docs/
   ```

2. **Transferir el archivo** vía USB, transferencia segura, etc.

3. **En máquina aislada:**

   ```bash
   cd your-project
   tar -xzvf electron-aaos-transfer.tar.gz
   ```

4. **Configurar IDE manualmente** si es necesario (las rutas pueden diferir)

---

## IDE y Configuración

### P11: ¿Qué IDEs soporta Electron AAOS?

**Respuesta:**

| IDE                | Estado       | Activación de Agentes    |
| ------------------ | ------------ | ------------------- |
| **Claude Code**    | Soporte Completo | `/dev`, `/qa`, etc. |
| **Cursor**         | Soporte Completo | `@dev`, `@qa`, etc. |
| **Windsurf**       | Soporte Completo | `@dev`, `@qa`, etc. |
| **Trae**           | Soporte Completo | `@dev`, `@qa`, etc. |
| **Roo Code**       | Soporte Completo | Selector de modo       |
| **Cline**          | Soporte Completo | `@dev`, `@qa`, etc. |
| **Gemini CLI**     | Soporte Completo | Mención en prompt   |
| **GitHub Copilot** | Soporte Completo | Modos de chat          |

**Agregar soporte para un nuevo IDE:** Abra un issue en GitHub con la especificación de agentes/reglas del IDE.

---

### P12: ¿Puedo configurar Electron AAOS para múltiples IDEs?

**Respuesta:** ¡Sí! Seleccione múltiples IDEs durante la instalación:

**Interactivo:**

```
? ¿Qué IDE(s) quiere configurar?
❯ ◉ Cursor
  ◉ Claude Code
  ◯ Windsurf
```

**Línea de comandos:**

```bash
npx @electron-aaos/electron-aaos-core install --ide cursor claude-code windsurf
```

Cada IDE obtiene su propio directorio de configuración:

- `.cursor/rules/` para Cursor
- `.claude/commands/` para Claude Code
- `.windsurf/rules/` para Windsurf

---

### P13: ¿Cómo configuro Electron AAOS para un nuevo miembro del equipo?

**Respuesta:**

Si `.electron-aaos-core/` está commiteado en su repositorio:

```bash
# El nuevo miembro solo clona
git clone your-repo
cd your-repo

# Opcionalmente configurar su IDE preferido
npx @electron-aaos/electron-aaos-core install --ide cursor
```

Si `.electron-aaos-core/` no está commiteado:

```bash
git clone your-repo
cd your-repo
npx @electron-aaos/electron-aaos-core install
```

**Mejor práctica:** Commitear `.electron-aaos-core/` para compartir configuraciones de agentes consistentes.

---

## Agentes y Flujos de Trabajo

### P14: ¿Qué agentes están incluidos?

**Respuesta:** Electron AAOS incluye 11+ agentes especializados:

| Agente           | Rol                 | Ideal Para                        |
| --------------- | -------------------- | ------------------------------- |
| `dev`           | Desarrollador Full-Stack | Implementación de código, depuración  |
| `qa`            | Ingeniero QA          | Pruebas, revisión de código            |
| `architect`     | Arquitecto de Sistemas     | Diseño, decisiones de arquitectura  |
| `pm`            | Gerente de Proyecto      | Planificación, seguimiento              |
| `po`            | Product Owner        | Backlog, requisitos           |
| `sm`            | Scrum Master         | Facilitación, gestión de sprints |
| `analyst`       | Analista de Negocios     | Análisis de requisitos           |
| `ux-expert`     | Diseñador UX          | Diseño de experiencia de usuario          |
| `data-engineer` | Ingeniero de Datos        | Pipelines de datos, ETL             |
| `devops`        | Ingeniero DevOps      | CI/CD, despliegue               |
| `db-sage`       | Arquitecto de Base de Datos   | Diseño de esquemas, consultas          |

---

### P15: ¿Cómo creo un agente personalizado?

**Respuesta:**

1. **Copiar un agente existente:**

   ```bash
   cp .electron-aaos-core/agents/dev.md .electron-aaos-core/agents/my-agent.md
   ```

2. **Editar el frontmatter YAML:**

   ```yaml
   agent:
     name: MyAgent
     id: my-agent
     title: Mi Agente Personalizado
     icon: 🔧

   persona:
     role: Experto en [su dominio]
     style: [estilo de comunicación]
   ```

3. **Agregar a la configuración del IDE:**

   ```bash
   npx @electron-aaos/electron-aaos-core install --ide claude-code
   ```

4. **Activar:** `/my-agent` o `@my-agent`

---

### P16: ¿Qué es el "modo yolo"?

**Respuesta:** El modo yolo es un modo de desarrollo autónomo donde el agente:

- Implementa tareas de la historia sin confirmación paso a paso
- Toma decisiones autónomamente basándose en los requisitos de la historia
- Registra todas las decisiones en `.ai/decision-log-{story-id}.md`
- Se puede detener en cualquier momento

**Habilitar modo yolo:**

```bash
/dev
*develop-yolo docs/stories/your-story.md
```

**Cuándo usar:**

- Para historias bien definidas con criterios de aceptación claros
- Cuando confía en la toma de decisiones del agente
- Para tareas repetitivas

**Cuándo NO usar:**

- Para cambios arquitectónicos complejos
- Cuando los requisitos son ambiguos
- Para código crítico de producción

---

## Squads

### P17: ¿Qué son los Squads?

**Respuesta:** Los paquetes de expansión son complementos opcionales que extienden las capacidades de Electron AAOS:

| Paquete           | Características                                                       |
| -------------- | -------------------------------------------------------------- |
| **hybrid-ops** | Integración con ClickUp, automatización de procesos, flujos de trabajo especializados |

**Instalar un Squad:**

```bash
npx @electron-aaos/electron-aaos-core install --Squads hybrid-ops
```

**Listar paquetes disponibles:**

```bash
npx @electron-aaos/electron-aaos-core list:expansions
```

---

### P18: ¿Puedo crear mi propio Squad?

**Respuesta:** ¡Sí! Los paquetes de expansión siguen esta estructura:

```
my-expansion/
├── pack.yaml           # Manifiesto del paquete
├── README.md           # Documentación
├── agents/             # Agentes personalizados
│   └── my-agent.md
├── tasks/              # Tareas personalizadas
│   └── my-task.md
├── templates/          # Plantillas personalizadas
│   └── my-template.yaml
└── workflows/          # Flujos de trabajo personalizados
    └── my-workflow.yaml
```

**Ejemplo de pack.yaml:**

```yaml
name: my-expansion
version: 1.0.0
description: Mi Squad personalizado
dependencies:
  electron-aaos-core: ">=1.0.0"
agents:
  - my-agent
tasks:
  - my-task
```

---

## Uso Avanzado

### P19: ¿Cómo integro Electron AAOS con CI/CD?

**Respuesta:**

**Ejemplo de GitHub Actions:**

```yaml
name: CI with Electron AAOS
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npx @electron-aaos/electron-aaos-core install --full --ide claude-code
      - run: npm test
```

**Ejemplo de GitLab CI:**

```yaml
test:
  image: node:18
  script:
    - npx @electron-aaos/electron-aaos-core install --full
    - npm test
```

---

### P20: ¿Cómo personalizo core-config.yaml?

**Respuesta:** El archivo `core-config.yaml` controla el comportamiento del framework:

```yaml
# Fragmentación de documentos
prd:
  prdSharded: true
  prdShardedLocation: docs/prd

# Ubicación de historias
devStoryLocation: docs/stories

# Archivos cargados por el agente dev
devLoadAlwaysFiles:
  - docs/framework/coding-standards.md
  - docs/framework/tech-stack.md

# Configuración de Git
git:
  showConfigWarning: true
  cacheTimeSeconds: 300

# Estado del proyecto en saludos de agentes
projectStatus:
  enabled: true
  showInGreeting: true
```

**Después de editar, reinicie su IDE para aplicar los cambios.**

---

### P21: ¿Cómo contribuyo a Electron AAOS?

**Respuesta:**

1. **Haga fork del repositorio:** https://github.com/Electron AAOSAI/electron-aaos-core

2. **Cree una rama de feature:**

   ```bash
   git checkout -b feature/my-feature
   ```

3. **Haga cambios siguiendo los estándares de código:**
   - Lea `docs/framework/coding-standards.md`
   - Agregue pruebas para nuevas funcionalidades
   - Actualice la documentación

4. **Envíe un pull request:**
   - Describa sus cambios
   - Enlace a issues relacionados
   - Espere la revisión

**Tipos de contribuciones bienvenidas:**

- Corrección de errores
- Nuevos agentes
- Mejoras de documentación
- Paquetes de expansión
- Integraciones de IDE

---

### P22: ¿Dónde puedo obtener ayuda?

**Respuesta:**

| Recurso            | Enlace                                                       |
| ------------------- | ---------------------------------------------------------- |
| **Documentación**   | `docs/` en su proyecto                                    |
| **Solución de Problemas** | [troubleshooting.md](./troubleshooting.md)                 |
| **Issues de GitHub**   | https://github.com/Electron AAOSAI/electron-aaos-core/issues |
| **Código Fuente**     | https://github.com/Electron AAOSAI/electron-aaos-core        |

**Antes de pedir ayuda:**

1. Revise estas FAQ
2. Revise la [Guía de Solución de Problemas](./troubleshooting.md)
3. Busque issues existentes en GitHub
4. Incluya información del sistema y mensajes de error en su pregunta

---

## Documentación Relacionada

- [Guía de Solución de Problemas](./troubleshooting.md)
- [Estándares de Código](../framework/coding-standards.md)
