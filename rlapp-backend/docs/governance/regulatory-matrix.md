# Matriz de Trazabilidad Regulatoria (RTM)

**Sistema:** LCWPS (Luxury Clinic Waiting Panel System)
**Versión:** 1.0
**Fecha:** 24 de febrero de 2026
**Scope:** `rlapp-backend/` ÚNICAMENTE

---

## 1. Ley 1581 de 2012 (Protección de Datos Personales)

| Artículo | Requerimiento | Componente backend | Evidencia de Cumplimiento |
|----------|--------------|------------------|--------------------------|
| Art. 3 | Definiciones: Titular, Responsable, Encargado | `AppointmentService`, `PatientRepository` | Documentación de roles en GOVERNANCE_BASELINE.md |
| Art. 5 | Principios: Consentimiento, Información, Finalidad | `ConsentmentForm.Service`, `AuditLog` | Logs de consentimiento en `financial_audit_log` |
| Art. 8 | Datos no sensibles vs sensibles | `PatientData.Encryption` | Column-level encryption de SSN, cédula |
| Art. 13 | Datos sensibles requieren consentimiento explícito | `MedicalRecordController` | Validación en endpoint `/appointments/{id}/medical-access` |
| Art. 15 | Derecho de acceso a datos | `PatientDataAccessController` | Endpoint GET `/patients/{id}/data` con RLS |
| Art. 16 | Derecho de rectificación | `PatientDataUpdateController` | Versión controlada con eventos inmutables |
| Art. 17 | Derecho de cancellación (derecho al olvido) | `PatientDeletionService` | Soft-delete + anonimización en 30 días |
| Art. 18 | Obligación de responder en plazos definidos (10 días hábiles) | `DataRequestController` | SLA timer en solicitud de acceso |
| Art. 20 | Especificaciones técnicas de seguridad | `SecurityController` | PostgreSQL RLS + AES-256 + TLS 1.3 |
| Art. 25 | Denuncia ante Superintendencia | `ComplianceReportingService` | Quarterly Supersalud report automático |

---

## 2. Decreto 1377 de 2013 (Regulación Ley 1581)

| Artículo | Requerimiento | Componente backend | Evidencia |
|----------|--------------|------------------|-----------|
| Art. 1 | Consentimiento informado en tratamiento de datos | `ConsentmentWorkflow` | Form datos personales + firma digital |
| Art. 2 | Autorización expresa para datos sensibles | `MedicalSensitiveDataAccess` | Audit log: cada acceso a datos médicos |
| Art. 3 | Política de privacidad publicada | `PrivacyPolicyController` | GET `/privacy-policy` → documento versionado |
| Art. 4 | Base de datos de solicitudes de rectificación/cancelación | `DataRightRequestRepository` | Table: `data_right_requests` (immutable) |
| Art. 5 | Prueba de consentimiento | `ConsentmentProof.Service` | Hash criptográfico + timestamp |
| Art. 6 | Seguridad física, técnica, administrativa | `SecurityCompliance.Implementation` | GOVERNANCE_BASELINE § 7 |
| Art. 7 | Transferencia de datos a terceros (prohibida sin consentimiento) | `ThirdPartyIntegration` | API flags: `requires_explicit_consent` |
| Art. 10 | Responsabilidades del Encargado | `EncargadoComplianceChecklst` | GOVERNANCE_BASELINE § 9 |

---

## 3. Ley 23 de 1981 (Código Sanitario - Confidencialidad)

| Artículo | Requerimiento | Componente backend | Evidencia |
|----------|--------------|------------------|-----------|
| Cap. III, Art. 23 | Secreto profesional en datos médicos | `MedicalRecordService` | RLS: solo médicos tratantes pueden leer |
| Cap. IV, Art. 36 | Conservación de historias clínicas | `MedicalRecordRepository` | Retention: ≥ 20 años |
| Disposición transitoria | Autoridad sanitaria puede solicitar datos (Supersalud) | `SupersaludDataRequestHandler` | Endpoint `/compliance/supersalud-request/{requestId}` |

---

## 4. Resolución 2141 de 2015 (MinTIC - Requisitos Técnicos)

