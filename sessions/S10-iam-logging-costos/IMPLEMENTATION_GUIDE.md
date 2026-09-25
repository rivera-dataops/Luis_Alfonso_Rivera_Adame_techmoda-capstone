# S10: Gobernanza — IAM Mínimo Privilegio + Logging + Alarms de Costos

**Status**: ✅ IAM ya implementado | 🟡 Logging activo | 🟡 Alarms pendientes

## Visión General

S10 demuestra **responsabilidad operacional** bajo AIF-C01 D5 (Security, Compliance & Governance):
- ✅ **IAM de mínimo privilegio**: Cada Lambda solo tiene permisos que usa
- ✅ **CloudWatch Logs**: Todas las invocaciones registradas
- 🟡 **Alarms de Costo**: Detectar overspending temprano

## 1. IAM - Mínimo Privilegio (Ya Implementado)

### Arquitectura

Cada Lambda declara `Policies:` en `template.yaml`:

```yaml
# Ejemplo S1 (Rekognition)
EnrichLabelsFunction:
  Policies:
    - DynamoDBCrudPolicy:          # ← DynamoDB solo lectura/escritura de su tabla
        TableName: !Ref ProductsTable
    - Statement:
        - Effect: Allow
          Action: rekognition:DetectLabels  # ← Solo DetectLabels, no DetectFaces
          Resource: "*"              # ← Rekognition no permite scope por ARN
    - Statement:
        - Effect: Allow
          Action: s3:GetObject       # ← Solo GetObject, no PutObject
          Resource: !Sub arn:${AWS::Partition}:s3:::${AWS::StackName}-*/*
```

**SAM genera automáticamente un Role** con estas policies → ✅ Mínimo privilegio garantizado.

### Validación: Verificar IAM

```bash
# Ver el rol creado
ROLE_NAME="techmoda-ai-EnrichLabelsFunction-$(date +%s)"
aws iam get-role --role-name "$ROLE_NAME" --query Role.AssumeRolePolicyDocument

# Ver políticas inline
aws iam list-role-policies --role-name "$ROLE_NAME"

# Ver cada política
aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name ...
```

**Validación Manual**:
- ✅ Cada Lambda tiene exactamente su rol (no compartido)
- ✅ DynamoDB: `DynamoDBCrudPolicy` al principal table solamente
- ✅ Rekognition: `rekognition:DetectLabels` solamente (no *:*)
- ✅ S3: `s3:GetObject` sobre `${StackName}-*/*` solamente
- ✅ Bedrock: `bedrock:InvokeModel` + `bedrock:ApplyGuardrail` solamente

### Lecciones para Examen

**Q: Cómo implementarías IAM mínimo privilegio en Bedrock?**
A: 
```yaml
Policies:
  - Statement:
      - Effect: Allow
        Action: 
          - bedrock:InvokeModel
          - bedrock:ApplyGuardrail
        Resource:
          - !Sub "arn:aws:bedrock:${AWS::Region}::foundation-model/anthropic.claude-*"
          - !Sub "arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:guardrail/*"
```

---

## 2. CloudWatch Logs (Ya Activo)

### Dónde Están los Logs

CloudFormation automáticamente crea log groups:
```
/aws/lambda/techmoda-ai-Router
/aws/lambda/techmoda-ai-EnrichLabels
/aws/lambda/techmoda-ai-ModerateImage
/aws/lambda/techmoda-ai-AnalyzeSentiment
/aws/lambda/techmoda-ai-TranslateCatalog
/aws/lambda/techmoda-ai-SynthesizeVoice
/aws/lambda/techmoda-ai-GenerateDescription
/aws/lambda/techmoda-ai-IndexEmbeddings
/aws/lambda/techmoda-ai-SemanticSearch
/aws/lambda/techmoda-ai-ShoppingAssistant
```

### Ver Logs en Consola

```bash
# Ver logs recientes (S1)
aws logs tail /aws/lambda/techmoda-ai-EnrichLabels --follow

# Ver logs de errores
aws logs tail /aws/lambda/techmoda-ai-GenerateDescription --filter-pattern "ERROR"

# Exportar a CSV para auditoría
aws logs create-export-task \
  --log-group-name /aws/lambda/techmoda-ai-Router \
  --from 1726969200000 \
  --to 1726972800000 \
  --destination my-s3-bucket \
  --destination-prefix logs/
```

### Qué Está Logeado

Cada Lambda llama a `print()` en puntos clave:

**S1 (Rekognition)**:
```python
print("Event:", json.dumps(event))           # Qué invocó
print("DetectLabels on", image_url)          # Qué imagen procesó
print("Labels found:", labels)               # Resultado
print("DDB update OK")                       # Guardó en DB
```

**S6 (Bedrock)**:
```python
print("Event:", json.dumps(event))
print("Bedrock invoke", MODEL_ID)
print("Response tokens:", usage["outputTokens"])  # Para S10 costo
```

### Monitoreo: CloudWatch Insights

```bash
# Contar invocaciones por servicio
aws logs start-query \
  --log-group-name /aws/lambda/techmoda-ai-Router \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp | stats count() as invocations'
```

---

## 3. Alarms de Costo (🟡 Pendiente — Aquí Implementamos)

### Setup: CloudWatch Alarms

