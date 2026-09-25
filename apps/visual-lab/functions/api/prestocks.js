const UPSTREAM = "https://keys-api-stocklana.faadil-casecraft.workers.dev/api/v0.2/integrations/prestocks";

export async function onRequestGet() {
  const response = await fetch(UPSTREAM, {
    headers: { accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 60 }
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60"
    }
  });
}
