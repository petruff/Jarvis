<!--
  Tradução: PT-BR
  Original: /docs/en/uninstallation.md
  Última sincronização: 2026-01-26
-->

# Guia de Desinstalação

> 🌐 [EN](../uninstallation.md) | **PT** | [ES](../es/uninstallation.md)

---

Este guia fornece instruções completas para desinstalar o Electron AAOS Electron AAOS do seu sistema.

## Índice

1. [Antes de Desinstalar](#antes-de-desinstalar)
2. [Desinstalação Rápida](#desinstalação-rápida)
3. [Desinstalação Completa](#desinstalação-completa)
4. [Desinstalação Seletiva](#desinstalação-seletiva)
5. [Preservação de Dados](#preservação-de-dados)
6. [Remoção Limpa do Sistema](#remoção-limpa-do-sistema)
7. [Resolução de Problemas na Desinstalação](#resolução-de-problemas-na-desinstalação)
8. [Limpeza Pós-Desinstalação](#limpeza-pós-desinstalação)
9. [Reinstalação](#reinstalação)

## Antes de Desinstalar

### Considerações Importantes

**Aviso**: Desinstalar o Electron AAOS Electron AAOS irá:

- Remover todos os arquivos do framework
- Excluir configurações de agentes (a menos que preservadas)
- Limpar dados da camada de memória (a menos que backup seja feito)
- Remover todos os workflows personalizados
- Excluir logs e arquivos temporários

### Checklist Pré-Desinstalação

- [ ] Fazer backup de dados importantes
- [ ] Exportar agentes e workflows personalizados
- [ ] Salvar chaves de API e configurações
- [ ] Documentar modificações personalizadas
- [ ] Parar todos os processos em execução
- [ ] Informar membros da equipe

### Faça Backup dos Seus Dados

```bash
# Criar backup completo
npx @electron-aaos/electron-aaos-core backup --complete

# Ou fazer backup manual dos diretórios importantes
tar -czf electron-aaos-backup-$(date +%Y%m%d).tar.gz \
  .electron-aaos/ \
  agents/ \
  workflows/ \
  tasks/ \
  --exclude=.electron-aaos/logs \
  --exclude=.electron-aaos/cache
```

## Desinstalação Rápida

### Usando o Desinstalador Integrado

A forma mais rápida de desinstalar o Electron AAOS Electron AAOS:

```bash
# Desinstalação básica (preserva dados do usuário)
npx @electron-aaos/electron-aaos-core uninstall

# Desinstalação completa (remove tudo)
npx @electron-aaos/electron-aaos-core uninstall --complete

# Desinstalação com preservação de dados
npx @electron-aaos/electron-aaos-core uninstall --keep-data
```

### Desinstalação Interativa

Para desinstalação guiada:

```bash
npx @electron-aaos/electron-aaos-core uninstall --interactive
```

Isso solicitará:

- O que manter/remover
- Opções de backup
- Confirmação para cada etapa

## Desinstalação Completa

### Etapa 1: Parar Todos os Serviços

```bash
# Parar todos os agentes em execução
*deactivate --all

# Parar todos os workflows
*stop-workflow --all

# Encerrar o meta-agent
*shutdown
```

### Etapa 2: Exportar Dados Importantes

```bash
# Exportar configurações
*export config --destination backup/config.json

# Exportar agentes
*export agents --destination backup/agents/

# Exportar workflows
*export workflows --destination backup/workflows/

# Exportar dados de memória
*export memory --destination backup/memory.zip
```

### Etapa 3: Executar o Desinstalador

```bash
# Remoção completa
npx @electron-aaos/electron-aaos-core uninstall --complete --no-backup
```

### Etapa 4: Remover Instalação Global

```bash
# Remover pacote npm global
npm uninstall -g @electron-aaos/electron-aaos-core

# Remover cache do npx
npm cache clean --force
```

### Etapa 5: Limpar Arquivos do Sistema

#### Windows

```powershell
# Remover arquivos do AppData
Remove-Item -Recurse -Force "$env:APPDATA\@electron-aaos/electron-aaos-core"

# Remover arquivos temporários
Remove-Item -Recurse -Force "$env:TEMP\electron-aaos-*"

# Remover entradas do registro (se houver)
Remove-Item -Path "HKCU:\Software\Electron AAOS Electron AAOS" -Recurse
```

#### macOS/Linux

```bash
# Remover arquivos de configuração
rm -rf ~/.electron-aaos
rm -rf ~/.config/@electron-aaos/electron-aaos-core

# Remover cache
rm -rf ~/.cache/@electron-aaos/electron-aaos-core

# Remover arquivos temporários
rm -rf /tmp/electron-aaos-*
```

## Desinstalação Seletiva

### Remover Componentes Específicos

```bash
# Remover apenas agentes
npx @electron-aaos/electron-aaos-core uninstall agents

# Remover apenas workflows
npx @electron-aaos/electron-aaos-core uninstall workflows

# Remover camada de memória
npx @electron-aaos/electron-aaos-core uninstall memory-layer

# Remover agente específico
*uninstall agent-name
```

### Manter o Core, Remover Extensões

```bash
# Remover todos os plugins
*plugin remove --all

# Remover Squads
rm -rf Squads/

# Remover templates personalizados
rm -rf templates/custom/
```

## Preservação de Dados

### O Que Manter

Antes de desinstalar, identifique o que você quer preservar:

1. **Agentes Personalizados**

   ```bash
   # Copiar agentes personalizados
   cp -r agents/custom/ ~/electron-aaos-backup/agents/
   ```

2. **Workflows e Tasks**

   ```bash
   # Copiar workflows
   cp -r workflows/ ~/electron-aaos-backup/workflows/
   cp -r tasks/ ~/electron-aaos-backup/tasks/
   ```

3. **Dados de Memória**

   ```bash
   # Exportar banco de dados de memória
   *memory export --format sqlite \
     --destination ~/electron-aaos-backup/memory.db
   ```

4. **Configurações**

   ```bash
   # Copiar todos os arquivos de configuração
   cp .electron-aaos/config.json ~/electron-aaos-backup/
   cp .env ~/electron-aaos-backup/
   ```

5. **Código Personalizado**
   ```bash
   # Encontrar e fazer backup de arquivos personalizados
   find . -name "*.custom.*" -exec cp {} ~/electron-aaos-backup/custom/ \;
   ```

### Script de Preservação

Crie `preserve-data.sh`:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/electron-aaos-backup-$(date +%Y%m%d-%H%M%S)"

echo "Criando diretório de backup: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Função de backup
backup_if_exists() {
    if [ -e "$1" ]; then
        echo "Fazendo backup de $1..."
        cp -r "$1" "$BACKUP_DIR/"
    fi
}

# Backup de todos os dados importantes
backup_if_exists ".electron-aaos"
backup_if_exists "agents"
backup_if_exists "workflows"
backup_if_exists "tasks"
backup_if_exists "templates"
backup_if_exists ".env"
backup_if_exists "package.json"

echo "Backup concluído em: $BACKUP_DIR"
```

## Remoção Limpa do Sistema

### Script de Limpeza Completa

Crie `clean-uninstall.sh`:

```bash
#!/bin/bash
echo "Desinstalação Completa do Electron AAOS Electron AAOS"
echo "================================="

# Confirmação
read -p "Isso removerá TODOS os dados do Electron AAOS Electron AAOS. Continuar? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Parar todos os processos
echo "Parando todos os processos..."
pkill -f "@electron-aaos/electron-aaos-core" || true
pkill -f "electron-aaos-developer" || true

# Remover arquivos do projeto
echo "Removendo arquivos do projeto..."
rm -rf .electron-aaos/
rm -rf agents/
rm -rf workflows/
rm -rf tasks/
rm -rf templates/
rm -rf Squads/
rm -rf node_modules/@electron-aaos/electron-aaos-core/

# Remover arquivos globais
echo "Removendo arquivos globais..."
npm uninstall -g @electron-aaos/electron-aaos-core

# Remover dados do usuário
echo "Removendo dados do usuário..."
rm -rf ~/.electron-aaos
rm -rf ~/.config/@electron-aaos/electron-aaos-core
rm -rf ~/.cache/@electron-aaos/electron-aaos-core

# Limpar cache do npm
echo "Limpando cache do npm..."
npm cache clean --force

# Remover do package.json
echo "Atualizando package.json..."
npm uninstall @electron-aaos/electron-aaos-core/core
npm uninstall @electron-aaos/electron-aaos-core/memory
npm uninstall @electron-aaos/electron-aaos-core/meta-agent

echo "Desinstalação concluída!"
```

### Limpeza do Registro (Windows)

```powershell
# Script PowerShell para limpeza no Windows
Write-Host "Limpando Electron AAOS Electron AAOS do Registro do Windows..."

# Remover do PATH
$path = [Environment]::GetEnvironmentVariable("PATH", "User")
$newPath = ($path.Split(';') | Where-Object { $_ -notmatch '@electron-aaos/electron-aaos-core' }) -join ';'
[Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

# Remover chaves do registro
Remove-ItemProperty -Path "HKCU:\Environment" -Name "Electron AAOS_*" -ErrorAction SilentlyContinue

# Remover associações de arquivo
Remove-Item -Path "HKCU:\Software\Classes\.electron-aaos" -Recurse -ErrorAction SilentlyContinue

Write-Host "Limpeza do registro concluída!"
```

## Resolução de Problemas na Desinstalação

### Problemas Comuns

#### 1. Permissão Negada

```bash
# Linux/macOS
sudo npx @electron-aaos/electron-aaos-core uninstall --complete

# Windows (Executar como Administrador)
npx @electron-aaos/electron-aaos-core uninstall --complete
```

#### 2. Processo Ainda em Execução

```bash
# Forçar parada de todos os processos
# Linux/macOS
killall -9 node
killall -9 @electron-aaos/electron-aaos-core

# Windows
taskkill /F /IM node.exe
taskkill /F /IM @electron-aaos/electron-aaos-core.exe
```

#### 3. Arquivos Bloqueados

```bash
# Encontrar processos usando os arquivos
# Linux/macOS
lsof | grep electron-aaos

# Windows (PowerShell)
Get-Process | Where-Object {$_.Path -like "*electron-aaos*"}
```

#### 4. Remoção Incompleta

```bash
# Limpeza manual
find . -name "*electron-aaos*" -type d -exec rm -rf {} +
find . -name "*.electron-aaos*" -type f -delete
```

### Desinstalação Forçada

Se a desinstalação normal falhar:

```bash
#!/bin/bash
# force-uninstall.sh
echo "Desinstalação forçada do Electron AAOS Electron AAOS..."

# Matar todos os processos relacionados
pkill -9 -f electron-aaos || true

# Remover todos os arquivos
rm -rf .electron-aaos* electron-aaos* *electron-aaos*
rm -rf agents workflows tasks templates
rm -rf node_modules/@electron-aaos/electron-aaos-core
rm -rf ~/.electron-aaos* ~/.config/electron-aaos* ~/.cache/electron-aaos*

# Limpar npm
npm cache clean --force
npm uninstall -g @electron-aaos/electron-aaos-core

echo "Desinstalação forçada concluída!"
```

## Limpeza Pós-Desinstalação

### 1. Verificar Remoção

```bash
# Verificar arquivos restantes
find . -name "*electron-aaos*" 2>/dev/null
find ~ -name "*electron-aaos*" 2>/dev/null

# Verificar pacotes npm
npm list -g | grep electron-aaos
npm list | grep electron-aaos

# Verificar processos em execução
ps aux | grep electron-aaos
```

### 2. Limpar Variáveis de Ambiente

```bash
# Remover do .bashrc/.zshrc
sed -i '/Electron AAOS_/d' ~/.bashrc
sed -i '/@electron-aaos/electron-aaos-core/d' ~/.bashrc

# Remover de arquivos .env
find . -name ".env*" -exec sed -i '/Electron AAOS_/d' {} \;
```

### 3. Atualizar Arquivos do Projeto

```javascript
// Remover do package.json scripts
{
  "scripts": {
    // Remover estas entradas
    "electron-aaos": "@electron-aaos/electron-aaos-core",
    "meta-agent": "@electron-aaos/electron-aaos-core meta-agent"
  }
}
```

### 4. Limpar Repositório Git

```bash
# Remover hooks git específicos do Electron AAOS
rm -f .git/hooks/*electron-aaos*

# Atualizar .gitignore
sed -i '/.electron-aaos/d' .gitignore
sed -i '/electron-aaos-/d' .gitignore

# Commitar remoção
git add -A
git commit -m "Remove Electron AAOS Electron AAOS"
```

## Reinstalação

### Após Desinstalação Completa

Se você quiser reinstalar o Electron AAOS Electron AAOS:

1. **Aguardar a limpeza**

   ```bash
   # Garantir que todos os processos pararam
   sleep 5
   ```

2. **Limpar cache do npm**

   ```bash
   npm cache clean --force
   ```

3. **Instalação limpa**
   ```bash
   npx @electron-aaos/electron-aaos-core@latest init my-project
   ```

### Restaurar a partir do Backup

```bash
# Restaurar dados salvos
cd my-project

# Restaurar configurações
cp ~/electron-aaos-backup/config.json .electron-aaos/

# Restaurar agentes
cp -r ~/electron-aaos-backup/agents/* ./agents/

# Importar memória
*memory import ~/electron-aaos-backup/memory.zip

# Verificar restauração
*doctor --verify-restore
```

## Checklist de Verificação de Desinstalação

- [ ] Todos os processos Electron AAOS parados
- [ ] Arquivos do projeto removidos
- [ ] Pacote npm global desinstalado
- [ ] Arquivos de configuração do usuário excluídos
- [ ] Diretórios de cache limpos
- [ ] Variáveis de ambiente removidas
- [ ] Entradas do registro limpas (Windows)
- [ ] Repositório git atualizado
- [ ] Nenhum arquivo Electron AAOS restante encontrado
- [ ] PATH do sistema atualizado

## Obtendo Ajuda

Se você encontrar problemas durante a desinstalação:

1. **Consulte a Documentação**
   - [FAQ](https://github.com/Electron AAOSAI/electron-aaos-core/wiki/faq#uninstall)
   - [Resolução de Problemas](https://github.com/Electron AAOSAI/electron-aaos-core/wiki/troubleshooting)

2. **Suporte da Comunidade**
   - Discord: #uninstall-help
   - GitHub Issues: Rotule com "uninstall"

3. **Suporte de Emergência**
   ```bash
   # Gerar relatório de desinstalação
   npx @electron-aaos/electron-aaos-core diagnose --uninstall > uninstall-report.log
   ```

---

**Lembre-se**: Sempre faça backup dos seus dados antes de desinstalar. O processo de desinstalação é irreversível, e a recuperação de dados pode não ser possível sem backups adequados.
