import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateFloorPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; plotW?: number; plotH?: number }) => {
    const prompt = String(input?.prompt ?? "").trim().slice(0, 1200);
    if (!prompt) throw new Error("Describe the home you want first.");
    return {
      prompt,
      plotW: Math.min(300, Math.max(10, Number(input?.plotW) || 40)),
      plotH: Math.min(300, Math.max(10, Number(input?.plotH) || 50)),
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const system = [
      "You are an architect that outputs residential floor plans as JSON only.",
      `The plot is ${data.plotW} ft wide (x axis) and ${data.plotH} ft deep (y axis).`,
      "Return an object: {\"rooms\":[{\"name\":string,\"x\":number,\"y\":number,\"w\":number,\"h\":number}]}",
      "All units are feet. Rooms must be axis-aligned rectangles that tile the plot without overlapping and stay inside the plot bounds.",
      "Use realistic sizes: bedrooms 10-14 ft, bathrooms 5-8 ft, living 12-18 ft. Include every room the user asks for.",
      "Output raw JSON only, no markdown fences, no commentary.",
    ].join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI gateway failed [${res.status}]: ${body}`);
      if (res.status === 429) throw new Error("Too many requests — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
      throw new Error("Could not generate a plan right now.");
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: { rooms?: unknown } = {};
    try {
      parsed = JSON.parse(content.replace(/^```(?:json)?|```$/g, "").trim());
    } catch {
      throw new Error("The AI returned an unreadable plan. Try rephrasing.");
    }

    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    return {
      rooms: rooms.slice(0, 24).map((r, i) => {
        const room = (r ?? {}) as Record<string, unknown>;
        return {
          id: `ai-${i}-${Math.random().toString(36).slice(2, 8)}`,
          name: String(room["name"] ?? `Room ${i + 1}`).slice(0, 40),
          x: Math.max(0, Number(room["x"]) || 0),
          y: Math.max(0, Number(room["y"]) || 0),
          w: Math.max(3, Number(room["w"]) || 10),
          h: Math.max(3, Number(room["h"]) || 10),
          tone: i % 6,
        };
      }),
      openings: [],
    };
  });