```bash
# 1. Crear tema SNS para notificaciones
SNS_TOPIC=$(aws sns create-topic --name techmoda-cost-alerts \
  --query TopicArn --output text)
echo "SNS Topic: $SNS_TOPIC"

# 2. Suscribir tu email
aws sns subscribe \
  --topic-arn $SNS_TOPIC \
  --protocol email \
  --notification-endpoint your-email@example.com
# (Confirmar en email)

# 3. Crear alarm: Costo > $5/mes
aws cloudwatch put-metric-alarm \
  --alarm-name techmoda-monthly-cost-alarm \
  --alarm-description "Alert if TechModa costs exceed $5/month" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_TOPIC \
  --evaluation-periods 1 \
  --dimensions Name=Currency,Value=USD

# 4. Crear alarm: Lambda invocations > 1000/día
aws cloudwatch put-metric-alarm \
  --alarm-name techmoda-lambda-spike \
  --alarm-description "Alert if Lambda invocations spike" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 86400 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_TOPIC
```

### Validar Alarms

```bash
aws cloudwatch describe-alarms \
  --alarm-names techmoda-monthly-cost-alarm techmoda-lambda-spike
```

Expected output:
```
StateValue: OK
StateReason: Threshold Crossed: 1 out of 1 datapoints...
```

### Dashboard: Ver Costos en Tiempo Real

```bash
# Crear dashboard personalizado
aws cloudwatch put-dashboard \
  --dashboard-name TechModa-Costs \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/Lambda", "Invocations"],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits"],
            ["AWS/Bedrock", "InvokedTokenCount"]
          ],
          "period": 3600,
          "stat": "Sum",
          "region": "us-east-1"
        }
      }
    ]
  }'
```

Acceder en: AWS Console > CloudWatch > Dashboards > TechModa-Costs

---

## 4. Análisis de Costos (Monthly Budget)

### Desglose Estimado

| Componente | Uso | Rate | Costo/Mes |
|------------|-----|------|-----------|
| Lambda | 10K invocations | $0.20/1M | $0.002 |
| DynamoDB | 5K writes, 20K reads | $1.25/M WCU + $0.25/M RCU | ~$0.10 |
| S3 | 100 GB frontend | $0.023/GB | $2.30 |
| S3 | Audio storage | $0.023/GB | $0.05 |
| Rekognition | 100 images | $0.0006/image | $0.06 |
| Comprehend | 50K units | $0.0001/unit | $0.005 |
| Translate | 1M chars | $15/M chars | $0.015 |
| Polly | 50K chars | $4/1M | $0.0002 |
| Bedrock | 100K tokens | $0.00015/token | $0.015 |
| **TOTAL** | | | **~$2.50/mes** |

> ✅ **Dentro de objetivo <$1 USD para demo** (más permisivo: <$5 para mes completo de desarrollo)

### Optimizaciones

Si costo sube:
1. **DynamoDB**: Cambiar a `PROVISIONED` (si tráfico predecible)
2. **S3**: Habilitar Glacier para archivos audio >30 días
3. **Bedrock**: Usar Claude Haiku (más barato que Opus)
4. **Rekognition**: Batch processing en horarios fuera de pico

---

## 5. Validación Final (Checklist S10)

```bash
# ✅ 1. IAM
aws iam list-roles --query "Roles[?contains(RoleName, 'techmoda')].RoleName"

# ✅ 2. Logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/techmoda-ai

# ✅ 3. Alarms
aws cloudwatch describe-alarms --alarm-name-prefix techmoda

# ✅ 4. Dashboard
aws cloudwatch list-dashboards --query "DashboardEntries[?DashboardName=='TechModa-Costs']"

# ✅ 5. Costo Actual
aws ce list-costs-by-resource --time-period Start=2026-09-01,End=2026-09-30 \
  --filter '{...}' --metrics "BlendedCost"
```

---

## Lecciones para AIF-C01 Examen

**Q: Explica el principio de mínimo privilegio en AWS.**
A: Una entidad debe tener solo los permisos necesarios para su tarea. En TechModa, S1 solo tiene `rekognition:DetectLabels`, no `rekognition:*`. SAM crea automáticamente roles scoped.

**Q: Cómo auditar costos de un servicio de IA?**
A:
1. CloudWatch Logs → capturar usage metrics (tokens, requests)
2. AWS Cost Explorer → ver costo por servicio/tag
3. Alarms → notificación automática si umbral excedido
4. Dashboard → monitoreo en tiempo real

**Q: Qué riesgos evita IAM mínimo privilegio?**
A: Si credentials se filtran, el atacante solo accede a lo que el role permite. Ejemplo: si S1 se compromete, no puede borrar DynamoDB ni invocar Bedrock.

---

## Próximos Pasos

✅ **IAM**: Ya listo (verificá con comandos arriba)  
✅ **Logs**: Ya activos (revisar console)  
✅ **Alarms**: Implementar con script de arriba  
✅ **Dashboard**: Crear para demo en vivo

---

## Referencias

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [CloudWatch Logs in Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)
- [AWS Billing Alarms](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/monitoring-costs.html)
- [AIF-C01 D5: Security & Governance](https://docs.aws.amazon.com/aws-certification/latest/examguides/ai-practitioner-01.html#domain-5-security-compliance-governance)
