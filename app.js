const channels = [
  { id: "espn-deportes", name: "ESPN Deportes", group: "ESPN", detail: "Fútbol y deportes en español", streamUrl: "" },
  { id: "espn-1", name: "ESPN 1", group: "ESPN", detail: "Programación deportiva", streamUrl: "" },
  { id: "espn-2", name: "ESPN 2", group: "ESPN", detail: "Eventos y fútbol en vivo", streamUrl: "" },
  { id: "espn-premium", name: "ESPN Premium", group: "ESPN", detail: "Fútbol premium", streamUrl: "" },
  { id: "fox-sports", name: "FOX Sports", group: "FOX", detail: "Deportes y competiciones", streamUrl: "" },
  { id: "fox-sports-2", name: "FOX Sports 2", group: "FOX", detail: "Eventos deportivos", streamUrl: "" },
  { id: "tudn", name: "TUDN", group: "Otros", detail: "Fútbol en español", streamUrl: "" },
  { id: "dazn", name: "DAZN", group: "Otros", detail: "Deportes y fútbol", streamUrl: "" }
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
const placeholder = document.getElementById("videoPlaceholder");

let activeFilter = "Todos";
let hlsInstance = null;

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

  if (window.lucide) {
    lucide.createIcons();
  }
}

function clearPlayer() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.style.display = "none";
  placeholder.hidden = false;
}

function openPlayer(channel) {
  clearPlayer();

  playerTitle.textContent = channel.name;
  playerMeta.textContent = channel.detail;
  overlay.hidden = false;
  document.body.classList.add("player-open");

  if (!channel.streamUrl) {
    placeholder.hidden = false;
    if (window.lucide) lucide.createIcons();
    return;
  }

  placeholder.hidden = true;
  video.style.display = "block";

  const isHls = channel.streamUrl.includes(".m3u8");

  if (isHls && window.Hls && Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true
    });

    hlsInstance.loadSource(channel.streamUrl);
    hlsInstance.attachMedia(video);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) showPlaybackError();
    });
  } else {
    video.src = channel.streamUrl;
    video.play().catch(() => {});
  }
}

function showPlaybackError() {
  clearPlayer();
  placeholder.hidden = false;
  placeholder.querySelector("h3").textContent = "No se pudo reproducir";
  placeholder.querySelector("p").textContent =
    "La señal no respondió o el navegador no admite este formato.";
}

function closePlayer() {
  clearPlayer();
  overlay.hidden = true;
  document.body.classList.remove("player-open");

  placeholder.querySelector("h3").textContent = "Fuente pendiente";
  placeholder.querySelector("p").textContent =
    "Este canal todavía no tiene una señal configurada.";
}

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
  if (event.key === "Escape" && !overlay.hidden) {
    closePlayer();
  }
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
  if (window.lucide) lucide.createIcons();
});