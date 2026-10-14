import '../chunks/modulepreload-polyfill-B54axMy2.js';

const PROVIDER_MODELS = {
  local: ["local-rules-v1"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
  gemini: ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
};
const providerSelect = document.getElementById("provider");
const apiKeyInput = document.getElementById("apiKey");
const modelSelect = document.getElementById("modelName");
const maxTokensInput = document.getElementById("maxTokens");
const temperatureInput = document.getElementById("temperature");
const tempValueSpan = document.getElementById("tempValue");
const toggleApiKeyBtn = document.getElementById("toggleApiKey");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const statusMessage = document.getElementById("statusMessage");
const apiKeyGroup = apiKeyInput.closest(".form-group");
function updateModelList(provider, selectedModel) {
  const models = PROVIDER_MODELS[provider] || [];
  modelSelect.innerHTML = models.map((model) => `<option value="${model}" ${model === selectedModel ? "selected" : ""}>${model}</option>`).join("");
}
function toggleApiKeyVisibility(provider) {
  if (apiKeyGroup) {
    if (provider === "local") {
      apiKeyGroup.style.display = "none";
    } else {
      apiKeyGroup.style.display = "";
    }
  }
}
async function loadSettings() {
  const result = await chrome.storage.local.get("settings");
  const settings = result.settings || {
    apiKey: "",
    provider: "local",
    modelName: "local-rules-v1",
    maxTokens: 4096,
    temperature: 0.1
  };
  if (settings.provider === "gemini" && (settings.modelName === "gemini-2.0-flash" || !settings.modelName)) {
    settings.modelName = "gemini-3.8-flash";
    await chrome.storage.local.set({ settings });
  }
  providerSelect.value = settings.provider;
  apiKeyInput.value = settings.apiKey;
  maxTokensInput.value = String(settings.maxTokens);
  temperatureInput.value = String(settings.temperature);
  tempValueSpan.textContent = String(settings.temperature);
  updateModelList(settings.provider, settings.modelName);
  toggleApiKeyVisibility(settings.provider);
}
async function saveSettings() {
  const provider = providerSelect.value;
  const settings = {
    apiKey: apiKeyInput.value.trim(),
    provider,
    modelName: modelSelect.value,
    maxTokens: parseInt(maxTokensInput.value, 10) || 4096,
    temperature: parseFloat(temperatureInput.value) || 0.1
  };
  if (provider !== "local" && !settings.apiKey) {
    showStatus("Lütfen API anahtarınızı girin veya Yerel Analiz Motoru seçin.", "error");
    return;
  }
  await chrome.storage.local.set({ settings });
  showStatus("Ayarlar başarıyla kaydedildi! ✓", "success");
}
async function clearAllData() {
  if (!confirm("Tüm ayarlar, raporlar ve geçmiş silinecektir. Devam etmek istiyor musunuz?")) {
    return;
  }
  await chrome.storage.local.clear();
  apiKeyInput.value = "";
  providerSelect.value = "local";
  updateModelList("local");
  toggleApiKeyVisibility("local");
  maxTokensInput.value = "4096";
  temperatureInput.value = "0.1";
  tempValueSpan.textContent = "0.1";
  showStatus("Tüm veriler temizlendi.", "success");
}
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove("hidden");
  setTimeout(() => {
    statusMessage.classList.add("hidden");
  }, 3e3);
}
providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value;
  updateModelList(provider);
  toggleApiKeyVisibility(provider);
  const placeholders = {
    local: "",
    openai: "sk-...",
    anthropic: "sk-ant-...",
    gemini: "AIza..."
  };
  apiKeyInput.placeholder = placeholders[provider] || "";
});
temperatureInput.addEventListener("input", () => {
  tempValueSpan.textContent = temperatureInput.value;
});
toggleApiKeyBtn.addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});
saveBtn.addEventListener("click", saveSettings);
clearBtn.addEventListener("click", clearAllData);
loadSettings();
//# sourceMappingURL=options.js.map