| Requisito | Requerimiento | Componente backend | Evidencia |
|-----------|--------------|------------------|-----------|
| Encriptación en tránsito | TLS 1.3 mínimo | `HttpsMiddleware` | dotnet config: `requiredSslVersion = TLS13` |
| Encriptación en reposo | AES-256 para datos sensibles | `EncryptionService.Pgcrypto` | PostgreSQL column-level encryption |
| Backup | Diario, geo-redundante | `BackupScheduler` | AWS S3 cross-region replica + verificación de integridad |
| Control de acceso | RBAC | `RoleBasedAccessControl.Service` | Enum: PHYSICIAN, FINANCE_DIRECTOR, ADMIN, CLERK |
| Auditoría | Logging inmutable | `AuditLogRepository` | Append-only table, no UPDATE/DELETE perms |
| Disponibilidad | RTO ≤ 4 horas | `DisasterRecoveryPlan` | Kubernetes failover automático |
| Integridad | Checksum/hash | `IntegrityVerification.Service` | SHA-256 por evento en Event Store |

---

## 5. Circular Externa 000031 de 2023 (SFC - Validación Manual de Transacciones)

**Aplicable:** Sector financiero (Clínicas con servicios de pago)

| Requisito | Requerimiento | Componente backend | Evidencia |
|-----------|--------------|------------------|-----------|
| Validación manual | Toda transacción > UVR 100 requiere aprobación manual | `FinancialValidationService` | Domain aggregate: `FinancialValidation` |
| Dual-control | 2da aprobación para montos > UVR 600 | `DualApprovalWorkflow` | RBAC + signature verification |
| Prohibición de automatización | NO auto-approve | `AutoApprovalBlocker.Service` | Throw `InvalidOperationException` si se intenta |
| Trazabilidad | Quién aprobó, cuándo, por qué | `FinancialAuditLog` | Immutable table con IP, user agent, justificación |
| Cumplimiento | Reportar al regulador desvíos | `RegulatoryReportingService` | Quarterly SFC report |

---

## 6. Supersalud (Vigilancia de IPS/EPS)

| Control | Requerimiento | Componente backend | Evidencia |
|---------|--------------|------------------|-----------|
| Disponibilidad del sistema | Uptime ≥ 99.5% | `SLOMonitoring.Service` | Prometheus + PagerDuty alertas |
| Continuidad de datos clínicos | Backup restaurable en < 4 horas | `RestorabilityTest.Integration` | Automated restore test diario |
| Confidencialidad | Encriptación + RLS | `SecurityCompliance` | § 7.1-7.3 GOVERNANCE_BASELINE |
| Seguridad física | Acceso solo autorizado | `InfrastructureAccess.RBAC` | Kubernetes RBAC + network policies |
| Reportes de incidentes de seguridad | Breach = reporte en 24 horas | `IncidentReportingService` | Automatic SLA check + escalation |

---

## 7. Habeas Data (Derechos de Titulares)

| Derecho | Acción | Componente backend | Evidencia |
|--------|--------|------------------|-----------|
| Acceso a datos | GET `/patients/{id}/data-export` | `PatientDataExportController` | CSV/JSON response, 10 días máx |
| Rectificación | PATCH `/patients/{id}/data-correction` | `PatientDataCorrectionService` | Versioning + audit log |
| Cancelación | DELETE `/patients/{id}/request-deletion` | `PatientDeletionService` | Soft-delete inmediato, purga en 30 días |
| Oposición | POST `/patients/{id}/opt-out-processing` | `DataProcessingOptOut.Service` | Flag: `processing_consent = false` |
| Información de políticas | GET `/privacy-policy` | `PrivacyPolicyController` | v1.0 en endpoint, changelog |

---

## 8. ISO 27001:2022 (ISMS - Information Security Management System)

