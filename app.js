const channels = [
  {
    id: "espn-5",
    name: "ESPN 5",
    group: "ESPN",
    detail: "Fútbol y deportes en español",
    sourceType: "iframe",
    embedUrl: "https://la18hd.su/vivo/canales.php?stream=espn5"
  },
  { id: "espn-1", name: "ESPN 1", group: "ESPN", detail: "Programación deportiva", sourceType: "hls", streamUrl: "" },
  { id: "espn-2", name: "ESPN 2", group: "ESPN", detail: "Eventos y fútbol en vivo", sourceType: "hls", streamUrl: "" },
  { id: "espn-premium", name: "ESPN Premium", group: "ESPN", detail: "Fútbol premium", sourceType: "hls", streamUrl: "" },
  { id: "fox-sports", name: "FOX Sports", group: "FOX", detail: "Deportes y competiciones", sourceType: "hls", streamUrl: "" },
  { id: "fox-sports-2", name: "FOX Sports 2", group: "FOX", detail: "Eventos deportivos", sourceType: "hls", streamUrl: "" },
  { id: "tudn", name: "TUDN", group: "Otros", detail: "Fútbol en español", sourceType: "hls", streamUrl: "" },
  { id: "dazn", name: "DAZN", group: "Otros", detail: "Deportes y fútbol", sourceType: "hls", streamUrl: "" }
];

const grid = document.getElementById("channelGrid");
const template = document.getElementById("channelCardTemplate");
const searchInput = document.getElementById("channelSearch");
const count = document.getElementById("channelCount");
const emptyState = document.getElementById("emptyState");
const filters = document.getElementById("filters");
const refreshButton = document.getElementById("refreshButton");

const overlay = document.getElementById("playerOverlay");
const playerTitle = document.getElementById("playerTitle");
const playerMeta = document.getElementById("playerMeta");
const video = document.getElementById("videoPlayer");
const embedPlayer = document.getElementById("embedPlayer");
const placeholder = document.getElementById("videoPlaceholder");
const loading = document.getElementById("playerLoading");
const playToggle = document.getElementById("playToggle");
const muteToggle = document.getElementById("muteToggle");
const fullscreenToggle = document.getElementById("fullscreenToggle");
const playerStatus = document.getElementById("playerStatus");
const customControls = document.getElementById("customControls");

let activeFilter = "Todos";
let hlsInstance = null;
let currentChannel = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let stallTimer = null;

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getVisibleChannels() {
  const query = normalize(searchInput.value.trim());

  return channels.filter((channel) => {
    const matchesFilter = activeFilter === "Todos" || channel.group === activeFilter;
    const matchesSearch =
      !query ||
      normalize(channel.name).includes(query) ||
      normalize(channel.detail).includes(query);

    return matchesFilter && matchesSearch;
  });
}

function renderChannels() {
  grid.innerHTML = "";
  const visibleChannels = getVisibleChannels();

  count.textContent = visibleChannels.length;
  emptyState.hidden = visibleChannels.length !== 0;

  for (const channel of visibleChannels) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".channel-card");
    const name = fragment.querySelector(".channel-name");
    const subtitle = fragment.querySelector(".channel-subtitle");
    const button = fragment.querySelector(".play-button");

    card.dataset.channelId = channel.id;
    name.textContent = channel.name;
    subtitle.textContent = channel.detail;
    button.addEventListener("click", () => openPlayer(channel));

    grid.appendChild(fragment);
  }

  if (window.lucide) lucide.createIcons();
}

function setStatus(text, mode = "idle") {
  playerStatus.textContent = text;
  playerStatus.dataset.mode = mode;
}

function setLoading(value) {
  loading.hidden = !value;
}

function resetPlaceholder() {
  placeholder.querySelector("h3").textContent = "Fuente directa pendiente";
  placeholder.querySelector("p").textContent =
    "Este reproductor usa HLS/DASH directo. Añade una fuente autorizada para comenzar.";
}

function clearTimers() {
  clearTimeout(reconnectTimer);
  clearTimeout(stallTimer);
  reconnectTimer = null;
  stallTimer = null;
}

function destroyPlayback() {
  clearTimers();

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.hidden = true;

  embedPlayer.src = "about:blank";
  embedPlayer.hidden = true;

  customControls.hidden = false;
  placeholder.hidden = false;
  setLoading(false);
  reconnectAttempts = 0;
}

function scheduleStallWatch() {
  clearTimeout(stallTimer);

  stallTimer = setTimeout(() => {
    if (!video.paused && video.readyState < 3 && currentChannel?.streamUrl) {
      recoverPlayback("Reconectando…");
    }
  }, 7000);
}

function recoverPlayback(message = "Recuperando señal…") {
  if (!currentChannel?.streamUrl) return;

  setStatus(message, "warn");
  setLoading(true);

  if (hlsInstance) {
    try {
      hlsInstance.startLoad();
      hlsInstance.recoverMediaError();
    } catch {
      restartStream();
    }
  } else {
    restartStream();
  }
}

function restartStream() {
  clearTimeout(reconnectTimer);

  const delay = Math.min(1200 * Math.max(reconnectAttempts, 1), 6000);
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(() => {
    if (!currentChannel) return;
    startPlayback(currentChannel, true);
  }, delay);
}

