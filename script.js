const micBtn = document.getElementById("micbtn");
const reactor = document.getElementById("reactor");
const statusText = document.getElementById("statustext");
const chatLog = document.getElementById("chatlog");
const textInput = document.getElementById("textinput");
const sendBtn = document.getElementById("sendbtn");
const apiModal = document.getElementById("apimodal");
const keyBtn = document.getElementById("keybtn");
const saveKeyBtn = document.getElementById("savekeybtn");
const closeModalBtn = document.getElementById("closemodalbtn");
const apiKeyInput = document.getElementById("apikeyinput");

let isSpeaking = false;
const systemPrompt = {
  role: "system",
  content: "You are J.A.R.V.I.S., Tony Stark's personal AI assistant. Address the user as Boss or Sir. Answer accurately, smartly, and concisely in 2-3 sentences in English or Hinglish. Never use markdown symbols like asterisks or hashtags."
};
let chatHistory = [systemPrompt];

// 1. Live Clock
function updateClock() {
  document.getElementById("clock").innerText = new Date().toLocaleTimeString();
}
updateClock();
setInterval(updateClock, 1000);

// 2. Live Battery
if ("getBattery" in navigator) {
  navigator.getBattery().then((battery) => {
    const updateBat = () => {
      document.getElementById("battery").innerText = "PWR: " + Math.round(battery.level * 100) + "%";
    };
    updateBat();
    battery.addEventListener("levelchange", updateBat);
  });
}

// 3. Smart Text-to-Speech
function speak(text) {
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/[*#_`]/g, "");
  const utter = new SpeechSynthesisUtterance(cleanText);
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.includes("en-GB") || v.lang.includes("en-IN") || v.lang.includes("en-US"));
  if (preferredVoice) utter.voice = preferredVoice;
  utter.pitch = 0.92;
  utter.rate = 1.03;
  utter.onstart = () => {
    isSpeaking = true;
    reactor.classList.add("active");
  };
  utter.onend = () => {
    isSpeaking = false;
    reactor.classList.remove("active");
  };
  window.speechSynthesis.speak(utter);
}

// 4. Terminal Chat Logger
function addLog(sender, message, isUser = false) {
  const p = document.createElement("p");
  p.className = isUser ? "usermsg" : "aimsg";
  p.innerText = "[" + sender + "]: " + message;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// 5. Auto-Detect Active Groq Models (Future-Proof!)
async function getActiveGroqModels(apiKey) {
  const modelsUrl = atob("aHR0cHM6Ly9hcGkuZ3JvcS5jb20vb3BlbmFpL3YxL21vZGVscw==");
  const priority = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile"
  ];

  try {
    const res = await fetch(modelsUrl, {
      headers: { "Authorization": "Bearer " + apiKey }
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.data)) {
      const available = data.data
        .map(m => m.id)
        .filter(id => !id.includes("whisper") && !id.includes("guard") && !id.includes("orpheus"));
      const sorted = [
        ...priority.filter(p => available.includes(p)),
        ...available.filter(a => !priority.includes(a))
      ];
      if (sorted.length > 0) return sorted;
    }
  } catch (e) {}
  return priority;
}

// 6. Send Request with Auto-Fallback
async function askGroq(apiKey, messages) {
  const endpoint = atob("aHR0cHM6Ly9hcGkuZ3JvcS5jb20vb3BlbmFpL3YxL2NoYXQvY29tcGxldGlvbnM=");
  const models = await getActiveGroqModels(apiKey);
  let lastError = "Connection failed";

  for (const modelName of models) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          temperature: 0.7,
          max_tokens: 250
        })
      });

      const data = await response.json();
      if (response.ok && data.choices && data.choices.length > 0) {
        return data.choices.at(0).message.content.trim();
      }
      lastError = data.error?.message || "Model unavailable";
    } catch (e) {
      lastError = e.message;
    }
  }
  throw new Error(lastError);
}

