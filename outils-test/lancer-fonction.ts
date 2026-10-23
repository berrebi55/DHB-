// Lance une Edge Function sur un port de test (la fonction appelle Deno.serve(handler)).
const original = Deno.serve.bind(Deno);
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (h: Deno.ServeHandler) => original({ port: Number(Deno.env.get("PORT_TEST") ?? "54399"), hostname: "127.0.0.1" }, h);
await import("file:///" + Deno.args[0]);
