chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanel.html"
  });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "ASSISTANT_START" || msg.type === "ASSISTANT_STOP") {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(async tab => {
        try {
          await chrome.tabs.sendMessage(tab.id, msg);
        } catch(err) {}
      });
    });
  }
});

let currentQuestion = null;
let recommendation = null;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "QUESTION_UPDATE") {
    if (JSON.stringify(msg.payload) !== JSON.stringify(currentQuestion)) {
      console.log("question changed");
      currentQuestion = msg.payload;
      analyze(currentQuestion);
    }
  }
});

async function analyze({ question, answers }) {
  // TODO: web search + LLM
  recommendation = {
    answerIndex: 1,
    confidence: 0.82,
    reasoning: [
      "Соответствует формулировке вопроса",
      "Остальные варианты противоречат контексту"
    ],
    sources: ["wikipedia.org", "example.com"]
  };

  chrome.runtime.sendMessage({
    type: "RECOMMENDATION_READY",
    payload: recommendation
  });
}

// chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
//   if (msg.type === 'ANALYZE') {
//     const { question, answers } = msg.payload;

//     // TODO: web search + LLM
//     sendResponse({
//       recommended: 2,
//       confidence: 0.74,
//       explanation: "Placeholder explanation"
//     });
//   }
// });
