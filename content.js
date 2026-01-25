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

function readQuestion() {
  const questionEl = findVisibleQuestion(".t");
  if (!questionEl) return null;

  const question = questionEl.innerText.trim();

  const answerEls = [...questionEl
    .closest(".q, form, body")
    .querySelectorAll(".opt")]
    .filter(isVisible);

  if (!answerEls.length) return null;

  const answers = answerEls.map((el, index) => ({
      index,
      text: el.innerText.trim()
    }));

  return { question, answers };
}

let timerId = null;

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "ASSISTANT_START") {
    startInterval();
  }

  if (msg.type === "ASSISTANT_STOP") {
    stopInterval();
  }
});

function startInterval() {
  if (timerId !== null) {
    console.log("Content: interval already running");
    return;
  }

  console.log("Content: starting interval");

  timerId = setInterval(() => {
    const payload = readQuestion();
    if (!payload) return;

    try {
      chrome.runtime.sendMessage({
        type: "QUESTION_UPDATE",
        payload: payload
      });
    } catch (err) {
      stopInterval()
    }
  }, 5000);
}

function stopInterval() {
  if (timerId === null) {
    console.log("Content: interval already stopped");
    return;
  }

  console.log("Content: stopping interval");

  clearInterval(timerId);
  timerId = null;
}
