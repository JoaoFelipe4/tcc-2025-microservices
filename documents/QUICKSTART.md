# 🚀 Quick Start Guide - Medical Microservices

Este guia irá te ajudar a colocar os microsserviços rodando em **5 minutos**.

---

## ⚡ Opção 1: Rodar Localmente com Docker Compose (Recomendado para Desenvolvimento)

### Passo 1: Pré-requisitos

- Docker Desktop instalado
- Docker Compose instalado

### Passo 2: Iniciar Serviços

```bash
cd microservices
docker-compose up -d
```

### Passo 3: Verificar Status

```bash
# Ver logs
docker-compose logs -f

# Verificar health checks
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Doctors Service
curl http://localhost:3003/health  # Patients Service
```

### Passo 4: Testar API

```bash
# Registrar um paciente
curl -X POST http://localhost:3001/api/auth/register \
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

### Passo 5: Parar Serviços

```bash
docker-compose down
```

---

## ☁️ Opção 2: Deploy na AWS ECS

### Passo 1: Configurar Variáveis de Ambiente

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1
```

### Passo 2: Criar Repositórios ECR

```bash
./deploy-helper.sh create-repos
```

### Passo 3: Configurar Secrets

```bash
./deploy-helper.sh setup-secrets

# Adicionar MongoDB URIs manualmente no Secrets Manager
aws secretsmanager put-secret-value \
    --secret-id medical/mongodb-uri \
    --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/medical_auth"

aws secretsmanager put-secret-value \
    --secret-id medical/mongodb-uri-doctors \
    --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/medical_doctors"

aws secretsmanager put-secret-value \
    --secret-id medical/mongodb-uri-patients \
    --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/medical_patients"
```

### Passo 4: Criar Infraestrutura (VPC, ECS Cluster, ALB)

**Opção A: Usando AWS Console**
1. Crie um ECS Cluster (Fargate)
2. Crie um Application Load Balancer
3. Crie Target Groups para cada serviço
4. Configure roteamento baseado em path

**Opção B: Usando Terraform/CloudFormation**
(Ver documentação completa em README.md)

### Passo 5: Build e Deploy

```bash
# Deploy completo (build + push + deploy)
./deploy-helper.sh full-deploy
```

### Passo 6: Verificar Status

```bash
./deploy-helper.sh status
```

---

## 🧪 Testando a API

### 1. Registrar Médico

```bash
curl -X POST http://<ALB_DNS>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinic.com",
    "password": "Doctor123!",
    "firstName": "Maria",
    "lastName": "Santos",
    "phone": "+5511912345678",
    "role": "doctor",
    "crm": "CRM/SP 123456",
    "specialties": ["Cardiologia"],
    "consultationPrice": 250,
    "consultationDuration": 30
  }'
```

### 2. Login

```bash
TOKEN=$(curl -X POST http://<ALB_DNS>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinic.com",
    "password": "Doctor123!"
  }' | jq -r '.token')

echo $TOKEN
```

### 3. Atualizar Perfil do Médico

```bash
DOCTOR_ID="<DOCTOR_ID_FROM_REGISTRATION>"

curl -X PUT http://<ALB_DNS>/api/doctors/$DOCTOR_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "availability": [
      {
        "dayOfWeek": 1,
        "startTime": "08:00",
        "endTime": "12:00"
      },
      {
        "dayOfWeek": 3,
        "startTime": "14:00",
        "endTime": "18:00"
      }
    ],
    "bio": "Cardiologista com 10 anos de experiência"
  }'
```

### 4. Listar Médicos (Público)

```bash
curl http://<ALB_DNS>/api/doctors?specialty=Cardiologia
```

### 5. Verificar Disponibilidade

```bash
curl "http://<ALB_DNS>/api/doctors/$DOCTOR_ID/availability?date=2024-03-20"
```

### 6. Criar Agendamento (como Paciente)

```bash
# Login como paciente
PATIENT_TOKEN=$(curl -X POST http://<ALB_DNS>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!"
  }' | jq -r '.token')

# Criar agendamento
curl -X POST http://<ALB_DNS>/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -d '{
    "doctorId": "<DOCTOR_ID>",
    "dateTime": "2024-03-20T08:30:00.000Z",
    "type": "consultation",
    "reason": "Consulta de rotina"
  }'
```

---

## 🔍 Troubleshooting

### Serviço não inicia localmente

```bash
# Ver logs detalhados
docker-compose logs -f <service-name>

# Verificar containers rodando
docker-compose ps

# Reiniciar serviços
docker-compose restart
```

### Erro de conexão entre serviços

```bash
# Verificar rede Docker
docker network ls
docker network inspect microservices_medical-network

# Testar conectividade
docker-compose exec auth-service ping doctors-service
```

### MongoDB não conecta

```bash
# Verificar se MongoDB está rodando
docker-compose ps mongodb

# Ver logs do MongoDB
docker-compose logs mongodb

# Conectar manualmente
docker-compose exec mongodb mongosh
```

### ECS Task não inicia

```bash
# Ver logs da task
aws ecs describe-tasks \
    --cluster medical-microservices-cluster \
    --tasks <TASK_ARN> \
    --region us-east-1

# Ver logs no CloudWatch
aws logs tail /ecs/medical-auth-service --follow
```

### Health check falhando

```bash
# Verificar endpoint de health
curl http://localhost:3001/health

# Resposta esperada:
{
  "success": true,
  "service": "auth-service",
  "status": "healthy",
  "timestamp": "2024-03-20T10:30:00.000Z"
}
```

---

## 📝 Próximos Passos

1. **Segurança:**
   - Configurar HTTPS no ALB com certificado SSL
   - Implementar API rate limiting por usuário
   - Adicionar CORS policies específicas

2. **Observabilidade:**
   - Configurar AWS X-Ray para distributed tracing
   - Criar dashboards no CloudWatch
   - Configurar alarmes para CPU/Memory/Errors

3. **Escalabilidade:**
   - Configurar Auto Scaling para ECS Services
   - Implementar cache com Redis/ElastiCache
   - Adicionar CDN (CloudFront)

4. **CI/CD:**
   - Configurar GitHub Actions (ver README.md)
   - Adicionar testes automatizados
   - Implementar Blue-Green deployment

---

## 📚 Recursos Adicionais

- [README.md](README.md) - Documentação completa
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura detalhada
- [API Documentation](../README.md) - Endpoints e payloads

---

## 🆘 Suporte

Problemas ou dúvidas? Abra uma issue no repositório!

**Happy Coding! 🚀**
