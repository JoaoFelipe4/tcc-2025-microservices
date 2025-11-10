# 🌐 AWS API Gateway Setup - Arquitetura Detalhada

## 📊 Arquitetura com API Gateway

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Cliente                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS API Gateway (HTTP API)                     │
│                                                             │
│  Routes:                                                    │
│  • POST   /auth/register    → Auth Service (VPC Link)      │
│  • POST   /auth/login       → Auth Service (VPC Link)      │
│  • GET    /auth/profile     → Auth Service (VPC Link)      │
│  • GET    /doctors          → Doctors Service (VPC Link)   │
│  • GET    /doctors/{id}     → Doctors Service (VPC Link)   │
│  • POST   /appointments     → Patients Service (VPC Link)  │
│  • GET    /patients/{id}    → Patients Service (VPC Link)  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ VPC Link
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPC (Private Subnets)                    │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │Auth Service │  │   Doctors   │  │  Patients   │       │
│   │   (ECS)     │  │Service (ECS)│  │Service (ECS)│       │
│   │ Port 3001   │  │ Port 3002   │  │ Port 3003   │       │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
│          │                 │                 │             │
│          └─────────────────┴─────────────────┘             │
│                            │                               │
│                  AWS Cloud Map (Service Discovery)         │
│                  - auth-service.local:3001                 │
│                  - doctors-service.local:3002              │
│                  - patients-service.local:3003             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                MongoDB Atlas / DocumentDB                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Passo a Passo: Setup do API Gateway

### **Etapa 1: Criar VPC e Subnets (se não existir)**

```bash
# Criar VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --region us-east-2 \
    --query 'Vpc.VpcId' \
    --output text)

echo "VPC ID: $VPC_ID"

# Criar Subnets Privadas (para ECS)
SUBNET_PRIVATE_1=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-2a \
    --region us-east-2 \
    --query 'Subnet.SubnetId' \
    --output text)

SUBNET_PRIVATE_2=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone us-east-2b \
    --region us-east-2 \
    --query 'Subnet.SubnetId' \
    --output text)

echo "Private Subnet 1: $SUBNET_PRIVATE_1"
echo "Private Subnet 2: $SUBNET_PRIVATE_2"

# Criar Internet Gateway (para NAT)
IGW_ID=$(aws ec2 create-internet-gateway \
    --region us-east-2 \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

aws ec2 attach-internet-gateway \
    --vpc-id $VPC_ID \
    --internet-gateway-id $IGW_ID \
    --region us-east-2

# Criar NAT Gateway (para ECS tasks acessarem internet)
ALLOCATION_ID=$(aws ec2 allocate-address \
    --domain vpc \
    --region us-east-2 \
    --query 'AllocationId' \
    --output text)

# Criar subnet pública para NAT Gateway
SUBNET_PUBLIC=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.100.0/24 \
    --availability-zone us-east-2a \
    --region us-east-2 \
    --query 'Subnet.SubnetId' \
    --output text)

NAT_GW_ID=$(aws ec2 create-nat-gateway \
    --subnet-id $SUBNET_PUBLIC \
    --allocation-id $ALLOCATION_ID \
    --region us-east-2 \
    --query 'NatGateway.NatGatewayId' \
    --output text)

echo "NAT Gateway ID: $NAT_GW_ID"
```

### **Etapa 2: Criar Security Groups**

```bash
# Security Group para ECS Tasks
SG_ECS=$(aws ec2 create-security-group \
    --group-name medical-ecs-sg \
    --description "Security group for Medical ECS services" \
    --vpc-id $VPC_ID \
    --region us-east-2 \
    --query 'GroupId' \
    --output text)

# Permitir tráfego entre serviços
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ECS \
    --protocol tcp \
    --port 3001-3003 \
    --source-group $SG_ECS \
    --region us-east-2

# Permitir saída para internet (MongoDB Atlas, etc)
aws ec2 authorize-security-group-egress \
    --group-id $SG_ECS \
    --protocol -1 \
    --cidr 0.0.0.0/0 \
    --region us-east-2

echo "ECS Security Group: $SG_ECS"
```

### **Etapa 3: Criar Cloud Map Namespace**

```bash
NAMESPACE_ID=$(aws servicediscovery create-private-dns-namespace \
    --name local \
    --vpc $VPC_ID \
    --region us-east-2 \
    --query 'OperationId' \
    --output text)

# Aguardar criação
aws servicediscovery get-operation \
    --operation-id $NAMESPACE_ID \
    --region us-east-2

# Obter namespace ID
NAMESPACE=$(aws servicediscovery list-namespaces \
    --region us-east-2 \
    --query "Namespaces[?Name=='local'].Id" \
    --output text)

echo "Cloud Map Namespace: $NAMESPACE"
```

