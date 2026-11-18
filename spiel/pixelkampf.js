"use strict";

// Gemeinsame Pixelgrafik für echte Kampfereignisse und die Figurenübersicht.
// Die Darstellung liest Kopien der Werte; Regeln, Würfel und Spielstand bleiben in rules.
const pixelCombat = (() => {
  const palettes = [
    "#8c9cbe",
    "#5babb3",
    "#d58c57",
    "#9aa86b",
    "#a193c4",
    "#b56b80",
    "#6fa47b",
    "#658ba6",
    "#b6ad70",
    "#8daa62",
    "#b99662",
    "#aa704f",
    "#929eb4",
    "#6eaaa0",
    "#b99168",
  ];
  const races = {
    menschen: { skin: "#d5ad82", hair: "#62412f", width: 1, height: 1 },
    elfen: { skin: "#d8cba3", hair: "#c8bf87", width: 0.85, height: 1.12 },
    orks: { skin: "#91a365", hair: "#343b2b", width: 1.25, height: 1.08 },
    zwerge: { skin: "#c39b7a", hair: "#a26739", width: 1.2, height: 0.8 },
    untote: { skin: "#bac7af", hair: "#525968", width: 0.92, height: 1.03 },
  };
  const profiles = {
    krieger: { weapon: "schwert", outfit: "armor", effect: "slash" },
    waechter: { weapon: "speer", outfit: "plate", effect: "thrust" },
    spaeher: { weapon: "bogen", outfit: "hood", effect: "arrow" },
    magier: { weapon: "stab", outfit: "robe", effect: "magic" },
    heiler: { weapon: "stab", outfit: "vestment", effect: "holy" },
    schurke: { weapon: "dolch", outfit: "hood", effect: "dagger" },
    skalde: { weapon: "schwert", outfit: "bard", effect: "song" },
    pulvermeister: { weapon: "dolch", outfit: "powder", effect: "bomb" },
    feldscher: { weapon: "dolch", outfit: "medic", effect: "medicine" },
  };
  function appearance({
    faction = "kronreich",
    role = "krieger",
    volk,
    weapon,
    armor,
    offhand,
    head,
    variant = 0,
    appearance: sex = "mann",
    special = false,
    master = false,
  } = {}) {
    const f = klassen.fraktionen[faction] ?? klassen.fraktionen.kronreich;
    const profile = f.profile?.[role] ?? role;
    const base = profiles[profile] ?? profiles.krieger;
    const race = volk ?? f.volk;
    const index = Math.max(0, Object.keys(klassen.fraktionen).indexOf(faction));
    return {
      ...base,
      profile,
      race,
      body: races[race] ?? races.menschen,
      color: palettes[index],
      name:
        f.klassen[role]?.name ?? klassen.grundklassen[profile]?.name ?? role,
      weapon: weapon || base.weapon,
      armor,
      offhand,
      head,
      variant,
      sex,
      special,
      master,
      // Kronreich/Häfen nutzen keine reguläre Magie, Glut bleibt eine eigene Gabe.
      magic: f.magie && ["magier", "heiler"].includes(profile),
      school:
        race === "elfen"
          ? "nature"
          : race === "untote"
            ? "soul"
            : race === "zwerge"
              ? "rune"
              : "fire",
    };
  }
  function effectFor(look, event, action = "f1", item) {
    if (["status", "afflict", "skip"].includes(event.kind)) return "status";
    if (event.kind === "retaliate") return "claw";
    if (event.kind === "revive") return "revive";
    if (event.actor === "dot") return "status";
    if (event.kind === "cleanse") return "cleanse";
    if (event.kind === "cover")
      return look.profile === "skalde" && action !== "guard"
        ? "song"
        : "shield";
    if (event.kind === "heal")
      return action === "herb" || item || look.profile === "feldscher"
        ? "medicine"
        : "heal";
    if (action === "torch" || action === "ember") return "fire";
    if (action === "restore") return "heal";
    if (event.actor === "summon") return "soul";
    if (
      look.magic &&
      (/stab/.test(look.weapon) || action.replace(/\+$/, "") !== "f1")
    )
      return look.profile === "heiler" && action === "f1"
        ? "holy"
        : look.school;
    if (action.replace(/\+$/, "") !== "f1") {
      if (look.profile === "skalde") return "song";
      if (look.profile === "pulvermeister") return "bomb";
    }
    if (look.weapon === "faeuste") return "punch";
    if (/bogen/.test(look.weapon)) return "arrow";
    if (/stab|speer|eisenkeil/.test(look.weapon)) return "thrust";
    if (/dolch|rostklaue/.test(look.weapon)) return "dagger";
    return "slash";
  }
  const colors = {
    fire: "#ef9a50",
    nature: "#add78b",
    soul: "#bba4ee",
    rune: "#85d8de",
    holy: "#f5d98b",
    heal: "#a8df97",
    revive: "#fff0bb",
    cleanse: "#9de5d5",
    song: "#edcf8f",
    medicine: "#c8dbb0",
    magic: "#a3cbf4",
    status: "#b58cbf",
    bomb: "#ffb262",
  };
  function line(ctx, x1, y1, x2, y2, color, size = 2) {
    ctx.fillStyle = color;
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let n = 0; n <= steps; n++)
      ctx.fillRect(
        Math.round(x1 + ((x2 - x1) * n) / steps),
        Math.round(y1 + ((y2 - y1) * n) / steps),
        size,
        size,
      );
  }
  function fighter(ctx, look, x, y, pose = {}) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (pose.dead) {
      ctx.rotate(-Math.PI / 2);
      ctx.globalAlpha = 0.5;
    }
    ctx.scale(look.body.width * (pose.facing ?? 1), look.body.height);
    const r = (a, b, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b, w, h);
    };
    const skin = look.body.skin;
    const robe = ["robe", "vestment"].includes(look.outfit);
    const armor = /panzer|waechter/.test(look.armor ?? "")
      ? "#8d9da5"
      : look.color;
    const p = pose.p ?? 0;
    const walking = pose.walk ? Math.sin(p * Math.PI * 12) * 3 : 0;
    r(-12, -6, 10, 6, "#252f2b");
    r(4, -6, 10, 6, "#252f2b");
    r(-10, -18, 7, 13 + walking, "#414a45");
    r(4, -18, 7, 13 - walking, "#414a45");
    r(-13, -40, 26, robe ? 34 : 26, armor);
    r(-10, -39, 4, 27, "#d2bc8e");
    r(-14, -17, 28, 4, "#534434");
    if (look.outfit === "plate" || look.outfit === "armor") {
      r(-17, -42, 12, 9, "#9ca9a3");
      r(7, -42, 11, 9, "#bcc9bc");
      r(-5, -36, 14, 15, "#7a8e8b");
    }
    r(-13, -62, 25, 23, look.body.hair);
    r(-10, -57, 21, 17, skin);
    r(6, -53, 3, 3, look.race === "untote" ? "#b75f61" : "#26302a");
    if (look.sex === "frau") r(-14, -58, 5, 27, look.body.hair);
    if (look.race === "elfen") {
      r(-17, -54, 8, 4, skin);
      r(-20, -57, 5, 3, skin);
    }
    if (look.race === "orks") {
      r(-17, -49, 6, 8, skin);
      r(0, -41, 4, 5, "#f0e4b3");
      r(9, -42, 4, 5, "#f0e4b3");
    }
    if (look.race === "zwerge") {
      r(-12, -45, 23, 14, look.body.hair);
      r(-6, -32, 13, 6, look.body.hair);
      r(-4, -37, 3, 9, "#d4b77f");
    }
    if (look.race === "untote") {
      r(-7, -47, 5, 4, "#647367");
      r(1, -41, 8, 2, "#637463");
    }
    if (look.outfit === "hood") {
      r(-15, -63, 28, 7, look.color);
      r(-16, -59, 6, 23, look.color);
    }
    if (look.outfit === "robe") {
      r(-15, -65, 30, 6, look.color);
      r(-7, -73, 16, 9, look.color);
      r(-1, -78, 6, 5, look.color);
    }
    if (look.outfit === "vestment") {
      r(-13, -64, 25, 5, "#e4dfbd");
      r(-4, -36, 5, 17, "#ecdca6");
      r(-9, -32, 15, 4, "#ecdca6");
    }
    if (look.outfit === "medic") {
      r(-13, -63, 27, 5, "#e6dfc7");
      r(-12, -27, 13, 13, "#d5c8a4");
      r(-8, -26, 4, 10, "#845e47");
      r(-11, -23, 10, 4, "#845e47");
    }
    if (look.outfit === "powder") {
      r(-16, -62, 34, 5, "#504735");
      r(-9, -72, 20, 11, "#504735");
      r(-5, -38, 8, 17, "#675341");
      r(-3, -36, 4, 4, "#d2af6c");
    }
    if (look.outfit === "bard") {
      r(-15, -63, 30, 5, look.color);
      r(-12, -69, 5, 9, "#d3bf88");
      r(-16, -30, 15, 20, "#ba9259");
      line(ctx, -13, -27, -3, -14, "#ebd4a7", 1);
    }
    if (look.head === "eisenhelm") {
      r(-15, -66, 30, 7, "#9caeaa");
      r(-15, -59, 5, 15, "#9caeaa");
      r(10, -59, 5, 15, "#9caeaa");
    }
    if (look.head === "lederhaube") {
      r(-14, -65, 28, 7, "#77634b");
      r(-14, -58, 5, 12, "#77634b");
    }
    // Variante beeinflusst Haar/Schmuck, ohne aus der Volkssilhouette zu fallen.
    r(-8 + (look.variant % 4) * 4, -62, 4, 4, "#d5bd80");
    if (look.special) r(0, -38, 4, 6, "#f0df9c");
    if (look.master) {
      r(-10, -69, 24, 4, "#dbc178");
      for (const a of [-10, 0, 10]) r(a, -74, 4, 6, "#dbc178");
    }
    if (look.outfit === "plate" || look.offhand) {
      r(-23, -36, 13, 22, "#7d9997");
      r(-21, -34, 9, 17, "#c3cbad");
      r(-18, -33, 3, 15, look.color);
    }
    const kind = pose.kind;
    const casting =
      kind &&
      !["slash", "dagger", "thrust", "claw", "punch", "arrow"].includes(kind);
    const angle = casting
      ? -0.4 - Math.sin((Math.min(1, p * 2) * Math.PI) / 2) * 1.1
      : kind
        ? -2 + Math.min(1, Math.max(0, (p - 0.25) * 2.7)) * 3.3
        : -0.9;
    const hx = 14 + Math.cos(angle) * 10,
      hy = -30 + Math.sin(angle) * 10;
    line(ctx, 12, -35, hx, hy, armor, 6);
    r(hx, hy, 5, 5, skin);
    const weapon = look.weapon;
    if (kind === "song") {
      r(7, -30, 18, 23, "#be935d");
      r(12, -27, 7, 15, "#6d513b");
      for (let n = 0; n < 3; n++)
        line(ctx, 12 + n * 3, -29, 12 + n * 3, -10, "#ead6a2", 1);
      r(19 + Math.sin(p * 25) * 3, -23, 5, 5, skin);
    } else if (["medicine", "revive", "cleanse", "bomb"].includes(kind)) {
      r(hx - 1, hy - 8, 9, 12, kind === "bomb" ? "#444c46" : "#d2debb");
      r(hx + 1, hy - 12, 5, 4, "#a38959");
      if (kind === "bomb") r(hx + 3, hy - 15, 3, 4, "#efbb69");
    } else if (weapon === "faeuste") {
      r(hx + 3, hy - 1, 7, 7, skin);
    } else if (/bogen/.test(weapon)) {
      const pull = kind === "arrow" ? Math.sin(p * Math.PI) * 8 : 0;
      line(ctx, 26, -49, 35, -32, "#c5a16d", 3);
      line(ctx, 35, -32, 26, -13, "#c5a16d", 3);
      line(ctx, 26, -49, 25 - pull, -30, "#e4ddc1", 1);
      line(ctx, 25 - pull, -30, 26, -13, "#e4ddc1", 1);
      if (kind === "arrow") line(ctx, 12 - pull, -30, 37, -30, "#e5e0c3", 2);
    } else {
      const length = /dolch|rostklaue/.test(weapon)
        ? 18
        : /stab|speer|eisenkeil/.test(weapon)
          ? 46
          : 32;
      const tx = hx + Math.cos(angle) * length,
        ty = hy + Math.sin(angle) * length;
      line(
        ctx,
        hx,
        hy,
        tx,
        ty,
        /stab/.test(weapon) ? "#ba955e" : "#d8ded0",
        /stab|speer/.test(weapon) ? 3 : 4,
      );
      if (/stab/.test(weapon))
        r(tx - 3, ty - 3, 8, 8, colors[pose.kind] ?? colors[look.school]);
      else if (/axt|beil/.test(weapon)) r(tx - 6, ty - 5, 15, 12, "#b7c4bb");
      else if (!/speer|eisenkeil/.test(weapon))
        line(ctx, hx - 4, hy + 5, hx + 6, hy - 4, "#c8ac6c", 3);
    }
    ctx.restore();
  }
  function beast(ctx, model, x, y, pose = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (pose.dead) {
      ctx.globalAlpha = 0.4;
      ctx.scale(1, 0.4);
    }
    const r = (a, b, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b, w, h);
    };
    const id = model.creature ?? "";
    if (/deserteur|bandit|kult|waechter/.test(id)) {
      fighter(
        ctx,
        appearance({
          faction: "kronreich",
          role: "krieger",
          armor: "aschenwaechter",
        }),
        0,
        0,
        { facing: -1, ...pose },
      );
    } else if (/kraehe|greif/.test(id)) {
      r(-17, -29, 34, 22, "#6e7778");
      r(-25, -36, 20, 16, "#929c95");
      r(-35, -28, 13, 5, "#cab681");
      line(
        ctx,
        -3,
        -28,
        28,
        -50 - Math.sin((pose.p ?? 0) * Math.PI * 8) * 10,
        "#7e8987",
        9,
      );
      line(ctx, -2, -25, 30, -7, "#9ba69d", 6);
      r(-13, -6, 5, 6, "#b9a578");
    } else if (/netz|spinn/.test(id)) {
      r(-20, -29, 40, 23, "#71667b");
      r(-32, -22, 20, 16, "#9b8993");
      for (let n = 0; n < 4; n++) {
        line(ctx, -12 + n * 9, -15, -35 + n * 22, 0, "#9d8c9b", 3);
        line(ctx, -12 + n * 9, -24, -40 + n * 23, -37, "#9d8c9b", 3);
      }
      r(-30, -21, 4, 4, "#e7a386");
    } else if (/glut|geist/.test(id)) {
      for (let n = 0; n < 6; n++)
        r(
          -18 + n * 6,
          -22 - Math.sin(n + (pose.p ?? 0) * 8) * 9,
          8,
          22,
          n % 2 ? "#e8b779" : "#9da9c5",
        );
    } else {
      const boar = /keiler/.test(id),
        swamp = /moor|schnapp/.test(id);
      const c = swamp ? "#718c72" : boar ? "#8a7b68" : "#9aa99d";
      r(-27, -31, 58, 22, c);
      r(-41, -36, 27, 23, c);
      r(-46, -24, 15, 8, c);
      r(-29, -12, 7, 12, c);
      r(15, -12, 7, 12, c);
      r(24, -31, 18, 6, c);
      r(-33, -41, 8, 10, c);
      r(-39, -30, 4, 3, "#e8d5a0");
      if (boar) r(-42, -17, 9, 4, "#e8d9ae");
      if (swamp)
        for (let n = 0; n < 5; n++) r(-15 + n * 9, -36, 5, 8, "#acb287");
    }
    ctx.restore();
  }
  function makeScene(
    host,
    {
      allies,
      enemies,
      speed = 1,
      motion = true,
      selected,
      onTarget,
      onAlly,
    } = {},
  ) {
    const root = document.createElement("section");
    root.className = "pixel-battle";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 340;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      "Pixelkampfszene. Ziele über die beschrifteten Karten darunter wählen.",
    );
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const controls = document.createElement("div");
    controls.className = "pixel-controls";
    const label = document.createElement("label");
    label.textContent = "Tempo ";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 1;
    slider.max = 5;
    slider.step = 1;
    slider.value = speed;
    slider.setAttribute("aria-label", "Kampfgeschwindigkeit");
    const output = document.createElement("output");
    output.textContent = "×" + speed;
    label.append(slider, output);
    const motionLabel = document.createElement("label"),
      checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = motion;
    motionLabel.append(checkbox, " Animationen");
    const next = document.createElement("button");
    next.type = "button";
    next.className = "action primary";
    next.textContent = "Weiter";
    next.disabled = true;
    const status = document.createElement("p");
    status.className = "pixel-phase";
    status.setAttribute("role", "status");
    status.textContent = "Wähle eine Aktion unter der Kampfübersicht.";
    controls.append(label, motionLabel, next);
    root.append(canvas, controls, status);
    host.append(root);
    let active = null,
      disposed = false,
      frame,
      resolveFrame,
      resolveNext,
      running = false;
    let target = selected;
    function pos(side, index) {
      const count = side === "ally" ? allies.length : enemies.length;
      // Mehr als vier Gegner bleiben sichtbar; die Karten bieten die präzise Zielwahl.
      if (side === "enemy" && count > 4)
        return {
          x: 420 + (index % 2) * 126,
          y:
            90 +
            (Math.floor(index / 2) * 210) /
              Math.max(1, Math.ceil(count / 2) - 1),
        };
      return {
        x: side === "ally" ? 110 + (index % 2) * 80 : 478 + (index % 2) * 35,
        y: 90 + index * (218 / Math.max(3, count - 1)),
      };
    }
    function draw() {
      ctx.fillStyle = "#263d3c";
      ctx.fillRect(0, 0, 640, 340);
      ctx.fillStyle = "#3a504b";
      ctx.fillRect(0, 0, 640, 48);
      for (let n = 0; n < 15; n++) {
        ctx.fillStyle = n % 2 ? "#213832" : "#2b443b";
        ctx.fillRect(n * 48, 35 + (n % 3) * 12, 34, 95);
        ctx.fillRect(n * 48 + 10, 16 + (n % 3) * 12, 16, 30);
      }
      ctx.fillStyle = "#3b4838";
      ctx.fillRect(0, 130, 640, 210);
      for (let n = 0; n < 60; n++) {
        ctx.fillStyle = n % 3 ? "#546046" : "#827653";
        ctx.fillRect((n * 97) % 640, 145 + ((n * 37) % 190), 5, 2);
      }
      for (const [side, models] of [
        ["ally", allies],
        ["enemy", enemies],
      ])
        for (let i = 0; i < models.length; i++) {
          const m = models[i],
            point = pos(side, i),
            source = active?.sourceSide === side && active?.sourceIndex === i;
          const receiving =
            active?.targetSide === side && active?.targetIndex === i;
          const p = active?.p ?? 0,
            melee =
              active &&
              ["slash", "dagger", "thrust", "claw", "punch"].includes(
                active.kind,
              );
          let x = point.x,
            y = point.y;
          if (source && melee) {
            const destination = pos(active.targetSide, active.targetIndex);
            const travel = p < 0.25 ? p / 0.25 : p > 0.8 ? (1 - p) / 0.2 : 1;
            x +=
              (destination.x - point.x - (side === "ally" ? 65 : -65)) * travel;
            y += (destination.y - point.y) * travel;
          }
          if (
            receiving &&
            p > 0.58 &&
            p < 0.8 &&
            active.value > 0 &&
            !active.healing
          )
            x += Math.sin(p * 85) * 3;
          ctx.fillStyle = "#26362f";
          ctx.fillRect(x - 25, y - 4, 50, 8);
          if (side === "ally")
            fighter(ctx, m.look, x, y, {
              dead: m.hp <= 0,
              kind: source ? active.kind : null,
              p,
              walk: source && melee && (p < 0.25 || p > 0.8),
            });
          else beast(ctx, m, x, y, { dead: m.hp <= 0, p: source ? p : 0 });
          if (side === "enemy" && m.id === target) {
            ctx.fillStyle = "#ebd18a";
            ctx.fillRect(x - 7, y - 83, 14, 4);
            ctx.fillRect(x - 3, y - 79, 6, 4);
          }
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "#e0d9bd";
          const short = m.name.length > 20 ? m.name.slice(0, 18) + "…" : m.name;
          ctx.fillText(short, x, y + 17);
          ctx.fillStyle = "#23352e";
          ctx.fillRect(x - 26, y + 21, 52, 4);
          ctx.fillStyle = m.hp > 0 ? "#9ebd89" : "#865a56";
          ctx.fillRect(
            x - 26,
            y + 21,
            (52 * Math.max(0, m.hp)) / Math.max(1, m.max),
            4,
          );
        }
      if (active) drawEffect();
    }
    function drawEffect() {
      const a = active,
        p = a.p,
        src = pos(a.sourceSide, a.sourceIndex),
        dest = pos(a.targetSide, a.targetIndex);
      const c = colors[a.kind] ?? "#e7e6c7";
      const caster = allies[a.sourceIndex]?.look;
      const castAngle =
        -0.4 - Math.sin((Math.min(1, p * 2) * Math.PI) / 2) * 1.1;
      const staff =
        a.sourceSide === "ally" && /stab/.test(caster?.weapon ?? "");
      const start = staff
        ? {
            x: src.x + (14 + Math.cos(castAngle) * 56) * caster.body.width,
            y: src.y + (-30 + Math.sin(castAngle) * 56) * caster.body.height,
          }
        : { x: src.x + 36, y: src.y - 50 };
      const end = { x: dest.x, y: dest.y - 36 };
      const progress = Math.min(1, Math.max(0, (p - 0.3) / 0.3));
      const x = start.x + (end.x - start.x) * progress,
        y =
          start.y +
          (end.y - start.y) * progress -
          Math.sin(progress * Math.PI) * 22;
      if (
        ["slash", "dagger", "claw"].includes(a.kind) &&
        p > 0.46 &&
        p < 0.72
      ) {
        const t = (p - 0.46) / 0.26;
        line(
          ctx,
          end.x - 29,
          end.y - 25,
          end.x - 29 + 58 * t,
          end.y - 25 + 49 * t,
          "#516a71",
          6,
        );
        line(
          ctx,
          end.x - 26,
          end.y - 28,
          end.x - 26 + 58 * t,
          end.y - 28 + 49 * t,
          "#f4f0d7",
          3,
        );
        if (a.kind === "dagger")
          line(
            ctx,
            end.x + 26,
            end.y - 15,
            end.x + 26 - 52 * t,
            end.y - 15 + 25 * t,
            "#d0e4bd",
            2,
          );
      } else if (a.kind === "punch" && p > 0.46 && p < 0.72) {
        line(ctx, end.x - 16, end.y, end.x + 12, end.y, "#e4dab6", 3);
      } else if (a.kind === "thrust" && p > 0.45 && p < 0.7)
        line(ctx, end.x - 30, end.y, end.x + 20, end.y, "#f0e8ce", 3);
      else if (a.kind === "arrow" && p > 0.3 && p < 0.62) {
        line(ctx, x - 23, y, x + 9, y, "#d5bd86", 2);
        line(ctx, x + 3, y - 4, x + 9, y, "#f6eac7", 2);
        line(ctx, x + 3, y + 4, x + 9, y, "#f6eac7", 2);
      } else if (
        !["slash", "dagger", "thrust", "arrow", "claw", "punch"].includes(
          a.kind,
        )
      ) {
        if (p < 0.3)
          for (let n = 0; n < 7; n++) {
            const angle = (n * Math.PI * 2) / 7 + p * 8;
            ctx.fillStyle = c;
            ctx.fillRect(
              start.x + Math.cos(angle) * 20,
              start.y + Math.sin(angle) * 15,
              4,
              4,
            );
          }
        if (p > 0.3 && p < 0.62) {
          ctx.fillStyle = c;
          ctx.fillRect(x - 4, y - 4, 9, 9);
          line(ctx, x - 20 * (end.x > start.x ? 1 : -1), y + 4, x, y, c, 3);
          if (a.kind === "song") {
            line(ctx, x + 4, y - 13, x + 4, y, c, 2);
            ctx.fillRect(x - 3, y, 7, 4);
          }
          if (a.kind === "medicine" || a.kind === "revive") {
            ctx.fillStyle = "#dce0bd";
            ctx.fillRect(x - 5, y - 8, 10, 14);
            ctx.fillStyle = "#9cae78";
            ctx.fillRect(x - 3, y - 12, 6, 4);
          }
        }
        if (p > 0.6 && p < 0.9)
          for (let n = 0; n < 8; n++) {
            const angle = (n * Math.PI) / 4,
              radius = 12 + (p - 0.6) * 65;
            const xx = end.x + Math.cos(angle) * radius,
              yy = end.y + Math.sin(angle) * radius;
            if (["rune", "shield", "cleanse"].includes(a.kind))
              line(
                ctx,
                xx,
                yy,
                end.x + Math.cos(angle + 0.7) * radius,
                end.y + Math.sin(angle + 0.7) * radius,
                c,
                2,
              );
            else {
              ctx.fillStyle = c;
              ctx.fillRect(
                xx,
                yy - (p - 0.6) * 36,
                4,
                a.kind === "fire" ? 12 : 4,
              );
              if (a.healing) {
                ctx.fillRect(xx - 3, yy + 3 - (p - 0.6) * 36, 10, 3);
              }
            }
          }
      }
      if (p > 0.64 && a.value) {
        ctx.font = "bold 17px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = a.healing ? "#c3eca7" : "#fff0ce";
        ctx.fillText(
          (a.healing ? "+" : "−") + a.value,
          end.x,
          end.y - 25 - (p - 0.64) * 35,
        );
      }
    }
    function atFrame(duration, update) {
      if (
        !checkbox.checked ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        update(1);
        draw();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        let before;
        let elapsed = 0;
        resolveFrame = resolve;
        function tick(now) {
          if (disposed) {
            resolve();
            return;
          }
          if (before !== undefined)
            elapsed += Math.min(80, now - before) * Number(slider.value);
          before = now;
          const p = checkbox.checked ? Math.min(1, elapsed / duration) : 1;
          update(p);
          draw();
          if (p < 1) frame = requestAnimationFrame(tick);
          else {
            resolveFrame = null;
            resolve();
          }
        }
        frame = requestAnimationFrame(tick);
      });
    }
    async function animate(event, action, item, pause = true, onImpact) {
      const sourceSide =
        event.kind === "retaliate" || event.kind === "afflict"
          ? "enemy"
          : "ally";
      const sourceIndex = Math.max(
        0,
        (sourceSide === "ally" ? allies : enemies).findIndex(
          (m) => m.id === event.actor,
        ),
      );
      const targetSide =
        event.ally ||
        ["heal", "revive", "cleanse", "cover", "status", "skip"].includes(
          event.kind,
        )
          ? "ally"
          : "enemy";
      const targetIndex = Math.max(
        0,
        (targetSide === "ally" ? allies : enemies).findIndex(
          (m) =>
            m.id ===
            (targetSide === "ally"
              ? (event.ally ?? event.actor)
              : event.target),
        ),
      );
      const look =
        allies[sourceSide === "ally" ? sourceIndex : 0]?.look ?? appearance();
      const healing = ["heal", "revive"].includes(event.kind),
        kind = effectFor(look, event, action, item);
      active = {
        sourceSide,
        sourceIndex,
        targetSide,
        targetIndex,
        kind,
        healing,
        value: event.value ?? 0,
        p: 0,
      };
      running = true;
      const targetModel = (targetSide === "ally" ? allies : enemies)[
        targetIndex
      ];
      let applied = false;
      const labels = {
        slash: "Schwerthieb",
        dagger: "Dolchstich",
        punch: "Faustschlag",
        thrust: "Stoß",
        claw: "Gegnerangriff",
        arrow: "Bogenschuss",
        fire: "Feuerzauber",
        nature: "Naturzauber",
        rune: "Runenzauber",
        soul: "Seelenzauber",
        holy: "Lichtzauber",
        heal: "Heilung",
        medicine: "Heilmittel",
        song: "Kriegslied",
        bomb: "Sprengladung",
        shield: "Schutz",
        revive: "Wiederbelebung",
        status: "Statuseffekt",
        cleanse: "Reinigung",
      };
      const apply = () => {
        if (applied) return;
        applied = true;
        onImpact?.();
        if (targetModel && event.value)
          targetModel.hp = Math.min(
            targetModel.max,
            Math.max(
              0,
              targetModel.hp + (healing ? event.value : -event.value),
            ),
          );
      };
      await atFrame(6400, (p) => {
        active.p = p;
        if (p >= 0.64) apply();
        status.textContent =
          (labels[kind] ?? "Magie") +
          " · " +
          (p < 0.3 ? "Vorbereiten" : p < 0.64 ? "Ausführen" : "Wirkung");
      });
      apply();
      active = null;
      draw();
      running = false;
      if (disposed) return;
      if (pause) {
        status.textContent =
          "Aktion abgeschlossen · Weiter für die nächste Aktion.";
        next.disabled = false;
        next.focus({ preventScroll: true });
        await new Promise((resolve) => {
          resolveNext = resolve;
        });
        next.disabled = true;
      } else status.textContent = "Wähle eine Aktion unter der Kampfübersicht.";
    }
    slider.addEventListener("input", () => {
      output.textContent = "×" + slider.value;
      root.dispatchEvent(
        new CustomEvent("pixel-settings", {
          bubbles: true,
          detail: { speed: Number(slider.value), motion: checkbox.checked },
        }),
      );
    });
    checkbox.addEventListener("change", () =>
      root.dispatchEvent(
        new CustomEvent("pixel-settings", {
          bubbles: true,
          detail: { speed: Number(slider.value), motion: checkbox.checked },
        }),
      ),
    );
    next.addEventListener("click", (event) => {
      if (event.detail > 1) return;
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve();
      }
    });
    canvas.addEventListener("click", (e) => {
      if (running || resolveNext) return;
      const rect = canvas.getBoundingClientRect(),
        x = ((e.clientX - rect.left) * 640) / rect.width,
        y = ((e.clientY - rect.top) * 340) / rect.height;
      for (const [side, models] of [
        ["enemy", enemies],
        ["ally", allies],
      ])
        models.forEach((m, i) => {
          const p = pos(side, i);
          if (Math.abs(x - p.x) < 38 && y > p.y - 80 && y < p.y + 28) {
            if (side === "enemy" && m.hp > 0) {
              target = m.id;
              onTarget?.(m.id);
            } else if (side === "ally") onAlly?.(m.id);
            draw();
          }
        });
    });
    draw();
    return {
      root,
      animate,
      select(id) {
        target = id;
        draw();
      },
      destroy() {
        disposed = true;
        cancelAnimationFrame(frame);
        resolveFrame?.();
        resolveNext?.();
      },
      get busy() {
        return running || Boolean(resolveNext);
      },
    };
  }
  return { appearance, effectFor, fighter, makeScene, profiles, races };
})();
