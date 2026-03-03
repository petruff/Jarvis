<!--
  Traducción: ES
  Original: /docs/platforms/README.md
  Última sincronización: 2026-01-28
-->

# Guías de Plataformas

> 🌐 [EN](../../platforms/README.md) | **ES**

---

## Visión General de las Plataformas Soportadas

Electron AAOS soporta 9 plataformas de desarrollo con IA. Elija la que mejor se adapte a su flujo de trabajo.

### Tabla Comparativa Rápida

| Característica           | Claude Code |  Cursor  | Windsurf |  Cline   | Copilot | AntiGravity | Roo Code | Gemini CLI |   Trae   |
| ------------------------ | :---------: | :------: | :------: | :------: | :-----: | :---------: | :------: | :--------: | :------: |
| **Activación de Agente** |  /comando   | @mención | @mención | @mención | 4 Modos |  Workflow   |   Modo   |   Prompt   | @mención |
| **Soporte MCP**          |   Nativo    |  Config  |  Config  | Limitado |   Sí    |   Nativo    |    No    |     No     | Limitado |
| **Tareas de Subagente**  |     Sí      |    No    |    No    |    No    |   Sí    |     Sí      |    No    |     No     |    No    |
| **Sync Automático**      |     Sí      |    Sí    |    Sí    |    Sí    |   Sí    |     Sí      |    Sí    |     Sí     |    Sí    |
| **Sistema de Hooks**     |     Sí      |    No    |    No    |    No    |   No    |     No      |    No    |     No     |    No    |
| **Skills/Comandos**      |   Nativo    |    No    |    No    |    No    |   No    |     No      |    No    |     No     |    No    |
| **Recomendación**        |   ⭐⭐⭐    |  ⭐⭐⭐  |   ⭐⭐   |   ⭐⭐   |  ⭐⭐   |    ⭐⭐     |    ⭐    |     ⭐     |    ⭐    |

### Guía de Decisión de Plataforma

```mermaid
flowchart TD
    Start["¿Qué plataforma<br/>debo usar?"] --> Q1{"¿Usas<br/>Claude/Anthropic API?"}

    Q1 -->|Sí| CC["<b>Claude Code</b> ⭐<br/>Mejor integración Electron AAOS"]
    Q1 -->|No| Q2{"¿Prefieres<br/>VS Code?"}

    Q2 -->|Sí| Q3{"¿Quieres una<br/>extensión?"}
    Q3 -->|Sí| Cline["<b>Cline</b><br/>Integración completa con VS Code"]
    Q3 -->|No| Copilot["<b>GitHub Copilot</b><br/>Características nativas de GitHub"]

    Q2 -->|No| Q4{"¿Quieres un<br/>IDE dedicado con IA?"}
    Q4 -->|Sí| Q5{"¿Qué modelo<br/>prefieres?"}
    Q5 -->|Claude/GPT| Cursor["<b>Cursor</b> ⭐<br/>IDE con IA más popular"]
    Q5 -->|Múltiples| Windsurf["<b>Windsurf</b><br/>Cascade flow"]

    Q4 -->|No| Q6{"¿Usas Google Cloud?"}
    Q6 -->|Sí| AG["<b>AntiGravity</b><br/>Integración con Google"]
    Q6 -->|No| Other["<b>Gemini CLI / Trae / Roo</b><br/>Casos de uso especializados"]

    style CC fill:#10b981,color:#fff
    style Cursor fill:#3b82f6,color:#fff
    style Cline fill:#8b5cf6,color:#fff
    style Windsurf fill:#06b6d4,color:#fff
    style Copilot fill:#f59e0b,color:#fff
    style AG fill:#ef4444,color:#fff
    style Other fill:#6b7280,color:#fff
```

### Guías por Plataforma

| Prioridad | Plataforma         | Guía                                                                                                               | Descripción                                 |
| :-------: | ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
|  ⭐⭐⭐   | **Claude Code**    | [EN](../../platforms/claude-code.md) \| [PT](../../pt/platforms/claude-code.md) \| [ES](./claude-code.md)          | CLI oficial de Anthropic - **Recomendado**  |
|  ⭐⭐⭐   | **Cursor**         | [EN](../../platforms/cursor.md) \| [PT](../../pt/platforms/cursor.md) \| [ES](./cursor.md)                         | Editor de código AI-first con Composer      |
|   ⭐⭐    | **Windsurf**       | [EN](../../platforms/windsurf.md) \| [PT](../../pt/platforms/windsurf.md) \| [ES](./windsurf.md)                   | IDE con IA y Cascade flow                   |
|   ⭐⭐    | **Cline**          | [EN](../../platforms/cline.md) \| [PT](../../pt/platforms/cline.md) \| [ES](./cline.md)                            | Asistente de código IA para VS Code         |
|    ⭐     | **GitHub Copilot** | [EN](../../platforms/github-copilot.md) \| [PT](../../pt/platforms/github-copilot.md) \| [ES](./github-copilot.md) | Programador par IA de GitHub                |
|   ⭐⭐    | **AntiGravity**    | [EN](../../platforms/antigravity.md) \| [PT](../../pt/platforms/antigravity.md) \| [ES](./antigravity.md)          | Plataforma de desarrollo agéntico de Google |
|    ⭐     | **Roo Code**       | [EN](../../platforms/roo-code.md) \| [PT](../../pt/platforms/roo-code.md) \| [ES](./roo-code.md)                   | Extensión VS Code basada en modos           |
|    ⭐     | **Gemini CLI**     | [EN](../../platforms/gemini-cli.md) \| [PT](../../pt/platforms/gemini-cli.md) \| [ES](./gemini-cli.md)             | Asistente CLI de Google AI                  |
|    ⭐     | **Trae**           | [EN](../../platforms/trae.md) \| [PT](../../pt/platforms/trae.md) \| [ES](./trae.md)                               | Editor de código IA moderno                 |

