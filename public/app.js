const CATEGORY = {
  mondo: { label: "Mondo", icon: "🌍", description: "Attualità, geopolitica e società" },
  tecnologia: { label: "Tecnologia", icon: "🤖", description: "Innovazione, IA e futuro digitale" },
  scienza: { label: "Scienza", icon: "🔬", description: "Ricerca, salute e nuove scoperte" },
  economia: { label: "Economia", icon: "📈", description: "Mercati, lavoro e imprese" },
  spazio: { label: "Spazio", icon: "🚀", description: "Astronomia e missioni spaziali" }
};
const CATEGORY_ORDER = Object.keys(CATEGORY);
const FALLBACK_IMAGES = {
  mondo: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1500",
  tecnologia: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1500",
  scienza: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1500",
  economia: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1500",
  spazio: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1500"
};
const state = {
  items: [],
  page: "feed",
  category: "all",
  saved: loadJson("wk_saved_v1", []),
  preferences: loadJson("wk_preferences_v1", CATEGORY_ORDER),
  lastUpdated: null,
  refreshing: false,
  audioItemId: null,
  videoObserver: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function dateLabel(value) {
  if (!value) return "Data non indicata";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non indicata";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}
function relativeDate(value) {
  if (!value) return "Pubblicazione recente";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 2) return "Adesso";
  if (minutes < 60) return `${minutes} min fa`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h fa`;
  return `${Math.floor(minutes / 1440)} giorni fa`;
}
function imageFor(item) {
  return item.image || FALLBACK_IMAGES[item.category] || FALLBACK_IMAGES.mondo;
}
function visibleItems() {
  let items = [...state.items];
  if (state.category !== "all") items = items.filter(item => item.category === state.category);
  else if (state.page === "feed") items = items.filter(item => state.preferences.includes(item.category));
  if (state.page === "saved") items = items.filter(item => state.saved.includes(item.id));
  return items;
}
function setConnection(type, text) {
  const el = $("#connection");
  el.className = `connection ${type}`;
  el.querySelector("span").textContent = text;
}
function setUpdatedLabel() {
  $("#feed-updated").textContent = state.lastUpdated
    ? `Ultimo controllo: ${dateLabel(state.lastUpdated)}`
    : "In attesa del primo aggiornamento…";
}
function categoryName(key) {
  return CATEGORY[key]?.label || "Mondo";
}

async function loadFeed(force = false) {
  if (state.refreshing) return;
  state.refreshing = true;
  $("#refresh-btn").disabled = true;
  $("#refresh-btn").textContent = "…";
  if (!state.items.length) {
    $("#reel-feed").innerHTML = `<div class="loading-state"><div class="loader"></div><b>Sto preparando il tuo feed</b><span>Raccolgo le pubblicazioni dalle fonti collegate.</span></div>`;
  }
  try {
    const response = await fetch(`/api/feed?category=all&limit=100${force ? "&refresh=1" : ""}`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Errore server ${response.status}`);
    const payload = await response.json();
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.lastUpdated = payload.lastUpdated;
    setConnection("ok", `${payload.workingSources}/${payload.sourceCount} fonti attive`);
    $("#source-status").textContent = `${payload.workingSources} fonti funzionanti su ${payload.sourceCount}. ${payload.errors?.length ? "Alcune fonti non hanno risposto: verranno riprovate al prossimo controllo." : "Nessun errore rilevato nell'ultimo controllo."}`;
    setUpdatedLabel();
    renderAll();
  } catch (error) {
    setConnection("error", "Feed non raggiungibile");
    $("#source-status").textContent = "Il server del feed non risponde. Avvia il progetto con npm start e riprova.";
    if (!state.items.length) {
      $("#reel-feed").innerHTML = `<div class="empty-state"><div class="eyebrow">COLLEGAMENTO NON DISPONIBILE</div><b>Il feed ha bisogno del suo motore.</b><span>Apri il progetto tramite il server Node.js (npm install, poi npm start). In questa modalità i contenuti vengono recuperati dalle fonti RSS e aggiornati automaticamente.</span></div>`;
    }
    console.error("World Knowledge feed:", error);
  } finally {
    state.refreshing = false;
    $("#refresh-btn").disabled = false;
    $("#refresh-btn").textContent = "↻";
  }
}

