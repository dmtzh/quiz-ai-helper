chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanel.html"
  });
});

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
      recommendation = null;

      chrome.runtime.sendMessage({
        type: "ASSISTANT_SOURCE_DATA",
        payload: response
      });
    }).catch(onError);
  }

  if (msg.type === "ASSISTANT_ANALYZE") {
    analyze(msg.payload);
  }
});


async function analyze({question, answers}) {
  const recommendation = {
    recommended: 3,
    confidence: 0.1,
    explanation: "Соответствует формулировке вопроса. Остальные варианты противоречат контексту"
  };
  
  // TODO: web search + LLM
  chrome.runtime.sendMessage({
    type: "ASSISTANT_RECOMMENDATION_READY",
    payload: recommendation
  });
}