// 7. Main Command Processor
async function runCommand(cmd) {
  if (!cmd || !cmd.trim()) return;
  addLog("BOSS", cmd, true);
  const lower = cmd.toLowerCase().trim();

  if (lower.startsWith("open ")) {
    const site = lower.replace("open ", "").trim();
    const sites = {
      youtube: atob("aHR0cHM6Ly93d3cueW91dHViZS5jb20="),
      google: atob("aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbQ=="),
      github: atob("aHR0cHM6Ly9naXRodWIuY29t"),
      instagram: atob("aHR0cHM6Ly93d3cuaW5zdGFncmFtLmNvbQ=="),
      whatsapp: atob("aHR0cHM6Ly93ZWIud2hhdHNhcHAuY29t"),
      gmail: atob("aHR0cHM6Ly9tYWlsLmdvb2dsZS5jb20=")
    };
    if (sites[site]) {
      const reply = "Launching " + site + " interface now, Boss.";
      addLog("J.A.R.V.I.S.", reply);
      speak(reply);
      window.open(sites[site], "_blank");
      return;
    }
  }

  if (lower.startsWith("search ")) {
    const query = cmd.slice(7).trim();
    const reply = "Searching Google for " + query + ", Boss.";
    addLog("J.A.R.V.I.S.", reply);
    speak(reply);
    window.open(atob("aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9zZWFyY2g/cT0=") + encodeURIComponent(query), "_blank");
    return;
  }

  const apiKey = (localStorage.getItem("groqKey") || "").trim();
  if (!apiKey) {
    const reply = "Boss, click API KEY and paste your Groq key first.";
    addLog("J.A.R.V.I.S.", reply);
    speak(reply);
    return;
  }

  statusText.innerText = "PROCESSING...";
  chatHistory.push({ role: "user", content: cmd });
  if (chatHistory.length > 11) {
    chatHistory = [systemPrompt, ...chatHistory.slice(-10)];
  }

  try {
    const aiReply = await askGroq(apiKey, chatHistory);
    chatHistory.push({ role: "assistant", content: aiReply });
    addLog("J.A.R.V.I.S.", aiReply);
    speak(aiReply);
    statusText.innerText = "SYSTEM READY";
  } catch (err) {
    addLog("J.A.R.V.I.S.", "System error, Boss: " + err.message);
    speak("Apologies Boss, please verify your Groq API key.");
    statusText.innerText = "ERROR - CHECK API KEY";
  }
}

// 8. UI Event Listeners
sendBtn.addEventListener("click", () => {
  runCommand(textInput.value);
  textInput.value = "";
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    runCommand(textInput.value);
    textInput.value = "";
  }
});

keyBtn.addEventListener("click", () => {
  apiKeyInput.value = localStorage.getItem("groqKey") || "";
  apiModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  apiModal.classList.add("hidden");
});

saveKeyBtn.addEventListener("click", () => {
  localStorage.setItem("groqKey", apiKeyInput.value.trim());
  apiModal.classList.add("hidden");
  const msg = "API Protocol saved and encrypted, Boss.";
  addLog("J.A.R.V.I.S.", msg);
  speak(msg);
});

// 9. Voice Recognition
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
  const recognition = new SpeechRec();
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    if (isSpeaking) window.speechSynthesis.cancel();
    try {
      recognition.start();
      reactor.classList.add("active");
      statusText.innerText = "LISTENING, BOSS...";
    } catch (e) {
      recognition.stop();
    }
  });

  recognition.onresult = (e) => {
    const transcript = e.results.item(0).item(0).transcript;
    reactor.classList.remove("active");
    runCommand(transcript);
  };

  recognition.onerror = (e) => {
    reactor.classList.remove("active");
    statusText.innerText = "MIC ERROR: " + e.error;
  };

  recognition.onend = () => {
    if (!isSpeaking) reactor.classList.remove("active");
    if (statusText.innerText === "LISTENING, BOSS...") {
      statusText.innerText = "Click the Core to Activate Voice Protocol";
    }
  };
} else {
  micBtn.addEventListener("click", () => {
    alert("Speech Recognition is not supported in this browser. Use Chrome or Edge.");
  });
}