function renderReels() {
  let items = visibleItems();
  const feed = $("#reel-feed");
  if (!items.length) {
    const message = state.page === "saved"
      ? "Non hai ancora salvato contenuti. Usa il cuore su una scheda per ritrovarla qui."
      : "Non ci sono contenuti per questo filtro nell'ultimo aggiornamento. Prova un altro argomento o aggiorna il feed.";
    feed.innerHTML = `<div class="empty-state"><div class="eyebrow">WORLD KNOWLEDGE</div><b>Ancora nessuna scheda da mostrare.</b><span>${escapeHtml(message)}</span></div>`;
    return;
  }
  feed.innerHTML = items.map((item, index) => {
    const category = CATEGORY[item.category] || CATEGORY.mondo;
    const saved = state.saved.includes(item.id);
    const title = escapeHtml(item.title);
    const description = escapeHtml(item.description || "Apri la fonte originale per leggere il contenuto e il contesto completo.");
    const source = escapeHtml(item.source || "Fonte originale");
    const image = escapeHtml(imageFor(item));
    const videoUrl = item.videoUrl ? escapeHtml(item.videoUrl) : "";
    const media = videoUrl
      ? `<video class="reel-video" data-autoplay-video muted loop playsinline controls preload="metadata" poster="${image}" aria-label="Video: ${title}"><source src="${videoUrl}"></video><div class="media-kind">VIDEO · AUDIO DISATTIVATO</div>`
      : `<div class="reel-image" style="background-image:url('${image}')"></div>`;
    return `<article class="reel" data-id="${escapeHtml(item.id)}">
      ${media}
      <div class="reel-topline"><span class="reel-badge">${category.icon} ${escapeHtml(category.label)}</span><span class="reel-count">${index + 1} / ${items.length}</span></div>
      <div class="reel-copy">
        <div class="source-line">${source.toUpperCase()} · ${escapeHtml(relativeDate(item.publishedAt))}</div>
        <h2>${title}</h2><p>${description}</p>
        <div class="reel-meta">ANTEPRIMA DALLA FONTE · ${escapeHtml(dateLabel(item.publishedAt))}</div>
        <div class="reel-actions"><button class="primary-button" data-action="details" data-id="${escapeHtml(item.id)}">Approfondisci ↗</button><button class="secondary-button" data-action="listen" data-id="${escapeHtml(item.id)}">▶ Ascolta</button><button class="secondary-button" data-action="next">Continua a scoprire ↓</button></div>
      </div>
      <div class="reel-rail">
        <button class="rail-button" data-action="save" data-id="${escapeHtml(item.id)}" aria-label="Salva">${saved ? "♥" : "♡"}</button><span class="rail-caption">${saved ? "Salvato" : "Salva"}</span>
        <button class="rail-button" data-action="details" data-id="${escapeHtml(item.id)}" aria-label="Dettagli">＋</button><span class="rail-caption">Dettagli</span>
        <button class="rail-button" data-action="share" data-id="${escapeHtml(item.id)}" aria-label="Condividi">↗</button><span class="rail-caption">Condividi</span>
      </div></article>`;
  }).join("");
  observeFeedVideos();
}
function storyCard(item) {
  const category = CATEGORY[item.category] || CATEGORY.mondo;
  const title = escapeHtml(item.title);
  const desc = escapeHtml(item.description || "Apri la fonte per leggere tutti i dettagli.");
  const image = escapeHtml(imageFor(item));
  return `<article class="story-card">
    <div class="story-card-image" style="background-image:url('${image}')"></div>
    <div class="story-card-body"><div class="category">${category.icon} ${escapeHtml(category.label)} · ${escapeHtml(item.source)}</div>
      <h3>${title}</h3><p>${desc}</p>
      <div class="story-card-foot"><small>${escapeHtml(relativeDate(item.publishedAt))}</small><span><button class="small-link" data-action="listen" data-id="${escapeHtml(item.id)}">Ascolta · </button><button class="small-link" data-action="details" data-id="${escapeHtml(item.id)}">Apri →</button></span></div>
    </div></article>`;
}
function renderLatest() {
  const items = [...state.items].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)).slice(0, 60);
  $("#latest-list").innerHTML = items.length ? items.map(storyCard).join("") :
    `<div class="empty-state"><b>Nessuna notizia disponibile</b><span>Il server mostrerà qui i contenuti appena raccolti dalle fonti RSS.</span></div>`;
}
function renderExplore() {
  $("#topic-grid").innerHTML = CATEGORY_ORDER.map(key => {
    const category = CATEGORY[key];
    const count = state.items.filter(item => item.category === key).length;
    return `<button class="topic-tile" data-topic="${key}"><span>${category.icon}</span><b>${category.label}</b><small>${category.description} · ${count} contenuti</small></button>`;
  }).join("");
}
function renderLearn() {
  const items = state.items.filter(item => ["scienza", "spazio", "tecnologia"].includes(item.category)).slice(0, 4);
  $("#learn-list").innerHTML = items.length ? items.map(storyCard).join("") :
    `<div class="empty-state"><b>Nuovi spunti in arrivo</b><span>Quando le fonti pubblicheranno nuovi contenuti scientifici e tecnologici, li troverai anche qui.</span></div>`;
}
function renderSaved() {
  const items = state.items.filter(item => state.saved.includes(item.id));
  $("#saved-list").innerHTML = items.length ? items.map(storyCard).join("") :
    `<div class="empty-state"><b>La tua libreria è ancora vuota.</b><span>Nel feed principale tocca il cuore di una scheda per conservarla.</span></div>`;
}
function renderSettings() {
  $("#settings-grid").innerHTML = CATEGORY_ORDER.map(key => {
    const category = CATEGORY[key];
    const checked = state.preferences.includes(key);
    return `<label class="setting-option"><input type="checkbox" value="${key}" ${checked ? "checked" : ""}> <span>${category.icon} ${category.label}</span></label>`;
  }).join("");
  $("#selected-count").textContent = `${state.preferences.length} selezionati`;
}
function renderRightbar() {
  $("#interest-summary").innerHTML = state.preferences.map(key =>
    `<span class="interest-pill">${CATEGORY[key].icon} ${CATEGORY[key].label}</span>`
  ).join("") || `<span class="side-empty">Nessun interesse selezionato</span>`;
  const latest = [...state.items].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)).slice(0, 4);
  $("#side-news").innerHTML = latest.length ? latest.map(item => `
    <div class="side-story"><div class="side-thumb" style="background-image:url('${escapeHtml(imageFor(item))}')"></div>
    <div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.source)} · ${escapeHtml(relativeDate(item.publishedAt))}</small></div></div>`).join("")
    : `<div class="side-empty">Le nuove pubblicazioni appariranno qui.</div>`;
}
function renderAll() {
  renderReels();
  renderLatest();
  renderExplore();
  renderLearn();
  renderSaved();
  renderSettings();
  renderRightbar();
}

