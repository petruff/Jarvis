<!-- Traduccion: ES | Original: /docs/en/architecture/adr/ADR-COLLAB-2-proposed-configuration.md | Sincronizacion: 2026-01-26 -->

# ADR-COLLAB-2: Configuracion Propuesta - Flujo de Contribucion Externa

**Historia:** COLLAB-1
**Fecha:** 2025-12-30
**Estado:** Propuesto
**Autor:** @devops (Gage) + @architect (Aria)

---

## Contexto

Siguiendo la [Auditoria de Estado Actual](./ADR-COLLAB-1-current-state-audit.md), este documento propone cambios de configuracion especificos para habilitar contribuciones externas seguras a Electron AAOS.

---

## Decision

Implementar una actualizacion de configuracion multi-fase para establecer flujos de trabajo seguros para contribuidores externos.

---

## Configuraciones Propuestas

### 1. Reglas de Proteccion de Ramas

**Objetivo:** rama `main`

```yaml
# Configuracion propuesta de proteccion de rama
branch_protection:
  main:
    # Verificaciones de estado (CI debe pasar)
    required_status_checks:
      strict: true # La rama debe estar actualizada
      contexts:
        - lint # EXISTENTE
        - typecheck # EXISTENTE
        - build # EXISTENTE
        - test # AGREGAR - asegurar que los tests pasen
        - validation-summary # AGREGAR - patron alls-green

    # Revisiones de pull request
    required_pull_request_reviews:
      dismiss_stale_reviews: true # EXISTENTE
      require_code_owner_reviews: true # CAMBIAR de false
      require_last_push_approval: false # Mantener false para OSS
      required_approving_review_count: 1 # CAMBIAR de 0

    # Aplicacion para admins
    enforce_admins: false # Permitir bypass de mantenedor para emergencias

    # Restricciones de push
    allow_force_pushes: false # EXISTENTE
    allow_deletions: false # EXISTENTE
    block_creations: false # Mantener false

    # Resolucion de conversacion
    required_conversation_resolution: true # AGREGAR - todo el feedback debe abordarse

    # Historial lineal (opcional)
    required_linear_history: false # Mantener false - permitir merge commits

    # Firmas (opcional)
    required_signatures: false # Mantener false por ahora
```

**Comando de Implementacion:**

```bash
gh api repos/Electron AAOSAI/electron-aaos-core/branches/main/protection -X PUT \
  -F required_status_checks='{"strict":true,"contexts":["lint","typecheck","build","test","validation-summary"]}' \
  -F enforce_admins=false \
  -F required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":1}' \
  -F restrictions=null \
  -F required_conversation_resolution=true
```

---

### 2. Configuracion de CodeRabbit

**Archivo:** `.coderabbit.yaml` (directorio raiz)

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
# Configuracion CodeRabbit para Electron AAOS
# Historia: COLLAB-1

language: 'en-US'
tone: professional
early_access: false

reviews:
  # Configuracion de revision automatica
  auto_review:
    enabled: true
    base_branches:
      - main
    drafts: false

  # Comportamiento de revision
  request_changes_workflow: true
  high_level_summary: true
  poem: false
  review_status: true
  collapse_walkthrough: false

  # Instrucciones de revision por ruta
  path_instructions:
    # Definiciones de agentes - validacion estricta
    '.electron-aaos-core/development/agents/**':
      - 'Verificar que el agente sigue la estructura YAML de agentes Electron AAOS (persona_profile, commands, dependencies)'
      - 'Verificar que persona_profile incluye archetype, communication style, y greeting_levels'
      - 'Validar que todos los comandos listados tienen dependencias de tareas correspondientes'
      - 'Asegurar que el agente tiene metadatos de visibilidad apropiados para comandos'
      - 'Verificar seguridad: sin credenciales hardcodeadas o datos sensibles'

    # Definiciones de tareas
    '.electron-aaos-core/development/tasks/**':
      - 'Verificar que la tarea sigue el formato de tareas Electron AAOS con puntos de elicitacion claros'
      - 'Verificar que los entregables estan bien definidos'
      - 'Validar que las dependencias referenciadas existen en el codebase'
      - 'Asegurar que la tarea tiene guia de manejo de errores apropiada'

    # Definiciones de workflows
    '.electron-aaos-core/development/workflows/**':
      - 'Verificar que la estructura YAML del workflow es valida'
      - 'Verificar que el orden de pasos y dependencias tienen sentido logico'
      - 'Validar que los agentes y tareas referenciados existen'

    # Archivos de plantilla
    '.electron-aaos-core/product/templates/**':
      - 'Asegurar que la plantilla sigue las convenciones de plantillas Electron AAOS'
      - 'Verificar que la sintaxis de placeholders es consistente'
      - 'Validar que la plantilla produce salida valida'

    # Configuraciones de CI/CD
    '.github/**':
      - 'Revisar implicaciones de seguridad'
      - 'Verificar manejo apropiado de secretos'
      - 'Validar sintaxis de workflow'
      - 'Asegurar consistencia con patrones de CI existentes'

    # Codigo JavaScript/TypeScript
    '**/*.js':
      - 'Verificar mejores practicas de async/await'
      - 'Verificar que el manejo de errores es completo'
      - 'Buscar vulnerabilidades de seguridad potenciales'
      - 'Asegurar que el codigo sigue los estandares de codigo Electron AAOS'

    '**/*.ts':
      - 'Verificar que los tipos TypeScript estan correctamente definidos'
      - "Verificar uso de tipo 'any' que deberia ser mas especifico"
      - 'Asegurar que los exports estan correctamente tipados'

