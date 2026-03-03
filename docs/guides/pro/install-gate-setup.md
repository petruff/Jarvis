# Electron AAOS Pro — Guia de Instalacao e Licenciamento

Guia completo para instalar, ativar e gerenciar o Electron AAOS Pro.

**Story:** PRO-6 — License Key & Feature Gating System

---

## Visao Geral

O Electron AAOS Pro e distribuido via npm publico. O pacote e livre para instalar, mas as features premium requerem uma **licenca ativa** para funcionar.

```
Comprar Licenca → Instalar → Ativar → Usar Features Pro
```

### Pacotes npm

| Pacote | Tipo | Proposito |
|--------|------|-----------|
| `electron-aaos-pro` | CLI (1.8 KB) | Comandos de instalacao e gerenciamento |
| `@electron-aaos-fullstack/pro` | Core (10 MB) | Features premium (squads, memory, metrics, integrations) |

---

## Instalacao Rapida

```bash
# Instalar Electron AAOS Pro (instala @electron-aaos-fullstack/pro automaticamente)
npx electron-aaos-pro install

# Ativar sua licenca
npx electron-aaos-pro activate --key PRO-XXXX-XXXX-XXXX-XXXX

# Verificar ativacao
npx electron-aaos-pro status
```

---

## Passo a Passo

### Prerequisitos

- Node.js >= 18
- `electron-aaos-core` >= 4.0.0 instalado no projeto

### Passo 1: Instalar Electron AAOS Pro

```bash
npx electron-aaos-pro install
```

Isso executa `npm install @electron-aaos-fullstack/pro` no seu projeto.

**Alternativa** (instalacao manual):

```bash
npm install @electron-aaos-fullstack/pro
```

### Passo 2: Ativar Licenca

Apos a compra, voce recebera uma chave no formato `PRO-XXXX-XXXX-XXXX-XXXX`.

```bash
npx electron-aaos-pro activate --key PRO-XXXX-XXXX-XXXX-XXXX
```

Esse comando:
1. Valida a chave contra o License Server (`https://electron-aaos-license-server.vercel.app`)
2. Registra sua maquina (machine ID unico)
3. Salva um cache local criptografado para uso offline

### Passo 3: Verificar

```bash
# Status da licenca
npx electron-aaos-pro status

# Listar features disponiveis
npx electron-aaos-pro features
```

---

## Comandos Disponiveis

| Comando | Descricao |
|---------|-----------|
| `npx electron-aaos-pro install` | Instala `@electron-aaos-fullstack/pro` no projeto |
| `npx electron-aaos-pro activate --key KEY` | Ativa uma chave de licenca |
| `npx electron-aaos-pro status` | Mostra status da licenca atual |
| `npx electron-aaos-pro features` | Lista todas as features pro e disponibilidade |
| `npx electron-aaos-pro validate` | Forca revalidacao online da licenca |
| `npx electron-aaos-pro deactivate` | Desativa a licenca nesta maquina |
| `npx electron-aaos-pro help` | Mostra todos os comandos |

---

## Operacao Offline

Apos a instalacao e ativacao, o Electron AAOS Pro funciona offline:

- **30 dias** sem necessidade de revalidacao
- **7 dias de grace period** apos expirar o cache
- Verificacao de features 100% local no dia a dia

A internet so e necessaria para:
1. Ativacao inicial (`npx electron-aaos-pro activate`)
2. Revalidacao periodica (automatica a cada 30 dias)
3. Desativacao (`npx electron-aaos-pro deactivate`)

---

## CI/CD

Para pipelines, instale e ative usando secrets de ambiente:

**GitHub Actions:**
```yaml
- name: Install Electron AAOS Pro
  run: npx electron-aaos-pro install

- name: Activate License
  run: npx electron-aaos-pro activate --key ${{ secrets.Electron AAOS_PRO_LICENSE_KEY }}
```

**GitLab CI:**
```yaml
before_script:
  - npx electron-aaos-pro install
  - npx electron-aaos-pro activate --key ${Electron AAOS_PRO_LICENSE_KEY}
```

---

## Troubleshooting

### Chave de licenca invalida

```
License activation failed: Invalid key format
```

- Verifique o formato: `PRO-XXXX-XXXX-XXXX-XXXX` (4 blocos de 4 caracteres hex)
- Sem espacos extras
- Contate support@electron-aaos.ai se a chave foi fornecida a voce

### Maximo de seats excedido

```
License activation failed: Maximum seats exceeded
```

- Desative a licenca na outra maquina: `npx electron-aaos-pro deactivate`
- Ou contate support para aumentar o limite de seats

### Erro de rede na ativacao

```
License activation failed: ECONNREFUSED
```

- Verifique sua conexao com a internet
- O License Server pode estar temporariamente indisponivel
- Tente novamente em alguns minutos

---

## Arquitetura do Sistema

```
┌─────────────────┐     ┌─────────────────────────────────┐     ┌──────────┐
│  Cliente (CLI)   │────>│  License Server (Vercel)        │────>│ Supabase │
│  npx electron-aaos-pro    │<────│  electron-aaos-license-server.vercel.app │<────│ Database │
└─────────────────┘     └─────────────────────────────────┘     └──────────┘
                                                                      │
                                                                      │
                        ┌─────────────────────────────────┐           │
                        │  Admin Dashboard (Vercel)       │───────────┘
                        │  electron-aaos-license-dashboard         │
                        │  Cria/revoga/gerencia licencas  │
                        └─────────────────────────────────┘
```

| Componente | URL | Proposito |
|-----------|-----|-----------|
| License Server | `https://electron-aaos-license-server.vercel.app` | API de ativacao/validacao |
| Admin Dashboard | `https://electron-aaos-license-dashboard.vercel.app` | Gestao de licencas (admin) |
| Database | Supabase PostgreSQL | Armazena licencas e ativacoes |

---

## Suporte

- **Documentacao:** https://electron-aaos.ai/pro/docs
- **Comprar:** https://electron-aaos.ai/pro
- **Suporte:** support@electron-aaos.ai
- **Issues:** https://github.com/Electron AAOSAI/electron-aaos-core/issues

---

*Electron AAOS Pro Installation Guide v3.0*
*Story PRO-6 — License Key & Feature Gating System*
