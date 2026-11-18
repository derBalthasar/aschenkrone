// Reiter der rechten Spalte und kleine Anzeigehilfen.
// Diese Datei ändert keine Spiellogik: Sie blendet Bereiche nur per CSS ein und aus. Alle Elemente bleiben im DOM.
(() => {
  "use strict";
  const panel = document.getElementById("character-panel");
  if (!panel) return;
  const tabs = [...panel.querySelectorAll('.side-tabs [role="tab"]')];
  const names = tabs.map(tab => tab.dataset.sideTab);
  const storageKey = "aschenkrone.seitenreiter";
  const mapTab = document.getElementById("side-tab-karte");
  const travelMap = document.getElementById("travel-map");

  // Im dreispaltigen Breitbild steht die Karte in einer eigenen Spalte; dort wird der Kartenreiter ausgeblendet.
  const mapHasOwnColumn = () => getComputedStyle(mapTab).display === "none";

  function select(name, { focus = false, remember = true } = {}) {
    if (!names.includes(name)) name = "karte";
    if (name === "karte" && mapHasOwnColumn()) name = "beutel";
    panel.dataset.sideTab = name;
    for (const tab of tabs) {
      const active = tab.dataset.sideTab === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    if (name === "karte") {
      travelMap.open = true;
      mapTab.classList.remove("side-tab-news");
    }
    if (remember) {
      try {
        localStorage.setItem(storageKey, name);
      } catch {
        // Ohne Speicher gilt die Auswahl nur in diesem Fenster.
      }
    }
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab.dataset.sideTab));
    tab.addEventListener("keydown", event => {
      const visible = tabs.filter(entry => getComputedStyle(entry).display !== "none");
      const index = visible.indexOf(tab);
      const target = { ArrowRight: visible[(index + 1) % visible.length], ArrowLeft: visible[(index - 1 + visible.length) % visible.length],
        Home: visible[0], End: visible[visible.length - 1] }[event.key];
      if (!target) return;
      event.preventDefault();
      select(target.dataset.sideTab, { focus: true });
    });
  }

  let saved = "karte";
  try {
    saved = localStorage.getItem(storageKey) || saved;
  } catch {
    // Standardreiter verwenden.
  }
  select(saved, { remember: false });

  // Wechsel der Ansicht oder Fenstergröße: Kartenreiter ggf. verlassen bzw. wieder anbieten.
  const relayout = () => select(panel.dataset.sideTab, { remember: false });
  window.addEventListener("resize", relayout);
  document.getElementById("layout-mode")?.addEventListener("change", relayout);

  // Sprungleiste auf schmalen Bildschirmen: „Karte“ öffnet zuerst den Kartenreiter.
  document.addEventListener("click", event => {
    const link = event.target.closest?.('.play-shortcuts a[href="#travel-map"]');
    if (link && !mapHasOwnColumn()) select("karte");
  }, true);

  // Neue Reiseziele melden, wenn gerade ein anderer Reiter offen ist.
  const destinations = document.getElementById("map-destinations");
  new MutationObserver(() => {
    const news = destinations.children.length > 0 && panel.dataset.sideTab !== "karte" && !mapHasOwnColumn();
    mapTab.classList.toggle("side-tab-news", news);
  }).observe(destinations, { childList: true });
})();
