# 🔧 DocumentDB Troubleshooting Guide

## Erro: "ENOENT: no such file or directory, open 'global-bundle.pem'"

### Causa
O MongoDB/Mongoose está tentando abrir o certificado TLS do AWS DocumentDB mas não encontra o arquivo.

### Solução Aplicada ✅

**1. Dockerfiles Atualizados**
Todos os 3 Dockerfiles agora baixam automaticamente o certificado durante o build:

```dockerfile
# Install curl for downloading AWS DocumentDB certificate
RUN apk add --no-cache curl

# Download AWS DocumentDB global bundle certificate
RUN curl -o /app/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

**2. Connection Strings Atualizadas**
Os arquivos `.env.example` foram atualizados com a opção `tlsCAFile`:

```bash
# PRODUÇÃO - com certificado TLS (recomendado)
MONGODB_URI=mongodb://admin:password@cluster.us-east-2.docdb.amazonaws.com:27017/medical_auth?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

# DESENVOLVIMENTO - sem validar certificado (menos seguro, mas mais fácil)
MONGODB_URI=mongodb://admin:password@cluster.us-east-2.docdb.amazonaws.com:27017/medical_auth?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Como Aplicar a Correção

**Passo 1: Atualizar seus arquivos .env**

Você tem 2 opções:

**Opção A (Recomendada): Com certificado TLS**
```bash
cd microservices/auth-service
# Edite seu .env e adicione tlsCAFile=global-bundle.pem
MONGODB_URI=mongodb://admin:senha@seu-cluster.us-east-2.docdb.amazonaws.com:27017/medical_auth?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

# Faça o mesmo para doctors-service e patients-service
```

**Opção B (Desenvolvimento): Sem validar certificado**
```bash
cd microservices/auth-service
# Edite seu .env e adicione tlsAllowInvalidCertificates=true
MONGODB_URI=mongodb://admin:senha@seu-cluster.us-east-2.docdb.amazonaws.com:27017/medical_auth?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

# Faça o mesmo para doctors-service e patients-service
```

**Passo 2: Rebuild dos containers**
```bash
cd microservices

# Parar containers existentes
docker-compose down

# Rebuild (isso vai baixar o certificado)
docker-compose build --no-cache

# Iniciar novamente
docker-compose up -d

# Verificar logs
docker-compose logs -f auth-service
```

---

## Outros Erros Comuns do DocumentDB

### Erro: "connection timed out"

**Causa:** Security Group ou Network ACL bloqueando conexão.

**Solução:**
1. Verifique o Security Group do DocumentDB
2. Certifique-se que permite conexões da porta 27017
3. Se estiver em VPC diferente, configure VPC Peering ou VPN

```bash
# Verificar Security Group
aws docdb describe-db-clusters \
  --db-cluster-identifier medical-docdb-cluster \
  --query 'DBClusters[0].VpcSecurityGroups' \
  --region us-east-2

# Adicionar regra de ingress (se necessário)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 27017 \
  --cidr 0.0.0.0/0 \
  --region us-east-2
```

### Erro: "Authentication failed"

**Causa:** Credenciais incorretas.

**Solução:**
```bash
# Resetar senha do usuário admin
aws docdb modify-db-cluster \
  --db-cluster-identifier medical-docdb-cluster \
  --master-user-password NovaS3nhaF0rt3! \
  --apply-immediately \
  --region us-east-2

# Aguardar alguns minutos
aws docdb describe-db-clusters \
  --db-cluster-identifier medical-docdb-cluster \
  --query 'DBClusters[0].Status' \
  --region us-east-2
```

### Erro: "ENOTFOUND" ou "getaddrinfo ENOTFOUND"

**Causa:** Endpoint do cluster incorreto ou não resolvível.

**Solução:**
```bash
# Obter endpoint correto
aws docdb describe-db-clusters \
  --db-cluster-identifier medical-docdb-cluster \
  --query 'DBClusters[0].Endpoint' \
  --output text \
  --region us-east-2

# Copiar o endpoint e usar no MONGODB_URI
# Exemplo: medical-docdb-cluster.cluster-xxxxxxxxx.us-east-2.docdb.amazonaws.com
```

### Erro: "SSL handshake failed"

**Causa:** Certificado TLS inválido ou expirado.

**Solução rápida (desenvolvimento):**
```bash
# Use tlsAllowInvalidCertificates=true temporariamente
MONGODB_URI=mongodb://admin:senha@cluster.docdb.amazonaws.com:27017/db?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0
```

**Solução permanente (produção):**
```bash
# Baixar certificado atualizado
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

---

## Testando Conexão Manualmente

### Teste 1: Conexão de rede básica

```bash
# De dentro do container
docker exec -it microservices-auth-service-1 sh

# Instalar telnet
apk add busybox-extras

# Testar conexão TCP
telnet seu-cluster.us-east-2.docdb.amazonaws.com 27017
# Se conectar = rede OK
# Se timeout = problema de Security Group/VPC
```

### Teste 2: Verificar certificado existe

```bash
# De dentro do container
docker exec -it microservices-auth-service-1 sh

# Verificar se certificado existe
ls -la /app/global-bundle.pem

# Verificar conteúdo
head -n 5 /app/global-bundle.pem
# Deve mostrar: -----BEGIN CERTIFICATE-----
```

### Teste 3: Conexão MongoDB usando mongosh

```bash
# De dentro do container (se tiver mongosh instalado)
mongosh "mongodb://admin:senha@cluster.us-east-2.docdb.amazonaws.com:27017/medical_auth?tls=true&tlsCAFile=/app/global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
```

---

## Checklist de Verificação

Quando tiver problemas de conexão, verifique na ordem:

- [ ] **Dockerfiles** têm o download do certificado?
- [ ] **MONGODB_URI** está correto no `.env`?
- [ ] **Credentials** (usuário/senha) estão corretas?
- [ ] **Endpoint** do cluster está correto?
- [ ] **Security Group** permite porta 27017?
- [ ] **Containers foram rebuilt** após mudanças nos Dockerfiles?
- [ ] **Certificado existe** dentro do container em `/app/global-bundle.pem`?
- [ ] **Cluster DocumentDB** está com status "available"?

---

## Comandos Úteis

### Ver logs de todos os serviços
```bash
docker-compose logs -f
```

### Ver logs de um serviço específico
```bash
docker-compose logs -f auth-service
docker-compose logs -f doctors-service
docker-compose logs -f patients-service
```

### Rebuild um serviço específico
```bash
docker-compose build --no-cache auth-service
docker-compose up -d auth-service
```

### Entrar no container
```bash
docker exec -it microservices-auth-service-1 sh
```

### Ver variáveis de ambiente no container
```bash
docker exec microservices-auth-service-1 env | grep MONGODB_URI
```

---

## Contato com Suporte AWS

Se os problemas persistirem:

```bash
# Obter detalhes do cluster para suporte
aws docdb describe-db-clusters \
  --db-cluster-identifier medical-docdb-cluster \
  --region us-east-2 > cluster-details.json

# Ver eventos recentes
aws docdb describe-events \
  --source-type db-cluster \
  --source-identifier medical-docdb-cluster \
  --duration 60 \
  --region us-east-2
```

---

**Última atualização:** 2025-11-10
