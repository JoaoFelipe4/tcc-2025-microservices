# 🗄️ AWS DocumentDB Setup - Guia Completo

## 📋 O que é AWS DocumentDB?

AWS DocumentDB é um **banco de dados NoSQL gerenciado** compatível com MongoDB. Benefícios:

✅ **Totalmente gerenciado** - AWS cuida de backups, patches, monitoramento
✅ **Alta disponibilidade** - Multi-AZ com failover automático
✅ **Escalável** - Até 64TB de armazenamento
✅ **Compatível com MongoDB** - APIs MongoDB 3.6, 4.0, 5.0
✅ **Seguro** - Criptografia em repouso e em trânsito
✅ **Backups automáticos** - Point-in-time recovery

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│           VPC (us-east-2)                           │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │  ECS Services (Private Subnets)        │        │
│  │  - Auth Service                        │        │
│  │  - Doctors Service                     │        │
│  │  - Patients Service                    │        │
│  └───────────────┬────────────────────────┘        │
│                  │                                  │
│                  │ (TLS Connection)                 │
│                  ▼                                  │
│  ┌────────────────────────────────────────┐        │
│  │  DocumentDB Cluster                    │        │
│  │  (Private Subnets)                     │        │
│  │                                        │        │
│  │  ┌──────────┐  ┌──────────┐          │        │
│  │  │ Primary  │  │ Replica  │          │        │
│  │  │ Instance │  │ Instance │          │        │
│  │  └──────────┘  └──────────┘          │        │
│  │                                        │        │
│  │  Databases:                            │        │
│  │  - medical_auth                        │        │
│  │  - medical_doctors                     │        │
│  │  - medical_patients                    │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Passo a Passo: Criar DocumentDB Cluster

### **Etapa 1: Criar Subnet Group**

```bash
# Criar subnet group para DocumentDB (mesmas subnets dos ECS tasks)
aws docdb create-db-subnet-group \
    --db-subnet-group-name medical-docdb-subnet-group \
    --db-subnet-group-description "Subnet group for Medical DocumentDB" \
    --subnet-ids subnet-xxxxx subnet-yyyyy \
    --region us-east-2

# Substitua subnet-xxxxx e subnet-yyyyy pelos IDs das suas subnets privadas
```

### **Etapa 2: Criar Security Group**

```bash
# Criar security group para DocumentDB
SG_DOCDB=$(aws ec2 create-security-group \
    --group-name medical-docdb-sg \
    --description "Security group for Medical DocumentDB" \
    --vpc-id vpc-xxxxx \
    --region us-east-2 \
    --query 'GroupId' \
    --output text)

echo "DocumentDB Security Group: $SG_DOCDB"

# Permitir conexões do Security Group dos ECS tasks na porta 27017
aws ec2 authorize-security-group-ingress \
    --group-id $SG_DOCDB \
    --protocol tcp \
    --port 27017 \
    --source-group $SG_ECS \
    --region us-east-2

# $SG_ECS é o security group dos seus ECS services
```

### **Etapa 3: Criar Parameter Group (Opcional)**

```bash
# Criar parameter group para customizar configurações
aws docdb create-db-cluster-parameter-group \
    --db-cluster-parameter-group-name medical-docdb-params \
    --db-parameter-group-family docdb5.0 \
    --description "Custom params for Medical DocumentDB" \
    --region us-east-2

# Modificar parâmetros (opcional)
aws docdb modify-db-cluster-parameter-group \
    --db-cluster-parameter-group-name medical-docdb-params \
    --parameters "ParameterName=audit_logs,ParameterValue=enabled,ApplyMethod=immediate" \
    --region us-east-2
```

### **Etapa 4: Criar DocumentDB Cluster**

```bash
# Criar cluster DocumentDB
aws docdb create-db-cluster \
    --db-cluster-identifier medical-docdb-cluster \
    --engine docdb \
    --engine-version 5.0.0 \
    --master-username admin \
    --master-user-password "YourStrongPassword123!" \
    --db-subnet-group-name medical-docdb-subnet-group \
    --vpc-security-group-ids $SG_DOCDB \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "mon:04:00-mon:05:00" \
    --port 27017 \
    --storage-encrypted \
    --kms-key-id alias/aws/docdb \
    --region us-east-2

echo "Cluster criado! Aguardando disponibilidade..."
```

**Parâmetros importantes:**
- `--master-username`: Usuário admin (use "admin" ou outro nome)
- `--master-user-password`: **IMPORTANTE:** Use senha forte! Salve em local seguro
- `--backup-retention-period`: Dias de retenção de backup (7-35 dias)
- `--storage-encrypted`: Criptografia em repouso (SEMPRE habilitar)

### **Etapa 5: Criar Instâncias do Cluster**

