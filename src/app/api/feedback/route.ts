import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { generationId, type, cardIndex, reorder, text } = body;

  // Validate type
  const validTypes = ["not_accurate", "not_good", "reorder", "freeform"];
  if (!validTypes.includes(type)) {
    return Response.json({ error: "Invalid feedback type" }, { status: 400 });
  }

  if (!generationId) {
    return Response.json({ error: "generationId required" }, { status: 400 });
  }

  // In V1, feedback is stored client-side in localStorage.
  // This endpoint is ready for Supabase connection.
  // When Supabase is connected:
  // const { data, error } = await supabase.from('feedback').insert({
  //   generation_id: generationId,
  //   type,
  //   card_index: cardIndex,
  //   reorder_value: reorder,
  //   freeform_text: text,
  // });

  return Response.json({
    success: true,
    feedback: {
      id: crypto.randomUUID(),
      generationId,
      type,
      cardIndex,
      reorderValue: reorder,
      freeformText: text,
      createdAt: new Date().toISOString(),
    },
  });
}
