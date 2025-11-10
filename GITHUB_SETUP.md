# 🔧 GitHub Setup - Repositório Separado para Microsserviços

## 📁 Estrutura do Repositório

Você criará um **novo repositório GitHub** separado só para os microsserviços.

### Passo 1: Criar Novo Repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome sugerido: `medical-microservices` ou `tcc-2025-microservices`
3. Descrição: "Medical Appointment System - Microservices Architecture"
4. Visibilidade: Private ou Public (sua escolha)
5. **NÃO** inicialize com README (vamos fazer manual)
6. Clique em "Create repository"

---

## 📦 Passo 2: Preparar e Fazer Push Inicial

### 2.1 Copiar a pasta microservices

```bash
# No Windows (PowerShell ou CMD)
cd C:\Users\johao\Desktop\TCC

# Criar nova pasta para o repositório
mkdir tcc-microservices
cd tcc-microservices

# Copiar todo o conteúdo da pasta microservices
xcopy /E /I C:\Users\johao\Desktop\TCC\monolithic-finance\backend\microservices .
```

### 2.2 Inicializar Git

```bash
# Inicializar repositório
git init

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "Initial commit: Medical Microservices Architecture

- Auth Service (Authentication and User Management)
- Doctors Service (Doctors and Availability Management)
- Patients Service (Patients and Appointments Management)
- Docker Compose for local development
- ECS Task Definitions for AWS deployment
- GitHub Actions CI/CD workflow"

# Adicionar remote (substitua SEU_USUARIO pelo seu username)
git remote add origin https://github.com/SEU_USUARIO/medical-microservices.git

# Push para main
git branch -M main
git push -u origin main
```

---

## 🔐 Passo 3: Configurar GitHub Secrets

Vá em: **Settings → Secrets and variables → Actions → New repository secret**

### Secrets Necessários:

#### 3.1 AWS Credentials

```
Name: AWS_ACCESS_KEY_ID
Value: <Sua Access Key ID da AWS>
```

```
Name: AWS_SECRET_ACCESS_KEY
Value: <Sua Secret Access Key da AWS>
```

**Como obter AWS Credentials:**

1. Acesse AWS Console → IAM
2. Users → Seu usuário → Security credentials
3. Create access key → Command Line Interface (CLI)
4. Copie Access Key ID e Secret Access Key

**Permissões IAM Necessárias:**
- `AmazonECS_FullAccess`
- `AmazonEC2ContainerRegistryFullAccess`
- `CloudWatchLogsFullAccess`
- `SecretsManagerReadWrite` (para secrets)

#### 3.2 AWS Account ID (Opcional, mas recomendado)

```
Name: AWS_ACCOUNT_ID
Value: 123456789012
```

---

## 🚀 Passo 4: Estrutura do Repositório Final

Após o push, seu repositório deve ter esta estrutura:

```
medical-microservices/
├── .github/
│   └── workflows/
│       └── deploy-microservices.yml  ← GitHub Actions workflow
│
├── auth-service/
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── auth.routes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── doctors-service/
│   ├── models/
│   │   └── Doctor.js
│   ├── routes/
│   │   └── doctor.routes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── patients-service/
│   ├── models/
│   │   ├── Patient.js
│   │   └── Appointment.js
│   ├── routes/
│   │   ├── patient.routes.js
│   │   └── appointment.routes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
│
├── ecs-task-definitions/
│   ├── auth-service-task.json
│   ├── doctors-service-task.json
│   └── patients-service-task.json
│
├── docker-compose.yml
├── deploy-helper.sh
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── QUICKSTART.md
├── LOCAL_SETUP.md
├── AWS_APIGATEWAY_SETUP.md
└── GITHUB_SETUP.md (este arquivo)
```

---

## ⚙️ Passo 5: Como Funciona o Deploy Automático

### Trigger do Workflow

O deploy automático acontece quando você faz **push para a branch `main`**:

```bash
# Fazer mudanças no código
cd auth-service
# ... editar arquivos ...

# Commit e push
git add .
git commit -m "Update auth service: add password reset feature"
git push origin main
```

**O que acontece automaticamente:**

1. ✅ GitHub Actions detecta push na `main`
2. ✅ Faz build de todas as imagens Docker
3. ✅ Faz push para ECR (Amazon Container Registry)
4. ✅ Atualiza ECS Services (força novo deployment)
5. ✅ Aguarda serviços estabilizarem
6. ✅ Notifica resultado

### Ver Status do Deploy

1. Vá no repositório GitHub
2. Clique na aba **Actions**
3. Veja o workflow "Deploy Microservices to AWS ECS"
4. Clique em um run específico para ver detalhes

