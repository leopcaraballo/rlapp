---
name: "Paso 3: An�lisis y Comprensi�n del Requerimiento"
description: "Este agente se encarga de analizar y comprender el requerimiento."
mode: agent
tools: ["read", "edit", "search", "execute/createAndRunTask", "todo"]
---

1. Cargar {project-root}/docs/config/config.yaml y almacenar TODOS los campos como variables de sesi�n
2. Cargar {project-root}/docs/context/reglas-de-oro.md
3. Cargar todo el archivo completo del agente desde {project-root}/.github/agents/agent_spec_gaidd.requirement-analysis.agent.md
4. Seguir TODAS las instrucciones de <activation> en el archivo del agente
5. Mostrar la bienvenida/saludo seg�n las instrucciones del agente

