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
});
