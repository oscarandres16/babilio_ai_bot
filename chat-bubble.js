class ChatBubble extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
        <style>
          .chat-bubble {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #376a12;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            z-index: 1000;
          }

          /* 👇 badge de notificación */
          .notification-badge {
            position: absolute;
            top: 0px;
            right: 0px;
            background: red;
            color: white;
            font-size: 12px;
            font-weight: bold;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: none; /* oculto por defecto */
          }

          .chat-bubble img {
            width: 100%;
            border-radius: 50%;
          }

          .chat-bubble:hover {
            transform: scale(1.1);
            background: #2e550f;
          }

          .chat-window {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 450px;
            height: 550px;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            font-family: sans-serif;
          }

          .chat-window.active {
            opacity: 1;
            pointer-events: auto;
            z-index: 1;
          }

          .chat-header {
            background: #2b4d0e; /* más oscuro para contraste */
            color: #fff;
            padding: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .chat-header img {
            width: 22px;
            height: 22px;
            filter: brightness(0) invert(1);
          }

          .chat-body {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            font-size: 14px;
          }

          .chat-footer {
            display: flex;
            border-top: 1px solid #ddd;
          }

          .chat-footer input {
            flex: 1;
            border: none;
            padding: 10px;
            font-size: 14px;
            max-length: 100; /* 👈 no afecta en Shadow DOM, lo hacemos en JS */
          }

          .chat-footer input:focus {
            outline: none;
          }

          .chat-footer button {
            background: #376a12;
            color: white;
            border: none;
            padding: 0 15px;
            cursor: pointer;
          }

          .chat-footer button:hover {
            background: #2e550f;
          }

          .message {
            margin: 8px 0;
            display: flex;
            flex-direction: column;
            max-width: 80%;
          }

          .user {
            align-self: flex-end;
            background: #e6f4e0;
            padding: 6px 10px;
            border-radius: 10px;
            color: #1e293b;
            font-weight: 500;
            margin-left: auto;
            border-top-right-radius: 0px;
            box-shadow: -1px 1px 2px -1px rgba(0, 0, 0, 0.45);
          }

          .bot {
            align-self: flex-start;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 10px;
            color: #334155;
            margin-right: auto;
            border-top-left-radius: 0px;
            box-shadow: 1px 1px 2px -1px rgba(0, 0, 0, 0.45);
          }

          .timestamp {
            font-size: 10px;
            color: #888;
            margin-top: 5px;
            align-self: flex-end;
          }

          .loader {
            display: inline-block;
            font-size: 16px;
            color: #376a12;
            animation: blink 1s infinite;
          }

          .chat-img {
            width: 20px;
          }

          @keyframes blink {
            0% { opacity: 0.2; }
            50% { opacity: 1; }
            100% { opacity: 0.2; }
          }

          .message {
            animation: fadeIn 0.3s ease;
          }

          .btn-tutorial {
            border: none;
            min-height: 30px;
            padding: 5px;
            background: #376a12;
            color: white;
            font-size: 13px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.3s ease;
          }

          .btn-tutorial:hover {
            background: #5f8f3cff;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>

        <div class="chat-bubble">
          <img src="/assets/babilio.png" alt="Logo" />
          <span class="notification-badge" id="badge">1</span>
        </div>
        <div class="chat-window">
          <div class="chat-header">
            Babilio (beta)
          </div>
          <div class="chat-body" id="messages"></div>
          <div class="chat-footer">
            <input type="text" id="userInput" placeholder="Escribe un mensaje..." />
            <button id="sendBtn">➤</button>
          </div>
        </div>
      `;
  }

  connectedCallback() {
    const bubble = this.shadowRoot.querySelector(".chat-bubble");
    const window = this.shadowRoot.querySelector(".chat-window");
    const input = this.shadowRoot.querySelector("#userInput");
    const sendBtn = this.shadowRoot.querySelector("#sendBtn");
    const messages = this.shadowRoot.querySelector("#messages");
    const badge = this.shadowRoot.querySelector("#badge");

    // 🔔 Sonido
    const notifySound = new Audio("/assets/notify.mp3");

    let greeted = false;
    let unreadCount = 0;

    // 🔹 Clave para LocalStorage
    const STORAGE_KEY = "babilio_conversation";

    // 💾 Array para el historial de conversación (para el backend)
    this.conversationHistory = [];
    this.actualTutorial = [];

    const getTime = () => {
      const now = new Date();
      return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const saveConversation = () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.conversationHistory)
      );
    };

    const renderMessage = (msg) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("message", msg.sender);

      const msgContent = document.createElement("div");
      msgContent.innerHTML = msg.html;
      wrapper.appendChild(msgContent);

      const time = document.createElement("div");
      time.classList.add("timestamp");
      time.textContent = msg.time;
      wrapper.appendChild(time);

      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;
    };

    const loadConversation = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.conversationHistory = JSON.parse(stored);
        this.conversationHistory.forEach((msg) => {
          renderMessage({
            sender: msg.sender,
            html: msg.html,
            time: msg.time,
          });
        });
      }
    };

    const addMessage = (text, sender = "bot", isHTML = false) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("message", sender);

      const msgContent = document.createElement("div");
      if (isHTML) {
        msgContent.innerHTML = text;
      } else {
        msgContent.textContent = text;
      }

      wrapper.appendChild(msgContent);

      const time = document.createElement("div");
      time.classList.add("timestamp");
      time.textContent = getTime();
      wrapper.appendChild(time);

      messages.appendChild(wrapper);
      messages.scrollTop = messages.scrollHeight;

      // No guardar el loader en el historial
      if (text !== "...") {
        this.conversationHistory.push({
          sender: sender,
          html: wrapper.querySelector("div").innerHTML,
          time: getTime(),
          text: msgContent.textContent,
        });
        saveConversation();
      }

      return wrapper;
    };

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;

      if (text.length > 100) {
        addMessage(
          "⚠️ El mensaje no puede superar los 100 caracteres.",
          "bot",
          true
        );
        return;
      }

      // Agregar el mensaje del usuario al historial
      addMessage(`${text}`, "user");
      input.value = "";

      // Loader
      const loaderId = "loader-" + Date.now();
      const loaderMsg = document.createElement("div");
      loaderMsg.classList.add("message", "bot");
      loaderMsg.id = loaderId;
      loaderMsg.innerHTML = `<img src="/assets/babilio.png" class="chat-img" alt="Logo" /> <span class="loader">...</span>`;
      messages.appendChild(loaderMsg);
      messages.scrollTop = messages.scrollHeight;

      // Preparar el historial para el backend
      const historyToSend = this.conversationHistory.map((msg) => {
        if (msg.sender === "user") {
          return { user: msg.text, assistant: "" };
        } else {
          return { user: "", assistant: msg.text };
        }
      });

      fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          rol: "Secretaria de unidad",
          nombre: "Genny Laguado",
          history: historyToSend,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("data", data);
          console.log("data?.tutorialGuiado", data?.tutorialGuiado);
          // quitar loader
          const loaderEl = this.shadowRoot.getElementById(loaderId);
          if (loaderEl) loaderEl.remove();

          let response = `<img src="/assets/babilio.png" class="chat-img" alt="Logo" /> ${data.reply}`;

          if (data?.tutorialGuiado) {
            this.actualTutorial = data?.tutorialGuiado;
            response += `
            Este proceso cuenta con tutorial guíado:
            <button class="btn-tutorial">Ejecutar tutoríal</button>
            `;
          }

          // mostrar respuesta
          addMessage(response, "bot", true);

          // 🔔 sonido
          notifySound.play().catch(() => {
            console.warn("El navegador bloqueó el sonido hasta interacción.");
          });

          // 📍 si la ventana está cerrada -> mostrar badge
          if (!window.classList.contains("active")) {
            unreadCount++;
            badge.textContent = unreadCount;
            badge.style.display = "flex";
          }
        })
        .catch((error) => {
          console.error("Error al conectar con el backend:", error);
          const loaderEl = this.shadowRoot.getElementById(loaderId);
          if (loaderEl) loaderEl.remove();
          addMessage(
            "Lo siento, hubo un problema al conectar con el servidor.",
            "bot"
          );
        });
    };

    // 📍 Abrir ventana limpia el badge
    bubble.addEventListener("click", () => {
      window.classList.toggle("active");
      if (window.classList.contains("active")) {
        input.focus();
        unreadCount = 0;
        badge.style.display = "none";
        if (!greeted && this.conversationHistory.length === 0) {
          greeted = true;
          addMessage(
            "👋 Hola, soy <b>Babilio AI</b>, tu asistente virtual. ¿En qué puedo ayudarte hoy?",
            "bot",
            true
          );
        }
      }
    });

    // Manejar clics en los botones de tutorial
    messages.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-tutorial")) {
        console.log("¡Botón de tutorial guíado clickeado!");
        console.log("this.actualTutorial", this.actualTutorial);
        // Aquí puedes llamar a una función para iniciar el tutorial
      }
    });

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });

    // ✅ Cargar conversación previa
    loadConversation();
  }

  executeTutorial(tuto) {
    console.log("tuto", tuto);
  }
}

customElements.define("chat-bubble", ChatBubble);
