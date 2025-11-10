# 🖥️ Setup Local - Passo a Passo

## ⚠️ Resolução de Problemas Comuns

### Erro: "unable to get image" ou "cannot find file dockerDesktopLinuxEngine"

**Causa:** Docker Desktop não está rodando ou não está configurado corretamente.

**Solução:**
1. Verifique se o Docker Desktop está rodando
2. No Windows, verifique se WSL2 está ativado
3. Teste: `docker ps` (deve listar containers sem erro)

### Erro: "the attribute `version` is obsolete"

**Causa:** Docker Compose v2+ não precisa mais da linha `version`.

**Solução:** Já foi removido! Ignore este warning se aparecer.

---

## 📝 Passo 1: Criar Arquivos .env

Sim, você precisa criar um arquivo `.env` em cada serviço para rodar localmente.

### 1.1 Auth Service

```bash
cd auth-service
cp .env.example .env
```

Edite o arquivo `auth-service/.env`:
```env
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/medical_auth
JWT_SECRET=seu_super_secreto_jwt_key_mude_em_producao
JWT_EXPIRE=7d
NODE_ENV=development
DOCTORS_SERVICE_URL=http://doctors-service:3002
PATIENTS_SERVICE_URL=http://patients-service:3003
```

### 1.2 Doctors Service

```bash
cd ../doctors-service
cp .env.example .env
```

Edite o arquivo `doctors-service/.env`:
```env
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/medical_doctors
NODE_ENV=development
AUTH_SERVICE_URL=http://auth-service:3001
PATIENTS_SERVICE_URL=http://patients-service:3003
```

### 1.3 Patients Service

```bash
cd ../patients-service
cp .env.example .env
```

Edite o arquivo `patients-service/.env`:
```env
PORT=3003
MONGODB_URI=mongodb://mongodb:27017/medical_patients
NODE_ENV=development
AUTH_SERVICE_URL=http://auth-service:3001
DOCTORS_SERVICE_URL=http://doctors-service:3002
```

---

## 🚀 Passo 2: Instalar Dependências (Opcional)

Se quiser rodar sem Docker:

```bash
# Auth Service
cd auth-service
npm install

# Doctors Service
cd ../doctors-service
npm install

# Patients Service
cd ../patients-service
npm install
```

---

## 🐳 Passo 3: Iniciar com Docker Compose

Volte para a pasta `microservices`:

```bash
cd ..
```

### Opção A: Build e Start (Primeira vez)

```bash
docker-compose up --build -d
```

### Opção B: Apenas Start (depois da primeira vez)

```bash
docker-compose up -d
```

---

## ✅ Passo 4: Verificar Status

```bash
# Ver todos os containers
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f auth-service
docker-compose logs -f doctors-service
docker-compose logs -f patients-service
```

### Testar Health Checks

```bash
# Auth Service
curl http://localhost:3001/health

# Doctors Service
curl http://localhost:3002/health

# Patients Service
curl http://localhost:3003/health
```

**Resposta esperada:**
```json
{
  "success": true,
  "service": "auth-service",
  "status": "healthy",
  "timestamp": "2025-11-09T14:33:00.000Z"
}
```

---

## 🧪 Passo 5: Testar a API

### 5.1 Registrar um Paciente

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "paciente@teste.com",
    "password": "Teste123!",
    "firstName": "João",
    "lastName": "Silva",
    "phone": "+5511999999999",
    "role": "patient",
    "cpf": "12345678901",
    "dateOfBirth": "1990-01-01"
  }'
```

### 5.2 Fazer Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "paciente@teste.com",
    "password": "Teste123!"
  }'
```

Guarde o `token` que vier na resposta!

### 5.3 Ver Perfil

```bash
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🛑 Parar os Serviços

```bash
# Parar mas manter os dados
docker-compose down

# Parar e apagar tudo (incluindo banco de dados)
docker-compose down -v
```

---

## 🔍 Troubleshooting Avançado

### MongoDB não conecta

```bash
# Verificar se MongoDB está rodando
docker-compose ps mongodb

# Ver logs do MongoDB
docker-compose logs mongodb

# Conectar manualmente ao MongoDB
docker-compose exec mongodb mongosh

# Dentro do mongosh:
show dbs
use medical_auth
show collections
```

### Serviço não consegue conectar em outro serviço

```bash
# Verificar rede Docker
docker network ls
docker network inspect microservices_medical-network

# Testar ping entre serviços
docker-compose exec auth-service ping doctors-service
```

### Rebuild completo (quando mudar código)

```bash
# Para tudo
docker-compose down

# Remove imagens antigas
docker-compose build --no-cache

# Sobe novamente
docker-compose up -d
```

### Ver uso de recursos

```bash
docker stats
```

---

## 📦 Estrutura de .env Files

Resumo da estrutura final:

```
microservices/
├── auth-service/
│   ├── .env          ← CRIAR ESTE
│   └── .env.example  ✓ (já existe)
├── doctors-service/
│   ├── .env          ← CRIAR ESTE
│   └── .env.example  ✓ (já existe)
├── patients-service/
│   ├── .env          ← CRIAR ESTE
│   └── .env.example  ✓ (já existe)
└── docker-compose.yml
```

**IMPORTANTE:**
- Os arquivos `.env` não devem ser commitados (já estão no .gitignore)
- Use `.env.example` como template
- Para produção na AWS, use AWS Secrets Manager

---

## 🎯 Checklist de Setup Local

- [ ] Docker Desktop instalado e rodando
- [ ] Arquivos `.env` criados em cada serviço
- [ ] `docker-compose up --build -d` executado
- [ ] Health checks passando (3001, 3002, 3003)
- [ ] Teste de registro funcionando
- [ ] Teste de login funcionando

---

**Pronto! Seus microsserviços devem estar rodando localmente! 🎉**