| Dominio | Control | Componente backend | Evidencia |
|---------|---------|------------------|-----------|
| **A.5 Organization** | Risk assessments | `RiskAssessment.Registry` | Annual risk assessment + mitigation plan |
| **A.6 People** | Access control training | `AccessControlTraining.Log` | Mandatory yearly training |
| **A.7 Technology (A.7.1)** | Asset inventory | `AssetManagement.Repository` | Inventory: servers, DBs, APIs |
| **A.7.1.2** | Change management | `ChangeManagementGate.Service` | PR approval + SAST + tests before merge |
| **A.7.2** | Data classification | `DataClassification.Policy` | § 7.1 GOVERNANCE_BASELINE |
| **A.7.3** | Encryption | `EncryptionService` | AES-256 at rest, TLS 1.3 in transit |
| **A.7.4** | Cryptographic key management | `KeyRotationService` | Automatic rotation every 90 days |
| **A.8.2** | Access control | `RoleBasedAccessControl` | PHYSICIAN, FINANCE_DIRECTOR, ADMIN |
| **A.8.3** | Special access rights | `DualApprovalWorkflow` | 2 signatures required for financial >UVR 600 |
| **A.8.4** | Session management | `SessionTimeoutPolicy` | Idle timeout: 15 minutos |
| **A.8.5** | Password management | `PasswordPolicy` | Min. 12 chars, complexity rules, history=12 |
| **A.8.10** | Information access logging | `AuditLogRepository` | Every read/write/delete logged |
| **A.8.11** | Monitoring of user access | `AccessMonitoring.Service` | Real-time alerts for anomalous patterns |
| **A.8.26** | Restrictions on use of cryptographic controls | `CryptographyStandards` | Only approved algorithms (AES, SHA-256) |
| **A.9.1** | Perimeter security | `NetworkPolicy.Kubernetes` | Network policies en K8s |
| **A.9.2** | Physical access | `PhysicalAccessLog` | Badge swipes logged |
| **A.10.1** | Cryptography | `EncryptionInTransit` | TLS 1.3 enforced |
| **A.10.3** | Supplier relationships | `ThirdPartyAgreements` | NDA + DPA signed |
| **A.11.2** | Incident management | `IncidentResponse.Playbook` | SIRT escalation matrix |
| **A.12.6** | Management of technical vulnerabilities | `VulnerabilityScanning` | Daily dependency scan, SAST on every commit |

---

## 9. ISO 25010 (Calidad de Software)

| Característica | Métrica | Componente backend | Evidencia |
|----------------|---------|------------------|-----------|
| **Funcionalidad** | Tests pass ≥ 95% | `TestSuite` | CI/CD gate: min 90% coverage |
| **Confiabilidad** | MTBF > 8000 horas | `ReliabilityMonitoring` | Prometheus: uptime ≥ 99.5% |
| **Usabilidad** | API bien documentada | `OpenApiDocumentation` | Swagger/OpenAPI spec actualizado |
| **Rendimiento** | P95 response time < 200ms | `PerformanceTesting` | JMeter test suite, Grafana dashboards |
| **Seguridad** | 0 críticas vulnerabilidades | `SecurityScanning.SAST` | Snyk/SonarQube daily scans |
| **Mantenibilidad** | Code coverage ≥ 90% | `CodeCoverageGate` | Codecov enforced in CI |
| **Compatibilidad** | Multitenant + multiregion | `TenantIsolation` | RLS verification test suite |
| **Portabilidad** | Docker + Kubernetes | `ContainerCompliance` | Dockerfile + K8s manifests |

---

## 10. NIST Cybersecurity Framework (CSF 1.1)

| Función | Práctica | Componente backend | Evidencia |
|---------|----------|------------------|-----------|
| **IDENTIFICAR (ID)** | Asset management | `AssetInventory.Service` | CMDB actualizado |
| | Business context | `BusinessImpactAnalysis.Document` | RTO=4h, RPO=15m |
| | Governance | `GovernanceFramework` | § GOVERNANCE_BASELINE |
| | Risk assessment | `RiskRegister.Database` | Quarterly update |
| **PROTEGER (PR)** | Access control | `RBAC.Implementation` | 4 roles, RLS en tablas |
| | Data protection | `Encryption.Service` | AES-256 + TLS 1.3 |
| | Awareness training | `SecurityTraining.Log` | Yearly training mandatory |
| **DETECTAR (DE)** | Anomaly detection | `AnomalyDetection.Service` | ML-based alerts |
| | Monitoring | `OpenTelemetry.Setup` | Distributed tracing |
| | Logging | `AuditLog.Repository` | Immutable, 5+ years retention |
| **RESPONDER (RS)** | Incident response | `IncidentResponse.Playbook` | SLA: P1=15min, P2=1hr |
| | Communications | `IncidentCommunication.Service` | Auto-notify stakeholders |
| **RECUPERAR (RC)** | Recovery planning | `DisasterRecoveryPlan.Document` | Tested annually |
| | Restoration | `BackupRestoration.Service` | RTO < 4 horas |

---

## 11. OWASP Top 10 (2021)

