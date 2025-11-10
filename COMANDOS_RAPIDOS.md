# ⚡ Comandos Rápidos - Cheat Sheet

## 🖥️ Local (Docker Compose)

### Iniciar tudo
```bash
cd microservices
docker-compose up -d
```

### Ver logs
```bash
docker-compose logs -f                    # Todos
docker-compose logs -f auth-service       # Auth apenas
docker-compose logs -f doctors-service    # Doctors apenas
docker-compose logs -f patients-service   # Patients apenas
```

### Parar tudo
```bash
docker-compose down              # Para mas mantém dados
docker-compose down -v           # Para e apaga dados (MongoDB)
```

### Rebuild (após mudanças no código)
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Health Checks
```bash
curl http://localhost:3001/health   # Auth
curl http://localhost:3002/health   # Doctors
curl http://localhost:3003/health   # Patients
```

---

## 🔐 Testar API (Local)

### Registrar Paciente
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

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "paciente@teste.com",
    "password": "Teste123!"
  }'
```

### Obter Token e Salvar
```bash
# Windows PowerShell
$response = Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method POST -ContentType "application/json" -Body '{"email":"paciente@teste.com","password":"Teste123!"}'
$token = $response.token
echo $token

# Linux/Mac
export TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"paciente@teste.com","password":"Teste123!"}' \
  | jq -r '.token')
```

---

## ☁️ AWS - Setup Inicial (us-east-2)

### Criar Repositórios ECR
```bash
aws ecr create-repository --repository-name medical-auth-service --region us-east-2
aws ecr create-repository --repository-name medical-doctors-service --region us-east-2
aws ecr create-repository --repository-name medical-patients-service --region us-east-2
```

### Criar Secrets Manager
```bash
# JWT Secret
aws secretsmanager create-secret \
    --name medical/jwt-secret \
    --secret-string "$(openssl rand -base64 32)" \
    --region us-east-2

# JWT Expire
aws secretsmanager create-secret \
    --name medical/jwt-expire \
    --secret-string "7d" \
    --region us-east-2

# MongoDB URIs (substitua os valores)
aws secretsmanager create-secret \
    --name medical/mongodb-uri \
    --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/medical_auth" \
    --region us-east-2

aws secretsmanager create-secret \
    --name medical/mongodb-uri-doctors \
    --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/medical_doctors" \
    --region us-east-2

aws secretsmanager create-secret \
    --name medical/mongodb-uri-patients \
    --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/medical_patients" \
    --region us-east-2
```

### Criar ECS Cluster
```bash
aws ecs create-cluster \
    --cluster-name medical-microservices-cluster \
    --region us-east-2
```

---

## 🐳 Docker - Build e Push Manual

### Login ECR
```bash
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com
```

### Build e Push Auth Service
```bash
cd auth-service
docker build -t <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/medical-auth-service:latest .
docker push <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/medical-auth-service:latest
cd ..
```

### Build e Push Doctors Service
```bash
cd doctors-service
docker build -t <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/medical-doctors-service:latest .
docker push <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/medical-doctors-service:latest
cd ..
```

### Build e Push Patients Service
```bash
cd patients-service
docker build -t <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/medical-patients-service:latest .
docker push <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/medical-patients-service:latest
cd ..
```

---

## 📋 ECS - Comandos Úteis

### Registrar Task Definitions
```bash
# Primeiro, edite os arquivos em ecs-task-definitions/ e substitua:
# - <YOUR_AWS_ACCOUNT_ID> pelo seu Account ID
# Depois:

aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definitions/auth-service-task.json \
    --region us-east-2

aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definitions/doctors-service-task.json \
    --region us-east-2

aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definitions/patients-service-task.json \
    --region us-east-2
```

### Ver Status dos Services
```bash
aws ecs describe-services \
    --cluster medical-microservices-cluster \
    --services auth-service doctors-service patients-service \
    --region us-east-2
```

### Ver Tasks Rodando
```bash
aws ecs list-tasks \
    --cluster medical-microservices-cluster \
    --region us-east-2
```

### Forçar Novo Deploy
```bash
aws ecs update-service \
    --cluster medical-microservices-cluster \
    --service auth-service \
    --force-new-deployment \
    --region us-east-2
```

---

## 📊 CloudWatch Logs

### Ver Logs
```bash
# Auth Service
aws logs tail /ecs/medical-auth-service --follow --region us-east-2

