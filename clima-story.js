(() => {
  "use strict";

  const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
  const RESERVOIR_API = "https://olacarlopolis.vercel.app/api/represa/chavantes";
  const RESERVOIR_HISTORY = "https://contadoracessos-default-rtdb.firebaseio.com/represas/chavantes/historico.json";
  const LOGO = "images/img_padrao_site/logo-ola-carlopolis.png.png";
  const COORDS = { lat: -23.4267, lng: -49.7239 };

  function number(value) {
    const match = String(value ?? "").match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0].replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function image(src) {
    return new Promise((resolve, reject) => {
      const item = new Image();
      item.onload = () => resolve(item);
      item.onerror = reject;
      item.src = src;
    });
  }

  async function screenMoonImage() {
    const moonSvg = document.querySelector("#lua-desenho svg");
    if (!moonSvg) return null;
    const clone = moonSvg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "320");
    clone.setAttribute("height", "320");
    const source = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
    try {
      return await image(url);
    } catch (error) {
      console.warn("Não foi possível reutilizar a Lua da tela na arte:", error);
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function rounded(ctx, x, y, width, height, radius, fill, stroke = "") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function wrapped(ctx, text, x, y, width, lineHeight, maxLines = 3) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? current + " " + word : word;
      if (!current || ctx.measureText(candidate).width <= width) current = candidate;
      else { lines.push(current); current = word; }
    });
    if (current) lines.push(current);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) visible[visible.length - 1] += "…";
    visible.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  }

  function dayKey(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(date);
  }

  async function weather(date) {
    const query = new URLSearchParams({
      latitude: COORDS.lat,
      longitude: COORDS.lng,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max",
      timezone: "America/Sao_Paulo", wind_speed_unit: "kmh", start_date: date, end_date: date
    });
    const response = await fetch(WEATHER_API + "?" + query, { cache: "no-store" });
    if (!response.ok) throw new Error("Clima indisponível");
    const data = await response.json();
    return {
      current: data.current || {},
      min: data.daily?.temperature_2m_min?.[0],
      max: data.daily?.temperature_2m_max?.[0],
      rain: data.daily?.precipitation_probability_max?.[0],
      rainTotal: data.daily?.precipitation_sum?.[0],
      uv: data.daily?.uv_index_max?.[0]
    };
  }

  async function reservoir() {
    const [currentResult, historyResult] = await Promise.allSettled([
      fetch(RESERVOIR_API, { cache: "no-store" }).then((response) => response.json()),
      fetch(RESERVOIR_HISTORY, { cache: "no-store" }).then((response) => response.json())
    ]);
    const currentData = currentResult.status === "fulfilled" && currentResult.value?.success ? currentResult.value : null;
    const historyRaw = historyResult.status === "fulfilled" && historyResult.value ? historyResult.value : {};
    const records = Object.values(historyRaw).filter(Boolean).map((item) => ({
      date: item.dataISO || item.atualizadoEm || item.data,
      level: number(item.cota ?? item.cotaAtual ?? item.nivel),
      volume: number(item.volume ?? item.volumeUtil)
    })).filter((item) => item.date && Number.isFinite(item.level));
    if (currentData) {
      const currentRecord = {
        date: currentData.atualizadoEm || Date.now(),
        level: number(currentData.cotaAtual ?? currentData.cota),
        volume: number(currentData.volumeUtil ?? currentData.volume)
      };
      if (Number.isFinite(currentRecord.level)) records.push(currentRecord);
    }
    const daily = new Map();
    records.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((item) => daily.set(dayKey(item.date), item));
    const days = [...daily.values()];
    const current = days.at(-1) || null;
    const previous = days.at(-2) || null;
    return {
      level: current?.level ?? null,
      volume: current?.volume ?? null,
      delta: Number.isFinite(current?.level) && Number.isFinite(previous?.level) ? current.level - previous.level : null,
      date: current?.date || null
    };
  }

  function moon(date) {
    const epoch = 2451550.1;
    const period = 29.530588861;
    const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    let days = (Math.floor(utc / 86400000) + 2440587.5 - epoch) % period;
    if (days < 0) days += period;
    const fraction = days / period;
    const light = Math.round((fraction <= .5 ? fraction * 2 : (1 - fraction) * 2) * 100);
    let name = "Lua Nova";
    if (light >= 90) name = light === 100 ? "Lua Cheia" : "Quase Cheia";
    else if (fraction < .22) name = "Lua Crescente";
    else if (fraction < .28) name = "Quarto Crescente";
    else if (fraction < .5) name = "Gibosa Crescente";
    else if (fraction < .72) name = "Gibosa Minguante";
    else if (fraction < .78) name = "Quarto Minguante";
    else if (fraction < .94) name = "Lua Minguante";
    return { fraction, light, name };
  }

  function weatherText(code) {
    return ({
      0: "Céu limpo", 1: "Predomínio de sol", 2: "Parcialmente nublado", 3: "Nublado",
      45: "Neblina", 48: "Neblina com geada", 51: "Garoa leve", 53: "Garoa",
      55: "Garoa forte", 61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
      80: "Pancadas leves", 81: "Pancadas de chuva", 82: "Pancadas fortes",
      95: "Trovoadas", 96: "Trovoadas com granizo", 99: "Tempestade com granizo"
    })[Number(code)] || "Condição variável";
  }

  function windDirection(degrees) {
    return ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round((Number(degrees) || 0) / 45) % 8];
  }

  function advice(data) {
    if ((data.rain || 0) >= 60 || (data.rainTotal || 0) >= 5) return "Leve guarda-chuva e acompanhe as atualizações antes de sair.";
    if ((data.uv || 0) >= 6) return "Use protetor solar, chapéu e evite exposição prolongada ao meio-dia.";
    if ((data.current?.relative_humidity_2m || 100) <= 30) return "Umidade baixa: hidrate-se com frequência.";
    return "Condições sem alerta relevante; acompanhe as atualizações ao longo do dia.";
  }

  function greeting() {
    const hour = Number(new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false
    }).format(new Date()));
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function dailyMotivation(date) {
    const messages = [
      "Que hoje não faltem motivos para sorrir e seguir em frente.",
      "Comece o dia acreditando: coisas boas também encontram quem não desiste.",
      "Cada manhã traz uma nova chance de fazer acontecer.",
      "Leve leveza no coração e coragem para todos os caminhos.",
      "Seu melhor passo de hoje é aquele que você decide dar.",
      "Que o dia seja produtivo, tranquilo e cheio de boas notícias.",
      "Espalhe gentileza: ela sempre encontra um jeito de voltar.",
      "Respire fundo, confie no caminho e faça deste dia um bom dia.",
      "Grandes mudanças começam com pequenas atitudes.",
      "Hoje é um ótimo dia para transformar planos em movimento.",
      "Valorize cada conquista, inclusive aquelas que só você percebe.",
      "Que nunca faltem esperança, saúde e vontade de recomeçar."
    ];
    return messages[Math.abs(Math.floor(date.getTime() / 86400000)) % messages.length];
  }
  function meteor(date, phase, clouds) {
    const monthDay = Number(String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0"));
    const showers = [
      [402, 1107, "Oriônidas/Taurídeas", "leste e nordeste", "depois da meia-noite"],
      [1110, 1130, "Leônidas", "nordeste", "depois das 2h"],
      [1204, 1217, "Gemínidas", "nordeste", "a partir das 22h"],
      [419, 528, "Eta Aquáridas", "leste", "das 3h ao amanhecer"],
      [712, 823, "Delta Aquáridas", "nordeste", "da meia-noite às 4h"]
    ];
    const active = showers.find(([start, end]) => monthDay >= start && monthDay <= end);
    const darkness = 1 - phase.light / 100 * .75;
    const clear = 1 - Math.min(100, Number(clouds) || 0) / 100;
    const score = Math.max(2, Math.round((active ? 62 : 12) * darkness * clear));
    return { score, label: score >= 50 ? "Alta" : score >= 25 ? "Moderada" : score >= 10 ? "Baixa" : "Muito baixa", direction: active?.[3] || "todo o céu", time: active?.[4] || "entre 0h e 4h" };
  }

  function drawMoon(ctx, x, y, radius, phase, moonVisual) {
    if (moonVisual) {
      const size = radius * 2.22;
      ctx.save();
      ctx.shadowColor = "rgba(184,220,255,.58)";
      ctx.shadowBlur = 34;
      ctx.drawImage(moonVisual, x - size / 2, y - size / 2, size, size);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const size = Math.ceil(radius * 2.35);
    const moonCanvas = document.createElement("canvas");
    moonCanvas.width = size;
    moonCanvas.height = size;
    const moonCtx = moonCanvas.getContext("2d");
    const frame = moonCtx.createImageData(size, size);
    const center = size / 2;
    const sunX = -Math.sin(phase.fraction * Math.PI * 2);
    const sunZ = -Math.cos(phase.fraction * Math.PI * 2);

    for (let py = 0; py < size; py += 1) {
      for (let px = 0; px < size; px += 1) {
        const nx = (px - center) / radius;
        const ny = (py - center) / radius;
        const distance = nx * nx + ny * ny;
        if (distance > 1) continue;
        const nz = Math.sqrt(Math.max(0, 1 - distance));
        const sunlight = Math.max(0, nx * sunX + nz * sunZ);
        const limb = .42 + .58 * nz;
        const texture = .94 + .035 * Math.sin(px * .17) + .025 * Math.cos(py * .13) + .018 * Math.sin((px + py) * .09);
        const earthshine = 14 + 19 * nz;
        const brightness = Math.min(244, earthshine + 218 * Math.pow(sunlight, .62) * limb * texture);
        const index = (py * size + px) * 4;
        frame.data[index] = Math.round(brightness * 1.02);
        frame.data[index + 1] = Math.round(brightness);
        frame.data[index + 2] = Math.round(brightness * .94);
        frame.data[index + 3] = Math.round(255 * Math.min(1, (1 - distance) * 18));
      }
    }
    moonCtx.putImageData(frame, 0, 0);
    moonCtx.save();
    moonCtx.beginPath();
    moonCtx.arc(center, center, radius - 2, 0, Math.PI * 2);
    moonCtx.clip();
    const craters = [
      [-.34, -.28, .16], [.26, -.38, .10], [.38, .16, .18],
      [-.15, .34, .12], [-.48, .20, .08], [.12, .46, .07]
    ];
    craters.forEach(([cx, cy, cr]) => {
      const gradient = moonCtx.createRadialGradient(
        center + cx * radius - cr * radius * .25,
        center + cy * radius - cr * radius * .25,
        1,
        center + cx * radius,
        center + cy * radius,
        cr * radius
      );
      gradient.addColorStop(0, "rgba(255,255,245,.10)");
      gradient.addColorStop(.58, "rgba(58,63,66,.18)");
      gradient.addColorStop(1, "rgba(245,243,220,.08)");
      moonCtx.fillStyle = gradient;
      moonCtx.beginPath();
      moonCtx.arc(center + cx * radius, center + cy * radius, cr * radius, 0, Math.PI * 2);
      moonCtx.fill();
    });
    moonCtx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(184,220,255,.58)";
    ctx.shadowBlur = 34;
    ctx.drawImage(moonCanvas, x - size / 2, y - size / 2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function card(ctx, x, label, value, detail, color) {
    rounded(ctx, x, 690, 292, 190, 28, "rgba(255,255,255,.11)", "rgba(255,255,255,.17)");
    ctx.fillStyle = color;
    ctx.font = "800 25px Arial";
    ctx.fillText(label.toUpperCase(), x + 28, 734);
    ctx.fillStyle = "#fff";
    ctx.font = "900 58px Arial";
    ctx.fillText(value, x + 28, 800);
    ctx.fillStyle = "rgba(235,247,255,.72)";
    ctx.font = "650 22px Arial";
    wrapped(ctx, detail, x + 28, 840, 236, 27, 2);
  }

  async function createCanvas(dateText) {
    const [forecast, lake, logo, moonVisual] = await Promise.all([weather(dateText), reservoir(), image(LOGO), screenMoonImage()]);
    const date = new Date(dateText + "T12:00:00");
    const phase = moon(date);
    const meteors = meteor(date, phase, forecast.current.cloud_cover);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, "#087ebc");
    gradient.addColorStop(.48, "#07517f");
    gradient.addColorStop(1, "#06162f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = "rgba(104,215,255,.13)";
    ctx.beginPath(); ctx.arc(930, 250, 310, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(255,188,69,.12)";
    ctx.beginPath(); ctx.arc(90, 650, 260, 0, Math.PI * 2); ctx.fill();
    rounded(ctx, 760, 64, 250, 230, 34, "#fff");
    ctx.drawImage(logo, 783, 80, 204, 204);

    const greetingText = greeting().toUpperCase();
    ctx.fillStyle = "#8de5ff";
    ctx.font = "900 24px Arial";
    ctx.fillText("CLIMA DO DIA • CARLÓPOLIS, PR", 70, 92);
    const greetingGradient = ctx.createLinearGradient(70, 118, 680, 250);
    greetingGradient.addColorStop(0, "#ffffff");
    greetingGradient.addColorStop(.55, "#fff1a8");
    greetingGradient.addColorStop(1, "#ffad45");
    ctx.fillStyle = greetingGradient;
    ctx.font = "900 62px Arial";
    ctx.fillText(greetingText + ",", 70, 172);
    ctx.font = "900 66px Arial";
    ctx.fillText("CARLÓPOLIS!", 70, 244);
    ctx.strokeStyle = "#ffd45e";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(74, 264);
    ctx.bezierCurveTo(210, 288, 470, 272, 650, 250);
    ctx.stroke();
    ctx.fillStyle = "#ffe37b";
    [[682, 152, 7], [716, 190, 5], [668, 220, 4]].forEach(([sparkX, sparkY, sparkRadius]) => {
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.font = "750 31px Arial";
    const dateLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    const timeLabel = new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit"
    });
    ctx.fillText(dateLabel + " • " + timeLabel, 70, 316);

    rounded(ctx, 70, 350, 940, 305, 38, "rgba(255,255,255,.12)");
    ctx.fillStyle = "#8de5ff";
    ctx.font = "900 25px Arial";
    ctx.fillText("CONDIÇÃO ATUAL", 105, 404);
    const temperatureText = (forecast.current.temperature_2m ?? "—") + "°";
    ctx.fillStyle = "#fff";
    ctx.font = "900 128px Arial";
    ctx.fillText(temperatureText, 105, 550);
    ctx.font = "900 48px Arial";
    wrapped(ctx, weatherText(forecast.current.weather_code), 525, 438, 430, 54, 2);
    ctx.fillStyle = "rgba(237,248,255,.84)";
    ctx.font = "750 28px Arial";
    ctx.fillText("Sensação " + (forecast.current.apparent_temperature ?? "—") + "°C", 525, 548);
    ctx.fillText("Umidade " + (forecast.current.relative_humidity_2m ?? "—") + "%", 525, 591);
    ctx.fillText("Vento " + (forecast.current.wind_speed_10m ?? "—") + " km/h " + windDirection(forecast.current.wind_direction_10m), 525, 634);

    card(ctx, 70, "Mínima", (forecast.min ?? "—") + "°C", "Temperatura prevista", "#9de7ff");
    card(ctx, 394, "Máxima", (forecast.max ?? "—") + "°C", "Temperatura prevista", "#ffd47b");
    card(ctx, 718, "Chuva", (forecast.rain ?? "—") + "%", (forecast.rainTotal ?? "—") + " mm previstos", "#86d8ff");

    rounded(ctx, 70, 920, 940, 350, 38, "rgba(3,12,31,.42)");
    drawMoon(ctx, 245, 1095, 122, phase, moonVisual);
    ctx.fillStyle = "#82d9ff";
    ctx.font = "900 25px Arial";
    ctx.fillText("LUA ATUAL", 430, 978);
    ctx.fillStyle = "#fff";
    ctx.font = "900 58px Arial";
    wrapped(ctx, phase.name, 430, 1040, 515, 55, 2);
    ctx.fillStyle = "rgba(239,246,255,.84)";
    ctx.font = "750 28px Arial";
    ctx.fillText(phase.light + "% iluminada", 430, 1122);
    ctx.fillText("Meteoros: " + meteors.label + " • " + meteors.score + "/100", 430, 1166);
    ctx.font = "650 23px Arial";
    wrapped(ctx, "Olhe para " + meteors.direction + ", " + meteors.time + ".", 430, 1206, 515, 29, 2);

    rounded(ctx, 70, 1310, 940, 295, 38, "rgba(255,255,255,.12)");
    ctx.fillStyle = "#82e7d1";
    ctx.font = "900 25px Arial";
    ctx.fillText("REPRESA DE CHAVANTES", 105, 1362);
    ctx.fillStyle = "rgba(239,246,255,.72)";
    ctx.font = "800 22px Arial";
    ctx.fillText("VALOR ATUAL", 105, 1410);
    ctx.fillText("VALOR DE REFERÊNCIA", 570, 1410);
    ctx.fillStyle = "#fff";
    ctx.font = "900 62px Arial";
    ctx.fillText(Number.isFinite(lake.level) ? lake.level.toFixed(2).replace(".", ",") + " m" : "Indisponível", 105, 1482);
    ctx.fillText("474,00 m", 570, 1482);
    const centimeters = Number.isFinite(lake.delta) ? lake.delta * 100 : null;
    const variation = Number.isFinite(centimeters)
      ? (Math.abs(centimeters) < .5 ? "Estável desde ontem" : (centimeters > 0 ? "Subiu " : "Baixou ") + Math.abs(centimeters).toFixed(0) + " cm em 1 dia")
      : "Comparação diária indisponível";
    ctx.fillStyle = Number.isFinite(centimeters) && centimeters > .5 ? "#7ff0c7" : Number.isFinite(centimeters) && centimeters < -.5 ? "#ffaeae" : "rgba(239,246,255,.84)";
    ctx.font = "850 29px Arial";
    ctx.fillText(variation, 105, 1535);
    ctx.fillStyle = "rgba(239,246,255,.72)";
    ctx.font = "750 23px Arial";
    const lakeDate = lake.date ? new Date(lake.date).toLocaleDateString("pt-BR") : "medição mais recente";
    ctx.fillText("Volume útil: " + (Number.isFinite(lake.volume) ? lake.volume.toFixed(2).replace(".", ",") + "%" : "não informado") + " • " + lakeDate, 105, 1580);

    ctx.fillStyle = "#ffd47b";
    ctx.font = "900 25px Arial";
    ctx.fillText("MENSAGEM DO DIA", 70, 1660);
    ctx.fillStyle = "#fff";
    ctx.font = "800 32px Arial";
    wrapped(ctx, "“" + dailyMotivation(date) + "”", 70, 1710, 940, 40, 2);
    ctx.fillStyle = "rgba(237,248,255,.72)";
    ctx.font = "650 23px Arial";
    wrapped(ctx, "Dica: " + advice(forecast), 70, 1802, 940, 29, 2);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.beginPath(); ctx.moveTo(70, 1850); ctx.lineTo(1010, 1850); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "900 26px Arial";
    ctx.fillText("olacarlopolis.com", 70, 1893);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(237,248,255,.65)";
    ctx.font = "650 19px Arial";
    ctx.fillText("Clima e níveis podem mudar ao longo do dia", 1010, 1893);
    ctx.textAlign = "left";
    return canvas;
  }

  function openPreview(canvas) {
    document.querySelector(".clima-story-modal")?.remove();
    const modal = document.createElement("div");
    modal.className = "clima-story-modal";
    modal.innerHTML = `<div class="clima-story-dialog" role="dialog" aria-modal="true" aria-labelledby="climaStoryTitle">
      <button type="button" class="clima-story-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
      <div class="clima-story-heading"><span>Instagram Stories • 1080 × 1920</span><h2 id="climaStoryTitle">Postagem do Clima do Dia</h2><p>Confira a arte e compartilhe diretamente ou salve no aparelho.</p></div>
      <img alt="Prévia da postagem do Clima do Dia">
      <footer><button type="button" class="clima-story-download"><i class="fa-solid fa-download"></i> Baixar imagem</button><button type="button" class="clima-story-share"><i class="fa-brands fa-instagram"></i> Compartilhar</button></footer>
    </div>`;
    const dataUrl = canvas.toDataURL("image/png", 1);
    modal.querySelector("img").src = dataUrl;
    const close = () => modal.remove();
    modal.querySelector(".clima-story-close").onclick = close;
    modal.onclick = (event) => { if (event.target === modal) close(); };
    modal.querySelector(".clima-story-download").onclick = () => {
      const link = document.createElement("a");
      link.download = "clima-do-dia-ola-carlopolis-" + new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + ".png";
      link.href = dataUrl;
      link.click();
    };
    modal.querySelector(".clima-story-share").onclick = () => canvas.toBlob(async (blob) => {
      if (!blob) return window.mostrarToast?.("Não foi possível preparar a imagem.");
      const file = new File([blob], "clima-do-dia-ola-carlopolis.png", { type: "image/png" });
      try {
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
          await navigator.share({ files: [file], title: "Clima do Dia", text: "Clima do Dia em Carlópolis • Olá Carlópolis" });
        } else {
          modal.querySelector(".clima-story-download").click();
          window.mostrarToast?.("Imagem salva. Agora publique nos Stories.");
        }
      } catch (error) {
        if (error?.name !== "AbortError") window.mostrarToast?.("Não foi possível compartilhar. Tente baixar a imagem.");
      }
    }, "image/png", 1);
    document.body.appendChild(modal);
  }

  async function generate(button) {
    if (button.classList.contains("is-loading")) return;
    const original = button.innerHTML;
    button.classList.add("is-loading");
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Gerando...</span>';
    try {
      const date = document.querySelector(".clima-page #solData")?.value || new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      openPreview(await createCanvas(date));
    } catch (error) {
      console.error("Erro ao gerar Story do clima.", error);
      window.mostrarToast?.("Não foi possível gerar a postagem agora.");
    } finally {
      button.classList.remove("is-loading");
      button.innerHTML = original;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("#climaStoryTrigger");
    if (button) generate(button);
  });
})();
