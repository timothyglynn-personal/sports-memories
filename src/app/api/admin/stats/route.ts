export async function GET() {
  // In V1, stats are computed client-side from localStorage.
  // This endpoint is ready for Supabase connection.
  // When connected, it will query the database:
  //
  // const { data: generations } = await supabase.from('generations').select('*');
  // const { data: feedback } = await supabase.from('feedback').select('*');
  //
  // For now, return a placeholder indicating client-side computation.

  return Response.json({
    message:
      "Stats are computed client-side in V1. Connect Supabase for server-side aggregation.",
    schema: {
      totalGenerations: "count of generations",
      accuracyRate: "% of cards not flagged as not_accurate",
      qualityRate: "% of cards not flagged as not_good",
      avgReorderDistance: "average positional difference from original ranking",
    },
  });
}