---

## 🔄 Passo 6: Workflow de Desenvolvimento

### Desenvolvimento Local

```bash
# Trabalhar localmente
cd medical-microservices
docker-compose up -d

# Fazer mudanças
# ... editar código ...

# Testar localmente
curl http://localhost:3001/health

# Quando satisfeito, commit e push
git add .
git commit -m "Feature: Add doctor availability validation"
git push origin main
```

### Deploy Manual (se necessário)

Se quiser deployar manualmente sem fazer commit:

```bash
# Ir para Actions no GitHub
# Clicar em "Deploy Microservices to AWS ECS"
# Clicar em "Run workflow" → escolher branch → Run
```

---

## 🌿 Passo 7: Branches e Ambientes (Recomendado)

### Estratégia de Branches

```
main (production)
  ↑
develop (staging/testing)
  ↑
feature/* (desenvolvimento)
```

### Criar Branch de Desenvolvimento

```bash
# Criar branch develop
git checkout -b develop
git push -u origin develop
```

### Modificar Workflow para Múltiplos Ambientes

Edite `.github/workflows/deploy-microservices.yml`:

```yaml
on:
  push:
    branches:
      - main        # Deploy para produção
      - develop     # Deploy para staging

env:
  AWS_REGION: us-east-2
  ECS_CLUSTER: ${{ github.ref == 'refs/heads/main' && 'medical-prod-cluster' || 'medical-staging-cluster' }}
```

---

## 📊 Passo 8: Monitorar Deploys

### Ver Logs do GitHub Actions

```bash
# Ou via CLI (opcional)
gh run list --repo SEU_USUARIO/medical-microservices
gh run view <RUN_ID> --log
```

### Ver Status no AWS

```bash
aws ecs describe-services \
    --cluster medical-microservices-cluster \
    --services auth-service doctors-service patients-service \
    --region us-east-2
```

---

## 🛡️ Passo 9: Proteção de Branch (Recomendado)

Para evitar deploys acidentais:

1. Vá em **Settings → Branches**
2. Clique em **Add rule**
3. Branch name pattern: `main`
4. Marque:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass
5. Save changes

**Workflow com proteção:**

```bash
# Criar feature branch
git checkout -b feature/new-endpoint

# Fazer mudanças
# ... código ...

# Push para feature branch
git push origin feature/new-endpoint

# Criar Pull Request no GitHub
# Review → Merge para main → Deploy automático
```

---

## 📝 Passo 10: Adicionar Status Badge (Opcional)

No seu `README.md`, adicione:

```markdown
# Medical Microservices

[![Deploy Status](https://github.com/SEU_USUARIO/medical-microservices/actions/workflows/deploy-microservices.yml/badge.svg)](https://github.com/SEU_USUARIO/medical-microservices/actions/workflows/deploy-microservices.yml)

Sistema de agendamento de consultas médicas - Arquitetura de Microsserviços
```

---

## 🔍 Troubleshooting

### Workflow falha com "Access Denied"

**Causa:** Secrets AWS não configurados ou permissões IAM insuficientes

**Solução:**
- Verificar se `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` estão corretos
- Adicionar permissões IAM necessárias ao usuário

### Workflow falha em "Push to ECR"

**Causa:** Repositórios ECR não existem

**Solução:**
```bash
aws ecr create-repository --repository-name medical-auth-service --region us-east-2
aws ecr create-repository --repository-name medical-doctors-service --region us-east-2
aws ecr create-repository --repository-name medical-patients-service --region us-east-2
```

### Workflow roda mas serviços não atualizam

**Causa:** ECS Services não existem ainda

**Solução:**
- Seguir o guia `AWS_APIGATEWAY_SETUP.md` para criar infraestrutura
- Criar ECS Services antes de rodar o workflow

---

## ✅ Checklist de Setup GitHub

- [ ] Novo repositório criado no GitHub
- [ ] Código copiado e pushed
- [ ] `.github/workflows/deploy-microservices.yml` presente
- [ ] Secrets AWS configurados
- [ ] Permissões IAM corretas
- [ ] Repositórios ECR criados
- [ ] ECS Cluster criado
- [ ] Task Definitions registradas
- [ ] ECS Services criados
- [ ] Primeiro deploy automático funcionou
- [ ] Badge de status adicionado (opcional)

---

## 📚 Recursos Adicionais

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Documentation](https://docs.docker.com/)

---

**Pronto! Seu repositório GitHub está configurado para CI/CD automático! 🎉**

Qualquer commit na `main` fará deploy automático para AWS ECS!
