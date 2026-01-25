function isVisible(el) {
  if (!el) return false;

  const style = getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

function findVisibleQuestion(selector) {
  const elements = document.querySelectorAll(selector);

  for (const el of elements) {
    if (isVisible(el)) return el;
  }

  return null;
}

function readQuestion({questionSelector, answersSelector}) {
  const questionEl = findVisibleQuestion(questionSelector);
  if (!questionEl) return {question: "", answers: []};

  const question = questionEl.innerText.trim();

  const answerEls = [...questionEl
    .closest("form, body")
    .querySelectorAll(answersSelector)]
    .filter(isVisible);

  if (!answerEls.length) return {question, answers: []};

  const answers = answerEls.map((el, index) => ({
      index,
      text: el.innerText.trim()
    }));

  return { question, answers };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ASSISTANT_GET") {
    const data = readQuestion(msg.payload);
    sendResponse(data);
    return true;
  }

  if (msg.type === "PICK_START") {
    pickTarget = msg.payload.target;
    enablePickMode();
  }
});

let pickTarget = null;
let lastHover = null;

function enablePickMode() {
  document.addEventListener("mouseover", onHover, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
}

function disablePickMode() {
  document.removeEventListener("mouseover", onHover, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKey, true);

  if (lastHover) lastHover.style.outline = "";
  lastHover = null;
  pickTarget = null;
}

function onHover(e) {
  if (lastHover) lastHover.style.outline = "";
  lastHover = e.target;
  lastHover.style.outline = "2px solid #4caf50";
}

function onClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const selector = buildSelector(e.target);

  chrome.runtime.sendMessage({
    type: "PICK_RESULT",
    payload: {
      target: pickTarget,
      selector
    }
  });

  disablePickMode();
}

function onKey(e) {
  if (e.key === "Escape") {
    disablePickMode();
  }
}

function buildSelector(el) {
  if (el.id) return `#${el.id}`;

  const parts = [];

  while (el && el.nodeType === 1 && parts.length < 4) {
    let part = el.tagName.toLowerCase();

    if (el.className) {
      const cls = el.className.split(" ")[0];
      if (cls) part += "." + cls;
    }

    parts.unshift(part);
    el = el.parentElement;
  }

  return parts.join(" > ");
}