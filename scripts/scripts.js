import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
} from "./aem.js";

const LCP_BLOCKS = []; // add your LCP blocks to the list

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector("h1");
  const picture = main.querySelector("picture");
  // eslint-disable-next-line no-bitwise
  if (
    h1 &&
    picture &&
    h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING
  ) {
    const section = document.createElement("div");
    section.append(buildBlock("hero", { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes("localhost"))
      sessionStorage.setItem("fonts-loaded", "true");
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Auto Blocking failed", error);
  }
}

const encodeHTML = (str) =>
  str.replace(/[\u00A0-\u9999<>\&]/g, (i) => `&#${i.charCodeAt(0)};`);

/**
 * converts text with attributes to <span> elements wit given attributes.
 * eg: [text]{color="red" class="highlight"} => <span color="red" class="highlight">text</span>
 * @param {string} expression
 */
export const convertInlineAttributes = (expression) => {
  const regex = /\[([^[\]]*)\]\{(.*?)\}/g;
  return expression.replace(regex, function (match, text, attrs) {
    text = encodeHTML(text);
    attrs = attrs
      .split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g) // match spaces only if not within quotes
      .map((attr) => {
        const [key, value] = attr.split("=");
        return `${key}="${encodeHTML(value.replace(/"/g, ""))}"`;
      })
      .join(" ");

    // Construct the HTML equivalent
    return `<span ${attrs}>${text}</span>`;
  });
};

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  decorateSpans(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 *
 * @param {HTMLElement} main
 */
export function decorateSpans(main) {
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    decorateTextNode(walker.currentNode);
  }
}

/**
 *
 * @param {Node} node
 */
export function decorateTextNode(node) {
  const textContent = node.textContent;
  if (textContent.includes("[") && textContent.includes("]{")) {
    const span = document.createElement("span");
    span.innerHTML = convertInlineAttributes(textContent);
    window.requestAnimationFrame(() => {
      node.replaceWith(span);
    });
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = "en";
  decorateTemplateAndTheme();
  const main = doc.querySelector("main");
  if (main) {
    decorateMain(main);
    document.body.classList.add("appear");
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem("fonts-loaded")) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector("main");
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector("header"));
  loadFooter(doc.querySelector("footer"));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  sampleRUM("lazy");
  sampleRUM.observe(main.querySelectorAll("div[data-block-name]"));
  sampleRUM.observe(main.querySelectorAll("picture > img"));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import("./delayed.js"), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
