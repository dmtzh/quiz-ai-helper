import { askLLM } from "../llm/llmClient.js";

export async function analyzeQuestion(question, answers) {
  if (!question || !answers || Object.keys(answers).length === 0) {
    throw new Error("Invalid input data");
  }

  const result = await askLLM(question, answers);

  // минимальная валидация
  if (!result.recommended || !result.scores) {
    throw new Error("Invalid LLM response");
  }

  return result;
}
