import { analyzeQuestion } from "./core/analyzeQuestion.js";
import { askLLM } from "./llm/llmClient.js";

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

async function analyze({llmApiUrl, llmApiKey, llmModel, question, answers}) {
  try {
    const recommendation = await askLLM(llmApiUrl, llmApiKey, llmModel, question, answers);
    // const recommendation = await analyzeQuestion(question, answers);
    chrome.runtime.sendMessage({
      type: "ASSISTANT_RECOMMENDATION_READY",
      payload: recommendation
    });
  } catch (err) {
    console.log(err);
    chrome.runtime.sendMessage({
      type: "ASSISTANT_RECOMMENDATION_ERROR",
      payload: err.toString()
    });
  }
}
