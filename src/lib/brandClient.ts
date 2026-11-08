export async function fetchBrand(model: string) {
  try {
    const response = await fetch("/api/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    const data = (await response.json()) as { brand?: string | null };
    return typeof data.brand === "string" ? data.brand.trim() : "";
  } catch {
    return "";
  }
}
