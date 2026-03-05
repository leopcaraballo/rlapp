# Security Check-list (Elite Grade)

## 1. Backend (ASP.NET Core)

- [ ] **CORS**: ¿Está restringido a dominios conocidos?
- [ ] **Rate Limiting**: ¿Protegido contra fuerza bruta?
- [ ] **Request Validation**: ¿se valida entrada con filtros/validadores y modelo tipado?
- [ ] **Security Headers**: ¿usa cabeceras de seguridad equivalentes en gateway/API?
- [ ] **Sensitive Data**: ¿Se filtran contraseñas/PIDs en logs?

## 2. Infrastructure (Docker)

- [ ] **Rootless**: ¿Los contenedores corren como no-root?
- [ ] **Ports**: ¿Se exponen solo los puertos estrictamente necesarios?
- [ ] **Secrets**: ¿Uso de Docker Secrets o variables de entorno seguras?
- [ ] **Images**: ¿Uso de imágenes oficiales y 'slim' para reducir superficie de ataque?

## 3. Communication (RMQ/WS)

- [ ] **Authentication**: ¿Los WebSockets requieren token?
- [ ] **Encryption**: ¿TLS configurado para RabbitMQ?
- [ ] **Input Sanitization**: ¿Se sanitizan los mensajes antes de procesarlos?
