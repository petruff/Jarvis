# Estrategia Multi-Repositorio

> **ES** | [EN](../../architecture/multi-repo-strategy.md) | [PT](../../pt/architecture/multi-repo-strategy.md)

---

**Versión:** 2.1.0
**Última actualización:** 2026-01-28
**Estado:** Documento de Arquitectura Oficial

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Estructura de Repositorios](#estructura-de-repositorios)
- [Repositorio Central (electron-aaos-core)](#repositorio-central-electron-aaos-core)
- [Repositorios Squad](#repositorios-squad)
- [Repositorio del Ecosistema MCP](#repositorio-del-ecosistema-mcp)
- [Repositorios Privados](#repositorios-privados)
- [Mecanismo de Sincronización](#mecanismo-de-sincronización)
- [Distribución de Paquetes](#distribución-de-paquetes)
- [Mejores Prácticas](#mejores-prácticas)

---

## Descripción General

Electron AAOS v2.1 adopta una **estrategia multi-repositorio** para permitir el desarrollo modular, las contribuciones de la comunidad y una clara separación entre el marco fundamental, las extensiones (squads) y los componentes propietarios.

### Objetivos de Diseño

| Objetivo                      | Descripción                                           |
| ----------------------------- | ----------------------------------------------------- |
| **Modularidad**               | Los squads pueden desarrollarse y versionarse independientemente   |
| **Comunidad**                 | Los squads de código abierto fomentan las contribuciones comunitarias  |
| **Protección de IP**          | Los componentes propietarios permanecen en repositorios privados |
| **Escalabilidad**             | Los equipos pueden trabajar en repositorios separados sin conflictos    |
| **Flexibilidad de Licencias** | Los diferentes componentes pueden tener diferentes licencias      |

---

## Estructura de Repositorios

```
Organización Electron AAOSAI
├── REPOSITORIOS PÚBLICOS
│   ├── electron-aaos-core          # Marco fundamental (Commons Clause)
│   ├── electron-aaos-squads        # Squads comunitarios (MIT)
│   └── mcp-ecosystem      # Configuraciones MCP (Apache 2.0)
│
└── REPOSITORIOS PRIVADOS
    ├── mmos               # MMOS propietario (NDA)
    └── certified-partners # Recursos de socios (Propietario)
```

### Arquitectura Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZACIÓN SYNKRA                                   │
│                                                                          │
│   REPOSITORIOS PÚBLICOS                                                  │
│   ═══════════════════════                                                │
│                                                                          │
│   ┌────────────────────┐     ┌────────────────────┐                     │
│   │  Electron AAOSAI/         │     │  Electron AAOSAI/         │                     │
│   │  electron-aaos-core         │     │  electron-aaos-squads       │                     │
│   │  (Commons Clause)  │◄────│  (MIT)             │                     │
│   │                    │     │                    │                     │
│   │  - Marco           │     │  - Squad ETL       │                     │
│   │    Fundamental     │     │  - Squad Creator   │                     │
│   │  - 11 Agentes Base │     │  - Squad MMOS      │                     │
│   │  - Puertas de      │     │  - Squads          │                     │
│   │    Calidad         │     │    Comunitarios    │                     │
│   │  - Hub de          │     │                    │                     │
│   │    Discusiones     │     │                    │                     │
│   └────────────────────┘     └────────────────────┘                     │
│            │                                                             │
│            │ dependencia opcional                                        │
│            ▼                                                             │
│   ┌────────────────────┐                                                │
│   │  Electron AAOSAI/         │                                                │
│   │  mcp-ecosystem     │                                                │
│   │  (Apache 2.0)      │                                                │
│   │                    │                                                │
│   │  - Docker MCP      │                                                │
│   │  - Configuraciones │                                                │
│   │    de IDE          │                                                │
│   │  - Presets MCP     │                                                │
│   └────────────────────┘                                                │
│                                                                          │
│   REPOSITORIOS PRIVADOS                                                  │
│   ════════════════════════                                               │
│                                                                          │
│   ┌────────────────────┐     ┌────────────────────┐                     │
│   │  Electron AAOSAI/mmos     │     │  Electron AAOSAI/         │                     │
│   │  (Propietario+NDA) │     │  certified-partners│                     │
│   │                    │     │  (Propietario)     │                     │
│   │  - Mentes MMOS     │     │  - Squads Premium  │                     │
│   │  - ADN Mental      │     │  - Portal de Socios│                     │
│   └────────────────────┘     └────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Repositorio Central (electron-aaos-core)

### Propósito

El repositorio central contiene el marco Electron AAOS fundamental del que todos los proyectos dependen.

### Contenidos

| Directorio                   | Descripción                                             |
| ---------------------------- | ------------------------------------------------------- |
| `.electron-aaos-core/core/`           | Fundamentos del marco (config, registry, puertas de calidad) |
| `.electron-aaos-core/development/`    | Definiciones de agentes, tareas, flujos de trabajo                     |
| `.electron-aaos-core/product/`        | Plantillas, listas de verificación, datos de PM                          |
| `.electron-aaos-core/infrastructure/` | Scripts, herramientas, integraciones                            |
| `docs/`                      | Documentación del marco                                 |

### Licencia

**Commons Clause** - Libre para usar, alojamiento/reventa comercial requiere licencia.

### Paquete npm

```bash
npm install @electron-aaos/core
```

---

## Repositorios Squad

### Descripción General

Los squads son extensiones modulares que agregan capacidades especializadas a Electron AAOS.

### Repositorio electron-aaos-squads

```
electron-aaos-squads/
├── etl/                    # Squad de procesamiento ETL
│   ├── squad.yaml          # Manifiesto del squad
│   ├── agents/             # Agentes específicos del squad
│   ├── tasks/              # Tareas del squad
│   └── README.md           # Documentación del squad
│
├── creator/                # Squad de creación de contenido
│   ├── squad.yaml
│   ├── agents/
│   └── tasks/
│
├── mmos/                   # Squad de integración MMOS
│   ├── squad.yaml
│   ├── agents/
│   └── tasks/
│
└── templates/              # Plantillas de creación de squad
    └── squad-template/
```

### Manifiesto del Squad (squad.yaml)

```yaml
name: etl
version: 1.0.0
description: Squad de procesamiento ETL para tuberías de datos
license: MIT

peerDependencies:
  '@electron-aaos/core': '^2.1.0'

agents:
  - id: data-engineer
    extends: dev

tasks:
  - extract-data
  - transform-data
  - load-data

exports:
  - agents
  - tasks
```

### Licencia

**MIT** - Libertad de código abierto completa para contribuciones comunitarias.

### Paquetes npm

```bash
npm install @electron-aaos/squad-etl
npm install @electron-aaos/squad-creator
npm install @electron-aaos/squad-mmos
```

---

## Repositorio del Ecosistema MCP

### Propósito

Configuraciones MCP (Model Context Protocol) centralizadas para varios IDEs y entornos.

### Contenidos

```
mcp-ecosystem/
├── docker/                 # Configuraciones Docker MCP
│   ├── docker-compose.yml
│   └── mcp-servers/
│
├── ide-configs/            # Configuraciones específicas del IDE
│   ├── claude-code/
│   ├── cursor/
│   ├── windsurf/
│   └── vscode/
│
└── presets/                # Paquetes MCP preconfigurados
    ├── minimal/
    ├── development/
    └── enterprise/
```

### Licencia

**Apache 2.0** - Licencia permisiva para máxima adopción.

### Paquete npm

```bash
npm install @electron-aaos/mcp-presets
```

---

## Repositorios Privados

### Electron AAOSAI/mmos (Propietario + NDA)

Contiene componentes MMOS (Mental Model Operating System) propietarios:

- Definiciones de Mentes MMOS
- Algoritmos de ADN Mental
- Datos de entrenamiento propietarios
- Personalizaciones específicas de socios

**Acceso:** Requiere acuerdo NDA y de licencia.

### Electron AAOSAI/certified-partners (Propietario)

Recursos para socios certificados de Electron AAOS:

- Implementaciones de squads premium
- Acceso al portal de socios
- Herramientas de soporte empresarial
- Configuraciones de marca blanca

**Acceso:** Requiere estado de socio certificado.

---

## Mecanismo de Sincronización

### Dependencias Entre Repositorios

```
┌──────────────┐     depende de      ┌──────────────┐
│  electron-aaos-squads │ ──────────────────► │  electron-aaos-core   │
└──────────────┘                     └──────────────┘
       │                                    │
       │                                    │
       │ opcional                           │ opcional
       │                                    │
       ▼                                    ▼
┌──────────────┐                    ┌──────────────┐
│mcp-ecosystem │                    │     mmos     │
└──────────────┘                    └──────────────┘
```

### Compatibilidad de Versiones

| electron-aaos-core | electron-aaos-squads | mcp-ecosystem |
| --------- | ----------- | ------------- |
| ^2.1.0    | ^1.0.0      | ^1.0.0        |
| ^3.0.0    | ^2.0.0      | ^1.x.x        |

### Git Submodules (Opcional)

Para proyectos que necesitan múltiples repositorios:

```bash
# Agregar squads como submodule
git submodule add https://github.com/Electron AAOSAI/electron-aaos-squads.git squads

# Agregar ecosistema MCP como submodule
git submodule add https://github.com/Electron AAOSAI/mcp-ecosystem.git mcp
```

### Dependencias npm (Recomendado)

```json
{
  "dependencies": {
    "@electron-aaos/core": "^2.1.0",
    "@electron-aaos/squad-etl": "^1.0.0",
    "@electron-aaos/mcp-presets": "^1.0.0"
  }
}
```

---

## Distribución de Paquetes

### Alcance de Paquetes npm

| Paquete               | Registro   | Licencia       | Repositorio    |
| --------------------- | ---------- | -------------- | ------------- |
| `@electron-aaos/core`          | npm public | Commons Clause | electron-aaos-core     |
| `@electron-aaos/squad-etl`     | npm public | MIT            | electron-aaos-squads   |
| `@electron-aaos/squad-creator` | npm public | MIT            | electron-aaos-squads   |
| `@electron-aaos/squad-mmos`    | npm public | MIT            | electron-aaos-squads   |
| `@electron-aaos/mcp-presets`   | npm public | Apache 2.0     | mcp-ecosystem |

### Flujo de Publicación

```bash
# Desde electron-aaos-core
npm publish --access public

# Desde electron-aaos-squads/etl
cd etl && npm publish --access public

# Desde mcp-ecosystem
npm publish --access public
```

---

## Mejores Prácticas

### Para Colaboradores del Núcleo

1. **Cambios Atómicos** - Mantén los PRs enfocados en características o correcciones únicas
2. **Compatibilidad Hacia Atrás** - Evita cambios disruptivos en versiones menores
3. **Documentación** - Actualiza la documentación en el mismo PR que los cambios de código
4. **Pruebas Entre Repositorios** - Prueba los cambios contra repositorios dependientes

### Para Desarrolladores de Squads

1. **Manifiesto Primero** - Define squad.yaml antes de implementar
2. **Dependencias Entre Iguales** - Especifica los requisitos exactos de versión de electron-aaos-core
3. **Pruebas Independientes** - Los squads deben tener sus propios conjuntos de pruebas
4. **Estándares README** - Incluye ejemplos de uso y requisitos

### Para Consumidores de Proyectos

1. **Bloquea Versiones** - Utiliza versiones exactas en producción
2. **Prueba Actualizaciones** - Ejecuta el conjunto de pruebas completo después de actualizar dependencias
3. **Monitorea Lanzamientos** - Suscribete a notificaciones de lanzamiento
4. **Reporta Problemas** - Reporta problemas en el repositorio correcto

### Mantenimiento del Repositorio

| Tarea              | Frecuencia   | Responsabilidad |
| ------------------ | ----------- | -------------- |
| Actualización de dependencias | Semanal      | DevOps         |
| Auditorías de seguridad    | Mensual     | DevOps         |
| Lanzamientos de versión   | Según sea necesario   | Mantenedores    |
| Sincronización de documentación | Por lanzamiento | Colaboradores   |

---

## Documentos Relacionados

- [Arquitectura de Alto Nivel](./high-level-architecture.md)
- [Sistema de Módulos](./module-system.md)
- [Guía de Migración v2.0 a v2.1](../migration/v2.0-to-v2.1.md)
- [Guía de Squads](../guides/squads-guide.md)

---

_Última actualización: 2026-01-28 | Equipo del Marco Electron AAOS_
