"use strict";

const portraits = (() => {
  const characters = [
    ["mann-01", "Valmarcher"], ["mann-02", "Waldelf"], ["mann-03", "Bergzwerg"],
    ["mann-04", "Ork"], ["mann-05", "Vampir"],
    ["frau-01", "Valmarcherin"], ["frau-02", "Waldelfin"], ["frau-03", "Bergzwergin"],
    ["frau-04", "Orkin"], ["frau-05", "Vampirin"],
    ["mann-06", "Erwachter"], ["frau-06", "Erwachte"],
  ];
  const names = new Map(characters);
  const beard = ["Glatt rasiert", "Dreitagebart", "Vollbart", "Spitzbart"];
  const hair = ["Offen", "Pferdeschwanz", "Flechtzopf", "Kurzhaar"];
  const positions = ["left top", "right top", "left bottom", "right bottom"];
  const styles = (id) => id.endsWith("-06") ? ["Fahl", "Rissige Aschenhaut"] : id.startsWith("mann") ? beard : hair;
  function get(id, variant) {
    if (id.endsWith("-06")) {
      return { file: "untot.png", label: names.get(id) + " · " + styles(id)[variant],
        position: positions[variant + (id.startsWith("frau") ? 2 : 0)] };
    }
    return { file: id + ".png", label: names.get(id) + " · " + styles(id)[variant], position: positions[variant] };
  }
  return { characters, styles, get };
})();
