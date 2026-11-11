import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600, stale-while-revalidate=1200", "x-content-type-options": "nosniff" };
const RSS_URL = "https://news.google.com/rss/search?q=(PETR4%20OR%20Petrobras%20OR%20VALE3%20OR%20Vale%20OR%20ITUB4%20OR%20Ita%C3%BA%20OR%20MGLU3)%20(a%C3%A7%C3%B5es%20OR%20B3)&hl=pt-BR&gl=BR&ceid=BR:pt-419";
const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" };
const decode = (value = "") => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&(#x?[0-9a-f]+|amp|quot|apos|lt|gt);/gi, (_, code) => { if (entities[code]) return entities[code]; const hex = code[1]?.toLowerCase() === "x"; return String.fromCodePoint(parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10)); }).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const field = (xml, tag) => decode(xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "");
function relativeDate(value) { const date = new Date(value); if (!Number.isFinite(date.getTime())) return "Data não informada"; const hours = Math.max(0, Math.round((Date.now() - date.getTime()) / 36e5)); return hours < 1 ? "Agora" : hours < 24 ? `Há ${hours}h` : `Há ${Math.round(hours / 24)}d`; }
function assetFor(title) { const text = title.toLowerCase(); if (/petrobras|petr[34]/.test(text)) return "PETR4"; if (/\bvale\b|vale3/.test(text)) return "VALE3"; if (/ita[uú]|itub4/.test(text)) return "ITUB4"; if (/magalu|magazine luiza|mglu3/.test(text)) return "MGLU3"; return "Mercado"; }

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  try {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000); const response = await fetch(RSS_URL, { signal: controller.signal, headers: { "user-agent": "OlaCarlopolis-NewsReader/1.0" } }); clearTimeout(timeout);
    if (!response.ok) throw new Error(`RSS indisponível (${response.status}).`); const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => { const block = match[1]; const title = field(block, "title"); const source = field(block, "source") || title.split(" - ").pop(); const cleanTitle = title.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""); const publishedAt = field(block, "pubDate"); return { title: cleanTitle, link: field(block, "link"), source, publishedAt, relativeDate: relativeDate(publishedAt), asset: assetFor(title), description: `Notícia relacionada a ${assetFor(title)} e ao mercado brasileiro.` }; }).filter((item) => item.title && item.link);
    const unique = items.filter((item, index, array) => array.findIndex((other) => other.title.toLowerCase() === item.title.toLowerCase()) === index);
    const diverse = unique.filter((item, index, array) => item.asset !== "Mercado" && array.findIndex((other) => other.asset === item.asset) === index);
    const selected = [...diverse, ...unique.filter((item) => !diverse.includes(item))].slice(0, 6);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "Google Notícias RSS", updatedAt: new Date().toISOString(), items: selected }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.name === "AbortError" ? "A fonte demorou para responder." : error.message }) }; }
}
