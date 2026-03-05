# Gobierno de Git Flow y proteccion de ramas

> Define el flujo obligatorio de ramas, fases operativas y controles de cumplimiento para el backend.

---

**Version:** 1.0
**Fecha:** 24 de febrero de 2026
**Vinculante:** Nivel empresarial
**Alcance:** `rlapp-backend/` unicamente

## 1. Ramas autorizadas y prohibidas

### 1.1 Ramas autorizadas

| Rama | Origen permitido | Proteccion minima | Observaciones |
| --- | --- | --- | --- |
| main | qa | 2 aprobaciones, firmas GPG, checks obligatorios | Solo merge desde qa |
| qa | develop | 2 aprobaciones, firmas GPG, checks obligatorios | Staging 1 semana |
| develop | feature/* | 2 aprobaciones, firmas GPG, checks obligatorios | Integracion continua |
| feature/* | develop | Controles locales y CI | Vida maxima 2 semanas |

### 1.2 Ramas prohibidas

- release/*
- hotfix/*
- experiment/*
- temp-*
- wip-*
- Cualquier patron no listado

## 2. Fases operativas obligatorias

### 2.1 Fase 1. Preparacion

- Actualizar la rama `develop`.
- Verificar que el trabajo se limita a `rlapp-backend/`.

```sh
git checkout develop
git pull origin develop
```

### 2.2 Fase 2. Creacion de rama feature

- Crear una rama `feature/*` desde `develop`.
- Aplicar TDD en ciclos cortos.

```sh
git checkout -b feature/descripcion-breve
```

### 2.3 Fase 3. Push y apertura de PR

- Hacer push de la rama feature.
- Abrir PR usando el template obligatorio.
- Asignar dos revisores distintos al autor.

```sh
git push origin feature/descripcion-breve
```

### 2.4 Fase 4. Validaciones y aprobaciones

- CI/CD en verde con umbrales de cobertura.
- Analisis de seguridad sin hallazgos criticos.
- Aprobaciones de dos revisores sin autoaprobacion.

### 2.5 Fase 5. Merge a develop

- Merge realizado por autoridad de integracion.
- Se mantiene historial con `--no-ff`.

```sh
git checkout develop
git pull origin develop
git merge --no-ff feature/descripcion-breve
git tag -a vX.Y.Z-dev -m "dev release"
git push origin develop --follow-tags
```

### 2.6 Fase 6. Promocion a qa y main

- Promocion a `qa` tras 7 dias en verde.
- Promocion a `main` solo con aprobacion de QA.

```sh
git checkout qa
git pull origin qa
git merge --no-ff develop
git tag -a vX.Y.Z-qa -m "qa release"
git push origin qa --follow-tags

git checkout main
git pull origin main
git merge --no-ff qa
git tag -a vX.Y.Z -m "production release"
git push origin main --follow-tags
```

## 3. Reglas de PR y evidencia

- El template obligatorio esta en `.github/pull_request_template.md`.
- La evidencia debe incluir pruebas, cobertura y revision dual.
- Si hay cambios con IA, anexar `docs/ai-generated/YYYY-MM-DD-change-summary.md`.

## 4. Proteccion de ramas

Las reglas de proteccion se definen en `.github/branch-protection.yml`.

```yaml
develop:
  required_reviews: 2
  require_signed_commits: true
  require_status_checks:
    - build
    - test (coverage >= 90%)
    - sast (0 critical)
    - domain-tests (coverage >= 95%)
```

## 5. Commits firmados

```sh
gpg --full-generate-key
gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey XXXXXXXXXXXXXXXX
git config --global commit.gpgsign true
git commit -S -m "feat(financial): descripcion"
```

## 6. Acciones prohibidas

| Accion | Razon | Enforcer | Consecuencia |
| --- | --- | --- | --- |
| Commit directo a develop | Sin revision | Proteccion | Rechazo de push |
| Commit directo a main | Bypass de controles | Proteccion | Rechazo de push |
| Force push en main | Riesgo de historial | Proteccion | Bloqueo |
| Merge sin PR | Sin trazabilidad | Configuracion repo | Bloqueo |
| Merge con menos de 2 aprobaciones | Revision insuficiente | Proteccion | Bloqueo |
| Commits sin firma | Sin trazabilidad | Hooks | Rechazo |
| Cobertura menor a 90% | Calidad insuficiente | CI/CD | Fallo de pipeline |
| Cobertura dominio menor a 95% | Riesgo financiero | CI/CD | Fallo de pipeline |

## 7. Reversion y rollback

### 7.1 Reversion en develop

```sh
git log --oneline develop | head -20
git revert <merge-commit-hash> --no-edit
```

### 7.2 Reversion en qa o main

```sh
git checkout main
git pull origin main
git revert <merge-commit-hash> --no-edit
git tag -a vX.Y.Z-revert-N -m "revert: motivo"
git push origin main --follow-tags
```

## 8. Reporte de cumplimiento

```sql
SELECT
  branch_name,
  COUNT(*) AS commit_count,
  AVG(test_coverage) AS avg_coverage,
  COUNT(CASE WHEN sast_critical > 0 THEN 1 END) AS failed_sast,
  COUNT(CASE WHEN is_signed = true THEN 1 END) AS signed_commits,
  COUNT(CASE WHEN requires_review = true THEN 1 END) AS pr_count
FROM git_commits
WHERE branch_name IN ('main', 'qa', 'develop')
  AND committed_at >= '2026-01-01'
  AND committed_at < '2026-04-01'
GROUP BY branch_name;
```
