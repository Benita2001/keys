const UPSTREAM = "https://keys-api-stocklana.faadil-casecraft.workers.dev/api/v0.2/market/discovery";

export async function onRequestGet() {
  const response = await fetch(UPSTREAM, {
    headers: { accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 20 }
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=20, s-maxage=20"
    }
  });
}
