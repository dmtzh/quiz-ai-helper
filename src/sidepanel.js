const questionTextInput = document.getElementById("questionText");
const answersSelectorInput = document.getElementById("answersSelector");
const getBtn = document.getElementById("get");
const analyzeBtn = document.getElementById("analyze");
const pickAnswersBtn = document.getElementById("pickAnswers");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

questionTextInput.onchange = () => {
  renderQuestionField([]);
};

const questionSelectorInputs = document.querySelectorAll(".question-selector");
questionSelectorInputs.forEach(input => input.onchange = (e) => {
  if (e.target.value.trim() === "") {
    const questionNum = Number(e.target.closest(".question-selector-area").dataset.questionNum);
    clearQuestionSelector(questionNum);
  }
});

function clearQuestionSelector(questionNum) {
  const statusElt = document.querySelector(`.question-selector-area[data-question-num="${questionNum}"] .question-status`);
  statusElt.innerHTML = "";
  statusElt.className = "question-status";
  const questionPart = {questionNum, questions: []};
  renderQuestionField([questionPart]);
}

const pickQuestionBtns = document.querySelectorAll(".pick-question");
pickQuestionBtns.forEach(btn => btn.onclick = async(e) => {
  const activeTab = await getActiveTab();
  tabId = activeTab.id;
  chrome.runtime.sendMessage({
    type: "PICK_START",
    tabId,
    payload: { target: "question", questionNum: Number(e.target.closest(".question-selector-area").dataset.questionNum) }
  });
});

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
      const questionSelectorInput = document.querySelector(`.question-selector-area[data-question-num="${msg.payload.questionNum}"] .question-selector`);
      questionSelectorInput.value = msg.payload.selector;
      renderQuestionStatus(msg.payload);
      const newQuestionParts = [{ questionNum: msg.payload.questionNum, questions: msg.payload.questions }];
      renderQuestionField(newQuestionParts);
    }
    if (msg.payload.target === "answers") {
      answersSelectorInput.value = msg.payload.selector;
      renderAnswersStatus(msg.payload.count);
      renderAnswersFields(msg.payload.answers);
    }
  }
});

function renderQuestionStatus(questionPart) {
  const statusElt = document.querySelector(`.question-selector-area[data-question-num="${questionPart.questionNum}"] .question-status`);
  const count = questionPart.questions.length;

  switch (count) {
    case -1:
      statusElt.textContent = "❌ Invalid question selector";
      statusElt.className = "error";
      break;
    case 0:
      statusElt.textContent = "❌ No question found";
      statusElt.className = "error";
      break;
    case 1:
      statusElt.textContent = "✅ Found 1 question";
      statusElt.className = "ok";
      break;
    default:
      statusElt.textContent = `⚠ Found ${count} questions`;
      statusElt.className = "warn";
  }
  
  statusElt.className += " question-status";
}

function renderAnswersStatus(count) {
  const statusEll = document.getElementById("answersStatus");

  if (count === -1) {
    statusEll.textContent = "❌ Invalid answers selector";
    statusEll.className = "error";
    return;
  }

  if (count === 0) {
    statusEll.textContent = "❌ No elements found";
    statusEll.className = "error";
    return;
  }

  if (count === 1) {
    statusEll.textContent = "⚠ Found 1 element";
    statusEll.className = "warn";
    return;
  }

  statusEll.textContent = `✅ Found ${count} answers`;
  statusEll.className = "ok";
}

getBtn.onclick = async () => {
  const activeTab = await getActiveTab();
  const tabId = activeTab.id;
  const questionSelectors = [...document.querySelectorAll(".selectors .question-selector")]
    .map(qs => {return { questionNum: Number(qs.closest(".question-selector-area").dataset.questionNum), selector: qs.value.trim() };})
    .filter(qs => qs.selector != "");
  const selectors = {
    questionSelectors,
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

function renderQuestion({ questionParts, answers }) {
  questionParts.forEach(renderQuestionStatus)
  renderQuestionField(questionParts);
  renderAnswersFields(answers);
}

function renderQuestionField(newQuestionParts) {
  const prependText = questionTextInput.value.trim();
  const container = document.getElementById("question");
  const questionParts = container.querySelector("textarea")?.questionParts ?? [];
  const questionNumsToUpdate = newQuestionParts.map(q => q.questionNum);
  const unchangedQuestionParts = questionParts.filter(qp => !questionNumsToUpdate.includes(qp.questionNum));
  const updatedQuestionParts = [...newQuestionParts, ...unchangedQuestionParts].sort((a, b) => a.questionNum - b.questionNum);
  container.innerHTML = "";
  const textarea = document.createElement("textarea");
  textarea.questionParts = updatedQuestionParts;
  const textParts = [prependText, ...updatedQuestionParts.flatMap(qp => qp.questions)];
  textarea.value = textParts.filter(tp => tp != null && tp.trim() != "").join(" ");
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
