"use strict";
(() => {
  const el = (id) => document.getElementById(id);
  const faction = el("faction");
  faction.append(new Option("Alle Fraktionen · 90 Figuren", "all"));
  for (const [id, data] of Object.entries(klassen.fraktionen))
    faction.append(
      new Option(klassen.voelker[data.volk].name + " · " + data.name, id),
    );
  faction.value = "kronreich";
  let scene,
    pending = false;
  let settings = { speed: 1, motion: true };
  const labels = {
    krieger: "Schwerthieb",
    waechter: "Speerstoß und Schild",
    spaeher: "Bogen spannen und schießen",
    magier: "Stab aufladen und zaubern",
    heiler: "Lichtzauber und Heilung",
    schurke: "Dolchstich",
    skalde: "Kriegslied",
    pulvermeister: "Sprengladung",
    feldscher: "Verbände und Heilmittel",
  };
  function lookFor(faction, role) {
    return pixelCombat.appearance({
      faction,
      role,
      appearance: el("sex").value,
      variant: Number(el("variant").value),
    });
  }
  function select(faction, role) {
    if (pending) return;
    scene?.destroy();
    el("stage").replaceChildren();
    const look = lookFor(faction, role);
    const ally = { id: "hero", name: look.name, hp: 24, max: 36, look };
    scene = pixelCombat.makeScene(el("stage"), {
      allies: [ally],
      enemies: [
        { id: 0, name: "Übungsziel", hp: 99, max: 99, creature: "deserteure" },
      ],
      ...settings,
      selected: 0,
    });
    scene.root.addEventListener("pixel-settings", (e) => {
      settings = e.detail;
    });
    el("selection").textContent =
      klassen.voelker[look.race].name +
      " · " +
      klassen.fraktionen[faction].name +
      " · " +
      look.name +
      " · " +
      labels[look.profile];
    return scene;
  }
  async function preview(faction, role, heal = false) {
    if (pending) return;
    const chosen = select(faction, role);
    pending = true;
    const disabled = Array.from(
      document.querySelectorAll(
        ".pixel-gallery-filters select, .pixel-gallery-card button",
      ),
    );
    disabled.forEach((b) => (b.disabled = true));
    try {
      const profile = lookFor(faction, role).profile;
      const kind = heal ? "heal" : "hit";
      await chosen.animate(
        {
          kind,
          actor: "hero",
          target: 0,
          ally: heal ? "hero" : undefined,
          value: heal ? 12 : 8,
        },
        ["skalde", "pulvermeister"].includes(profile) ? "f2" : "f1",
        undefined,
        false,
      );
    } finally {
      pending = false;
      disabled.forEach((b) => (b.disabled = false));
    }
  }
  function render() {
    if (pending) return;
    el("figures").replaceChildren();
    const factions =
      faction.value === "all"
        ? Object.keys(klassen.fraktionen)
        : [faction.value];
    for (const id of factions)
      for (const role of klassen.klassenFolge) {
        const look = lookFor(id, role);
        const card = document.createElement("article");
        card.className = "pixel-gallery-card";
        const canvas = document.createElement("canvas");
        canvas.width = 220;
        canvas.height = 128;
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          klassen.voelker[look.race].name + " · " + look.name,
        );
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#263c34";
        ctx.fillRect(0, 0, 220, 128);
        ctx.fillStyle = "#43533c";
        ctx.fillRect(0, 105, 220, 23);
        pixelCombat.fighter(ctx, look, 105, 107);
        const title = document.createElement("h3");
        title.textContent = look.name;
        const detail = document.createElement("p");
        detail.textContent =
          klassen.fraktionen[id].name + " · " + labels[look.profile];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "action";
        button.textContent = "Animation ansehen";
        button.addEventListener("click", () => preview(id, role));
        card.append(canvas, title, detail, button);
        if (["heiler", "feldscher"].includes(look.profile)) {
          const heal = document.createElement("button");
          heal.type = "button";
          heal.className = "action";
          heal.textContent = "Heilung ansehen";
          heal.addEventListener("click", () => preview(id, role, true));
          card.append(heal);
        }
        el("figures").append(card);
      }
    select(factions[0], "krieger");
  }
  for (const id of ["faction", "sex", "variant"])
    el(id).addEventListener("change", render);
  render();
})();
