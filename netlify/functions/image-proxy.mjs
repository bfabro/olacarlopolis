const ALLOWED_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com"
]);

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "x-content-type-options": "nosniff"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    const source = event.queryStringParameters?.url;
    if (!source) {
      return { statusCode: 400, headers: CORS_HEADERS, body: "URL da imagem nao informada." };
    }

    const imageUrl = new URL(source);
    if (imageUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(imageUrl.hostname)) {
      return { statusCode: 403, headers: CORS_HEADERS, body: "Origem da imagem nao permitida." };
    }

    const imageResponse = await fetch(imageUrl.toString(), {
      headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/*" }
    });
    if (!imageResponse.ok) {
      return {
        statusCode: imageResponse.status || 502,
        headers: CORS_HEADERS,
        body: "Nao foi possivel carregar a imagem."
      };
    }

    const contentType = imageResponse.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return {
        statusCode: 415,
        headers: CORS_HEADERS,
        body: "O endereco informado nao retornou uma imagem."
      };
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=86400"
      },
      isBase64Encoded: true,
      body: imageBuffer.toString("base64")
    };
  } catch (error) {
    console.error("Erro no proxy de imagem.", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: "Erro ao carregar a imagem."
    };
  }
}