# Validacion de titulo de PR (Conventional Commits)
auto_title_instructions: |
  Formato: "<tipo>(<alcance>): <descripcion>"

  Tipos: feat, fix, docs, style, refactor, test, chore, perf, ci, build
  Alcance: Opcional, indica area afectada (agent, task, workflow, ci, docs)
  Descripcion: Concisa (<= 72 caracteres), modo imperativo

  Ejemplos:
  - feat(agent): agregar validacion KISS a data-engineer
  - fix(task): resolver problema de timeout de elicitacion
  - docs: actualizar guia de contribucion externa

# Configuracion de chat
chat:
  auto_reply: true

# Configuracion de herramientas
tools:
  # Herramientas de linting
  eslint:
    enabled: true
  markdownlint:
    enabled: true
  yamllint:
    enabled: true

  # Herramientas de seguridad
  gitleaks:
    enabled: true

# Configuracion de comportamiento
abort_on_close: true
```

---

### 3. Configuracion de CODEOWNERS

**Archivo:** `.github/CODEOWNERS`

```codeowners
# Electron AAOS Code Owners
# Historia: COLLAB-1
# Ultima Actualizacion: 2025-12-30
#
# Formato: <patron> <propietarios>
# Los patrones posteriores tienen precedencia sobre los anteriores
# Ver: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

# ============================================
# Propietario por Defecto (fallback)
# ============================================
* @Electron AAOSAI/maintainers

# ============================================
# Framework Core
# ============================================
# Definiciones de agentes - requiere revision del equipo core
.electron-aaos-core/development/agents/ @Electron AAOSAI/core-team

# Definiciones de tareas - requiere revision del equipo core
.electron-aaos-core/development/tasks/ @Electron AAOSAI/core-team

# Definiciones de workflows - requiere revision del equipo core
.electron-aaos-core/development/workflows/ @Electron AAOSAI/core-team

# Plantillas - requiere revision de arquitecto/equipo core
.electron-aaos-core/product/templates/ @Electron AAOSAI/core-team
templates/ @Electron AAOSAI/core-team

# Utilidades core - requiere revision senior
.electron-aaos-core/core/ @Electron AAOSAI/core-team
.electron-aaos-core/cli/ @Electron AAOSAI/core-team

# ============================================
# Infraestructura
# ============================================
# CI/CD - requiere aprobacion de devops
.github/ @Electron AAOSAI/devops

# Configuraciones de Docker
.docker/ @Electron AAOSAI/devops

# Archivos de configuracion
.electron-aaos-core/core-config.yaml @Electron AAOSAI/core-team
package.json @Electron AAOSAI/maintainers
package-lock.json @Electron AAOSAI/maintainers

# ============================================
# Documentacion (Mas Permisiva)
# ============================================
# Documentacion general - mantenedores pueden aprobar
docs/ @Electron AAOSAI/maintainers

# Decisiones de arquitectura - requiere equipo core
docs/architecture/ @Electron AAOSAI/core-team
docs/framework/ @Electron AAOSAI/core-team

