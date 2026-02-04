const questionTextInput = document.getElementById("questionText");
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
      renderQuestionStatus(msg.payload.count);
      renderQuestionField(msg.payload.question);
    }
    if (msg.payload.target === "answers") {
      answersSelectorInput.value = msg.payload.selector;
      renderAnswersStatus(msg.payload.count);
      renderAnswersFields(msg.payload.answers);
    }
  }
});

function renderQuestionStatus(count) {
  const statusEl = document.getElementById("questionStatus");

  if (count === -1) {
    statusEl.textContent = "❌ Invalid question selector";
    statusEl.className = "error";
    return;
  }

  if (count === 0) {
    statusEl.textContent = "❌ No question found";
    statusEl.className = "error";
    return;
  }

  if (count === 1) {
    statusEl.textContent = "✅ Found 1 question";
    statusEl.className = "ok";
    return;
  }

  statusEl.textContent = `⚠ Found ${count} questions`;
  statusEl.className = "warn";
}

function renderAnswersStatus(count) {
  const statusEl = document.getElementById("answersStatus");

  if (count === -1) {
    statusEl.textContent = "❌ Invalid answers selector";
    statusEl.className = "error";
    return;
  }

  if (count === 0) {
    statusEl.textContent = "❌ No elements found";
    statusEl.className = "error";
    return;
  }

  if (count === 1) {
    statusEl.textContent = "⚠ Found 1 element";
    statusEl.className = "warn";
    return;
  }

  statusEl.textContent = `✅ Found ${count} answers`;
  statusEl.className = "ok";
}

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


function collectQuestionData() {
  const questionTextarea = document.querySelector("#question textarea");
  const answerInputs = document.querySelectorAll("#answers input");

  const question = questionTextarea
    ? questionTextarea.value.trim()
    : "";

  const answers = Array.from(answerInputs).map((input, i) => ({
    key: i + 1,
    text: input.value.trim()
  }));

  return { question, answers };
}
function collectLLMData() {
  const llmApiUrl = document.getElementById("llmApiUrl").value.trim();
  const llmApiKey = document.getElementById("llmApiKey").value.trim();
  const llmModel = document.getElementById("llmModel").value.trim();
  return {llmApiUrl, llmApiKey, llmModel};
}
analyzeBtn.onclick = () => {
  
  const llmData = collectLLMData();
  questionData = collectQuestionData();
  payload = {...llmData, ...questionData};
  chrome.runtime.sendMessage({ type: "ASSISTANT_ANALYZE", payload });
  document.getElementById("recommendation").innerHTML = "<div>Analyzing. Please wait...</div>"
};

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "ASSISTANT_SOURCE_DATA") {
    renderQuestion(msg.payload);
  }
  if (msg.type === "ASSISTANT_RECOMMENDATION_READY") {
    renderRecommendation(msg.payload);
  }
  if (msg.type === "ASSISTANT_RECOMMENDATION_ERROR") {
    renderRecommendationError(msg.payload);
  }
});

function renderQuestion({ question, answers }) {
  renderQuestionField(question);
  renderAnswersFields(answers);
}

function renderQuestionField(question) {
  questionText = questionTextInput.value.trim();
  const container = document.getElementById("question");
  container.innerHTML = "";

  const textarea = document.createElement("textarea");
  questions = [questionText, ...question];
  textarea.value = questions.filter(q => q != null && q.trim() != "").join(" ");
  textarea.rows = 4;
  textarea.style.width = "100%";
  textarea.placeholder = "Question";

  textarea.addEventListener("input", updateAnalyzeButtonState);

  container.appendChild(textarea);

  updateAnalyzeButtonState();
}


function renderAnswersFields(answers) {
  const container = document.getElementById("answers");
  container.innerHTML = "";

  answers.forEach((a, i) => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";

    const index = document.createElement("span");
    index.textContent = `${i + 1}.`;
    index.style.minWidth = "20px";

    const input = document.createElement("input");
    input.type = "text";
    input.value = a || "";
    input.placeholder = `Answer ${i + 1}`;
    input.style.width = "100%";

    input.addEventListener("input", updateAnalyzeButtonState);

    wrapper.appendChild(index);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });

  updateAnalyzeButtonState();
}


function updateAnalyzeButtonState() {
  const questionTextarea = document.querySelector("#question textarea");
  const answerInputs = document.querySelectorAll("#answers input");

  const questionFilled =
    questionTextarea && questionTextarea.value.trim().length > 0;

  const allAnswersFilled =
    answerInputs.length > 0 &&
    Array.from(answerInputs).every(i => i.value.trim().length > 0);

  analyzeBtn.disabled = !(questionFilled && allAnswersFilled);
}

function valueToString(value, nestedLevel = 0) {
  const indent = "&nbsp;".repeat(nestedLevel);
  const childNestedLevel = nestedLevel + 1;
  switch (Object.prototype.toString.call(value)) {
    case "[object Object]":
      return `{<br/>${Object.entries(value).map(([key, value]) => `${indent}&nbsp;${key}: ${valueToString(value, childNestedLevel)}`).join(",<br/>")}<br/>${indent}}`;
    case "[object Array]":
      return `[<br/>${value.map(val => `${indent}&nbsp;${valueToString(val, childNestedLevel)}`).join(",<br/>")}<br/>${indent}]`;
    case "[object String]":
      return `"${htmlEncode(value)}"`;
    default:
      return String(value);
  }
}

function htmlEncode(str) {
  var el = document.createElement("div");
  el.innerText = str;
  return el.innerHTML;
}

function renderRecommendation(recommendation) {
  const recommendationElt = document.getElementById("recommendation");
  recommendationElt.innerHTML = `
    <div>${valueToString(recommendation)}</div>
  `;
}
// function renderRecommendation({recommended, confidence, explanation}) {
//   const recommendation = document.getElementById("recommendation");
//   recommendation.innerHTML = `
//     <div class="answer">
//       ✅ Ответ: <b>${recommended}</b>
//     </div>

//     <div class="confidence">
//       Уверенность: ${(confidence * 100).toFixed(0)}%
//       <div class="bar">
//         <span style="width:${confidence * 100}%"></span>
//       </div>
//     </div>

//     <summary>Почему?</summary>
//     <div>${explanation}</div>
//   `;
// }
function renderRecommendationError(error) {
  const recommendation = document.getElementById("recommendation");
  recommendation.innerHTML = `
    <div>Упс, произошла ошибка</div>
    <div>${JSON.stringify(error)}</div>
  `;
}
