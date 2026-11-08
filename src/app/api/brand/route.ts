import { resolveBrand } from "@/lib/brandLookup";
import { askGemini } from "@/lib/gemini";
import { DEFAULT_GEMINI_MODEL } from "@/lib/recognition";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  let body: { model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Не удалось проверить модель." }, { status: 400 });
  }

  const modelName = typeof body.model === "string" ? body.model.trim() : "";
  if (modelName.length < 4) return Response.json({ brand: null });

  const brand = await resolveBrand(modelName, async (prompt) => {
    if (!key) return { brand: null };
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    return askGemini(key, model, [{ text: prompt }]);
  });

  return Response.json({ brand: brand || null });
}
