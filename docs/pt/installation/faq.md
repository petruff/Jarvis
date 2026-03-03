<!--
  Tradução: PT-BR
  Original: /docs/en/installation/faq.md
  Última sincronização: 2026-01-26
-->

# FAQ do Electron AAOS Electron AAOS

> 🌐 [EN](../../installation/faq.md) | **PT** | [ES](../../es/installation/faq.md)

---

**Versão:** 2.1.0
**Última Atualização:** 2025-01-24

---

## Sumário

- [Perguntas sobre Instalação](#perguntas-sobre-instalação)
- [Atualizações e Manutenção](#atualizações-e-manutenção)
- [Uso Offline e Air-Gapped](#uso-offline-e-air-gapped)
- [IDE e Configuração](#ide-e-configuração)
- [Agentes e Workflows](#agentes-e-workflows)
- [Squads](#squads)
- [Uso Avançado](#uso-avançado)

---

## Perguntas sobre Instalação

### Q1: Por que npx ao invés de npm install -g?

**Resposta:** Recomendamos `npx @electron-aaos/electron-aaos-core install` ao invés de instalação global por várias razões:

1. **Sempre a Versão Mais Recente**: npx baixa a versão mais recente automaticamente
2. **Sem Poluição Global**: Não adiciona aos seus pacotes npm globais
3. **Isolamento de Projeto**: Cada projeto pode ter sua própria versão
4. **Sem Problemas de Permissão**: Evita problemas comuns de permissão npm global
5. **Amigável para CI/CD**: Funciona perfeitamente em pipelines automatizados

**Se você preferir instalação global:**

```bash
npm install -g @electron-aaos/electron-aaos-core
@electron-aaos/electron-aaos-core install
```

---

### Q2: Quais são os requisitos de sistema?

**Resposta:**

| Componente     | Mínimo                             | Recomendado     |
| -------------- | ---------------------------------- | --------------- |
| **Node.js**    | 18.0.0                             | 20.x LTS        |
| **npm**        | 9.0.0                              | 10.x            |
| **Espaço em Disco** | 100 MB                        | 500 MB          |
| **RAM**        | 2 GB                               | 8 GB            |
| **SO**         | Windows 10, macOS 12, Ubuntu 20.04 | Versões mais recentes |

**Verifique seu sistema:**

```bash
node --version  # Deve ser 18+
npm --version   # Deve ser 9+
```

---

### Q3: Posso instalar o Electron AAOS em um projeto existente?

**Resposta:** Sim! O Electron AAOS foi projetado tanto para projetos greenfield quanto brownfield.

**Para projetos existentes:**

```bash
cd /path/to/existing-project
npx @electron-aaos/electron-aaos-core install
```

O instalador irá:

- Criar o diretório `.electron-aaos-core/` (arquivos do framework)
- Criar configuração de IDE (`.claude/`, `.cursor/`, etc.)
- NÃO modificar seu código-fonte existente
- NÃO sobrescrever documentação existente a menos que você escolha

**Importante:** Se você tiver um diretório `.claude/` ou `.cursor/` existente, o instalador perguntará antes de modificar.

---

### Q4: Quanto tempo leva a instalação?

**Resposta:**

| Cenário                 | Tempo         |
| ----------------------- | ------------- |
| **Primeira instalação** | 2-5 minutos   |
| **Atualizar existente** | 1-2 minutos   |
| **Apenas Squad**        | 30-60 segundos |

Fatores que afetam o tempo de instalação:

- Velocidade da conexão de internet
- Status do cache npm
- Número de IDEs selecionadas
- Squads selecionados

---

### Q5: Quais arquivos o Electron AAOS cria no meu projeto?

**Resposta:** O Electron AAOS cria a seguinte estrutura:

```
your-project/
├── .electron-aaos-core/                 # Core do framework (200+ arquivos)
│   ├── agents/                 # 11+ definições de agentes
│   ├── tasks/                  # 60+ workflows de tarefas
│   ├── templates/              # 20+ templates de documentos
│   ├── checklists/             # Checklists de validação
│   ├── scripts/                # Scripts utilitários
│   └── core-config.yaml        # Configuração do framework
│
├── .claude/                    # Claude Code (se selecionado)
│   └── commands/Electron AAOS/agents/   # Comandos slash de agentes
│
├── .cursor/                    # Cursor (se selecionado)
│   └── rules/                  # Regras de agentes
│
├── docs/                       # Estrutura de documentação
│   ├── stories/                # Stories de desenvolvimento
│   ├── architecture/           # Docs de arquitetura
│   └── prd/                    # Requisitos de produto
│
└── Squads/            # (se instalado)
    └── hybrid-ops/             # Pack HybridOps
```

---

## Atualizações e Manutenção

### Q6: Como atualizo o Electron AAOS para a versão mais recente?

**Resposta:**

```bash
# Atualizar via npx (recomendado)
npx @electron-aaos/electron-aaos-core update

# Ou reinstalar a versão mais recente
npx @electron-aaos/electron-aaos-core install --force-upgrade

# Verificar versão atual
npx @electron-aaos/electron-aaos-core status
```

**O que é atualizado:**

- Arquivos `.electron-aaos-core/` (agentes, tarefas, templates)
- Configurações de IDE
- Squads (se instalados)

**O que é preservado:**

- Suas modificações customizadas em `core-config.yaml`
- Sua documentação (`docs/`)
- Seu código-fonte

---

### Q7: Com que frequência devo atualizar?

**Resposta:** Recomendamos:

| Tipo de Atualização    | Frequência  | Comando                         |
| ---------------------- | ----------- | ------------------------------- |
| **Patches de segurança** | Imediatamente | `npx @electron-aaos/electron-aaos-core update` |
| **Atualizações menores** | Mensalmente | `npx @electron-aaos/electron-aaos-core update` |
| **Versões maiores**    | Trimestralmente | Revisar changelog primeiro    |

**Verificar atualizações:**

```bash
npm show @electron-aaos/electron-aaos-core version
npx @electron-aaos/electron-aaos-core status
```

---

### Q8: Posso fazer rollback para uma versão anterior?

**Resposta:** Sim, várias opções:

**Opção 1: Reinstalar versão específica**

```bash
npx @electron-aaos/electron-aaos-core@1.1.0 install --force-upgrade
```

**Opção 2: Usar Git para restaurar**

```bash
# Se .electron-aaos-core está no controle de versão
git checkout HEAD~1 -- .electron-aaos-core/
```

**Opção 3: Restaurar do backup**

```bash
# O instalador cria backups
mv .electron-aaos-core .electron-aaos-core.failed
mv .electron-aaos-core.backup .electron-aaos-core
```

---

## Uso Offline e Air-Gapped

### Q9: Posso usar o Electron AAOS sem internet?

**Resposta:** Sim, com alguma preparação:

**Configuração inicial (requer internet):**

```bash
# Instalar uma vez com internet
npx @electron-aaos/electron-aaos-core install

# Empacotar para uso offline
tar -czvf electron-aaos-offline.tar.gz .electron-aaos-core/ .claude/ .cursor/
```

**Na máquina air-gapped:**

```bash
# Extrair o pacote
tar -xzvf electron-aaos-offline.tar.gz

# Os agentes Electron AAOS funcionam sem internet
# (Eles não requerem chamadas de API externas)
```

**Limitações sem internet:**

- Não é possível atualizar para novas versões
- Integrações MCP (ClickUp, GitHub) não funcionarão
- Não é possível buscar documentação de bibliotecas (Context7)

---

### Q10: Como transfiro o Electron AAOS para um ambiente air-gapped?

**Resposta:**

1. **Na máquina conectada:**

   ```bash
   # Instalar e empacotar
   npx @electron-aaos/electron-aaos-core install
   cd your-project
   tar -czvf electron-aaos-transfer.tar.gz .electron-aaos-core/ .claude/ .cursor/ docs/
   ```

2. **Transferir o arquivo** via USB, transferência segura, etc.

3. **Na máquina air-gapped:**

   ```bash
   cd your-project
   tar -xzvf electron-aaos-transfer.tar.gz
   ```

4. **Configurar IDE manualmente** se necessário (os caminhos podem diferir)

---

## IDE e Configuração

### Q11: Quais IDEs o Electron AAOS suporta?

**Resposta:**

| IDE                | Status         | Ativação de Agentes |
| ------------------ | -------------- | ------------------- |
| **Claude Code**    | Suporte Completo | `/dev`, `/qa`, etc. |
| **Cursor**         | Suporte Completo | `@dev`, `@qa`, etc. |
| **Windsurf**       | Suporte Completo | `@dev`, `@qa`, etc. |
| **Trae**           | Suporte Completo | `@dev`, `@qa`, etc. |
| **Roo Code**       | Suporte Completo | Seletor de modo     |
| **Cline**          | Suporte Completo | `@dev`, `@qa`, etc. |
| **Gemini CLI**     | Suporte Completo | Menção no prompt    |
| **GitHub Copilot** | Suporte Completo | Modos de chat       |

**Adicionar suporte para uma nova IDE:** Abra uma issue no GitHub com a especificação de agentes/regras da IDE.

---

### Q12: Posso configurar o Electron AAOS para múltiplas IDEs?

**Resposta:** Sim! Selecione múltiplas IDEs durante a instalação:

**Interativo:**

```
? Which IDE(s) do you want to configure?
❯ ◉ Cursor
  ◉ Claude Code
  ◯ Windsurf
```

**Linha de comando:**

```bash
npx @electron-aaos/electron-aaos-core install --ide cursor claude-code windsurf
```

Cada IDE recebe seu próprio diretório de configuração:

- `.cursor/rules/` para Cursor
- `.claude/commands/` para Claude Code
- `.windsurf/rules/` para Windsurf

---

### Q13: Como configuro o Electron AAOS para um novo membro da equipe?

**Resposta:**

Se `.electron-aaos-core/` está commitado no seu repositório:

```bash
# Novo membro da equipe apenas clona
git clone your-repo
cd your-repo

# Opcionalmente configurar a IDE preferida
npx @electron-aaos/electron-aaos-core install --ide cursor
```

Se `.electron-aaos-core/` não está commitado:

```bash
git clone your-repo
cd your-repo
npx @electron-aaos/electron-aaos-core install
```

**Melhor prática:** Commitar `.electron-aaos-core/` para compartilhar configurações de agentes consistentes.

---

## Agentes e Workflows

### Q14: Quais agentes estão incluídos?

**Resposta:** O Electron AAOS inclui 11+ agentes especializados:

| Agente          | Papel                    | Melhor Para                           |
| --------------- | ------------------------ | ------------------------------------- |
| `dev`           | Desenvolvedor Full-Stack | Implementação de código, debugging    |
| `qa`            | Engenheiro de QA         | Testes, code review                   |
| `architect`     | Arquiteto de Sistema     | Design, decisões de arquitetura       |
| `pm`            | Gerente de Projeto       | Planejamento, acompanhamento          |
| `po`            | Product Owner            | Backlog, requisitos                   |
| `sm`            | Scrum Master             | Facilitação, gestão de sprints        |
| `analyst`       | Analista de Negócios     | Análise de requisitos                 |
| `ux-expert`     | Designer UX              | Design de experiência do usuário      |
| `data-engineer` | Engenheiro de Dados      | Pipelines de dados, ETL               |
| `devops`        | Engenheiro DevOps        | CI/CD, deployment                     |
| `db-sage`       | Arquiteto de Banco       | Design de schema, queries             |

---

### Q15: Como crio um agente customizado?

**Resposta:**

1. **Copie um agente existente:**

   ```bash
   cp .electron-aaos-core/agents/dev.md .electron-aaos-core/agents/my-agent.md
   ```

2. **Edite o frontmatter YAML:**

   ```yaml
   agent:
     name: MyAgent
     id: my-agent
     title: My Custom Agent
     icon: 🔧

   persona:
     role: Expert in [your domain]
     style: [communication style]
   ```

3. **Adicione à configuração da IDE:**

   ```bash
   npx @electron-aaos/electron-aaos-core install --ide claude-code
   ```

4. **Ative:** `/my-agent` ou `@my-agent`

---

### Q16: O que é "yolo mode"?

**Resposta:** Yolo mode é o modo de desenvolvimento autônomo onde o agente:

- Implementa tarefas de stories sem confirmação passo a passo
- Toma decisões autonomamente baseado nos requisitos da story
- Registra todas as decisões em `.ai/decision-log-{story-id}.md`
- Pode ser parado a qualquer momento

**Habilitar yolo mode:**

```bash
/dev
*develop-yolo docs/stories/your-story.md
```

**Quando usar:**

- Para stories bem definidas com critérios de aceitação claros
- Quando você confia na tomada de decisão do agente
- Para tarefas repetitivas

**Quando NÃO usar:**

- Para mudanças arquiteturais complexas
- Quando os requisitos são ambíguos
- Para código crítico de produção

---

## Squads

### Q17: O que são Squads?

**Resposta:** Squads são add-ons opcionais que estendem as capacidades do Electron AAOS:

| Pack           | Funcionalidades                                                |
| -------------- | -------------------------------------------------------------- |
| **hybrid-ops** | Integração ClickUp, automação de processos, workflows especializados |

**Instalar um Squad:**

```bash
npx @electron-aaos/electron-aaos-core install --Squads hybrid-ops
```

**Listar packs disponíveis:**

```bash
npx @electron-aaos/electron-aaos-core list:expansions
```

---

### Q18: Posso criar meu próprio Squad?

**Resposta:** Sim! Squads seguem esta estrutura:

```
my-expansion/
├── pack.yaml           # Manifesto do pack
├── README.md           # Documentação
├── agents/             # Agentes customizados
│   └── my-agent.md
├── tasks/              # Tarefas customizadas
│   └── my-task.md
├── templates/          # Templates customizados
│   └── my-template.yaml
└── workflows/          # Workflows customizados
    └── my-workflow.yaml
```

**Exemplo de pack.yaml:**

```yaml
name: my-expansion
version: 1.0.0
description: My custom Squad
dependencies:
  electron-aaos-core: ">=1.0.0"
agents:
  - my-agent
tasks:
  - my-task
```

---

## Uso Avançado

### Q19: Como integro o Electron AAOS com CI/CD?

**Resposta:**

**Exemplo de GitHub Actions:**

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

**Exemplo de GitLab CI:**

```yaml
test:
  image: node:18
  script:
    - npx @electron-aaos/electron-aaos-core install --full
    - npm test
```

---

### Q20: Como customizo o core-config.yaml?

**Resposta:** O arquivo `core-config.yaml` controla o comportamento do framework:

```yaml
# Fragmentação de documento
prd:
  prdSharded: true
  prdShardedLocation: docs/prd

# Localização de stories
devStoryLocation: docs/stories

# Arquivos carregados pelo agente dev
devLoadAlwaysFiles:
  - docs/framework/coding-standards.md
  - docs/framework/tech-stack.md

# Configuração do Git
git:
  showConfigWarning: true
  cacheTimeSeconds: 300

# Status do projeto nas saudações dos agentes
projectStatus:
  enabled: true
  showInGreeting: true
```

**Após editar, reinicie sua IDE para aplicar as mudanças.**

---

### Q21: Como contribuo para o Electron AAOS?

**Resposta:**

1. **Faça fork do repositório:** https://github.com/Electron AAOSAI/electron-aaos-core

2. **Crie um branch de feature:**

   ```bash
   git checkout -b feature/my-feature
   ```

3. **Faça mudanças seguindo os padrões de código:**
   - Leia `docs/framework/coding-standards.md`
   - Adicione testes para novas funcionalidades
   - Atualize a documentação

4. **Envie um pull request:**
   - Descreva suas mudanças
   - Vincule a issues relacionadas
   - Aguarde a revisão

**Tipos de contribuições bem-vindas:**

- Correção de bugs
- Novos agentes
- Melhorias de documentação
- Squads
- Integrações de IDE

---

### Q22: Onde posso obter ajuda?

**Resposta:**

| Recurso             | Link                                                       |
| ------------------- | ---------------------------------------------------------- |
| **Documentação**    | `docs/` no seu projeto                                     |
| **Solução de Problemas** | [troubleshooting.md](./troubleshooting.md)            |
| **Issues no GitHub** | https://github.com/Electron AAOSAI/electron-aaos-core/issues              |
| **Código-fonte**    | https://github.com/Electron AAOSAI/electron-aaos-core                      |

**Antes de pedir ajuda:**

1. Consulte este FAQ
2. Consulte o [Guia de Solução de Problemas](./troubleshooting.md)
3. Pesquise issues existentes no GitHub
4. Inclua informações do sistema e mensagens de erro na sua pergunta

---

## Documentação Relacionada

- [Guia de Solução de Problemas](./troubleshooting.md)
- [Padrões de Código](../framework/coding-standards.md)
