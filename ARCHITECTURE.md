# 🏗️ Arquitetura de Microsserviços - Sistema Médico

## 📊 Diagrama de Arquitetura

### Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTE (Frontend)                         │
│                    React / Angular / Mobile App                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   AWS Application Load Balancer                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Path-based Routing:                                       │    │
│  │  • /api/auth/*        → Auth Service Target Group          │    │
│  │  • /api/doctors/*     → Doctors Service Target Group       │    │
│  │  • /api/patients/*    → Patients Service Target Group      │    │
│  │  • /api/appointments/* → Patients Service Target Group     │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Auth Service   │      │ Doctors Service │      │Patients Service │
│   Port: 3001    │      │   Port: 3002    │      │   Port: 3003    │
│                 │      │                 │      │                 │
│ ┌─────────────┐ │      │ ┌─────────────┐ │      │ ┌─────────────┐ │
│ │   Routes    │ │      │ │   Routes    │ │      │ │   Routes    │ │
│ │ • register  │ │      │ │ • list docs │ │      │ │ • patients  │ │
│ │ • login     │ │      │ │ • get doc   │ │      │ │ • appts     │ │
│ │ • profile   │ │      │ │ • update    │ │      │ │ • medical   │ │
│ │ • verify    │ │      │ │ • available │ │      │ │   history   │ │
│ └─────────────┘ │      │ └─────────────┘ │      │ └─────────────┘ │
│                 │      │                 │      │                 │
│ ┌─────────────┐ │      │ ┌─────────────┐ │      │ ┌─────────────┐ │
│ │   Models    │ │      │ │   Models    │ │      │ │   Models    │ │
│ │ • User      │ │      │ │ • Doctor    │ │      │ │ • Patient   │ │
│ │             │ │      │ │             │ │      │ │ • Appoint.  │ │
│ └─────────────┘ │      │ └─────────────┘ │      │ └─────────────┘ │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │                        │
         │   Inter-Service        │   Communication        │
         │   HTTP/REST            │   (Axios)              │
         │◄──────────────────────►│◄──────────────────────►│
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
         ┌────────────────────────────────────────────────┐
         │           MongoDB (Databases)                  │
         │  ┌──────────────┐  ┌──────────────┐           │
         │  │ medical_auth │  │medical_doctor│           │
         │  │              │  │              │           │
         │  │ Collections: │  │ Collections: │           │
         │  │ • users      │  │ • doctors    │           │
         │  └──────────────┘  └──────────────┘           │
         │                                                │
         │  ┌──────────────────────────────┐             │
         │  │   medical_patients           │             │
         │  │                              │             │
         │  │   Collections:               │             │
         │  │   • patients                 │             │
         │  │   • appointments             │             │
         │  └──────────────────────────────┘             │
         └────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Comunicação

### 1. Fluxo de Registro de Paciente

```
┌────────┐       ┌──────────┐      ┌───────────┐      ┌──────────┐
│ Client │       │   Auth   │      │ Patients  │      │ MongoDB  │
│        │       │ Service  │      │  Service  │      │          │
└───┬────┘       └────┬─────┘      └─────┬─────┘      └────┬─────┘
    │                 │                   │                 │
    │ POST /register  │                   │                 │
    ├────────────────►│                   │                 │
    │                 │                   │                 │
    │                 │ Create User       │                 │
    │                 ├──────────────────────────────────► │
    │                 │                   │                 │
    │                 │ Generate JWT      │                 │
    │                 │◄─────────┐        │                 │
    │                 │          │        │                 │
    │                 │ POST /patients/   │                 │
    │                 │      profile      │                 │
    │                 ├──────────────────►│                 │
    │                 │ (with JWT)        │                 │
    │                 │                   │                 │
    │                 │                   │ Create Patient  │
    │                 │                   ├────────────────►│
    │                 │                   │                 │
    │                 │ Patient Created   │                 │
    │                 │◄──────────────────┤                 │
    │                 │                   │                 │
    │ User + Token +  │                   │                 │
    │   Profile ID    │                   │                 │
    │◄────────────────┤                   │                 │
    │                 │                   │                 │
```

### 2. Fluxo de Login

```
┌────────┐       ┌──────────┐      ┌───────────┐
│ Client │       │   Auth   │      │ Patients/ │
│        │       │ Service  │      │  Doctors  │
└───┬────┘       └────┬─────┘      └─────┬─────┘
    │                 │                   │
    │ POST /login     │                   │
    ├────────────────►│                   │
    │                 │                   │
    │                 │ Validate Password │
    │                 │◄────────┐         │
    │                 │         │         │
    │                 │ Generate JWT      │
    │                 │◄────────┐         │
    │                 │         │         │
    │                 │ GET /profile/     │
    │                 │     user/{id}     │
    │                 ├──────────────────►│
    │                 │ (get profileId)   │
    │                 │                   │
    │                 │ Profile ID        │
    │                 │◄──────────────────┤
    │                 │                   │
    │ Token + User +  │                   │
    │   Profile ID    │                   │
    │◄────────────────┤                   │
    │                 │                   │
```

### 3. Fluxo de Verificação de Disponibilidade e Agendamento

```
┌────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ Client │    │ Doctors  │    │ Patients  │    │   Auth   │
│        │    │ Service  │    │  Service  │    │ Service  │
└───┬────┘    └────┬─────┘    └─────┬─────┘    └────┬─────┘
    │              │                 │                │
    │ GET /doctors │                 │                │
    │     /:id/    │                 │                │
    │  availability│                 │                │
    ├─────────────►│                 │                │
    │              │                 │                │
    │              │ GET /appointments/               │
    │              │  doctor/{id}?date=...            │
    │              ├────────────────►│                │
    │              │ (fetch booked slots)             │
    │              │                 │                │
    │              │ Appointments    │                │
    │              │◄────────────────┤                │
    │              │                 │                │
    │              │ Calculate       │                │
    │              │ Available Slots │                │
    │              │◄───────┐        │                │
    │              │        │        │                │
    │Available Slots        │        │                │
    │◄─────────────┤        │        │                │
    │              │        │        │                │
    │              │        │        │                │
    │ POST /appointments    │        │                │
    ├──────────────┬────────┴───────►│                │
    │              │ (with token)    │                │
    │              │                 │ Verify Token   │
    │              │                 ├───────────────►│
    │              │                 │                │
    │              │ GET /doctors/{id}                │
    │              │◄────────────────┤                │
    │              │ (verify & get duration)          │
    │              │                 │                │
    │              │ Doctor Info     │                │
    │              ├────────────────►│                │
    │              │                 │                │
    │              │                 │ Check Conflicts│
    │              │                 │ Create Appt    │
    │              │                 │◄──────┐        │
    │              │                 │       │        │
    │ Appointment Created            │       │        │
    │◄───────────────────────────────┤       │        │
    │              │                 │       │        │
```

---

## 🗃️ Separação de Dados (Database per Service)

### **Estratégia: Database per Service Pattern**

Cada microsserviço possui seu próprio banco de dados (ou schema):

#### Auth Service - `medical_auth`
```javascript
Collections:
  - users
    {
      _id: ObjectId,
      email: String,
      password: String (hashed),
      role: Enum ['admin', 'doctor', 'patient'],
      firstName: String,
      lastName: String,
      phone: String,
      isActive: Boolean,
      createdAt: Date
    }
```

#### Doctors Service - `medical_doctors`
```javascript
Collections:
  - doctors
    {
      _id: ObjectId,
      user: ObjectId (reference to Auth Service),
      crm: String,
      specialties: [String],
      consultationDuration: Number,
      availability: [
        {
          dayOfWeek: Number,
          startTime: String,
          endTime: String
        }
      ],
      consultationPrice: Number,
      education: [Object],
      experience: Number,
      bio: String,
      isAcceptingPatients: Boolean
    }
```

#### Patients Service - `medical_patients`
```javascript
Collections:
  - patients
    {
      _id: ObjectId,
      user: ObjectId (reference to Auth Service),
      cpf: String,
      dateOfBirth: Date,
      bloodType: String,
      allergies: [String],
      medications: [Object],
      medicalHistory: [Object],
      emergencyContact: Object,
      insuranceInfo: Object
    }

  - appointments
    {
      _id: ObjectId,
      doctor: ObjectId (reference to Doctors Service),
      patient: ObjectId (reference to local Patient),
      dateTime: Date,
      duration: Number,
      status: Enum,
      type: Enum,
      reason: String,
      notes: String,
      prescription: [Object],
      diagnosis: String,
      followUpRequired: Boolean,
      followUpDate: Date
    }
```

### **Vantagens desta Abordagem:**

✅ **Isolamento de dados:** Falha em um serviço não afeta dados de outros
✅ **Escalabilidade independente:** Cada DB pode ser escalado separadamente
✅ **Tecnologia flexível:** Pode usar DBs diferentes (MongoDB, PostgreSQL, etc.)
✅ **Deploy independente:** Mudanças em schema não afetam outros serviços

### **Desvantagens:**

⚠️ **Joins complexos:** Dados distribuídos requerem múltiplas queries
⚠️ **Transações distribuídas:** ACID mais difícil (usar Saga pattern)
⚠️ **Duplicação de dados:** Pode haver redundância controlada
⚠️ **Consistência eventual:** Sincronização assíncrona quando necessário

---

## 🔐 Autenticação e Autorização

### **Fluxo de Autenticação Inter-Service**

1. **Cliente autentica** no Auth Service → recebe JWT
2. **Cliente envia JWT** para outros serviços
3. **Serviços validam JWT** chamando `/api/auth/verify` do Auth Service
4. **Auth Service retorna** dados do usuário se token válido

### **Middleware de Autenticação** (Doctors/Patients Services)

```javascript
exports.authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Chama Auth Service para verificar
  const response = await axios.get(
    `${AUTH_SERVICE_URL}/api/auth/verify`,
    { headers: { 'Authorization': `Bearer ${token}` }}
  );

  if (response.data.success) {
    req.user = response.data.user;
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
```

### **Alternativa: Shared Secret Validation**

Para melhor performance, pode-se implementar validação local do JWT:

```javascript
const jwt = require('jsonwebtoken');

exports.authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    // Valida JWT usando o mesmo secret compartilhado
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

**Trade-off:**
- ✅ Mais rápido (sem chamada HTTP)
- ⚠️ Secret compartilhado entre serviços
- ⚠️ Tokens revogados não invalidam imediatamente

---

## 🌐 Service Discovery

### **Opção 1: AWS Cloud Map** (Recomendado para ECS)

```
auth-service.local:3001
doctors-service.local:3002
patients-service.local:3003
```

### **Opção 2: Variáveis de Ambiente** (Docker Compose)

```yaml
environment:
  AUTH_SERVICE_URL: http://auth-service:3001
  DOCTORS_SERVICE_URL: http://doctors-service:3002
  PATIENTS_SERVICE_URL: http://patients-service:3003
```

### **Opção 3: API Gateway Pattern**

Usar AWS API Gateway ou Kong como ponto de entrada único:

```
Client → API Gateway → Serviços
```

---

## 📦 Padrões de Comunicação

### **Síncrono (HTTP/REST)**
- Usado para queries imediatas
- Exemplo: Verificar disponibilidade de médico

### **Assíncrono (Eventos)** - Futuro
- Message Queue (SQS, RabbitMQ)
- Pub/Sub (SNS, EventBridge)
- Exemplo: Notificações de agendamento

---

## 🔄 Resiliência e Circuit Breaker

### **Implementação Recomendada:**

```javascript
const axios = require('axios');
const CircuitBreaker = require('opossum');

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const breaker = new CircuitBreaker(
  async (url) => axios.get(url),
  options
);

breaker.fallback(() => ({
  success: false,
  message: 'Service temporarily unavailable'
}));

// Uso
const response = await breaker.fire(
  `${DOCTORS_SERVICE_URL}/api/doctors/${id}`
);
```

---

## 🚀 Estratégia de Deploy

### **Blue-Green Deployment**

1. Deploy nova versão (Green) em paralelo com antiga (Blue)
2. Testa Green
3. Redireciona tráfego do ALB para Green
4. Remove Blue após validação

### **Rolling Update** (ECS)

```bash
aws ecs update-service \
  --cluster medical-cluster \
  --service auth-service \
  --force-new-deployment \
  --deployment-configuration \
    "maximumPercent=200,minimumHealthyPercent=100"
```

---

## 📊 Monitoramento Distribuído

### **Métricas por Serviço:**

- Request Rate (req/s)
- Error Rate (%)
- Response Time (p50, p95, p99)
- CPU/Memory Usage

### **Distributed Tracing:**

Implementar **AWS X-Ray** ou **Jaeger**:

```javascript
const AWSXRay = require('aws-xray-sdk');
const app = AWSXRay.express.openSegment('auth-service');

// Routes...

app.use(AWSXRay.express.closeSegment());
```

### **Correlation ID:**

Propagar ID único através de todas as chamadas:

```javascript
const correlationId = req.headers['x-correlation-id'] || uuidv4();

// Passar para próximo serviço
axios.get(url, {
  headers: { 'x-correlation-id': correlationId }
});
```

---

## 🔮 Futuras Melhorias

1. **Event-Driven Architecture** com SNS/SQS
2. **CQRS** para leitura/escrita otimizada
3. **API Gateway** centralizado (Kong, AWS API Gateway)
4. **Service Mesh** (Istio, AWS App Mesh)
5. **GraphQL Federation** para agregação de dados
6. **Saga Pattern** para transações distribuídas

---

**Desenvolvido para TCC 2025 - Arquitetura de Microsserviços**
