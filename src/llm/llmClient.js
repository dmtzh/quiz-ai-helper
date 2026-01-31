import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

export async function askLLM({ question, answers }) {
  const response = await fetch("LLM_API_ENDPOINT", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question, answers) }
      ],
      temperature: 0.2
    })
  });

  const data = await response.json();

  // ожидаем, что модель вернула чистый JSON
  return JSON.parse(data.choices[0].message.content);
}