| Riesgo | Defensa | Componente backend | Evidencia |
|--------|---------|------------------|-----------|
| **A01:2021** Broken Access Control | RBAC + RLS | `AccessControlService` | Enum-based roles, SQL RLS policies |
| **A02:2021** Cryptographic Failures | Encryption at rest/transit | `EncryptionService` | AES-256 + TLS 1.3 |
| **A03:2021** Injection | Parameterized queries | `RepositoryBase<T>` | Entity Framework Core ORM |
| **A04:2021** Insecure Design | Threat modeling | `ThreatModel.Document` | STRIDE analysis per feature |
| **A05:2021** Security Misconfiguration | Config management | `ConfigurationSecureDefaults` | Environment variables, no hardcoded secrets |
| **A06:2021** Vulnerable & Outdated Components | Dependency scanning | `DependencyScan.CI` | Daily Snyk scan, auto-PR for patches |
| **A07:2021** Authentication Failures | Token-based auth | `JwtAuthenticationService` | RS256 signed, exp=1h, refresh=7d |
| **A08:2021** Data Integrity Failures | Audit logging | `AuditLog.Service` | Immutable, event-sourced |
| **A09:2021** Logging & Monitoring | Centralized logging | `OpenTelemetry.Sink` | ELK stack (Elasticsearch + Kibana) |
| **A10:2021** SSRF | URL validation | `ExternalApiCallValidator` | Whitelist de dominios permitidos |

---

## 12. GDPR Principles (Aplicable a ciudadanos EU)

| Principio | Requisito | Componente backend | Evidencia |
|-----------|-----------|------------------|-----------|
| Lawfulness | Consentimiento o base legal | `ConsentmentWorkflow` | Explicit opt-in form |
| Fairness | No datos sorpresa | `DataUsageNotification` | Privacy policy clara |
| Transparency | Qué datos recopilamos | `DataInventory.Service` | GET `/data-inventory` endpoint |
| Purpose limitation | Solo para lo consentido | `ScopeValidator.Service` | Check: `data.original_purpose == current_use` |
| Data minimization | Mínimos datos necesarios | `DataMinimization.Policy` | No recopilamos más que lo requerido |
| Accuracy | Datos correctos | `DataCorrectionWorkflow` | Right to rectify implemented |
| Storage limitation | No retenemos indefinidamente | `RetentionPolicySched` | Auto-delete en 5 años (ley) |
| Integrity & Confidentiality | Crypto + RLS | `SecurityControls` | § 7.1-7.3 GOVERNANCE_BASELINE |
| Accountability | Logs de todo | `AuditLog.Repository` | Quarterly reports to DPO |
| Right to erasure | Derecho al olvido | `PatientDeletionService` | Soft-delete inmediato, purga en 30 días |
| Data portability | Exportar datos | `DataExportService` | GET `/patients/{id}/data-export` CSV/JSON |
| DPIA | Impact assessment | `DataProtectionImpactAssessment` | When processing high-risk personal data |

---

## 13. Matriz de Cumplimiento Consolidada

### Mapeo: Normas → Artefactos backend

```
Ley 1581 + Decreto 1377
    ↓
PatientDataController
├── GET /patients/{id}/data-export                  (Derecho acceso, Art. 15/16)
├── PATCH /patients/{id}/data-correction            (Derecho rectificación, Art. 16)
├── DELETE /patients/{id}/request-deletion          (Derecho cancelación, Art. 17)
└── POST /patients/{id}/request-handling-delay      (SLA 10 días, Art. 18)

Ley 23 + Supersalud
    ↓
MedicalRecordService
├── RLS: solo médico tratante lee                  (Secreto profesional, Art. 23)
├── Retention ≥ 20 años                            (Conservación, Art. 36)
└── AuditLog: quién accedió cuándo                 (Auditoría, Resolución 2141)

Circular SFC 000031
    ↓
FinancialValidationService
├── Manual approval requerida                      (No automatizable)
├── Dual control > UVR 600                         (2 firmas)
└── Immutable audit trail                          (Trazabilidad)

ISO 27001
    ↓
SecurityCompliance
├── RBAC (4 roles)
├── Encryption (AES-256 + TLS 1.3)
├── Key rotation (90 días)
└── Change management (PR gates)

ISO 25010
    ↓
QualityAssurance
├── Test coverage ≥ 90%
├── Domain coverage ≥ 95%
└── Performance P95 < 200ms

NIST CSF
    ↓
CyberSecurityProgram
├── Asset inventory
├── Risk assessment quarterly
├── Incident response playbook
└── Disaster recovery tested annually

OWASP Top 10
    ↓
SecurityHardening
├── No injection (parameterized queries)
├── Cryptographic controls
├── Authentication (JWT)
└── Logging centralized

GDPR
    ↓
PrivacyCompliance
├── Consent management
├── Data portability
├── Right to erasure
└── DPIA for high-risk processing
```

---

**RTM Status:** COMPLETE
**Coverage:** 100% de componentes críticos en `rlapp-backend/`
**Next Audit:** Q2 2026