const PAGE_TEXT = {
  feed: ["Scopri qualcosa di nuovo.", "Notizie e idee selezionate per alimentare la tua curiosità."],
  latest: ["Il mondo, in aggiornamento.", "Le pubblicazioni più recenti dalle fonti collegate."],
  explore: ["Scegli dove andare.", "Ogni argomento apre una prospettiva diversa sul mondo."],
  learn: ["Impara qualcosa ogni giorno.", "Una conoscenza alla volta, con esempi e piccole verifiche."],
  saved: ["La tua raccolta personale.", "Le cose interessanti che vuoi ritrovare."],
  settings: ["Costruisci il tuo feed.", "Decidi quali argomenti vuoi incontrare più spesso."]
};
function openPage(page) {
  if (!PAGE_TEXT[page]) return;
  state.page = page;
  $$(".page").forEach(section => section.classList.toggle("active", section.id === `page-${page}`));
  $$("[data-page]").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  $("#page-title").textContent = PAGE_TEXT[page][0];
  $("#page-subtitle").textContent = PAGE_TEXT[page][1];
  if (page === "feed") {
    $("#feed-categories").hidden = false;
    state.category = "all";
    $$("#feed-categories .chip").forEach(chip => chip.classList.toggle("active", chip.dataset.category === "all"));
    renderReels();
  } else {
    $("#feed-categories").hidden = true;
  }
  if (page === "saved") renderSaved();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showDetails(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  const category = CATEGORY[item.category] || CATEGORY.mondo;
  $("#dialog-category").textContent = `${category.icon} ${category.label.toUpperCase()}`;
  $("#dialog-title").textContent = item.title;
  $("#dialog-meta").textContent = `${item.source} · ${dateLabel(item.publishedAt)}`;
  $("#dialog-description").textContent = item.description || "La fonte non ha fornito un riepilogo. Apri l'articolo originale per consultare il contenuto.";
  $("#dialog-source").href = item.url;
  $("#dialog-listen").dataset.id = item.id;
  const dialog = $("#article-dialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else window.open(item.url, "_blank", "noopener");
}
function voiceForCategory(category) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const italian = voices.filter(voice => /^it(-|_)?/i.test(voice.lang));
  const pool = italian.length ? italian : voices;
  if (!pool.length) return null;
  // Associa le aree a posizioni diverse nell'elenco delle voci installate.
  // La varietà effettiva dipende dal dispositivo e dal browser dell'utente.
  const voiceSlot = { mondo: 0, tecnologia: 1, scienza: 2, economia: 1, spazio: 0 }[category] ?? 0;
  return pool[voiceSlot % pool.length];
}
function speakItem(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item || !("speechSynthesis" in window)) {
    alert("La lettura vocale non è supportata da questo browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const text = `${item.title}. ${item.description || ""}`.trim();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = 0.96;
  const voice = voiceForCategory(item.category);
  if (voice) utterance.voice = voice;
  state.audioItemId = id;
  utterance.onend = () => { state.audioItemId = null; };
  utterance.onerror = () => { state.audioItemId = null; };
  window.speechSynthesis.speak(utterance);
}
function stopAudio() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  state.audioItemId = null;
}
function observeFeedVideos() {
  if (state.videoObserver) state.videoObserver.disconnect();
  const videos = $$("#reel-feed video[data-autoplay-video]");
  if (!videos.length) return;
  if (!("IntersectionObserver" in window)) {
    videos.forEach(video => { video.muted = true; video.play().catch(() => {}); });
    return;
  }
  state.videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        video.muted = true;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { root: $("#reel-feed"), threshold: [0, 0.65, 1] });
  videos.forEach(video => state.videoObserver.observe(video));
}
function toggleSaved(id) {
  state.saved = state.saved.includes(id)
    ? state.saved.filter(value => value !== id)
    : [...state.saved, id];
  saveJson("wk_saved_v1", state.saved);
  renderAll();
}
async function shareItem(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  try {
    if (navigator.share) await navigator.share({ title: item.title, url: item.url });
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(item.url);
      alert("Link copiato.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") console.warn("Condivisione non riuscita", error);
  }
}

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) openPage(pageButton.dataset.page);

  const openButton = event.target.closest("[data-open-page]");
  if (openButton) openPage(openButton.dataset.openPage);

  const action = event.target.closest("[data-action]");
  if (action) {
    const id = action.dataset.id;
    if (action.dataset.action === "details") showDetails(id);
    if (action.dataset.action === "save") toggleSaved(id);
    if (action.dataset.action === "share") shareItem(id);
    if (action.dataset.action === "listen") speakItem(id);
    if (action.dataset.action === "next") {
      const feed = $("#reel-feed");
      feed.scrollBy({ top: feed.clientHeight, behavior: "smooth" });
    }
  }

  const topic = event.target.closest("[data-topic]");
  if (topic) {
    openPage("feed");
    state.category = topic.dataset.topic;
    $$("#feed-categories .chip").forEach(chip => chip.classList.toggle("active", chip.dataset.category === state.category));
    renderReels();
  }
});

