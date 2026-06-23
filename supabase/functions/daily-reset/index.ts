import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing env" }), { status: 500 });
  }

  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase
    .from("occupancies")
    .update({ released_at: new Date().toISOString() })
    .is("released_at", null)
    .select("id");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ released: data?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } }
  );
});