```bash
# Criar instância primária
aws docdb create-db-instance \
    --db-instance-identifier medical-docdb-instance-1 \
    --db-instance-class db.t3.medium \
    --engine docdb \
    --db-cluster-identifier medical-docdb-cluster \
    --region us-east-2

# Criar réplica de leitura (recomendado para alta disponibilidade)
aws docdb create-db-instance \
    --db-instance-identifier medical-docdb-instance-2 \
    --db-instance-class db.t3.medium \
    --engine docdb \
    --db-cluster-identifier medical-docdb-cluster \
    --region us-east-2

echo "Instâncias criadas! Aguardando disponibilidade (5-10 minutos)..."
```

**Classes de instância recomendadas:**
- **Desenvolvimento/Teste:** `db.t3.medium` (2 vCPU, 4 GB RAM) - ~$70/mês
- **Produção pequena:** `db.r5.large` (2 vCPU, 16 GB RAM) - ~$280/mês
- **Produção média:** `db.r5.xlarge` (4 vCPU, 32 GB RAM) - ~$560/mês

### **Etapa 6: Obter Connection String**

```bash
# Obter endpoint do cluster
DOCDB_ENDPOINT=$(aws docdb describe-db-clusters \
    --db-cluster-identifier medical-docdb-cluster \
    --region us-east-2 \
    --query 'DBClusters[0].Endpoint' \
    --output text)

echo "DocumentDB Endpoint: $DOCDB_ENDPOINT"

# Connection string completa:
echo "mongodb://admin:YourStrongPassword123!@${DOCDB_ENDPOINT}:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
```

**Connection String Format:**
```
mongodb://<username>:<password>@<cluster-endpoint>:27017/<database>?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### **Etapa 7: Baixar Certificado TLS**

DocumentDB requer TLS. Baixe o certificado AWS:

```bash
# Baixar certificado global
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Ou via curl
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

**Para ECS:** Adicione o certificado no Dockerfile ou use o certificado padrão do sistema.

---

## 🔐 Configurar Secrets Manager

### Armazenar Connection Strings no Secrets Manager

```bash
# Auth Service MongoDB URI
aws secretsmanager create-secret \
    --name medical/mongodb-uri \
    --secret-string "mongodb://admin:YourStrongPassword123!@${DOCDB_ENDPOINT}:27017/medical_auth?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" \
    --region us-east-2

# Doctors Service MongoDB URI
aws secretsmanager create-secret \
    --name medical/mongodb-uri-doctors \
    --secret-string "mongodb://admin:YourStrongPassword123!@${DOCDB_ENDPOINT}:27017/medical_doctors?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" \
    --region us-east-2

# Patients Service MongoDB URI
aws secretsmanager create-secret \
    --name medical/mongodb-uri-patients \
    --secret-string "mongodb://admin:YourStrongPassword123!@${DOCDB_ENDPOINT}:27017/medical_patients?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false" \
    --region us-east-2
```

---

## 📝 Configurar Aplicação

### Opção 1: Desenvolvimento Local (via Docker Compose)

Crie arquivo `.env` na raiz de `microservices/`:

```bash
cd microservices
cp .env.example .env
```

Edite o `.env`:

```env
# Substitua com seus valores reais
MONGODB_URI_AUTH=mongodb://admin:SuaSenha@seu-cluster.us-east-2.docdb.amazonaws.com:27017/medical_auth?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
MONGODB_URI_DOCTORS=mongodb://admin:SuaSenha@seu-cluster.us-east-2.docdb.amazonaws.com:27017/medical_doctors?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
MONGODB_URI_PATIENTS=mongodb://admin:SuaSenha@seu-cluster.us-east-2.docdb.amazonaws.com:27017/medical_patients?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
```

**IMPORTANTE para desenvolvimento local:**
- Seu computador precisa acessar o DocumentDB
- DocumentDB está em subnet privada
- **Soluções:**
  1. **VPN** para VPC AWS
  2. **Bastion Host** para SSH tunnel
  3. **Cloud9** ou **EC2** dentro da VPC
  4. **Alternativa:** Use MongoDB local para dev (ver abaixo)

### Opção 2: MongoDB Local para Desenvolvimento

Se não conseguir acessar DocumentDB localmente, use MongoDB local:

1. **Adicione MongoDB no docker-compose.yml:**

```yaml
services:
  mongodb:
    image: mongo:7.0
    container_name: medical-mongodb-local
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

2. **No .env local, use:**

```env
MONGODB_URI_AUTH=mongodb://mongodb:27017/medical_auth
MONGODB_URI_DOCTORS=mongodb://mongodb:27017/medical_doctors
MONGODB_URI_PATIENTS=mongodb://mongodb:27017/medical_patients
```

### Opção 3: Produção (ECS com Secrets Manager)

As Task Definitions já estão configuradas! Elas usam Secrets Manager automaticamente.

---

## 🧪 Testar Conexão

### Via mongosh (se tiver acesso à VPC)

```bash
# Instalar mongosh
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt update
sudo apt install -y mongodb-mongosh