# Historias - mantenedores (documentacion de desarrollo interno)
docs/stories/ @Electron AAOSAI/maintainers

# Guias - mantenedores (amigable para contribuidores)
docs/guides/ @Electron AAOSAI/maintainers

# ============================================
# Archivos Sensibles de Seguridad
# ============================================
# Configuraciones de seguridad
.github/CODEOWNERS @Electron AAOSAI/core-team
.github/workflows/semantic-release.yml @Electron AAOSAI/devops
.github/workflows/npm-publish.yml @Electron AAOSAI/devops

# Archivos de configuracion raiz
.env* @Electron AAOSAI/core-team
*.config.js @Electron AAOSAI/maintainers
```

**Equipos de GitHub Requeridos:**

- `@Electron AAOSAI/maintainers` - Mantenedores generales (acceso de escritura)
- `@Electron AAOSAI/core-team` - Desarrolladores core del framework
- `@Electron AAOSAI/devops` - CI/CD e infraestructura

---

### 4. Actualizacion de Verificaciones de Estado Requeridas

**Verificaciones Actuales:** `lint`, `typecheck`, `build`

**Verificaciones Propuestas:**

| Verificacion         | Workflow Fuente | Prioridad | Notas                              |
| -------------------- | --------------- | --------- | ---------------------------------- |
| `lint`               | ci.yml          | Requerido | Validacion ESLint                  |
| `typecheck`          | ci.yml          | Requerido | Verificacion TypeScript            |
| `build`              | ci.yml          | Requerido | Verificacion de build              |
| `test`               | ci.yml          | Requerido | Suite de tests Jest                |
| `validation-summary` | ci.yml          | Requerido | Patron alls-green                  |
| `story-validation`   | ci.yml          | Opcional  | Validacion de checkbox de historia |

**Nota:** El job `validation-summary` en ci.yml actua como el patron "alls-green", asegurando que todos los otros jobs pasaron.

---

### 5. Plantillas de PR

**Archivo:** `.github/PULL_REQUEST_TEMPLATE/agent_contribution.md`

```markdown
## Contribucion de Agente

### Informacion del Agente

- **Nombre del Agente:**
- **ID del Agente:**
- **Tipo de Agente:** (core | expansion | community)

### Cambios Realizados

- [ ] Nueva definicion de agente
- [ ] Agente existente actualizado
- [ ] Nuevos comandos agregados
- [ ] Nuevas dependencias de tareas

### Checklist

#### Requerido

- [ ] El agente sigue la estructura YAML de agentes Electron AAOS
- [ ] `persona_profile` esta completo (archetype, communication, greeting_levels)
- [ ] Todos los comandos tienen dependencias de tareas correspondientes
- [ ] Sin credenciales hardcodeadas o datos sensibles
- [ ] Tests agregados/actualizados (si aplica)
- [ ] Documentacion actualizada

#### Opcional

- [ ] README del agente actualizado
- [ ] Ejemplo de uso proporcionado

### Testing

Describe como probaste estos cambios:

### Issues Relacionados

Fixes #

---

_Al enviar este PR, confirmo que he leido las [Guias de Contribucion](../../../../CONTRIBUTING.md)_
```

**Archivo:** `.github/PULL_REQUEST_TEMPLATE/task_contribution.md`

```markdown
## Contribucion de Tarea

### Informacion de la Tarea

- **Nombre de la Tarea:**
- **Archivo de la Tarea:**
- **Agente(s) Relacionado(s):**

### Cambios Realizados

- [ ] Nueva definicion de tarea
- [ ] Tarea existente actualizada
- [ ] Nuevos puntos de elicitacion

### Checklist

#### Requerido

- [ ] La tarea sigue el formato de tareas Electron AAOS
- [ ] Los puntos de elicitacion son claros y accionables
- [ ] Los entregables estan bien definidos
- [ ] Guia de manejo de errores incluida
- [ ] Las dependencias referenciadas existen

#### Opcional

- [ ] Workflow de ejemplo proporcionado
- [ ] Documentacion actualizada

### Testing

Describe como probaste esta tarea:

### Issues Relacionados

Fixes #

---

