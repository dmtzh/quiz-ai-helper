chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanel.html"
  });
});

let storedQuestion = null;
let recommendation = null;

function onError(error) {
  console.error(`Error: ${error}`);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PICK_START") {
    chrome.tabs.sendMessage(msg.tabId, msg);
  }

  if (msg.type === "ASSISTANT_GET") {
    chrome.tabs.sendMessage(
      msg.tabId,
      msg
    ).then((response) => {
      storedQuestion = response;
      recommendation = null;

      chrome.runtime.sendMessage({
        type: "ASSISTANT_SOURCE_DATA",
        payload: storedQuestion
      });
    }).catch(onError);
  }

  if (msg.type === "ASSISTANT_ANALYZE") {
    if (!storedQuestion) {
      chrome.runtime.sendMessage({
        type: "ERROR",
        payload: "No question saved"
      });
      return;
    }

    analyze(storedQuestion);
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
    type: "ASSISTANT_RECOMMENDATION_READY",
    payload: recommendation
  });
}