# Doctors Service
aws logs tail /ecs/medical-doctors-service --follow --region us-east-2

# Patients Service
aws logs tail /ecs/medical-patients-service --follow --region us-east-2
```

---

## 🔍 Troubleshooting

### MongoDB não conecta (local)
```bash
docker-compose ps mongodb                    # Ver status
docker-compose logs mongodb                  # Ver logs
docker-compose exec mongodb mongosh          # Conectar
```

### Service não inicia no ECS
```bash
# Listar tasks
aws ecs list-tasks --cluster medical-microservices-cluster --region us-east-2

# Ver detalhes da task (substitua TASK_ID)
aws ecs describe-tasks \
    --cluster medical-microservices-cluster \
    --tasks <TASK_ID> \
    --region us-east-2

# Ver logs
aws logs tail /ecs/medical-auth-service --follow --region us-east-2
```

### Ver imagens no ECR
```bash
aws ecr list-images \
    --repository-name medical-auth-service \
    --region us-east-2
```

### Deletar Service (se precisar recriar)
```bash
aws ecs update-service \
    --cluster medical-microservices-cluster \
    --service auth-service \
    --desired-count 0 \
    --region us-east-2

aws ecs delete-service \
    --cluster medical-microservices-cluster \
    --service auth-service \
    --region us-east-2
```

---

## 🌐 API Gateway

### Ver APIs
```bash
aws apigatewayv2 get-apis --region us-east-2
```

### Ver Routes
```bash
aws apigatewayv2 get-routes --api-id <API_ID> --region us-east-2
```

### Testar API Gateway (substitua <API_ENDPOINT>)
```bash
# Health check
curl <API_ENDPOINT>/production/auth/health

# Registrar paciente
curl -X POST <API_ENDPOINT>/production/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!",
    "firstName": "João",
    "lastName": "Silva",
    "phone": "+5511999999999",
    "role": "patient",
    "cpf": "12345678901",
    "dateOfBirth": "1990-01-01"
  }'
```

---

## 🚀 GitHub

### Criar novo repo e push
```bash
cd C:\Users\johao\Desktop\TCC\tcc-microservices
git init
git add .
git commit -m "Initial commit: Medical Microservices"
git remote add origin https://github.com/SEU_USUARIO/medical-microservices.git
git branch -M main
git push -u origin main
```

### Deploy manual via GitHub Actions
```bash
# Ir para: https://github.com/SEU_USUARIO/medical-microservices/actions
# Clicar em "Deploy Microservices to AWS ECS"
# Clicar em "Run workflow" → main → Run workflow
```

---

## 📌 Variáveis que você precisa substituir

Em todos os comandos acima, substitua:

- `<YOUR_AWS_ACCOUNT_ID>` → Seu AWS Account ID (ex: 123456789012)
- `<ACCOUNT_ID>` → Mesmo que acima
- `<API_ID>` → ID do API Gateway (obtido após criar)
- `<API_ENDPOINT>` → URL do API Gateway (ex: https://abc123.execute-api.us-east-2.amazonaws.com)
- `<TASK_ID>` → ID da task ECS (obtido do list-tasks)
- `SEU_USUARIO` → Seu username do GitHub

---

## 🎯 Fluxo Completo de Deploy

### Primeira vez:
```bash
# 1. AWS Setup
aws ecr create-repository --repository-name medical-auth-service --region us-east-2
# ... (criar todos os recursos AWS)

# 2. Build e Push
docker build -t <ACCOUNT>.dkr.ecr.us-east-2.amazonaws.com/medical-auth-service:latest auth-service
docker push <ACCOUNT>.dkr.ecr.us-east-2.amazonaws.com/medical-auth-service:latest
# ... (para todos os serviços)

# 3. Registrar Tasks
aws ecs register-task-definition --cli-input-json file://ecs-task-definitions/auth-service-task.json --region us-east-2
# ... (para todos)

# 4. Criar Services
aws ecs create-service --cluster medical-microservices-cluster --service-name auth-service ...
# ... (seguir AWS_APIGATEWAY_SETUP.md)
```

### Deploy subsequente (automático):
```bash
# Apenas:
git add .
git commit -m "Update feature"
git push origin main
# GitHub Actions faz o resto!
```

---

**Salve este arquivo! É seu guia de referência rápida! 📋**
