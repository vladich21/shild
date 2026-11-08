export async function askGemini(
  key: string,
  model: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  let result = await requestGemini(url, key, body);
  if (!result.ok && result.status >= 500) {
    result = await requestGemini(url, key, body);
  }
  if (!result.ok) throw new Error(modelError(result.status));
  return readModelJson(result.data);
}

async function requestGemini(url: string, key: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Нет связи с сервисом чтения фото. Проверьте интернет и попробуйте снова.");
  }
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function readModelJson(data: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}) {
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "");

  if (!text) {
    throw new Error("Не удалось прочитать текст на фото. Снимите наклейку или чек крупнее.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Не удалось разобрать фото. Попробуйте другой снимок.");
  }
}

function modelError(status: number) {
  if (status === 401 || status === 403) {
    return "Ключ для чтения фото не подошёл. Проверьте его и обновите страницу.";
  }
  if (status === 429) {
    return "Слишком много попыток подряд. Подождите минуту и загрузите фото ещё раз.";
  }
  if (status === 400) {
    return "Не получилось прочитать эти фото. Снимите наклейку и чек крупнее и попробуйте снова.";
  }
  if (status === 404) {
    return "Сервис чтения фото сейчас недоступен. Попробуйте позже.";
  }
  if (status >= 500) {
    return "Сервис чтения фото сейчас не отвечает. Попробуйте ещё раз через минуту.";
  }
  return "Не удалось распознать фото. Попробуйте другой снимок.";
}