$("#feed-categories").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-category]");
  if (!chip) return;
  state.category = chip.dataset.category;
  $$("#feed-categories .chip").forEach(button => button.classList.toggle("active", button === chip));
  renderReels();
  $("#reel-feed").scrollTop = 0;
});
$("#refresh-btn").addEventListener("click", () => loadFeed(true));
$("#dialog-listen").addEventListener("click", () => speakItem($("#dialog-listen").dataset.id));
$("#dialog-stop-audio").addEventListener("click", stopAudio);
$("#settings-grid").addEventListener("change", () => {
  const count = $$("#settings-grid input:checked").length;
  $("#selected-count").textContent = `${count} selezionati`;
});
$("#save-preferences").addEventListener("click", () => {
  state.preferences = $$("#settings-grid input:checked").map(input => input.value);
  saveJson("wk_preferences_v1", state.preferences);
  renderAll();
  openPage("feed");
});

$$("[data-answer]").forEach(button => button.addEventListener("click", () => {
  const correct = button.dataset.answer === "correct";
  $("#quiz-result").textContent = correct
    ? "Esatto. Il costo opportunità è la migliore alternativa a cui rinunci."
    : "Non proprio. Pensa all'opzione migliore che non hai scelto.";
}));

let installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("#install-btn").hidden = false;
});
$("#install-btn").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("#install-btn").hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(error => console.warn("Service worker:", error));
  });
}
loadFeed();
setInterval(() => loadFeed(false), 8 * 60 * 1000);
