"use strict";

(() => {
  const buttons = [...document.querySelectorAll(".case-button")];
  const filters = [...document.querySelectorAll(".filter-btn")];
  const modes = [...document.querySelectorAll(".mode-btn")];
  const strip = document.getElementById("case-strip");
  const video = document.getElementById("reconstruction-video");
  const hero = document.getElementById("demo-video");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeCase = buttons[0];
  let activeFilter = "all";
  let activeMode = "ours";
  let loadController;

  const visibleCases = () => buttons.filter(button => !button.hidden);

  function updateArrows() {
    document.getElementById("case-prev").disabled = strip.scrollLeft <= 2;
    document.getElementById("case-next").disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2;
  }

  function updateStatus() {
    const caseNumber = activeCase.dataset.case.split("_")[1];
    document.getElementById("gallery-status").textContent = `Showing ${visibleCases().length} cases · ${activeCase.dataset.dataset} case ${caseNumber} · ${activeMode === "ours" ? "Our Results" : "Method Comparison"}`;
  }

  function renderVideo({ preserveTime = false, play = false } = {}) {
    const savedTime = preserveTime ? video.currentTime : 0;
    const wasPlaying = preserveTime && !video.paused;
    const data = activeCase.dataset;
    const folder = activeMode === "ours" ? "ours" : "qualitative";
    const src = `media/${folder}/${data.case}.mp4`;
    loadController?.abort();
    loadController = new AbortController();
    video.pause();
    video.poster = `media/${folder}/${data.case}.jpg`;
    video.setAttribute("aria-label", `${data.dataset} case ${data.case.split("_")[1]}: ${activeMode === "ours" ? "MetricHand reconstruction" : "full method comparison"}`);
    document.getElementById("active-dataset").textContent = data.dataset;
    document.getElementById("active-title").textContent = data.title;
    document.getElementById("active-detail").textContent = data.detail;
    document.getElementById("view-labels").hidden = activeMode !== "ours";
    document.getElementById("view-caption").textContent = activeMode === "ours"
      ? "Source and MetricHand panels cropped from the original synchronized comparison video."
      : "Original synchronized comparison: input, MetricHand, HaWoR, Dyn-HaMR, ground truth, WiLoR-SLAM, HaMeR-SLAM and HMP-SLAM.";
    document.getElementById("video-error").hidden = true;
    document.getElementById("video-fallback").href = src;
    video.addEventListener("loadedmetadata", () => {
      if (savedTime > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(savedTime, Math.max(0, video.duration - 0.05));
      if ((play || wasPlaying) && !reducedMotion.matches) video.play().catch(() => {});
    }, { once: true, signal: loadController.signal });
    video.src = src;
    video.load();
    updateStatus();
  }

  function selectCase(button, { scroll = false, play = true } = {}) {
    activeCase = button;
    buttons.forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderVideo({ play });
    if (scroll) {
      strip.scrollTo({ left: Math.max(0, button.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + button.clientWidth / 2), behavior: reducedMotion.matches ? "instant" : "smooth" });
    }
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => selectCase(button));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const list = visibleCases();
      const index = list.indexOf(button);
      const target = event.key === "Home" ? list[0]
        : event.key === "End" ? list.at(-1)
        : list[Math.min(list.length - 1, Math.max(0, index + (event.key === "ArrowRight" ? 1 : -1)))];
      target.focus({ preventScroll: true });
      selectCase(target, { scroll: true, play: false });
    });
  });

  filters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    buttons.forEach(item => { item.hidden = activeFilter !== "all" && item.dataset.dataset !== activeFilter; });
    strip.scrollLeft = 0;
    if (activeCase.hidden) selectCase(visibleCases()[0], { play: false });
    else updateStatus();
    updateArrows();
  }));

  modes.forEach(button => button.addEventListener("click", () => {
    if (button.dataset.mode === activeMode) return;
    activeMode = button.dataset.mode;
    modes.forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderVideo({ preserveTime: true });
  }));

  document.getElementById("case-prev").addEventListener("click", () => strip.scrollBy({ left: -strip.clientWidth * .8, behavior: reducedMotion.matches ? "instant" : "smooth" }));
  document.getElementById("case-next").addEventListener("click", () => strip.scrollBy({ left: strip.clientWidth * .8, behavior: reducedMotion.matches ? "instant" : "smooth" }));
  strip.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  video.addEventListener("error", () => { document.getElementById("video-error").hidden = false; });
  updateArrows();

  // Silent autoplay only for the hero; respect accessibility preferences and offscreen playback.
  if (reducedMotion.matches) { hero.removeAttribute("autoplay"); hero.pause(); }
  reducedMotion.addEventListener("change", event => { if (event.matches) { hero.pause(); video.pause(); } });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) hero.pause();
    }, { threshold: 0.1 }).observe(hero);
  }
  hero.addEventListener("play", () => video.pause());
  video.addEventListener("play", () => hero.pause());

  const copyButton = document.getElementById("copy-bibtex");
  copyButton.addEventListener("click", async () => {
    const text = document.getElementById("bibtex").textContent;
    const status = document.getElementById("copy-status");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied!";
      status.textContent = "BibTeX copied to clipboard.";
      window.setTimeout(() => { copyButton.textContent = "Copy BibTeX"; }, 2000);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.getElementById("bibtex"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "BibTeX selected. Press Ctrl+C or ⌘C to copy.";
    }
  });
})();
