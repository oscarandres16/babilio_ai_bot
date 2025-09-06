# Ujsard Bot

![Proyecto Ujsard](assets/babilio.png)

Ujsard Bot es un asistente virtual para el **portal SIA Ujsard** de la Universidad Industrial de Santander.  
Está diseñado como un **Web Component** para frontend y un **backend en Node.js** que consume un modelo LLaMA3 configurado en un servidor Linux.

---

## Características

- Responde **consultas de procesos administrativos y financieros** en formato HTML.
- Integración como **Web Component** en cualquier portal web.
- Backend en **Node.js** que se comunica con un servidor LLaMA3.
- Prompt base configurable mediante `modelFile.txt`.
- Responde con rutas sugeridas para los procesos.

---

## Estructura del proyecto
```
/
├─ assets/
│ └─ babilio.png # Imagen del proyecto
├─ backend/
│ └─ server.js # Código del backend Node.js
├─ frontend/
│ └─ ujsard-bot.js # Web Component
├─ modelFile.txt # Prompt base del bot
└─ README.md
```