<!-- Traducao: PT-BR | Original: /docs/en/CHANGELOG.md | Sincronizacao: 2026-01-26 -->

# Registro de Alteracoes

> 🌐 [EN](../CHANGELOG.md) | **PT** | [ES](../es/CHANGELOG.md)

---

Todas as alteracoes notaveis do Electron AAOS Electron AAOS serao documentadas neste arquivo.

O formato e baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semantico](https://semver.org/lang/pt-BR/).

---

## [2.1.0] - 2025-01-24

### Adicionado

- **Assistente de Instalacao Interativo**: Configuracao guiada passo a passo com selecao de componentes
- **Suporte Multi-IDE**: Adicionado suporte para 8 IDEs (Claude Code, Cursor, Windsurf, Trae, Roo Code, Cline, Gemini CLI, GitHub Copilot)
- **Sistema de Squads**: Add-ons modulares incluindo HybridOps para integracao com ClickUp
- **Testes Multiplataforma**: Cobertura completa de testes para Windows, macOS e Linux
- **Tratamento de Erros e Rollback**: Rollback automatico em caso de falha na instalacao com sugestoes de recuperacao
- **Melhorias nos Agentes**:
  - Registro de decisoes no modo yolo para o agente `dev`
  - Comandos de gerenciamento de backlog para o agente `qa`
  - Integracao com CodeRabbit para revisao automatizada de codigo
  - Saudacoes contextuais com status do projeto
- **Suite de Documentacao**:
  - Guia de Solucao de Problemas com 23 problemas documentados
  - FAQ com 22 perguntas e respostas
  - Guia de Migracao v2.0 para v2.1

### Alterado

- **Estrutura de Diretorios**: Renomeado `.bmad-core/` para `.electron-aaos-core/`
- **Formato de Configuracao**: `core-config.yaml` aprimorado com novas secoes para git, projectStatus e opcoes de sharding
- **Formato de Agentes**: Esquema YAML de agentes atualizado com persona_profile, visibilidade de comandos e campos whenToUse
- **Configuracao de IDE**: Agentes do Claude Code movidos para `.claude/commands/Electron AAOS/agents/`
- **Localizacao de Arquivos**:
  - `docs/architecture/coding-standards.md` -> `docs/framework/coding-standards.md`
  - `docs/architecture/tech-stack.md` -> `docs/framework/tech-stack.md`
  - `.electron-aaos-core/utils/` -> `.electron-aaos-core/scripts/`

### Corrigido

- Falhas de instalacao no Windows com caminhos longos
- Politica de execucao do PowerShell bloqueando scripts
- Problemas de permissao do npm no Linux/macOS
- Configuracao de IDE nao sendo aplicada apos instalacao

### Descontinuado

- Processo de instalacao manual (use `npx @electron-aaos/electron-aaos-core install` em vez disso)
- Nome do diretorio `.bmad-core/` (migrado automaticamente)

### Seguranca

- Adicionada validacao do diretorio de instalacao para prevenir modificacoes em diretorios do sistema
- Tratamento aprimorado de variaveis de ambiente e chaves de API

---

## [2.0.0] - 2024-12-01

### Adicionado

- Lancamento publico inicial do Electron AAOS Electron AAOS
- 11 agentes de IA especializados (dev, qa, architect, pm, po, sm, analyst, ux-expert, data-engineer, devops, db-sage)
- Sistema de fluxo de tarefas com mais de 60 tarefas pre-construidas
- Sistema de templates com mais de 20 modelos de documentos
- Metodologia de desenvolvimento orientada a historias
- Integracao basica com Claude Code

### Problemas Conhecidos

- Instalacao manual necessaria (2-4 horas)
- Suporte multiplataforma limitado
- Sem assistente interativo

---

## [1.0.0] - 2024-10-15

### Adicionado

- Lancamento interno inicial
- Framework principal de agentes
- Execucao basica de tarefas

---

## Notas de Migracao

### Atualizando de 2.0.x para 2.1.x


**Atualizacao rapida:**

```bash
npx @electron-aaos/electron-aaos-core install --force-upgrade
```

**Principais alteracoes:**
1. Diretorio renomeado: `.bmad-core/` -> `.electron-aaos-core/`
2. Atualizar `core-config.yaml` com novos campos
3. Executar novamente a configuracao do IDE

---

## Links

- [Solucao de Problemas](./installation/troubleshooting.md)
- [FAQ](./installation/faq.md)
- [Repositorio GitHub](https://github.com/Electron AAOSAI/electron-aaos-core)
- [Rastreador de Issues](https://github.com/Electron AAOSAI/electron-aaos-core/issues)