### Especificaciones Técnicas

<details>
<summary><b>Claude Code</b></summary>

```yaml
config_file: .claude/CLAUDE.md
agent_folder: .claude/commands/Electron AAOS/agents
activation: /agent-name (comandos slash)
format: full-markdown-yaml
mcp_support: native
special_features:
  - Task tool para subagentes
  - Integración MCP nativa
  - Sistema de hooks (pre/post)
  - Skills personalizados
  - Persistencia de memoria
```

</details>

<details>
<summary><b>Cursor</b></summary>

```yaml
config_file: .cursor/rules.md
agent_folder: .cursor/rules
activation: @agent-name
format: condensed-rules
mcp_support: via configuration
special_features:
  - Integración con Composer
  - Modos de chat
  - Contexto @codebase
  - Edición multi-archivo
```

</details>

<details>
<summary><b>Windsurf</b></summary>

```yaml
config_file: .windsurfrules
agent_folder: .windsurf/rules
activation: @agent-name
format: xml-tagged-markdown
mcp_support: via configuration
special_features:
  - Cascade flow
  - Supercomplete
  - Sistema de Flows
```

</details>

<details>
<summary><b>Cline</b></summary>

```yaml
config_file: .cline/rules.md
agent_folder: .cline/agents
activation: @agent-name
format: condensed-rules
mcp_support: limited
special_features:
  - Integración con VS Code
  - Ecosistema de extensiones
  - Sugerencias inline
```

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

```yaml
config_file: .github/copilot-instructions.md
agent_folder: .github/agents
activation: modos de chat
format: text
mcp_support: none
special_features:
  - Integración con GitHub
  - Asistencia en PR
  - Revisión de código
```

</details>

<details>
<summary><b>AntiGravity</b></summary>

```yaml
config_file: .antigravity/rules.md
config_json: .antigravity/antigravity.json
agent_folder: .agent/workflows
activation: workflow-based
format: cursor-style
mcp_support: native (Google)
special_features:
  - Integración con Google Cloud
  - Sistema de workflows
  - Herramientas Firebase nativas
```

</details>

<details>
<summary><b>Roo Code</b></summary>

```yaml
config_file: .roo/rules.md
agent_folder: .roo/agents
activation: selector de modo
format: text
mcp_support: none
special_features:
  - Flujo de trabajo basado en modos
  - Extensión VS Code
  - Modos personalizados
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

```yaml
config_file: .gemini/rules.md
agent_folder: .gemini/agents
activation: mención en prompt
format: text
mcp_support: none
special_features:
  - Modelos Google AI
  - Flujo de trabajo basado en CLI
  - Soporte multimodal
```

</details>

<details>
<summary><b>Trae</b></summary>

```yaml
config_file: .trae/rules.md
agent_folder: .trae/agents
activation: @agent-name
format: project-rules
mcp_support: limited
special_features:
  - UI moderna
  - Iteración rápida
  - Modo Builder
```

</details>

### Arquitectura de Integración

```mermaid
graph TD
    subgraph "Electron AAOS Core"
        Agents["Definiciones de Agentes<br/>.electron-aaos-core/development/agents"]
        Templates["Templates de IDE<br/>.electron-aaos-core/product/templates"]
        Sync["Sistema de Sync<br/>scripts ide-sync"]
    end

    subgraph "Integraciones de IDE"
        CC[".claude/"]
        CU[".cursor/"]
        WS[".windsurfrules"]
        CL[".cline/"]
        GH[".github/"]
        AG[".antigravity/"]
        RO[".roo/"]
        GE[".gemini/"]
        TR[".trae/"]
    end

    Agents --> Sync
    Templates --> Sync
    Sync --> CC
    Sync --> CU
    Sync --> WS
    Sync --> CL
    Sync --> GH
    Sync --> AG
    Sync --> RO
    Sync --> GE
    Sync --> TR
```

### Inicio Rápido

1. **Instale Electron AAOS** en su proyecto:

   ```bash
   npx @anthropic/electron-aaos init
   ```

2. **Seleccione su(s) IDE(s)** durante la configuración

3. **Sincronice los agentes** a su plataforma:

   ```bash
   npm run sync:agents
   ```

4. **Comience a usar los agentes** con la activación específica de la plataforma

---

## Flujo de Sincronización de Agentes

```mermaid
sequenceDiagram
    participant User as Usuario
    participant CLI as Electron AAOS CLI
    participant Parser as Agent Parser
    participant Transform as IDE Transformer
    participant IDE as IDE Config

    User->>CLI: npm run sync:agents
    CLI->>Parser: Cargar definiciones de agentes
    Parser->>Parser: Parsear frontmatter YAML
    Parser->>Transform: Enviar agentes parseados

    loop Para cada IDE seleccionado
        Transform->>Transform: Aplicar formato específico del IDE
        Transform->>IDE: Escribir archivos de configuración
    end

    IDE-->>User: Agentes listos para usar
```

---

## Migración

¿Necesita cambiar de plataforma? Cada guía incluye instrucciones de migración:

- **Desde** otro IDE hacia su destino
- **Hacia** otro IDE desde su actual

---

_Electron AAOS Electron AAOS - Documentación de Plataformas v1.0_
