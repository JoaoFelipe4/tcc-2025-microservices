# ✅ Respostas às Suas Dúvidas

## 1️⃣ Sobre os Arquivos .env

### ✅ Sim, você precisa criar arquivos .env para rodar localmente

**Para desenvolvimento local (Docker Compose):**

```bash
# Em cada serviço, crie um arquivo .env baseado no .env.example

cd auth-service
cp .env.example .env

cd ../doctors-service
cp .env.example .env

cd ../patients-service
cp .env.example .env
```

**Conteúdo dos arquivos .env:**

`auth-service/.env`:
```env
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/medical_auth
JWT_SECRET=seu_super_secreto_jwt_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
DOCTORS_SERVICE_URL=http://doctors-service:3002
PATIENTS_SERVICE_URL=http://patients-service:3003
```

`doctors-service/.env`:
```env
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/medical_doctors
NODE_ENV=development
AUTH_SERVICE_URL=http://auth-service:3001
PATIENTS_SERVICE_URL=http://patients-service:3003
```

`patients-service/.env`:
```env
PORT=3003
MONGODB_URI=mongodb://mongodb:27017/medical_patients
NODE_ENV=development
AUTH_SERVICE_URL=http://auth-service:3001
DOCTORS_SERVICE_URL=http://doctors-service:3002
```

**IMPORTANTE:**
- ✅ Arquivos `.env` são apenas para desenvolvimento local
- ✅ Já estão no `.gitignore` (não serão commitados)
- ✅ Para AWS, usamos **AWS Secrets Manager** (não precisa de .env)

---

## 2️⃣ Sobre o Repositório GitHub Separado

### ✅ Criar repositório separado para microservices

**Estrutura recomendada:**

```
Repositório 1: monolithic-finance (o que você já tem)
  └── backend/
      └── (código monolítico atual)

Repositório 2: medical-microservices (NOVO - criar este)
  ├── .github/
  │   └── workflows/
  │       └── deploy-microservices.yml  ← CI/CD automático
  ├── auth-service/
  ├── doctors-service/
  ├── patients-service/
  ├── docker-compose.yml
  └── ecs-task-definitions/
```

**Passos para criar:**

1. **Criar novo repo no GitHub:**
   - Nome: `medical-microservices` (ou similar)
   - Visibilidade: Private ou Public
   - **NÃO** inicializar com README

2. **Copiar pasta microservices:**
   ```bash
   # Windows
   cd C:\Users\johao\Desktop\TCC
   mkdir tcc-microservices
   xcopy /E /I monolithic-finance\backend\microservices tcc-microservices
   ```

3. **Inicializar Git:**
   ```bash
   cd tcc-microservices
   git init
   git add .
   git commit -m "Initial commit: Microservices architecture"
   git remote add origin https://github.com/SEU_USUARIO/medical-microservices.git
   git branch -M main
   git push -u origin main
   ```

**O diretório `.github/workflows` já está criado dentro de `microservices/`!**

Você terá:
```
microservices/
└── .github/
    └── workflows/
        └── deploy-microservices.yml  ← Já criado!
```

Quando copiar para o novo repositório, esse workflow vai junto automaticamente! 🎉

---

## 3️⃣ Sobre API Gateway (não Load Balancer)

### ✅ Adaptado para AWS API Gateway HTTP API

**Já criei a documentação completa em:** `AWS_APIGATEWAY_SETUP.md`

**Arquitetura com API Gateway:**

```
Internet
  ↓
AWS API Gateway (HTTP API)
  ↓ (VPC Link)
Network Load Balancer (interno)
  ↓
ECS Fargate Tasks (3 serviços)
  ↓
MongoDB Atlas
```

**Por que ainda tem NLB?**
- API Gateway precisa de **VPC Link** para acessar recursos privados
- VPC Link requer um **Network Load Balancer** (não Application Load Balancer)
- Mas o NLB é **interno** (não exposto à internet)
- Apenas o API Gateway é público

**Vantagens do API Gateway:**
- ✅ Custo mais baixo para tráfego leve
- ✅ Throttling nativo
- ✅ Caching integrado
- ✅ Custom domain fácil
- ✅ Serverless (sem instâncias para gerenciar)

**Rotas configuradas:**
```
POST   https://<API_ID>.execute-api.us-east-2.amazonaws.com/production/auth/register
POST   https://<API_ID>.execute-api.us-east-2.amazonaws.com/production/auth/login
GET    https://<API_ID>.execute-api.us-east-2.amazonaws.com/production/doctors
POST   https://<API_ID>.execute-api.us-east-2.amazonaws.com/production/appointments
```

---

## 4️⃣ Sobre a Região us-east-2

### ✅ Tudo já atualizado para us-east-2

**Arquivos atualizados:**

1. **GitHub Actions Workflow** (.github/workflows/deploy-microservices.yml):
   ```yaml
   env:
     AWS_REGION: us-east-2  ✓
   ```

