# 🏥 Medical Appointment System - Microservices Architecture

[![Deploy Status](https://img.shields.io/badge/deploy-automated-success)]()
[![AWS Region](https://img.shields.io/badge/aws-us--east--2-orange)]()
[![API](https://img.shields.io/badge/api-gateway-blue)]()

## 📋 Visão Geral

Este projeto implementa uma arquitetura de **microsserviços** para o sistema de agendamento de consultas médicas, dividido em 3 serviços independentes:

1. **Auth Service (Port 3001)** - Autenticação e gerenciamento de usuários
2. **Doctors Service (Port 3002)** - Gerenciamento de médicos, especialidades e disponibilidade
3. **Patients Service (Port 3003)** - Gerenciamento de pacientes e agendamentos

## 🚀 Início Rápido

**NOVO USUÁRIO? Comece aqui:**

1. **Setup Local:** Leia [LOCAL_SETUP.md](LOCAL_SETUP.md) ← **COMECE AQUI**
2. **Repositório GitHub:** Leia [GITHUB_SETUP.md](GITHUB_SETUP.md)
3. **DocumentDB na AWS:** Leia [AWS_DOCUMENTDB_SETUP.md](AWS_DOCUMENTDB_SETUP.md)
4. **Deploy AWS:** Leia [AWS_APIGATEWAY_SETUP.md](AWS_APIGATEWAY_SETUP.md)
5. **Dúvidas?** Leia [RESPOSTAS_DUVIDAS.md](RESPOSTAS_DUVIDAS.md)
6. **Comandos Rápidos:** [COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md)

---

## 📚 Documentação Completa

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **[LOCAL_SETUP.md](LOCAL_SETUP.md)** | Setup passo a passo local | Primeiro uso |
| **[GITHUB_SETUP.md](GITHUB_SETUP.md)** | Configurar repositório e CI/CD | Após setup local |
| **[AWS_DOCUMENTDB_SETUP.md](AWS_DOCUMENTDB_SETUP.md)** | Configurar DocumentDB (banco de dados) | Antes do deploy AWS |
| **[AWS_APIGATEWAY_SETUP.md](AWS_APIGATEWAY_SETUP.md)** | Deploy completo na AWS | Produção |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Arquitetura detalhada | Entender sistema |
| **[QUICKSTART.md](QUICKSTART.md)** | Início rápido 5 min | Resumo executivo |
| **[RESPOSTAS_DUVIDAS.md](RESPOSTAS_DUVIDAS.md)** | FAQ e troubleshooting | Dúvidas |
| **[COMANDOS_RAPIDOS.md](COMANDOS_RAPIDOS.md)** | Cheat sheet | Referência |

---

## ⚠️ Problemas Comuns e Soluções

### 🐛 Erro ao rodar `docker-compose up`

**Erro típico:**
```
unable to get image 'microservices-auth-service': error during connect:
Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/...":
The system cannot find the file specified.
```

**Causa:** Docker Desktop não está rodando.

**Solução:**
1. ✅ Inicie o **Docker Desktop** (menu Iniciar do Windows)
2. ✅ Aguarde até o ícone ficar verde (pode demorar 1-2 minutos)
3. ✅ Teste: `docker ps` (deve listar containers, mesmo vazio)
4. ✅ Execute: `docker-compose up --build -d`

**Warning "version is obsolete":**
- Apenas um aviso (Docker Compose v2+)
- Já foi removido do arquivo
- Não afeta o funcionamento

### 🔧 Preciso criar arquivos .env?

**Sim, para rodar localmente:**

Crie um arquivo `.env` em cada serviço baseado no `.env.example`:

```bash
cd auth-service
cp .env.example .env

cd ../doctors-service
cp .env.example .env

cd ../patients-service
cp .env.example .env
```

**Para AWS:** Use AWS Secrets Manager (não precisa de .env)

### 📂 Onde criar o repositório GitHub?

Crie um **novo repositório separado** chamado `medical-microservices`.

**Detalhes completos:** [GITHUB_SETUP.md](GITHUB_SETUP.md)

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway / Load Balancer              │
│                  (AWS ALB or API Gateway)                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Auth Service │      │   Doctors    │      │  Patients    │
│   (Port      │◄────►│   Service    │◄────►│   Service    │
│    3001)     │      │ (Port 3002)  │      │ (Port 3003)  │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  AWS DocumentDB    │
                    │ (MongoDB-compatible)│
                    └────────────────────┘
```

### Comunicação Entre Serviços

- **Síncrona:** HTTP/REST via axios
- **Autenticação:** Token JWT verificado pelo Auth Service
- **Service Discovery:** AWS Cloud Map ou variáveis de ambiente

---

## 🚀 Deploy Local com Docker Compose

### Pré-requisitos
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (para desenvolvimento local sem Docker)

### 1️⃣ Iniciar Todos os Serviços

```bash
cd microservices
docker-compose up -d
```

### 2️⃣ Verificar Status dos Serviços

```bash
docker-compose ps
```

### 3️⃣ Verificar Health Checks

```bash
# Auth Service
curl http://localhost:3001/health

# Doctors Service
curl http://localhost:3002/health

# Patients Service
curl http://localhost:3003/health
```

### 4️⃣ Ver Logs

```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f auth-service
docker-compose logs -f doctors-service
docker-compose logs -f patients-service
```

### 5️⃣ Parar Serviços

```bash
docker-compose down
```

### 6️⃣ Limpar Tudo (incluindo volumes)

```bash
docker-compose down -v
```

---

## ☁️ Deploy na AWS ECS (Fargate)

### Arquitetura na AWS

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────┐
│         Application Load Balancer (ALB)         │
│  - Target Groups para cada serviço              │
│  - Path-based routing: /api/auth, /api/doctors  │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│              ECS Cluster (Fargate)              │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐│
│  │Auth Service │  │Doctors Svc  │  │Patients  ││
│  │  (Task)     │  │  (Task)     │  │Svc (Task)││
│  └─────────────┘  └─────────────┘  └──────────┘│
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│         AWS Cloud Map (Service Discovery)       │
│  - medical-auth-service.local:3001              │
│  - medical-doctors-service.local:3002           │
│  - medical-patients-service.local:3003          │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│            AWS DocumentDB (3 databases)         │
│  - medical_auth                                 │
│  - medical_doctors                              │
│  - medical_patients                             │
└─────────────────────────────────────────────────┘
```

---

## 📦 Passo a Passo: Deploy no AWS ECS

### **Etapa 1: Criar Repositórios ECR**

```bash
# Criar repositórios no Amazon ECR
aws ecr create-repository --repository-name medical-auth-service --region us-east-1
aws ecr create-repository --repository-name medical-doctors-service --region us-east-1
aws ecr create-repository --repository-name medical-patients-service --region us-east-1
```

### **Etapa 2: Build e Push das Imagens Docker**

```bash
# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build Auth Service
cd auth-service
docker build -t medical-auth-service .
docker tag medical-auth-service:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/medical-auth-service:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/medical-auth-service:latest

# Build Doctors Service
cd ../doctors-service
docker build -t medical-doctors-service .
docker tag medical-doctors-service:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/medical-doctors-service:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/medical-doctors-service:latest

# Build Patients Service
cd ../patients-service
docker build -t medical-patients-service .
docker tag medical-patients-service:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/medical-patients-service:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/medical-patients-service:latest
```

### **Etapa 3: Criar Secrets no AWS Secrets Manager**

```bash
# JWT Secret
aws secretsmanager create-secret \
    --name medical/jwt-secret \
    --secret-string "your_super_secure_jwt_secret_key_here" \
    --region us-east-1

# JWT Expire
aws secretsmanager create-secret \
    --name medical/jwt-expire \
    --secret-string "7d" \
    --region us-east-1

# MongoDB URI para Auth Service
aws secretsmanager create-secret \
    --name medical/mongodb-uri \
    --secret-string "mongodb+srv://user:password@cluster.mongodb.net/medical_auth" \
    --region us-east-1

# MongoDB URI para Doctors Service
aws secretsmanager create-secret \
    --name medical/mongodb-uri-doctors \
    --secret-string "mongodb+srv://user:password@cluster.mongodb.net/medical_doctors" \
    --region us-east-1

# MongoDB URI para Patients Service
aws secretsmanager create-secret \
    --name medical/mongodb-uri-patients \
    --secret-string "mongodb+srv://user:password@cluster.mongodb.net/medical_patients" \
    --region us-east-1
```

### **Etapa 4: Criar CloudWatch Log Groups**

```bash
aws logs create-log-group --log-group-name /ecs/medical-auth-service --region us-east-1
aws logs create-log-group --log-group-name /ecs/medical-doctors-service --region us-east-1
aws logs create-log-group --log-group-name /ecs/medical-patients-service --region us-east-1
```

### **Etapa 5: Criar ECS Cluster**

```bash
aws ecs create-cluster \
    --cluster-name medical-microservices-cluster \
    --region us-east-1
```

### **Etapa 6: Criar VPC e Subnets (se não existir)**

```bash
# Criar VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region us-east-1

# Criar Subnets
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Criar Security Group
aws ec2 create-security-group \
    --group-name medical-ecs-sg \
    --description "Security group for Medical ECS services" \
    --vpc-id <VPC_ID>

# Adicionar regras
aws ec2 authorize-security-group-ingress \
    --group-id <SG_ID> \
    --protocol tcp \
    --port 3001-3003 \
    --cidr 0.0.0.0/0
```

### **Etapa 7: Criar Namespace no AWS Cloud Map**

```bash
aws servicediscovery create-private-dns-namespace \
    --name local \
    --vpc <VPC_ID> \
    --region us-east-1
```

### **Etapa 8: Registrar Task Definitions**

Edite os arquivos em `ecs-task-definitions/` substituindo:
- `<YOUR_AWS_ACCOUNT_ID>` pelo seu Account ID
- `<YOUR_REGION>` pela região (ex: us-east-1)

```bash
# Registrar Auth Service Task
aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definitions/auth-service-task.json \
    --region us-east-1

# Registrar Doctors Service Task
aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definitions/doctors-service-task.json \
    --region us-east-1

# Registrar Patients Service Task
aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definitions/patients-service-task.json \
    --region us-east-1
```

### **Etapa 9: Criar Application Load Balancer**

```bash
# Criar ALB
aws elbv2 create-load-balancer \
    --name medical-alb \
    --subnets <SUBNET_ID_1> <SUBNET_ID_2> \
    --security-groups <SG_ID> \
    --region us-east-1

# Criar Target Groups
aws elbv2 create-target-group \
    --name medical-auth-tg \
    --protocol HTTP \
    --port 3001 \
    --vpc-id <VPC_ID> \
    --target-type ip \
    --health-check-path /health

aws elbv2 create-target-group \
    --name medical-doctors-tg \
    --protocol HTTP \
    --port 3002 \
    --vpc-id <VPC_ID> \
    --target-type ip \
    --health-check-path /health

aws elbv2 create-target-group \
    --name medical-patients-tg \
    --protocol HTTP \
    --port 3003 \
    --vpc-id <VPC_ID> \
    --target-type ip \
    --health-check-path /health

# Criar Listener
aws elbv2 create-listener \
    --load-balancer-arn <ALB_ARN> \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=<AUTH_TG_ARN>

# Adicionar regras de roteamento
aws elbv2 create-rule \
    --listener-arn <LISTENER_ARN> \
    --priority 1 \
    --conditions Field=path-pattern,Values=/api/auth/* \
    --actions Type=forward,TargetGroupArn=<AUTH_TG_ARN>

aws elbv2 create-rule \
    --listener-arn <LISTENER_ARN> \
    --priority 2 \
    --conditions Field=path-pattern,Values=/api/doctors/* \
    --actions Type=forward,TargetGroupArn=<DOCTORS_TG_ARN>

aws elbv2 create-rule \
    --listener-arn <LISTENER_ARN> \
    --priority 3 \
    --conditions Field=path-pattern,Values=/api/patients/*,/api/appointments/* \
    --actions Type=forward,TargetGroupArn=<PATIENTS_TG_ARN>
```

### **Etapa 10: Criar ECS Services**

```bash
# Auth Service
aws ecs create-service \
    --cluster medical-microservices-cluster \
    --service-name auth-service \
    --task-definition medical-auth-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1>,<SUBNET_2>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
    --load-balancers targetGroupArn=<AUTH_TG_ARN>,containerName=auth-service,containerPort=3001 \
    --region us-east-1

# Doctors Service
aws ecs create-service \
    --cluster medical-microservices-cluster \
    --service-name doctors-service \
    --task-definition medical-doctors-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1>,<SUBNET_2>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
    --load-balancers targetGroupArn=<DOCTORS_TG_ARN>,containerName=doctors-service,containerPort=3002 \
    --region us-east-1

# Patients Service
aws ecs create-service \
    --cluster medical-microservices-cluster \
    --service-name patients-service \
    --task-definition medical-patients-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_1>,<SUBNET_2>],securityGroups=[<SG_ID>],assignPublicIp=ENABLED}" \
    --load-balancers targetGroupArn=<PATIENTS_TG_ARN>,containerName=patients-service,containerPort=3003 \
    --region us-east-1
```

---

## 🔄 CI/CD com GitHub Actions

Crie `.github/workflows/deploy-microservices.yml`:

```yaml
name: Deploy Microservices to ECS

on:
  push:
    branches: [ "main" ]
    paths:
      - 'microservices/**'

jobs:
  deploy-auth-service:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Auth Service
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: medical-auth-service
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd microservices/auth-service
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Update ECS Service
        run: |
          aws ecs update-service \
            --cluster medical-microservices-cluster \
            --service auth-service \
            --force-new-deployment

  deploy-doctors-service:
    runs-on: ubuntu-latest
    steps:
      # Similar ao auth-service, ajustando os nomes

  deploy-patients-service:
    runs-on: ubuntu-latest
    steps:
      # Similar ao auth-service, ajustando os nomes
```

---

## 📊 Monitoramento e Logs

### CloudWatch Logs

```bash
# Ver logs do Auth Service
aws logs tail /ecs/medical-auth-service --follow

# Ver logs do Doctors Service
aws logs tail /ecs/medical-doctors-service --follow

# Ver logs do Patients Service
aws logs tail /ecs/medical-patients-service --follow
```

### CloudWatch Metrics

- CPU Utilization
- Memory Utilization
- Request Count (via ALB)
- Target Response Time
- Health Check Status

### Configurar Alarmes

```bash
aws cloudwatch put-metric-alarm \
    --alarm-name auth-service-high-cpu \
    --alarm-description "Auth Service CPU above 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2
```

---

## 🧪 Testando os Serviços

### 1. Health Checks

```bash
# Local
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# AWS (usando ALB DNS)
curl http://<ALB_DNS>/api/auth/health
```

### 2. Registro de Paciente

```bash
curl -X POST http://<ALB_DNS>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+5511999999999",
    "role": "patient",
    "cpf": "12345678901",
    "dateOfBirth": "1990-01-01"
  }'
```

### 3. Login

```bash
curl -X POST http://<ALB_DNS>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!"
  }'
```

### 4. Listar Médicos

```bash
curl http://<ALB_DNS>/api/doctors
```

---

## 🔐 Segurança

### Secrets Management
- ✅ Secrets armazenados no AWS Secrets Manager
- ✅ JWT tokens com expiração configurável
- ✅ Senhas hasheadas com bcrypt

### Network Security
- ✅ VPC isolada
- ✅ Security Groups restritivos
- ✅ ALB com SSL/TLS (configurar certificado)

### Best Practices
- ✅ Least Privilege IAM Roles
- ✅ Container scanning (ECR)
- ✅ Rate limiting implementado
- ✅ CORS configurado

---

## 📈 Escalabilidade

### Auto Scaling

```bash
# Configurar auto scaling para Auth Service
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/medical-microservices-cluster/auth-service \
    --min-capacity 2 \
    --max-capacity 10

aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/medical-microservices-cluster/auth-service \
    --policy-name auth-service-cpu-scaling \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

**scaling-policy.json:**
```json
{
  "TargetValue": 75.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

---

## 💰 Estimativa de Custos (AWS)

### Fargate (2 tasks por serviço, 0.25 vCPU, 0.5 GB cada)
- **Compute:** ~$30-40/mês por serviço
- **Total 3 serviços:** ~$90-120/mês

### ALB
- **Load Balancer:** ~$16/mês
- **LCU (estimado):** ~$10/mês

### CloudWatch Logs
- **Ingestão + Armazenamento:** ~$5-10/mês

### ECR
- **Armazenamento de imagens:** ~$1/mês

### Secrets Manager
- **3 secrets:** ~$1.20/mês

### **Total Estimado:** ~$123-158/mês

---

## 🛠️ Troubleshooting

### Serviço não inicia no ECS

```bash
# Verificar task logs
aws ecs describe-tasks \
    --cluster medical-microservices-cluster \
    --tasks <TASK_ARN>

# Verificar logs no CloudWatch
aws logs tail /ecs/medical-auth-service --follow
```

### Erro de comunicação entre serviços

- Verificar Security Groups permitem tráfego interno
- Verificar variáveis de ambiente `*_SERVICE_URL`
- Testar conectividade usando exec:

```bash
aws ecs execute-command \
    --cluster medical-microservices-cluster \
    --task <TASK_ID> \
    --container auth-service \
    --interactive \
    --command "/bin/sh"
```

### Health check falhando

```bash
# Testar health endpoint manualmente
curl http://<TASK_PRIVATE_IP>:3001/health
```

---

## 📚 Referências

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## 👥 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Add nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido com ❤️ para TCC 2025**
