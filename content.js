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

function getTextsBySelector(selector) {
  let nodes;

  try {
    nodes = document.querySelectorAll(selector);
  } catch {
    return [];
  }

  return [...nodes]
    .map(el => extractText(el))
    .filter(Boolean);
}

function extractText(el) {
  // radio / checkbox → label
  if (el.matches('input[type=radio], input[type=checkbox]')) {
    const label =
      el.closest('label') ||
      document.querySelector(`label[for="${el.id}"]`);

    return normalizeText(label?.innerText);
  }

  return normalizeText(el.innerText || el.textContent);
}

function normalizeText(text) {
  if (!text) return "";

  return escapeHtml(
    text
      .replace(/\s+/g, " ")
      .replace(/\u00A0/g, " ")
      .trim()
  );
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

  const answers = getTextsBySelector(answersSelector).map((text, index) => ({
      index,
      text
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

  let payload = {target: pickTarget};
  if (pickTarget === "answers") {
    payload.selector = buildAnswersSelector(e.target);
  } else {
    payload.selector = buildSelector(e.target);
  }
  payload.count = getTextsBySelector(payload.selector).length;
  
  chrome.runtime.sendMessage({
    type: "PICK_RESULT",
    payload
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

  while (el && el.nodeType === 1 && parts.length < 3) {
    let part = el.tagName.toLowerCase();

    if (el.classList.length) {
      part += "." + el.classList[0];
    }

    parts.unshift(part);
    el = el.parentElement;
  }

  return parts.join(" > ");
}

function commonClass(nodes) {
  const classLists = nodes.map(n => [...n.classList]);

  return classLists[0].find(cls =>
    classLists.every(list => list.includes(cls))
  );
}

function normalizeAnswerTarget(el) {
  // 1️⃣ сам input
  if (el.matches('input[type=radio], input[type=checkbox]')) {
    return el;
  }

  // 2️⃣ input внутри
  const input = el.querySelector?.(
    'input[type=radio], input[type=checkbox]'
  );
  if (input) return input;

  // 3️⃣ input выше
  return el.closest('label, div')?.querySelector(
    'input[type=radio], input[type=checkbox]'
  );
}

function buildAnswersSelector(clickedEl) {
  const inputEl = normalizeAnswerTarget(clickedEl);

  if (inputEl) {
    return buildInputGroupSelector(inputEl);
  }

  // fallback — обычная логика (li / div / label)
  return buildGenericAnswersSelector(clickedEl);
}

function buildInputGroupSelector(input) {
  const type = input.type;

  // 1️⃣ по name
  if (input.name) {
    return `input[type=${type}][name="${input.name}"]`;
  }

  // 2️⃣ общий parent
  let parent = input.parentElement;

  while (parent && parent !== document.body) {
    const inputs = parent.querySelectorAll(
      `input[type=${type}]`
    );

    if (inputs.length >= 2) {
      return `${buildSelector(parent)} input[type=${type}]`;
    }

    parent = parent.parentElement;
  }

  // 3️⃣ fallback
  return `input[type=${type}]`;
}

function buildGenericAnswersSelector(el) {
  let parent = el.parentElement;

  while (parent && parent !== document.body) {
    const siblings = [...parent.children].filter(
      n => n.tagName === el.tagName
    );

    if (siblings.length >= 2) {
      // 1️⃣ общий class
      const cls = commonClass(siblings);
      if (cls) {
        return `${buildSelector(parent)} > ${el.tagName.toLowerCase()}.${cls}`;
      }

      // 2️⃣ только tag
      return `${buildSelector(parent)} > ${el.tagName.toLowerCase()}`;
    }

    parent = parent.parentElement;
  }

  // fallback
  return buildSelector(el);
}