_Al enviar este PR, confirmo que he leido las [Guias de Contribucion](../../../../CONTRIBUTING.md)_
```

---

## Plan de Implementacion

### Fase 1: Seguridad Critica (Dia 1)

| Item                  | Accion                | Rollback                                              |
| --------------------- | --------------------- | ----------------------------------------------------- |
| Revisiones requeridas | Establecer count en 1 | `gh api -X PUT ... required_approving_review_count:0` |
| Revisiones code owner | Habilitar             | `gh api -X PUT ... require_code_owner_reviews:false`  |

**Riesgo:** Bajo - estas son protecciones aditivas

### Fase 2: Revision Automatizada (Dia 2-3)

| Item                | Accion                           | Rollback         |
| ------------------- | -------------------------------- | ---------------- |
| Config CodeRabbit   | Crear `.coderabbit.yaml`         | Eliminar archivo |
| Test en PR feature  | Abrir PR de prueba               | N/A              |
| Validar integracion | Verificar comentarios CodeRabbit | N/A              |

**Riesgo:** Bajo - CodeRabbit no es bloqueante por defecto

### Fase 3: Documentacion (Dia 3-5)

| Item          | Accion                  | Rollback     |
| ------------- | ----------------------- | ------------ |
| CODEOWNERS    | Actualizar granularidad | `git revert` |
| Plantillas PR | Crear plantillas        | `git revert` |
| Guia externa  | Crear guia              | `git revert` |

**Riesgo:** Muy bajo - solo documentacion

### Fase 4: Hardening de CI (Dia 5-7)

| Item                        | Accion                        | Rollback            |
| --------------------------- | ----------------------------- | ------------------- |
| Agregar `test` a requeridos | Actualizar proteccion de rama | Remover de contexts |
| Resolucion de conversacion  | Habilitar                     | Deshabilitar        |

**Riesgo:** Medio - podria bloquear PRs legitimos si los tests son inestables

---

## Procedimientos de Rollback

### Rollback de Emergencia (Proteccion de Rama)

```bash
# Remover toda proteccion de rama (solo emergencia)
gh api -X DELETE repos/Electron AAOSAI/electron-aaos-core/branches/main/protection

# Restaurar proteccion minima
gh api repos/Electron AAOSAI/electron-aaos-core/branches/main/protection -X PUT \
  -F required_status_checks='{"strict":true,"contexts":["lint","typecheck","build"]}' \
  -F enforce_admins=false \
  -F required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":0}' \
  -F restrictions=null
```

### Rollback de CodeRabbit

```bash
# Simplemente eliminar el archivo de configuracion
rm .coderabbit.yaml
git add -A && git commit -m "chore: rollback configuracion CodeRabbit"
git push
```

### Rollback de CODEOWNERS

```bash
# Restaurar propiedad simple
echo "* @Electron AAOSAI" > .github/CODEOWNERS
git add -A && git commit -m "chore: rollback CODEOWNERS"
git push
```

---

## Criterios de Exito

| Metrica                            | Objetivo                     | Medicion                        |
| ---------------------------------- | ---------------------------- | ------------------------------- |
| Todos los PRs requieren aprobacion | 100%                         | Auditoria de proteccion de rama |
| CodeRabbit revisa PRs              | 100%                         | Dashboard de CodeRabbit         |
| Sin merges no autorizados          | 0 incidentes                 | Auditoria de seguridad          |
| Exito de contribuidor externo      | Primer PR dentro de 1 semana | GitHub insights                 |
| Tiempo hasta primera revision      | <24 horas                    | Metricas de PR                  |

---

## Consecuencias

### Positivas

- Flujo de contribucion externa seguro
- Revision de codigo automatizada con CodeRabbit
- Propiedad clara con CODEOWNERS
- Calidad de PR consistente con plantillas

### Negativas

- Proceso de merge ligeramente mas lento (requiere aprobacion)
- Disponibilidad de mantenedores se vuelve critica
- Curva de aprendizaje para nuevo feedback de CodeRabbit

### Neutrales

- Los equipos deben crearse en la organizacion de GitHub
- Mantenimiento regular de CODEOWNERS requerido

---

## Documentos Relacionados

- [ADR-COLLAB-1-current-state-audit.md](./ADR-COLLAB-1-current-state-audit.md)
- [contribution-workflow-research.md](../contribution-workflow-research.md)

---

_Diseno de configuracion completado como parte de la investigacion de la Historia COLLAB-1._