### **Etapa 4: Criar ECS Cluster**

```bash
aws ecs create-cluster \
    --cluster-name medical-microservices-cluster \
    --region us-east-2
```

### **Etapa 5: Criar VPC Link para API Gateway**

```bash
# Criar Network Load Balancer (necessário para VPC Link)
NLB_ARN=$(aws elbv2 create-load-balancer \
    --name medical-nlb \
    --type network \
    --scheme internal \
    --subnets $SUBNET_PRIVATE_1 $SUBNET_PRIVATE_2 \
    --region us-east-2 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

echo "NLB ARN: $NLB_ARN"

# Criar Target Groups para cada serviço
TG_AUTH=$(aws elbv2 create-target-group \
    --name medical-auth-tg \
    --protocol TCP \
    --port 3001 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --region us-east-2 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

TG_DOCTORS=$(aws elbv2 create-target-group \
    --name medical-doctors-tg \
    --protocol TCP \
    --port 3002 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --region us-east-2 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

TG_PATIENTS=$(aws elbv2 create-target-group \
    --name medical-patients-tg \
    --protocol TCP \
    --port 3003 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --region us-east-2 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Criar Listeners no NLB
aws elbv2 create-listener \
    --load-balancer-arn $NLB_ARN \
    --protocol TCP \
    --port 3001 \
    --default-actions Type=forward,TargetGroupArn=$TG_AUTH \
    --region us-east-2

aws elbv2 create-listener \
    --load-balancer-arn $NLB_ARN \
    --protocol TCP \
    --port 3002 \
    --default-actions Type=forward,TargetGroupArn=$TG_DOCTORS \
    --region us-east-2

aws elbv2 create-listener \
    --load-balancer-arn $NLB_ARN \
    --protocol TCP \
    --port 3003 \
    --default-actions Type=forward,TargetGroupArn=$TG_PATIENTS \
    --region us-east-2

# Criar VPC Link
VPC_LINK_ID=$(aws apigatewayv2 create-vpc-link \
    --name medical-vpc-link \
    --subnet-ids $SUBNET_PRIVATE_1 $SUBNET_PRIVATE_2 \
    --region us-east-2 \
    --query 'VpcLinkId' \
    --output text)

echo "VPC Link ID: $VPC_LINK_ID"
```

### **Etapa 6: Criar API Gateway HTTP API**

```bash
# Criar API
API_ID=$(aws apigatewayv2 create-api \
    --name medical-microservices-api \
    --protocol-type HTTP \
    --region us-east-2 \
    --query 'ApiId' \
    --output text)

echo "API Gateway ID: $API_ID"

# Obter DNS do NLB
NLB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $NLB_ARN \
    --region us-east-2 \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# Criar Integrations
INT_AUTH=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type HTTP_PROXY \
    --integration-method ANY \
    --integration-uri "http://$NLB_DNS:3001/{proxy}" \
    --payload-format-version 1.0 \
    --connection-type VPC_LINK \
    --connection-id $VPC_LINK_ID \
    --region us-east-2 \
    --query 'IntegrationId' \
    --output text)

INT_DOCTORS=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type HTTP_PROXY \
    --integration-method ANY \
    --integration-uri "http://$NLB_DNS:3002/{proxy}" \
    --payload-format-version 1.0 \
    --connection-type VPC_LINK \
    --connection-id $VPC_LINK_ID \
    --region us-east-2 \
    --query 'IntegrationId' \
    --output text)

INT_PATIENTS=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type HTTP_PROXY \
    --integration-method ANY \
    --integration-uri "http://$NLB_DNS:3003/{proxy}" \
    --payload-format-version 1.0 \
    --connection-type VPC_LINK \
    --connection-id $VPC_LINK_ID \
    --region us-east-2 \
    --query 'IntegrationId' \
    --output text)

# Criar Routes
aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "ANY /auth/{proxy+}" \
    --target integrations/$INT_AUTH \
    --region us-east-2

aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "ANY /doctors/{proxy+}" \
    --target integrations/$INT_DOCTORS \
    --region us-east-2

aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "ANY /patients/{proxy+}" \
    --target integrations/$INT_PATIENTS \
    --region us-east-2

aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "ANY /appointments/{proxy+}" \
    --target integrations/$INT_PATIENTS \
    --region us-east-2

# Criar Stage (production)
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name production \
    --auto-deploy \
    --region us-east-2

# Obter URL do API Gateway
API_ENDPOINT=$(aws apigatewayv2 get-api \
    --api-id $API_ID \
    --region us-east-2 \
    --query 'ApiEndpoint' \
    --output text)

echo ""
echo "=========================================="
echo "API Gateway URL: ${API_ENDPOINT}/production"
echo "=========================================="
echo ""
echo "Exemplos de uso:"
echo "POST ${API_ENDPOINT}/production/auth/register"
echo "POST ${API_ENDPOINT}/production/auth/login"
echo "GET  ${API_ENDPOINT}/production/doctors"
```

