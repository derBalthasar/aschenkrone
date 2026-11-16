"use strict";

const prologue = (() => {
  const el = (id) => document.getElementById(id);
  const stage = el("intro-scene");
  const image = el("intro-art");
  const portrait = el("intro-portrait");
  const title = el("intro-title");
  const toggle = el("intro-toggle");
  const next = el("intro-next");
  const skip = el("intro-skip");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const slides = [
    {
      image: "nordpass.png", location: "Nordpass · In der Nacht", title: "Asche auf dem Pass",
      text: "Noch vor Tagesanbruch trägt der Wind graue Asche über die Grenzsteine nach Valmarch.",
      duration: 5200,
    },
    {
      image: "asche.png", location: "Weidenkamm · Vor Sonnenaufgang", title: "Unter grauer Asche",
      text: "Bis zum Morgen legt sich die Asche in die Wagenspuren und unter die Hecken. Am Wegrand glimmt noch etwas unter der grauen Schicht.",
      duration: 6500,
    },
    {
      image: "asche.png", location: "Weidenkamm · Morgengrauen", title: "Du erwachst in der Asche",
      text: "Du holst Luft und hustest. Asche klebt an deinem Gesicht. An deinen Namen erinnerst du dich: %NAME%. Wie du hierhergekommen bist, weißt du nicht.",
      duration: 7300, showPortrait: true,
    },
  ];
  let playback = null;

  function clearTimer() {
    if (playback.timer === null) return;
    clearTimeout(playback.timer);
    playback.timer = null;
    playback.remaining = Math.max(0, playback.deadline - performance.now());
  }

  function schedule() {
    if (!playback || playback.paused || document.hidden || playback.timer !== null) return;
    playback.deadline = performance.now() + playback.remaining;
    playback.timer = setTimeout(() => {
      playback.timer = null;
      advance();
    }, playback.remaining);
  }

  function render() {
    const slide = slides[playback.index];
    const src = "spiel/prolog/" + slide.image;
    if (image.getAttribute("src") !== src) image.src = src;
    stage.dataset.shot = String(playback.index);
    image.hidden = false;
    if (image.complete && !image.naturalWidth) image.hidden = true;
    portrait.hidden = !slide.showPortrait;
    el("intro-location").textContent = slide.location;
    title.textContent = slide.title;
    el("intro-text").textContent = slide.text.replace("%NAME%", () => playback.name);
    next.textContent = slide.showPortrait ? "Zum Spiel" : "Weiter";
    toggle.textContent = playback.paused ? "Abspielen" : "Pausieren";
    stage.classList.toggle("is-paused", playback.paused || document.hidden);
    schedule();
  }

  function finish() {
    if (!playback) return;
    clearTimer();
    const done = playback.done;
    playback = null;
    done();
  }

  function advance() {
    if (!playback) return;
    clearTimer();
    if (playback.index === slides.length - 1) {
      finish();
      return;
    }
    playback.index++;
    playback.remaining = slides[playback.index].duration;
    render();
  }

  image.addEventListener("error", () => { image.hidden = true; });
  image.addEventListener("load", () => { image.hidden = false; });
  next.addEventListener("click", advance);
  skip.addEventListener("click", finish);
  toggle.addEventListener("click", () => {
    if (!playback) return;
    clearTimer();
    playback.paused = !playback.paused;
    toggle.textContent = playback.paused ? "Abspielen" : "Pausieren";
    stage.classList.toggle("is-paused", playback.paused || document.hidden);
    schedule();
  });
  document.addEventListener("visibilitychange", () => {
    if (!playback) return;
    if (document.hidden) clearTimer();
    stage.classList.toggle("is-paused", playback.paused || document.hidden);
    schedule();
  });

  function play(name, done) {
    if (playback) clearTimer();
    playback = {
      index: 0, name, done, paused: reducedMotion.matches, timer: null,
      remaining: slides[0].duration, deadline: 0,
    };
    render();
    title.focus();
  }

  return { play };
})();