# Baixar certificado
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Conectar
mongosh "mongodb://admin:SuaSenha@seu-cluster.us-east-2.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

# Testar comandos
show dbs
use medical_auth
db.users.find()
```

### Via Aplicação

```bash
# Inicie os serviços
docker-compose up -d

# Teste health check
curl http://localhost:3001/health

# Teste registro (vai criar documento no DocumentDB)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+5511999999999",
    "role": "patient",
    "cpf": "12345678901",
    "dateOfBirth": "1990-01-01"
  }'
```

---

## 📊 Monitoramento e Manutenção

### CloudWatch Metrics

```bash
# Ver métricas de CPU
aws cloudwatch get-metric-statistics \
    --namespace AWS/DocDB \
    --metric-name CPUUtilization \
    --dimensions Name=DBClusterIdentifier,Value=medical-docdb-cluster \
    --start-time 2025-11-09T00:00:00Z \
    --end-time 2025-11-09T23:59:59Z \
    --period 3600 \
    --statistics Average \
    --region us-east-2

# Ver conexões
aws cloudwatch get-metric-statistics \
    --namespace AWS/DocDB \
    --metric-name DatabaseConnections \
    --dimensions Name=DBClusterIdentifier,Value=medical-docdb-cluster \
    --start-time 2025-11-09T00:00:00Z \
    --end-time 2025-11-09T23:59:59Z \
    --period 300 \
    --statistics Sum \
    --region us-east-2
```

### Backups

```bash
# Criar snapshot manual
aws docdb create-db-cluster-snapshot \
    --db-cluster-snapshot-identifier medical-backup-$(date +%Y%m%d) \
    --db-cluster-identifier medical-docdb-cluster \
    --region us-east-2

# Listar snapshots
aws docdb describe-db-cluster-snapshots \
    --db-cluster-identifier medical-docdb-cluster \
    --region us-east-2

# Restaurar de snapshot
aws docdb restore-db-cluster-from-snapshot \
    --db-cluster-identifier medical-docdb-restored \
    --snapshot-identifier medical-backup-20251109 \
    --engine docdb \
    --region us-east-2
```

---

## 💰 Estimativa de Custos (us-east-2)

### Cluster Mínimo (Desenvolvimento)

| Item | Configuração | Custo Mensal |
|------|-------------|--------------|
| **Instância Primary** | db.t3.medium | ~$70 |
| **Armazenamento** | 10 GB | ~$1 |
| **I/O Requests** | 1M requests | ~$0.20 |
| **Backups** | 10 GB (7 dias) | ~$1 |
| **Total** | | **~$72/mês** |

### Cluster Produção (Alta Disponibilidade)

| Item | Configuração | Custo Mensal |
|------|-------------|--------------|
| **Instância Primary** | db.r5.large | ~$280 |
| **Instância Replica** | db.r5.large | ~$280 |
| **Armazenamento** | 50 GB | ~$5 |
| **I/O Requests** | 10M requests | ~$2 |
| **Backups** | 50 GB (30 dias) | ~$5 |
| **Total** | | **~$572/mês** |

---

## 🔧 Troubleshooting

### Erro: "connection refused"

**Causa:** Security Group bloqueando conexão

**Solução:**
```bash
# Verificar security group
aws ec2 describe-security-groups --group-ids $SG_DOCDB --region us-east-2

# Adicionar regra se necessário
aws ec2 authorize-security-group-ingress \
    --group-id $SG_DOCDB \
    --protocol tcp \
    --port 27017 \
    --source-group $SG_ECS \
    --region us-east-2
```

### Erro: "SSL handshake failed"

**Causa:** TLS não configurado ou certificado inválido

**Solução:**
- Certifique-se que connection string tem `tls=true`
- Baixe certificado atualizado: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

### Erro: "authentication failed"

**Causa:** Credenciais incorretas

**Solução:**
```bash
# Resetar senha do master user
aws docdb modify-db-cluster \
    --db-cluster-identifier medical-docdb-cluster \
    --master-user-password "NovaSenhaForte123!" \
    --apply-immediately \
    --region us-east-2
```

---

## 🎯 Checklist de Setup

- [ ] Subnet group criado
- [ ] Security group criado e configurado
- [ ] DocumentDB cluster criado
- [ ] 1-2 instâncias criadas
- [ ] Connection string obtida
- [ ] Secrets Manager configurado
- [ ] Certificado TLS baixado (se necessário)
- [ ] Teste de conexão bem-sucedido
- [ ] CloudWatch alarms configurados

---

## 📚 Recursos Adicionais

- [AWS DocumentDB Documentation](https://docs.aws.amazon.com/documentdb/)
- [MongoDB Compatibility](https://docs.aws.amazon.com/documentdb/latest/developerguide/compatibility.html)
- [Best Practices](https://docs.aws.amazon.com/documentdb/latest/developerguide/best_practices.html)

---

**Pronto! Seu DocumentDB está configurado e pronto para produção! 🎉**
