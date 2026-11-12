const CATEGORY = {
  mondo: { label: "Mondo", icon: "🌍", description: "Attualità, geopolitica e società" },
  politica: { label: "Politica", icon: "🏛️", description: "Governi, istituzioni e decisioni pubbliche" },
  tecnologia: { label: "Tecnologia", icon: "🤖", description: "Innovazione, IA e futuro digitale" },
  scienza: { label: "Scienza", icon: "🔬", description: "Ricerca, fisica e nuove scoperte" },
  spazio: { label: "Spazio", icon: "🚀", description: "Astronomia e missioni spaziali" },
  economia: { label: "Economia", icon: "📈", description: "Mercati, lavoro e imprese" },
  salute: { label: "Salute", icon: "🧬", description: "Medicina, benessere e salute pubblica" },
  ambiente: { label: "Ambiente", icon: "🌱", description: "Clima, energia e sostenibilità" },
  storia: { label: "Storia", icon: "🏺", description: "Civiltà, eventi e personaggi" },
  psicologia: { label: "Psicologia", icon: "🧠", description: "Mente, comportamento e relazioni" },
  cultura: { label: "Cultura", icon: "🎭", description: "Libri, cinema, musica e idee" },
  natura: { label: "Natura", icon: "🦋", description: "Animali, biodiversità ed ecosistemi" },
  istruzione: { label: "Istruzione", icon: "📚", description: "Educazione, ricerca e apprendimento" },
  sport: { label: "Sport", icon: "⚽", description: "Competizioni, atleti e scienza dello sport" },
  arte: { label: "Arte", icon: "🎨", description: "Arti visive, design e architettura" },
  viaggi: { label: "Viaggi", icon: "🧭", description: "Luoghi, culture e geografia" },
  filosofia: { label: "Filosofia", icon: "💭", description: "Pensiero, etica e grandi domande" },
  anime: { label: "Anime", icon: "🎌", description: "Animazione giapponese, manga e cultura pop" }
};
const CATEGORY_ORDER = Object.keys(CATEGORY);
const FALLBACK_IMAGES = {
  mondo: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1500",
  tecnologia: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1500",
  scienza: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1500",
  economia: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1500",
  spazio: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1500",
  politica: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1500",
  salute: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1500",
  ambiente: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1500",
  storia: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1500",
  psicologia: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1500",
  cultura: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1500",
  natura: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1500",
  istruzione: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1500",
  sport: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1500",
  arte: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1500",
  viaggi: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1500",
  filosofia: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=1500",
};
const state = {
  items: [],
  page: "feed",
  hasMore: false,
  loadingMore: false,
  pageSize: 60,
  category: "all",
  saved: loadJson("wk_saved_v1", []),
  preferences: [...new Set([...loadJson("wk_preferences_v1", CATEGORY_ORDER), ...CATEGORY_ORDER])],
  lastUpdated: null,
  refreshing: false,
  audioItemId: null,
  videoObserver: null,
  translations: new Map(),
  translationPending: new Set(),
  originalIds: new Set(),
  translationObserver: null
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
  return item.image || FALLBACK_IMAGES[item.category] || null;
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
function updateTopicPickerLabel() {
  const label = $("#active-topic-label");
  if (label) label.textContent = state.category === "all" ? "Tutti gli argomenti" : categoryName(state.category);
}
function renderTopicPicker() {
  const target = $("#topic-picker-grid");
  if (!target) return;
  target.innerHTML = `<button class="topic-picker-option ${state.category === "all" ? "selected" : ""}" data-picker-category="all"><span>✦</span><b>Per te</b><small>Un mix dei tuoi interessi</small></button>` + CATEGORY_ORDER.map(key => {
    const c = CATEGORY[key];
    return `<button class="topic-picker-option ${state.category === key ? "selected" : ""}" data-picker-category="${key}"><span>${c.icon}</span><b>${c.label}</b><small>${c.description}</small></button>`;
  }).join("");
}

async function loadFeed(force = false) {
  if (state.refreshing) return;
  state.refreshing = true;
  $("#refresh-btn").disabled = true;
  $("#refresh-btn").textContent = "…";
  if (!state.items.length) $("#reel-feed").innerHTML = `<div class="loading-state"><div class="loader"></div><b>Sto preparando il tuo feed</b><span>Raccolgo le pubblicazioni dalle fonti collegate.</span></div>`;
  try {
    const response = await fetch(`/api/feed?category=all&limit=${state.pageSize}&offset=0${force ? "&refresh=1" : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Errore server ${response.status}`);
    const payload = await response.json();
    state.items = Array.isArray(payload.items) ? payload.items : [];
    state.hasMore = Boolean(payload.hasMore);
    state.lastUpdated = payload.lastUpdated;
    setConnection("ok", `${payload.workingSources}/${payload.sourceCount} fonti attive`);
    $("#source-status").textContent = `${payload.workingSources} fonti funzionanti su ${payload.sourceCount}. ${payload.errors?.length ? "Alcune fonti non hanno risposto: verranno riprovate al prossimo controllo." : "Nessun errore rilevato nell'ultimo controllo."} Archivio disponibile: ${payload.total ?? state.items.length} contenuti. ${payload.persistentArchive ? "Archivio permanente attivo." : "Archivio temporaneo: collega DATABASE_URL per conservarlo dopo i riavvii."}`;
    setUpdatedLabel(); renderAll();
  } catch (error) {
    setConnection("error", "Feed non raggiungibile");
    $("#source-status").textContent = "Il server del feed non risponde. Avvia il progetto con npm start e riprova.";
    if (!state.items.length) $("#reel-feed").innerHTML = `<div class="empty-state"><div class="eyebrow">COLLEGAMENTO NON DISPONIBILE</div><b>Il feed ha bisogno del suo motore.</b><span>Avvia il progetto tramite Node.js (npm install, poi npm start).</span></div>`;
    console.error("World Knowledge feed:", error);
  } finally {
    state.refreshing = false; $("#refresh-btn").disabled = false; $("#refresh-btn").textContent = "↻"; updateLoadMoreButton();
  }
}

async function loadMore() {
  if (state.loadingMore || !state.hasMore) return;
  state.loadingMore = true; updateLoadMoreButton();
  try {
    const offset = state.items.length;
    const response = await fetch(`/api/feed?category=all&limit=${state.pageSize}&offset=${offset}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Errore server ${response.status}`);
    const payload = await response.json();
    const known = new Set(state.items.map(item => item.id));
    state.items.push(...(payload.items || []).filter(item => !known.has(item.id)));
    state.hasMore = Boolean(payload.hasMore); renderAll();
  } catch (error) { console.error("Caricamento archivio:", error); }
  finally { state.loadingMore = false; updateLoadMoreButton(); }
}

function updateLoadMoreButton() {
  const button = $("#load-more-btn"); if (!button) return;
  button.hidden = !state.hasMore && !state.loadingMore;
  button.disabled = state.loadingMore;
  button.textContent = state.loadingMore ? "Caricamento…" : "Carica altri contenuti";
}

function renderCategoryChips() {
  const selected = state.category;
  $("#feed-categories").innerHTML = `<button class="chip ${selected === "all" ? "active" : ""}" data-category="all">Per te</button>` + CATEGORY_ORDER.map(key =>
    `<button class="chip ${selected === key ? "active" : ""}" data-category="${key}">${CATEGORY[key].icon} ${CATEGORY[key].label}</button>`
  ).join("");
}
function translatedView(item) {
  const tr = state.translations.get(item.id);
  const original = state.originalIds.has(item.id);
  return {
    title: tr?.available && !original ? tr.title : item.title,
    description: tr?.available && !original ? tr.description : item.description,
    status: tr?.available ? (original ? "Originale" : "Tradotto in italiano") : (tr ? "Originale · traduzione non disponibile" : "Traduzione in italiano in preparazione"),
    canToggle: Boolean(tr?.available),
    original
  };
}
async function ensureTranslation(id) {
  if (state.translations.has(id) || state.translationPending.has(id)) return;
  state.translationPending.add(id);
  try {
    const response = await fetch(`/api/translate/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("HTTP " + response.status);
    state.translations.set(id, await response.json());
  } catch {
    state.translations.set(id, { available: false });
  } finally {
    state.translationPending.delete(id);
    updateTranslatedText(id);
  }
}
function updateTranslatedText(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return;
  const view = translatedView(item);
  const reel = [...document.querySelectorAll(".reel")].find(el => el.dataset.id === id);
  if (reel) {
    const title = reel.querySelector(".reel-copy h2");
    const desc = reel.querySelector(".reel-copy p");
    if (title) title.textContent = view.title;
    if (desc) desc.textContent = view.description || "Apri la fonte originale per i dettagli.";
    const status = reel.querySelector(".translation-status");
    if (status) status.textContent = view.status;
    const toggle = reel.querySelector("[data-action='toggle-language']");
    if (toggle) { toggle.hidden = !view.canToggle; toggle.textContent = view.original ? "Mostra italiano" : "Leggi originale"; }
  }
  const dialog = $("#article-dialog");
  if (dialog?.open && dialog.dataset.itemId === id) {
    $("#dialog-title").textContent = view.title;
    $("#dialog-description").textContent = view.description || "Apri la fonte originale per i dettagli.";
    const toggle = $("#dialog-toggle-language");
    if (toggle) { toggle.hidden = !view.canToggle; toggle.textContent = view.original ? "Mostra italiano" : "Leggi originale"; }
    const status = $("#dialog-language-status");
    if (status) status.textContent = view.status;
  }
}
function observeTranslations() {
  if (state.translationObserver) state.translationObserver.disconnect();
  state.translationObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) ensureTranslation(entry.target.dataset.id);
  }, { root: $("#reel-feed"), threshold: 0.45 });
  document.querySelectorAll(".reel").forEach(el => state.translationObserver.observe(el));
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
    const view = translatedView(item);
    const title = escapeHtml(view.title);
    const description = escapeHtml(view.description || "Apri la fonte originale per leggere il contenuto e il contesto completo.");
    const source = escapeHtml(item.source || "Fonte originale");
    const image = escapeHtml(imageFor(item));
    const videoUrl = item.videoUrl ? escapeHtml(item.videoUrl) : "";
    const youtubeId = item.youtubeId ? escapeHtml(item.youtubeId) : "";
    const media = youtubeId
      ? `<div class="reel-image video-poster" style="background-image:url('${image}')"></div><iframe class="reel-youtube" data-youtube-id="${youtubeId}" title="Video: ${title}" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe><div class="media-kind">VIDEO · PARTENZA SILENZIOSA</div>`
      : videoUrl
        ? `<video class="reel-video" data-autoplay-video muted loop playsinline controls preload="metadata" poster="${image}" aria-label="Video: ${title}"><source src="${videoUrl}"></video><div class="media-kind">VIDEO · AUDIO DISATTIVATO</div>`
        : `<div class="reel-image" style="background-image:url('${image}')"></div>`;
    return `<article class="reel" data-id="${escapeHtml(item.id)}">
      ${media}
      <div class="reel-topline"><span class="reel-badge">${category.icon} ${escapeHtml(category.label)}</span><span class="reel-count">${index + 1} / ${items.length}</span></div>
      <div class="reel-copy">
        <div class="source-line">${source.toUpperCase()} · ${escapeHtml(relativeDate(item.publishedAt))}</div><div class="language-line"><span class="translation-status">${escapeHtml(view.status)}</span><button class="language-toggle" data-action="toggle-language" data-id="${escapeHtml(item.id)}" ${view.canToggle ? "" : "hidden"}>${view.original ? "Mostra italiano" : "Leggi originale"}</button></div>
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
  observeTranslations();
}
function storyCard(item) {
  const category = CATEGORY[item.category] || CATEGORY.mondo;
  const view = translatedView(item);
  const title = escapeHtml(view.title);
  const desc = escapeHtml(view.description || "Apri la fonte per leggere tutti i dettagli.");
  const image = imageFor(item);
  const imageMarkup = image
    ? `<div class="story-card-image" style="background-image:url('${escapeHtml(image)}')"></div>`
    : `<div class="story-card-image story-card-placeholder"><span>${category.icon}</span><small>Immagine non fornita dalla fonte</small></div>`;
  return `<article class="story-card">
    ${imageMarkup}
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
function renderAnime() {
  const items = state.items
    .filter(item => item.category === "anime")
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 40);
  $("#anime-list").innerHTML = items.length ? items.map(storyCard).join("") :
    `<div class="empty-state"><b>Le prossime novità anime arriveranno qui.</b><span>Il feed dedicato raccoglie notizie da Anime News Network. Se la fonte non risponde, riprova più tardi.</span></div>`;
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
  renderCategoryChips();
  renderReels();
  renderLatest();
  renderExplore();
  renderAnime();
  renderLearn();
  renderSaved();
  renderSettings();
  renderRightbar();
}

const PAGE_TEXT = {
  feed: ["Scopri qualcosa di nuovo.", "Notizie e idee selezionate per alimentare la tua curiosità."],
  latest: ["Il mondo, in aggiornamento.", "Le pubblicazioni più recenti dalle fonti collegate."],
  anime: ["Entra nel mondo degli anime.", "Novità, manga, film, serie e cultura pop giapponese."],
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
    updateTopicPickerLabel();
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
  const view = translatedView(item);
  $("#article-dialog").dataset.itemId = id;
  $("#dialog-title").textContent = view.title;
  $("#dialog-meta").textContent = `${item.source} · ${dateLabel(item.publishedAt)}`;
  $("#dialog-description").textContent = view.description || "La fonte non ha fornito un riepilogo. Apri l'articolo originale per consultare il contenuto.";
  $("#dialog-language-status").textContent = view.status;
  $("#dialog-toggle-language").hidden = !view.canToggle;
  $("#dialog-toggle-language").textContent = view.original ? "Mostra italiano" : "Leggi originale";
  ensureTranslation(id);
  $("#dialog-source").href = item.url;
  const translationText = `${item.title}. ${item.description || ""}`.trim();
  $("#dialog-translate").href = `https://translate.google.com/?sl=auto&tl=it&text=${encodeURIComponent(translationText)}&op=translate`;
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
async function speakItem(id) {
  const item = state.items.find(entry => entry.id === id);
  if (!item || !("speechSynthesis" in window)) {
    alert("La lettura vocale non è supportata da questo browser.");
    return;
  }
  window.speechSynthesis.cancel();
  await ensureTranslation(id);
  const view = translatedView(item);
  const text = `${view.title}. ${view.description || ""}`.trim();
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
  const embeds = $$("#reel-feed iframe[data-youtube-id]");
  if (!videos.length && !embeds.length) return;
  if (!("IntersectionObserver" in window)) {
    videos.forEach(video => { video.muted = true; video.play().catch(() => {}); });
    embeds.forEach(frame => { frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(frame.dataset.youtubeId)}?autoplay=1&mute=1&controls=1&playsinline=1&rel=0`; });
    return;
  }
  state.videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const media = entry.target;
      const active = entry.isIntersecting && entry.intersectionRatio >= 0.6;
      if (media.tagName === "IFRAME") {
        if (active && !media.src) media.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(media.dataset.youtubeId)}?autoplay=1&mute=1&controls=1&playsinline=1&rel=0`;
        if (!active && media.src) media.src = "about:blank";
      } else if (active) {
        media.muted = true;
        media.play().catch(() => {});
      } else {
        media.pause();
      }
    });
  }, { root: $("#reel-feed"), threshold: [0, 0.6, 1] });
  [...videos, ...embeds].forEach(media => state.videoObserver.observe(media));
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
    if (action.dataset.action === "toggle-language") {
      if (state.originalIds.has(id)) state.originalIds.delete(id); else state.originalIds.add(id);
      updateTranslatedText(id);
      if (state.page === "latest") renderLatest();
    }
    if (action.dataset.action === "next") {
      const feed = $("#reel-feed");
      feed.scrollBy({ top: feed.clientHeight, behavior: "smooth" });
    }
  }

  const pickerChoice = event.target.closest("[data-picker-category]");
  if (pickerChoice) {
    state.category = pickerChoice.dataset.pickerCategory;
    $$("#feed-categories .chip").forEach(chip => chip.classList.toggle("active", chip.dataset.category === state.category));
    updateTopicPickerLabel();
    renderTopicPicker();
    renderReels();
    $("#reel-feed").scrollTop = 0;
    $("#topic-dialog").close();
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
  updateTopicPickerLabel();
  renderTopicPicker();
  renderReels();
  $("#reel-feed").scrollTop = 0;
});
$("#refresh-btn").addEventListener("click", () => loadFeed(true));
$("#load-more-btn")?.addEventListener("click", loadMore);
$("#open-topic-picker").addEventListener("click", () => {
  renderTopicPicker();
  const dialog = $("#topic-dialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
});
$("#close-topic-picker").addEventListener("click", () => $("#topic-dialog").close());
$("#dialog-toggle-language").addEventListener("click", () => {
  const id = $("#article-dialog").dataset.itemId;
  if (state.originalIds.has(id)) state.originalIds.delete(id); else state.originalIds.add(id);
  updateTranslatedText(id);
});
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
updateTopicPickerLabel();
renderTopicPicker();
loadFeed();
setInterval(() => loadFeed(false), 8 * 60 * 1000);
