import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

export async function askLLM(llmApiUrl, llmApiKey, llmModel, question, answers) {
  const response = await fetch(llmApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${llmApiKey}`
    },
    body: JSON.stringify({
      model: llmModel,
      plugins: [
        // { id: "web", engine: "native" }
      ],
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question, answers) }
      ],
      temperature: 0.2
    })
  });
  
  // const recommendation = {
  //   recommended: 3,
  //   confidence: 0.1,
  //   explanation: "Соответствует формулировке вопроса. Остальные варианты противоречат контексту"
  // };

  const data = await response.json();
  console.log(data);

  // ожидаем, что модель может вернуть не только JSON
  let content = data?.choices?.at(0)?.error ?? data?.choices?.at(0)?.message?.content ?? data?.error;
  switch (typeof content) {
    case "string":
      const separator = '"recommended":';
      let parts = content.split(separator);
      parts.shift();
      content = `{${separator}${parts.join(separator)}`;
      const closingBracketSeparator = "}";
      const endsWithClosingBracket = content.endsWith(closingBracketSeparator);
      if (endsWithClosingBracket)
        return JSON.parse(content);
      parts = content.split(closingBracketSeparator);
      parts.pop();
      content = `${parts.join(closingBracketSeparator)}${closingBracketSeparator}`;
      return JSON.parse(content);
    default:
      return content;
  }
}
