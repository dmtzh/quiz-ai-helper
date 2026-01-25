const questionSelectorInput = document.getElementById("questionSelector");
const answersSelectorInput = document.getElementById("answersSelector");
const getBtn = document.getElementById("get");
const analyzeBtn = document.getElementById("analyze");
const pickQuestionBtn = document.getElementById("pickQuestion");
const pickAnswersBtn = document.getElementById("pickAnswers");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

pickQuestionBtn.onclick = async () => {
  const activeTab = await getActiveTab();
  tabId = activeTab.id;
  chrome.runtime.sendMessage({
    type: "PICK_START",
    tabId,
    payload: { target: "question" }
  });
};

pickAnswersBtn.onclick = async () => {
  const activeTab = await getActiveTab();
  tabId = activeTab.id;
  chrome.runtime.sendMessage({
    type: "PICK_START",
    tabId,
    payload: { target: "answers" }
  });
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "PICK_RESULT") {
    if (msg.payload.target === "question") {
      questionSelectorInput.value = msg.payload.selector;
    }
    if (msg.payload.target === "answers") {
      answersSelectorInput.value = msg.payload.selector;
    }
  }
});

getBtn.onclick = async () => {
  const activeTab = await getActiveTab();
  tabId = activeTab.id;
  const selectors = {
    questionSelector: questionSelectorInput.value.trim(),
    answersSelector: answersSelectorInput.value.trim()
  };
  await chrome.runtime.sendMessage({
    type: "ASSISTANT_GET",
    tabId,
    payload: selectors
  });
};

analyzeBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: "ASSISTANT_ANALYZE" });
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "ASSISTANT_SOURCE_DATA") {
    renderQuestion(msg.payload);
    analyzeBtn.disabled = false;
  }

  if (msg.type === "ASSISTANT_RECOMMENDATION_READY") {
    renderRecommendation(msg.payload);
  }

  if (msg.type === "ERROR") {
    alert(msg.payload);
  }
});

function renderQuestion({ question, answers }) {
  document.getElementById("question").innerText = question;

  document.getElementById("answers").innerHTML =
    answers.map((a, i) => `<div>${i + 1}. ${a.text}</div>`).join("");
}

const result = document.getElementById("result");

function renderRecommendation({ answerIndex, confidence, reasoning, sources }) {
  result.innerHTML = `
    <div class="answer">
      ✅ Ответ: <b>${answerIndex + 1}</b>
    </div>

    <div class="confidence">
      Уверенность: ${(confidence * 100).toFixed(0)}%
      <div class="bar">
        <span style="width:${confidence * 100}%"></span>
      </div>
    </div>

    <details>
      <summary>Почему?</summary>
      <ul>${reasoning.map(r => `<li>${r}</li>`).join("")}</ul>
    </details>

    <details>
      <summary>Источники</summary>
      <ul>${sources.map(s => `<li>${s}</li>`).join("")}</ul>
    </details>
  `;
}