function attachNativeSource(url) {
  video.src = url;
  video.addEventListener(
    "loadedmetadata",
    () => video.play().catch(() => {}),
    { once: true }
  );
}

function attachHlsSource(url) {
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    attachNativeSource(url);
    return;
  }

  if (!window.Hls || !Hls.isSupported()) {
    showPlaybackError("Este navegador no admite HLS.");
    return;
  }

  hlsInstance = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    maxBufferLength: 20,
    maxMaxBufferLength: 45,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 8,
    manifestLoadingTimeOut: 10000,
    levelLoadingTimeOut: 10000,
    fragLoadingTimeOut: 15000,
    startFragPrefetch: true
  });

  hlsInstance.loadSource(url);
  hlsInstance.attachMedia(video);

  hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
    reconnectAttempts = 0;
    setLoading(false);
    setStatus("EN DIRECTO", "live");
    video.play().catch(() => {});
  });

  hlsInstance.on(Hls.Events.ERROR, (_, data) => {
    if (!data.fatal) return;

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      restartStream();
      return;
    }

    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      try {
        hlsInstance.recoverMediaError();
      } catch {
        restartStream();
      }
      return;
    }

    showPlaybackError("La señal dejó de responder.");
  });
}

function startPlayback(channel, isRetry = false) {
  if (!isRetry) destroyPlayback();

  currentChannel = channel;
  resetPlaceholder();
  playerTitle.textContent = channel.name;
  playerMeta.textContent = channel.detail;

  if (channel.sourceType === "iframe" && channel.embedUrl) {
    placeholder.hidden = true;
    video.hidden = true;
    embedPlayer.hidden = false;
    customControls.hidden = true;
    setLoading(false);
    setStatus("EMBED", "live");
    embedPlayer.src = channel.embedUrl;
    return;
  }

  if (!channel.streamUrl) {
    placeholder.hidden = false;
    video.hidden = true;
    embedPlayer.hidden = true;
    setStatus("SIN FUENTE", "idle");
    setLoading(false);
    if (window.lucide) lucide.createIcons();
    return;
  }

  placeholder.hidden = true;
  embedPlayer.hidden = true;
  customControls.hidden = false;
  video.hidden = false;
  setLoading(true);
  setStatus(isRetry ? "RECONECTANDO" : "CARGANDO", "warn");

  const url = channel.streamUrl.trim();
  const isHls = /\.m3u8($|\?)/i.test(url);

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  if (isHls) attachHlsSource(url);
  else attachNativeSource(url);
}

function openPlayer(channel) {
  currentChannel = channel;
  overlay.hidden = false;
  document.body.classList.add("player-open");
  startPlayback(channel);
}

function showPlaybackError(message) {
  destroyPlayback();
  placeholder.hidden = false;
  placeholder.querySelector("h3").textContent = "No se pudo reproducir";
  placeholder.querySelector("p").textContent = message;
  setStatus("SIN SEÑAL", "error");
  if (window.lucide) lucide.createIcons();
}

function closePlayer() {
  destroyPlayback();
  currentChannel = null;
  overlay.hidden = true;
  document.body.classList.remove("player-open");
  resetPlaceholder();
}

video.addEventListener("playing", () => {
  setLoading(false);
  setStatus("EN DIRECTO", "live");
  playToggle.innerHTML = '<i data-lucide="pause"></i>';
  if (window.lucide) lucide.createIcons();
});

video.addEventListener("pause", () => {
  playToggle.innerHTML = '<i data-lucide="play"></i>';
  if (window.lucide) lucide.createIcons();
});

video.addEventListener("waiting", () => {
  setLoading(true);
  setStatus("BUFFER", "warn");
  scheduleStallWatch();
});

video.addEventListener("stalled", scheduleStallWatch);

video.addEventListener("canplay", () => {
  clearTimeout(stallTimer);
  setLoading(false);
});

video.addEventListener("error", () => {
  if (currentChannel?.streamUrl) restartStream();
});

playToggle.addEventListener("click", () => {
  if (video.paused) video.play().catch(() => {});
  else video.pause();
});

muteToggle.addEventListener("click", () => {
  video.muted = !video.muted;
  muteToggle.innerHTML = video.muted
    ? '<i data-lucide="volume-x"></i>'
    : '<i data-lucide="volume-2"></i>';
  if (window.lucide) lucide.createIcons();
});

fullscreenToggle.addEventListener("click", async () => {
  const frame = document.querySelector(".video-wrap");

  try {
    if (!document.fullscreenElement) await frame.requestFullscreen();
    else await document.exitFullscreen();
  } catch {}
});

searchInput.addEventListener("input", renderChannels);

filters.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-chip");
  if (!button) return;

  activeFilter = button.dataset.filter;

  for (const chip of filters.querySelectorAll(".filter-chip")) {
    chip.classList.toggle("active", chip === button);
  }

  renderChannels();
});

document.querySelectorAll("[data-close-player]").forEach((element) => {
  element.addEventListener("click", closePlayer);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlay.hidden) closePlayer();
});

refreshButton.addEventListener("click", () => {
  refreshButton.classList.add("refreshing");

  setTimeout(() => {
    refreshButton.classList.remove("refreshing");
    renderChannels();
  }, 550);
});

window.addEventListener("DOMContentLoaded", () => {
  renderChannels();
  resetPlaceholder();
  if (window.lucide) lucide.createIcons();
});
