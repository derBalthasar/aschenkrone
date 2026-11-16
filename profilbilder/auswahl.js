"use strict";

const person = document.getElementById("person");
const variants = document.getElementById("variants");
const portrait = document.getElementById("portrait");
const caption = document.getElementById("caption");

for (const [id, name] of portraits.characters) person.add(new Option(name, id));

function selectCharacter() {
  const id = person.value;
  const styles = portraits.styles(id);

  const buttons = styles.map((style, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = style;
    button.addEventListener("click", () => showVariant(index));
    return button;
  });

  function showVariant(index) {
    const variant = portraits.get(id, index);
    portrait.style.backgroundImage = 'url("bilder/' + variant.file + '")';
    portrait.style.backgroundPosition = variant.position;
    portrait.setAttribute("aria-label", variant.label);
    caption.textContent = variant.label;
    for (const [option, button] of buttons.entries()) {
      button.setAttribute("aria-pressed", option === index);
    }
  }

  variants.replaceChildren(...buttons);
  showVariant(0);
}

person.addEventListener("change", selectCharacter);
selectCharacter();
