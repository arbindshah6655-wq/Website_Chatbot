(function () {
  // ---- Configuration: change this to your deployed backend URL ----
  const API_URL = window.OM_CHAT_API_URL || "https://YOUR-DEPLOYMENT.vercel.app/api/chat";

  let history = [];
  let isOpen = false;

  const style = document.createElement("style");
  style.textContent = `
    #om-chat-bubble {
      position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
      border-radius: 50%; background: #1a2b6d; color: #fff; display: flex;
      align-items: center; justify-content: center; cursor: pointer; z-index: 999999;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2); font-size: 26px; border: none;
    }
    #om-chat-window {
      position: fixed; bottom: 92px; right: 20px; width: 340px; max-width: 90vw;
      height: 460px; max-height: 70vh; background: #fff; border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25); display: none; flex-direction: column;
      overflow: hidden; z-index: 999999; font-family: -apple-system, Segoe UI, Roboto, sans-serif;
    }
    #om-chat-window.open { display: flex; }
    #om-chat-header {
      background: #1a2b6d; color: #fff; padding: 14px 16px; font-weight: 600; font-size: 15px;
    }
    #om-chat-messages {
      flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px;
      background: #f7f8fb;
    }
    .om-msg { max-width: 80%; padding: 8px 12px; border-radius: 10px; font-size: 14px; line-height: 1.4; }
    .om-msg.user { align-self: flex-end; background: #1a2b6d; color: #fff; }
    .om-msg.assistant { align-self: flex-start; background: #e9ebf3; color: #1a1a1a; }
    #om-chat-input-row { display: flex; border-top: 1px solid #eee; padding: 8px; gap: 6px; }
    #om-chat-input {
      flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; font-size: 14px; outline: none;
    }
    #om-chat-send {
      background: #1a2b6d; color: #fff; border: none; border-radius: 8px; padding: 8px 14px;
      cursor: pointer; font-size: 14px;
    }
    #om-chat-send:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);

  const bubble = document.createElement("button");
  bubble.id = "om-chat-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.textContent = "\uD83D\uDCAC";
  document.body.appendChild(bubble);

  const win = document.createElement("div");
  win.id = "om-chat-window";
  win.innerHTML = `
    <div id="om-chat-header">Chat with us</div>
    <div id="om-chat-messages"></div>
    <div id="om-chat-input-row">
      <input id="om-chat-input" type="text" placeholder="Type a message..." />
      <button id="om-chat-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  const messagesEl = win.querySelector("#om-chat-messages");
  const inputEl = win.querySelector("#om-chat-input");
  const sendEl = win.querySelector("#om-chat-send");

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `om-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toggle() {
    isOpen = !isOpen;
    win.classList.toggle("open", isOpen);
    if (isOpen && history.length === 0) {
      // Kick off with a greeting - a real first message rather than an empty box.
      sendMessage("Hi, I'd like to know more about your services.", true);
    }
  }

  async function sendMessage(text, hideUserBubble) {
    if (!text.trim()) return;
    if (!hideUserBubble) addMessage("user", text);
    inputEl.value = "";
    sendEl.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();

      if (data.reply) {
        addMessage("assistant", data.reply);
      }
      if (data.history) {
        history = data.history;
      }
    } catch (err) {
      addMessage("assistant", "Sorry, something went wrong. Please try again in a moment.");
    } finally {
      sendEl.disabled = false;
      inputEl.focus();
    }
  }

  bubble.addEventListener("click", toggle);
  sendEl.addEventListener("click", () => sendMessage(inputEl.value));
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage(inputEl.value);
  });
})();
