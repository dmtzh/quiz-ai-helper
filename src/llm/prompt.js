export const SYSTEM_PROMPT = `
You are an assistant that MUST choose the most correct answer in a multiple-choice test.

Rules:
- You can guess.

Tasks:
1. Analyze question type and detect negation.
2. Perform web search.
3. Evaluate each answer.
4. Score answers [0.0–1.0].
5. Handle NOT / EXCEPT correctly.
6. Return strict JSON only.

Output format:
{
  "recommended": "<answer key>",
  "confidence": <0–1>,
  "explanation": "...",
  "scores": { "<key>": <score> },
  "rejected": { "<key>": "<reason>" }
}
`;

export function buildUserPrompt(question, answers) {
  const answersText = answers
    .map(({key, text}) => `${key}) ${text}`)
    .join("\n");

  return `
Question:
${question}

Answers:
${answersText}
`;
}