### **Etapa 7: Registrar Task Definitions e Criar Services**

Atualize as task definitions para usar `us-east-2` e registre:

```bash
# Atualizar task definitions (substitua <YOUR_AWS_ACCOUNT_ID>)
cd ecs-task-definitions

# Registrar tasks
aws ecs register-task-definition \
    --cli-input-json file://auth-service-task.json \
    --region us-east-2

aws ecs register-task-definition \
    --cli-input-json file://doctors-service-task.json \
    --region us-east-2

aws ecs register-task-definition \
    --cli-input-json file://patients-service-task.json \
    --region us-east-2

# Criar ECS Services
aws ecs create-service \
    --cluster medical-microservices-cluster \
    --service-name auth-service \
    --task-definition medical-auth-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PRIVATE_1,$SUBNET_PRIVATE_2],securityGroups=[$SG_ECS]}" \
    --load-balancers targetGroupArn=$TG_AUTH,containerName=auth-service,containerPort=3001 \
    --region us-east-2

aws ecs create-service \
    --cluster medical-microservices-cluster \
    --service-name doctors-service \
    --task-definition medical-doctors-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PRIVATE_1,$SUBNET_PRIVATE_2],securityGroups=[$SG_ECS]}" \
    --load-balancers targetGroupArn=$TG_DOCTORS,containerName=doctors-service,containerPort=3002 \
    --region us-east-2

aws ecs create-service \
    --cluster medical-microservices-cluster \
    --service-name patients-service \
    --task-definition medical-patients-service \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PRIVATE_1,$SUBNET_PRIVATE_2],securityGroups=[$SG_ECS]}" \
    --load-balancers targetGroupArn=$TG_PATIENTS,containerName=patients-service,containerPort=3003 \
    --region us-east-2
```

---

## 🔐 Configurar CORS no API Gateway

```bash
# Adicionar CORS
aws apigatewayv2 update-api \
    --api-id $API_ID \
    --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,PUT,DELETE,PATCH",AllowHeaders="*" \
    --region us-east-2
```

---

## 🧪 Testar a API

```bash
# Registrar paciente
curl -X POST ${API_ENDPOINT}/production/auth/register \
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

# Login
curl -X POST ${API_ENDPOINT}/production/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!"
  }'

# Listar médicos
curl ${API_ENDPOINT}/production/doctors
```

---

## 💰 Estimativa de Custos (us-east-2)

| Serviço | Configuração | Custo Mensal (estimado) |
|---------|-------------|-------------------------|
| **API Gateway HTTP** | 1M requests/mês | ~$1.00 |
| **VPC Link** | 1 link | ~$10.00 |
| **Network Load Balancer** | 1 NLB | ~$16.00 |
| **ECS Fargate** | 6 tasks (2/serviço) 0.25vCPU/0.5GB | ~$90-120 |
| **NAT Gateway** | 1 NAT | ~$32 + dados |
| **CloudWatch Logs** | 5GB/mês | ~$2.50 |
| **ECR** | 3 repositórios | ~$1 |
| **Secrets Manager** | 3-5 secrets | ~$2 |
| **Total** | | **~$155-185/mês** |

---

## 📊 Monitoramento

```bash
# CloudWatch Logs
aws logs tail /ecs/medical-auth-service --follow --region us-east-2

# Métricas do API Gateway
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApiGateway \
    --metric-name Count \
    --dimensions Name=ApiId,Value=$API_ID \
    --start-time 2025-11-09T00:00:00Z \
    --end-time 2025-11-09T23:59:59Z \
    --period 3600 \
    --statistics Sum \
    --region us-east-2
```

---

## 🎯 Vantagens do API Gateway vs ALB

| Característica | API Gateway | ALB |
|---------------|-------------|-----|
| **Custo (baixo tráfego)** | Mais barato | Mais caro (custo fixo) |
| **Gerenciamento** | Serverless | Precisa provisionar |
| **Throttling** | Nativo | Requer configuração |
| **WAF Integration** | Nativo | Suporta |
| **Custom Domains** | Fácil | Fácil |
| **Caching** | Nativo | Requer CloudFront |

---

**Pronto! Seu API Gateway está configurado e roteando para os microsserviços no ECS! 🚀**
