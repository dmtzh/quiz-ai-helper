const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

startBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: "ASSISTANT_START" });
  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: "ASSISTANT_STOP" });
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

window.addEventListener("beforeunload", () => {
  chrome.runtime.sendMessage({ type: "ASSISTANT_STOP" });
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

const content = document.getElementById("content");

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "RECOMMENDATION_READY") {
    render(msg.payload);
  }
});

function render({ answerIndex, confidence, reasoning, sources }) {
  content.innerHTML = `
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
