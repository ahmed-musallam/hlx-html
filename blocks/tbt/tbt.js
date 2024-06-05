export default function decorate(block) {
  // add 2000 button elements to the block
  for (let i = 0; i < 2000; i++) {
    const button = document.createElement("button");
    button.textContent = "Button";
    block.appendChild(button);
  }
}