2. **Task Definitions** (todos os 3):
   - `ecs-task-definitions/auth-service-task.json` ✓
   - `ecs-task-definitions/doctors-service-task.json` ✓
   - `ecs-task-definitions/patients-service-task.json` ✓

   Atualizados com:
   ```json
   "image": "<YOUR_ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/..."
   "awslogs-region": "us-east-2"
   "valueFrom": "arn:aws:secretsmanager:us-east-2:..."
   ```

3. **Documentação** (README.md, AWS_APIGATEWAY_SETUP.md):
   - Todos os comandos usam `--region us-east-2` ✓

**Comandos AWS CLI já configurados:**
```bash
# Exemplo:
aws ecr create-repository \
    --repository-name medical-auth-service \
    --region us-east-2  ← Região correta
```

---

## 🐛 Sobre o Erro do Docker Compose

### ❌ Erro: "unable to get image" / "cannot find dockerDesktopLinuxEngine"

**Causa:** Docker Desktop não está rodando.

**Solução:**

1. **Iniciar Docker Desktop:**
   - Windows: Abra Docker Desktop do menu Iniciar
   - Aguarde até o ícone ficar verde

2. **Verificar Docker:**
   ```bash
   docker ps
   # Deve listar containers (pode estar vazio, mas não deve dar erro)
   ```

3. **Testar Docker:**
   ```bash
   docker run hello-world
   # Deve baixar e rodar uma imagem de teste
   ```

4. **Iniciar os serviços:**
   ```bash
   cd C:\Users\johao\Desktop\TCC\monolithic-finance\backend\microservices
   docker-compose up --build -d
   ```

**Sobre o warning "version is obsolete":**
- ✅ Já foi removido do `docker-compose.yml`
- É apenas um aviso, não afeta funcionamento
- Docker Compose v2+ não precisa da linha `version:`

---

## 📋 Checklist Completo de Setup

### Desenvolvimento Local:
- [ ] Docker Desktop instalado e rodando
- [ ] Criar arquivos `.env` em cada serviço
- [ ] Executar `docker-compose up --build -d`
- [ ] Testar health checks (3001, 3002, 3003)
- [ ] Testar API de registro/login

### Repositório GitHub:
- [ ] Criar novo repositório `medical-microservices`
- [ ] Copiar pasta `microservices` para novo local
- [ ] Push inicial para GitHub
- [ ] Configurar Secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

### AWS Setup (us-east-2):
- [ ] Criar VPC e Subnets
- [ ] Criar ECS Cluster
- [ ] Criar ECR Repositories (3)
- [ ] Criar Secrets Manager (MongoDB URIs, JWT)
- [ ] Criar Network Load Balancer (interno)
- [ ] Criar API Gateway HTTP API
- [ ] Criar VPC Link
- [ ] Registrar Task Definitions
- [ ] Criar ECS Services
- [ ] Testar API Gateway endpoint

### Deploy Automático:
- [ ] Fazer commit e push para `main`
- [ ] Ver workflow rodando em Actions
- [ ] Verificar deploy no ECS
- [ ] Testar endpoints via API Gateway

---

## 🎯 Resumo Final

| Tópico | Status | Detalhes |
|--------|--------|----------|
| **Arquivos .env** | ✅ Respondido | Criar manualmente em cada serviço (local only) |
| **GitHub Separado** | ✅ Respondido | Ver GITHUB_SETUP.md com passo a passo |
| **API Gateway** | ✅ Implementado | Ver AWS_APIGATEWAY_SETUP.md completo |
| **Região us-east-2** | ✅ Atualizado | Todos os arquivos já usando us-east-2 |
| **Erro Docker** | ✅ Resolvido | Docker Desktop precisa estar rodando |

---

## 📚 Documentação Criada

1. **README.md** - Guia completo geral
2. **ARCHITECTURE.md** - Arquitetura detalhada
3. **QUICKSTART.md** - Início rápido 5 minutos
4. **LOCAL_SETUP.md** - Setup local passo a passo ← **COMECE AQUI**
5. **AWS_APIGATEWAY_SETUP.md** - Setup AWS com API Gateway ← **PARA PRODUÇÃO**
6. **GITHUB_SETUP.md** - Configurar repositório e CI/CD
7. **RESPOSTAS_DUVIDAS.md** - Este arquivo (resumo)

---

## 🚀 Próximos Passos Recomendados

1. **Testar Localmente:**
   ```bash
   cd microservices
   # Criar .env em cada serviço
   docker-compose up --build -d
   curl http://localhost:3001/health
   ```

2. **Criar Repositório GitHub:**
   - Seguir GITHUB_SETUP.md
   - Push inicial

3. **Setup AWS:**
   - Seguir AWS_APIGATEWAY_SETUP.md
   - Criar infraestrutura

4. **Primeiro Deploy:**
   - Commit e push
   - Workflow roda automaticamente

---

**Tudo pronto! Qualquer dúvida, consulte os arquivos MD criados! 🎉**
