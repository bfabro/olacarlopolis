(() => {
  "use strict";

  const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
  const RESERVOIR_API = "https://olacarlopolis.vercel.app/api/represa/chavantes";
  const RESERVOIR_HISTORY = "https://contadoracessos-default-rtdb.firebaseio.com/represas/chavantes/historico.json";
  const LOGO = "images/img_padrao_site/logo_1.png";
  const BACKGROUND = "images/turismo/ponte.jpg";
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

  function hourlyPeriod(data, hour, label) {
    const times = data.hourly?.time || [];
    const index = times.findIndex((value) => String(value).endsWith("T" + String(hour).padStart(2, "0") + ":00"));
    return {
      label,
      temperature: index >= 0 ? data.hourly?.temperature_2m?.[index] : null,
      rain: index >= 0 ? data.hourly?.precipitation_probability?.[index] : null,
      code: index >= 0 ? data.hourly?.weather_code?.[index] : null
    };
  }

  function consistentTemperatureRange(data) {
    const temperatures = (data.hourly?.temperature_2m || [])
      .filter((value) => value !== null && value !== "" && Number.isFinite(Number(value)))
      .map(Number);
    const dailyDate = String(data.daily?.time?.[0] || "");
    const currentDate = String(data.current?.time || "").split("T")[0];
    const currentRaw = data.current?.temperature_2m;
    const currentTemperature = currentRaw === null || currentRaw === "" ? null : Number(currentRaw);
    if (dailyDate && dailyDate === currentDate && Number.isFinite(currentTemperature)) {
      temperatures.push(currentTemperature);
    }
    const dailyMinRaw = data.daily?.temperature_2m_min?.[0];
    const dailyMaxRaw = data.daily?.temperature_2m_max?.[0];
    const dailyMin = dailyMinRaw === null || dailyMinRaw === "" ? null : Number(dailyMinRaw);
    const dailyMax = dailyMaxRaw === null || dailyMaxRaw === "" ? null : Number(dailyMaxRaw);
    if (Number.isFinite(dailyMin)) temperatures.push(dailyMin);
    if (Number.isFinite(dailyMax)) temperatures.push(dailyMax);
    return {
      min: temperatures.length ? Math.min(...temperatures) : null,
      max: temperatures.length ? Math.max(...temperatures) : null
    };
  }
  async function weather(date) {
    const query = new URLSearchParams({
      latitude: COORDS.lat,
      longitude: COORDS.lng,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      timezone: "America/Sao_Paulo", wind_speed_unit: "kmh", start_date: date, end_date: date
    });
    const response = await fetch(WEATHER_API + "?" + query, { cache: "no-store" });
    if (!response.ok) throw new Error("Clima indisponível");
    const data = await response.json();
    const temperatureRange = consistentTemperatureRange(data);
    return {
      current: data.current || {},
      min: temperatureRange.min,
      max: temperatureRange.max,
      rain: data.daily?.precipitation_probability_max?.[0],
      rainTotal: data.daily?.precipitation_sum?.[0],
      uv: data.daily?.uv_index_max?.[0],
      sunrise: data.daily?.sunrise?.[0],
      sunset: data.daily?.sunset?.[0],
      periods: [
        hourlyPeriod(data, 9, "MANHÃ"),
        hourlyPeriod(data, 15, "TARDE"),
        hourlyPeriod(data, 21, "NOITE")
      ]
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
      date: current?.date || null,
      history: days.slice(-7)
    };
  }

  function drawImageCover(ctx, source, x, y, width, height) {
    const scale = Math.max(width / source.width, height / source.height);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (source.width - sourceWidth) / 2;
    const sourceY = (source.height - sourceHeight) / 2;
    ctx.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  function weatherEmoji(code, period = "") {
    const value = Number(code);
    if ([95, 96, 99].includes(value)) return "⛈️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(value)) return "🌧️";
    if ([45, 48].includes(value)) return "🌫️";
    if (value === 3) return "☁️";
    if ([1, 2].includes(value)) return period === "NOITE" ? "☁️" : "🌤️";
    return period === "NOITE" ? "🌙" : "☀️";
  }

  function formatClock(value) {
    const text = String(value || "");
    return text.includes("T") ? text.split("T")[1].slice(0, 5) : "--:--";
  }

  function uvLabel(value) {
    const uv = Number(value);
    if (!Number.isFinite(uv)) return "Indisponível";
    if (uv >= 11) return "Extremo";
    if (uv >= 8) return "Muito alto";
    if (uv >= 6) return "Alto";
    if (uv >= 3) return "Moderado";
    return "Baixo";
  }

  function cleanCelebrationText(value) {
    return String(value || "")
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s+-\s+.+$/, "")
      .trim();
  }

  async function celebration(date) {
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const page = date.getDate() + "_de_" + months[date.getMonth()];
    const query = new URLSearchParams({ origin: "*", action: "parse", page, prop: "text", format: "json" });
    try {
      const response = await fetch("https://pt.wikipedia.org/w/api.php?" + query, { cache: "no-store" });
      if (!response.ok) throw new Error("Calendário indisponível");
      const payload = await response.json();
      const html = payload.parse?.text?.["*"];
      if (!html) throw new Error("Data sem conteúdo");
      const documentView = new DOMParser().parseFromString(html, "text/html");
      const itemsAfter = (id) => {
        const heading = documentView.getElementById(id)?.closest(".mw-heading");
        let node = heading?.nextElementSibling;
        while (node && !node.classList?.contains("mw-heading")) {
          if (node.matches?.("ul, ol")) {
            return [...node.querySelectorAll(":scope > li")].map((item) => cleanCelebrationText(item.textContent));
          }
          node = node.nextElementSibling;
        }
        return [];
      };
      let items = itemsAfter("Brasil");
      if (!items.length) items = itemsAfter("Internacional");
      if (!items.length) items = itemsAfter("Santos_do_dia");
      const selected = items.filter(Boolean).slice(0, 2);
      if (selected.length) {
        return {
          title: selected.join(" • "),
          description: "Uma data para reconhecer pessoas, histórias e causas que fazem parte deste dia."
        };
      }
    } catch (error) {
      console.warn("Não foi possível consultar a comemoração do dia:", error);
    }
    return {
      title: "Dia de celebrar novas oportunidades",
      description: "Valorize as boas histórias, as pessoas e tudo o que torna este dia especial."
    };
  }

  function drawReservoirChart(ctx, history, x, y, width, height) {
    const points = (history || []).filter((item) => Number.isFinite(item.level));
    ctx.fillStyle = "#174c7e";
    ctx.font = "900 18px Arial";
    ctx.fillText("ÚLTIMOS 7 DIAS (m)", x, y - 12);
    if (points.length < 2) {
      ctx.fillStyle = "#5b7290";
      ctx.font = "700 17px Arial";
      ctx.fillText("Histórico em atualização", x, y + height / 2);
      return;
    }
    const levels = points.map((item) => item.level);
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    const range = Math.max(.12, max - min);
    const axisWidth = 48;
    const plotX = x + axisWidth;
    const plotWidth = width - axisWidth;
    ctx.strokeStyle = "rgba(26,102,164,.18)";
    ctx.lineWidth = 1;
    for (let line = 0; line < 4; line += 1) {
      const lineY = y + line * height / 3;
      const axisValue = max - (line / 3) * range;
      ctx.beginPath(); ctx.moveTo(plotX, lineY); ctx.lineTo(x + width, lineY); ctx.stroke();
      ctx.fillStyle = "#64758a";
      ctx.font = "700 12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(axisValue.toFixed(2).replace(".", ","), plotX - 7, lineY + 4);
    }
    const coordinates = points.map((item, index) => ({
      x: plotX + index * plotWidth / Math.max(1, points.length - 1),
      y: y + height - ((item.level - min) / range * (height - 26)) - 13,
      item
    }));
    ctx.strokeStyle = "#168ee0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    coordinates.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    coordinates.forEach((point) => {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(point.x, point.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#168ee0"; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = "#64758a";
      ctx.font = "700 13px Arial";
      ctx.textAlign = "center";
      ctx.fillText(new Date(point.item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), point.x, y + height + 22);
    });
    ctx.textAlign = "left";
  }
  function moon(date) {
    const epoch = 2451550.1;
    const period = 29.530588861;
    const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    let days = (Math.floor(utc / 86400000) + 2440587.5 - epoch) % period;
    if (days < 0) days += period;
    const fraction = days / period;
    const light = Math.round(((1 - Math.cos(2 * Math.PI * fraction)) / 2) * 100);
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
    const openings = [
      "Hoje é dia de colocar os planos para andar", "Comece devagar, mas comece",
      "Leve coragem na bagagem de hoje", "Dê uma chance para as coisas boas",
      "Faça deste dia um bom capítulo", "Respire fundo e siga confiante",
      "Hoje vale insistir um pouquinho mais", "Abra espaço para uma boa surpresa",
      "Transforme vontade em movimento", "Vá com calma, alegria e propósito",
      "Acredite no próximo passo", "Espalhe bom humor por onde passar",
      "Que o dia renda boas histórias"
    ];
    const endings = [
      "o café ajuda, mas o primeiro passo ainda é por sua conta.",
      "até a previsão muda, então você também pode mudar o rumo.",
      "se chover, a gente chama de irrigação dos sonhos.",
      "se o plano falhar, finja que era aquecimento.",
      "ninguém precisa bater recorde antes do café.",
      "a pressa espanta até peixe curioso.",
      "um sorriso pesa menos que qualquer preocupação.",
      "se aparecer vento contrário, ajuste a vela imaginária.",
      "o importante é não deixar a coragem no modo soneca.",
      "todo grande resultado já foi uma ideia meio teimosa.",
      "até a represa sobe gota por gota.",
      "se der errado, pelo menos vira uma boa história.",
      "o sol não cobra ingresso para iluminar seu caminho.",
      "quem vai com constância chega antes da desculpa.",
      "problema grande também fica menor depois de um café.",
      "hoje a sorte pode estar só esperando você sair de casa.",
      "não consulte a preguiça; ela sempre vota para ficar.",
      "faça o possível e deixe o impossível pegar fila.",
      "dia bonito começa no jeito de olhar pela janela.",
      "se a inspiração atrasar, comece sem ela mesmo.",
      "até história de pescador começa com alguém tentando.",
      "o bom humor não resolve tudo, mas melhora a reunião.",
      "uma pausa é descanso, não abandono do plano.",
      "quem planta paciência colhe menos dor de cabeça.",
      "o caminho pode ser longo, mas não precisa ser sem graça.",
      "se o céu fechar, abra o guarda-chuva e mantenha o plano.",
      "o despertador venceu a primeira batalha; aproveite.",
      "seja persistente, mas aceite uma paradinha para o café.",
      "hoje pode surpreender mais que peixe grande em linha fina."
    ];
    const yearStart = Date.UTC(date.getFullYear(), 0, 1);
    const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const dayIndex = Math.floor((currentDay - yearStart) / 86400000);
    const opening = openings[dayIndex % openings.length];
    const ending = endings[Math.floor(dayIndex / openings.length) % endings.length];
    return `${opening} — ${ending}`;
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
      const size = radius * (220 / 83);
      ctx.save();
      ctx.drawImage(moonVisual, x - size / 2, y - size / 2, size, size);
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

  async function createCanvas(dateText, fontScale = 1) {
    const date = new Date(dateText + "T12:00:00");
    const [forecast, lake, logo, background, moonVisual, dayCelebration] = await Promise.all([
      weather(dateText), reservoir(), image(LOGO), image(BACKGROUND), screenMoonImage(), celebration(date)
    ]);
    const phase = moon(date);
    const meteors = meteor(date, phase, forecast.current.cloud_cover);
    const safeFontScale = Math.max(1, Math.min(1.25, Number(fontScale) || 1));
    const cardFont = (weight, size) => weight + " " + size + "px Arial";
    const cardLine = (size) => size;
    const detailFont = (weight, size) => weight + " " + Math.round(size * safeFontScale) + "px Arial";
    const detailLine = (size) => Math.round(size * safeFontScale);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    const description = (weight, baseSize, text, x, y, width, lineBase, maxLines) => {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      let size = Math.round(baseSize * safeFontScale);
      let lines = [];
      while (size >= 8) {
        ctx.font = weight + " " + size + "px Arial";
        lines = [];
        let current = "";
        words.forEach((word) => {
          const candidate = current ? current + " " + word : word;
          if (!current || ctx.measureText(candidate).width <= width) current = candidate;
          else { lines.push(current); current = word; }
        });
        if (current) lines.push(current);
        if (lines.length <= maxLines) break;
        size -= 1;
      }
      const lineHeight = Math.min(Math.round(lineBase * safeFontScale), Math.max(lineBase, Math.round(size * 1.12)));
      lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
      return lines.length;
    };

    const base = ctx.createLinearGradient(0, 0, 0, 1920);
    base.addColorStop(0, "#063f70");
    base.addColorStop(.55, "#00517f");
    base.addColorStop(1, "#003a66");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1080, 1920);

    drawImageCover(ctx, background, 0, 0, 1080, 485);
    const heroShade = ctx.createLinearGradient(0, 0, 1080, 0);
    heroShade.addColorStop(0, "rgba(0,31,70,.80)");
    heroShade.addColorStop(.48, "rgba(0,38,76,.34)");
    heroShade.addColorStop(1, "rgba(0,31,63,.04)");
    ctx.fillStyle = heroShade;
    ctx.fillRect(0, 0, 1080, 485);
    const heroFade = ctx.createLinearGradient(0, 255, 0, 490);
    heroFade.addColorStop(0, "rgba(0,38,73,0)");
    heroFade.addColorStop(1, "rgba(0,58,96,.96)");
    ctx.fillStyle = heroFade;
    ctx.fillRect(0, 250, 1080, 240);

    const greetingText = greeting().toUpperCase();
    ctx.fillStyle = "#fff";
    ctx.font = "900 86px Arial";
    ctx.fillText(greetingText + ",", 48, 104);
    const titleGradient = ctx.createLinearGradient(48, 118, 690, 205);
    titleGradient.addColorStop(0, "#ffe36a");
    titleGradient.addColorStop(1, "#ffbd30");
    ctx.fillStyle = titleGradient;
    ctx.font = "900 82px Arial";
    ctx.fillText("CARLÓPOLIS!", 48, 194);
    ctx.strokeStyle = "#ffd52f";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(54, 214);
    ctx.quadraticCurveTo(275, 197, 508, 216);
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = "rgba(0,24,56,.58)";
    ctx.shadowBlur = 18;
    ctx.drawImage(logo, 810, 24, 225, 225);
    ctx.restore();

    const dateLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    const timeLabel = new Date().toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit"
    });
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
    const headline = Number(forecast.rain) >= 45
      ? weekday.charAt(0).toUpperCase() + weekday.slice(1) + " com possibilidade de chuva em Carlópolis!"
      : weekday.charAt(0).toUpperCase() + weekday.slice(1) + " com " + weatherText(forecast.current.weather_code).toLowerCase() + " em Carlópolis!";
    ctx.fillStyle = "#fff";
    ctx.font = "800 27px Arial";
    ctx.fillText("▣  " + dateLabel + "   |   ◷  " + timeLabel, 52, 268);
    ctx.font = "italic 700 29px Arial";
    wrapped(ctx, headline, 52, 314, 635, 36, 2);
    ctx.strokeStyle = "#ffe03f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(55, 387);
    ctx.quadraticCurveTo(240, 360, 440, 384);
    ctx.stroke();

    rounded(ctx, 20, 420, 740, 455, 26, "rgba(0,60,110,.91)", "rgba(90,210,255,.78)");
    rounded(ctx, 34, 432, 712, 55, 18, "#ffda64", "rgba(255,244,175,.95)");
    ctx.fillStyle = "#063c70";
    ctx.font = cardFont(900, 28);
    ctx.fillText("☁  COMO SERÁ O DIA EM CARLÓPOLIS?", 56, 470);

    ctx.textAlign = "center";
    ctx.font = "112px Arial";
    ctx.fillText(weatherEmoji(forecast.current.weather_code), 150, 630);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ff7764";
    ctx.font = cardFont(900, 21);
    ctx.fillText("MÁXIMA", 266, 540);
    ctx.font = "900 48px Arial";
    ctx.fillText((forecast.max ?? "—") + "°C", 266, 595);
    ctx.fillStyle = "#72dfff";
    ctx.font = cardFont(900, 21);
    ctx.fillText("MÍNIMA", 510, 540);
    ctx.font = "900 48px Arial";
    ctx.fillText((forecast.min ?? "—") + "°C", 510, 595);
    ctx.strokeStyle = "rgba(152,225,255,.40)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(245, 625); ctx.lineTo(700, 625); ctx.stroke();
    ctx.fillStyle = "#76e5ff";
    ctx.font = "54px Arial";
    ctx.fillText("💧", 254, 717);
    ctx.font = cardFont(900, 20);
    ctx.fillText("CHUVA", 320, 673);
    ctx.fillStyle = "#fff";
    ctx.font = "900 48px Arial";
    ctx.fillText((forecast.rain ?? "—") + "%", 318, 728);
    ctx.strokeStyle = "rgba(152,225,255,.45)";
    ctx.beginPath(); ctx.moveTo(455, 650); ctx.lineTo(455, 745); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = detailFont(700, 20);
    description(700, 20, weatherText(forecast.current.weather_code) + ", com chance de chuva ao longo do dia.", 485, 675, 225, 21, 3);
    rounded(ctx, 36, 758, 708, 102, 22, "#ffe47a", "#fff1a9");
    ctx.fillStyle = "#083e70";
    ctx.font = cardFont(900, 22);
    ctx.textAlign = "center";
    ctx.fillText("☂  DICA DO DIA:", 390, 790);
    ctx.font = detailFont(750, 20);
    description(750, 20, advice(forecast), 390, 825, 650, 20, 2);
    ctx.textAlign = "left";

    rounded(ctx, 780, 432, 280, 443, 25, "rgba(0,60,110,.91)", "rgba(90,210,255,.78)");
    rounded(ctx, 795, 445, 250, 48, 15, "rgba(87,187,236,.34)");
    ctx.fillStyle = "#e8f7ff";
    ctx.font = cardFont(900, 21);
    ctx.fillText("◷  AGORA • ÀS " + timeLabel.slice(0, 2) + "H", 812, 477);
    ctx.textAlign = "center";
    ctx.font = "82px Arial";
    ctx.fillText(weatherEmoji(forecast.current.weather_code), 920, 590);
    ctx.fillStyle = "#fff";
    ctx.font = "900 58px Arial";
    ctx.fillText((forecast.current.temperature_2m ?? "—") + "°C", 920, 656);
    ctx.font = detailFont(750, 20);
    description(750, 20, weatherText(forecast.current.weather_code), 920, 691, 230, 20, 2);
    ctx.textAlign = "left";
    ctx.strokeStyle = "rgba(152,225,255,.42)";
    ctx.beginPath(); ctx.moveTo(806, 738); ctx.lineTo(1035, 738); ctx.stroke();
    const currentDetails = [
      ["♨", "Sensação", (forecast.current.apparent_temperature ?? "—") + "°C"],
      ["●", "Umidade", (forecast.current.relative_humidity_2m ?? "—") + "%"],
      ["≋", "Vento", (forecast.current.wind_speed_10m ?? "—") + " km/h " + windDirection(forecast.current.wind_direction_10m)]
    ];
    currentDetails.forEach(([icon, label, value], index) => {
      const y = 780 + index * 38;
      ctx.fillStyle = "#72dfff";
      ctx.font = cardFont(800, 19);
      ctx.fillText(icon, 808, y);
      ctx.fillStyle = "#e1f2ff";
      ctx.fillText(label, 840, y);
      ctx.fillStyle = "#fff";
      ctx.font = cardFont(900, 18);
      ctx.textAlign = "right";
      ctx.fillText(value, 1035, y);
      ctx.textAlign = "left";
    });

    rounded(ctx, 20, 895, 750, 310, 24, "rgba(0,63,111,.92)", "rgba(90,210,255,.68)");
    ctx.fillStyle = "#fff";
    ctx.font = cardFont(900, 26);
    ctx.fillText("▥  PREVISÃO POR PERÍODO", 45, 936);
    const forecastCards = [...forecast.periods, { label: "SOL", sun: true }];
    forecastCards.forEach((period, index) => {
      const x = 38 + index * 181;
      rounded(ctx, x, 957, 168, 226, 18, "rgba(40,126,184,.63)", "rgba(177,231,255,.30)");
      ctx.textAlign = "center";
      ctx.fillStyle = "#eaf8ff";
      ctx.font = cardFont(900, 18);
      ctx.fillText(period.label, x + 84, 992);
      if (period.sun) {
        ctx.font = "48px Arial";
        ctx.fillText("☀️", x + 84, 1055);
        ctx.fillStyle = "#fff";
        ctx.font = cardFont(800, 17);
        ctx.fillText("Nascer " + formatClock(forecast.sunrise), x + 84, 1110);
        ctx.fillText("Pôr " + formatClock(forecast.sunset), x + 84, 1148);
      } else {
        ctx.font = "46px Arial";
        ctx.fillText(weatherEmoji(period.code, period.label), x + 84, 1053);
        ctx.fillStyle = "#fff";
        ctx.font = "900 35px Arial";
        ctx.fillText((period.temperature ?? "—") + "°C", x + 84, 1104);
        ctx.font = detailFont(750, 15);
        description(750, 15, weatherText(period.code), x + 84, 1128, 132, 17, 2);
        ctx.fillStyle = "#bceaff";
        ctx.font = cardFont(800, 14);
        ctx.fillText("Chuva " + (period.rain ?? "—") + "%", x + 84, 1170);
      }
      ctx.textAlign = "left";
    });

    rounded(ctx, 790, 895, 270, 310, 24, "rgba(0,63,111,.92)", "rgba(90,210,255,.68)");
    ctx.fillStyle = "#fff";
    ctx.font = cardFont(900, 24);
    ctx.fillText("☾  LUA ATUAL", 815, 936);
    drawMoon(ctx, 925, 1010, 52, phase, moonVisual);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = detailFont(900, 25);
    description(900, 25, phase.name, 925, 1077, 230, 25, 2);
    ctx.fillStyle = "#d1edff";
    ctx.font = detailFont(700, 17);
    description(700, 17, "Iluminação " + phase.light + "%", 925, 1142, 225, 17, 1);
    ctx.font = detailFont(650, 14);
    description(650, 14, "Meteoros: " + meteors.label + " • olhe " + meteors.direction, 925, 1173, 225, 15, 2);
    ctx.textAlign = "left";

    rounded(ctx, 20, 1225, 1040, 275, 24, "#f6fbff", "rgba(174,228,255,.9)");
    ctx.fillStyle = "#07518e";
    ctx.font = cardFont(900, 27);
    ctx.fillText("≋  REPRESA DE CHAVANTES", 48, 1268);
    const referenceGap = Number.isFinite(lake.level) ? 474 - lake.level : null;
    if (Number.isFinite(referenceGap)) {
      rounded(ctx, 620, 1238, 415, 42, 16, "#e2f3ff");
      ctx.fillStyle = "#245b88";
      ctx.font = cardFont(800, 15);
      ctx.textAlign = "center";
      ctx.fillText("Está " + Math.abs(referenceGap).toFixed(2).replace(".", ",") + " m " + (referenceGap >= 0 ? "abaixo" : "acima") + " do limite máximo normal.", 827, 1266);
      ctx.textAlign = "left";
    }
    ctx.fillStyle = "#6c8095";
    ctx.font = cardFont(850, 17);
    ctx.fillText("NÍVEL ATUAL", 50, 1320);
    ctx.fillText("LIMITE MÁXIMO NORMAL", 358, 1320);
    ctx.fillStyle = "#073663";
    const lakeLevelText = Number.isFinite(lake.level) ? lake.level.toFixed(2).replace(".", ",") + " m" : "Indisponível";
    ctx.font = Number.isFinite(lake.level) ? "900 53px Arial" : "900 36px Arial";
    ctx.fillText(lakeLevelText, 48, 1380);
    ctx.font = "900 37px Arial";
    ctx.fillText("474,00 m", 358, 1378);
    const centimeters = Number.isFinite(lake.delta) ? lake.delta * 100 : null;
    const variation = Number.isFinite(centimeters)
      ? (Math.abs(centimeters) < .5 ? "Estável desde ontem" : (centimeters > 0 ? "▲ Subiu " : "▼ Baixou ") + Math.abs(centimeters).toFixed(0) + " cm em 1 dia")
      : "Comparação diária indisponível";
    ctx.fillStyle = Number.isFinite(centimeters) && centimeters > .5 ? "#159b58" : Number.isFinite(centimeters) && centimeters < -.5 ? "#e13f46" : "#59728b";
    ctx.font = cardFont(900, 22);
    ctx.fillText(variation, 50, 1423);
    ctx.fillStyle = "#60758a";
    ctx.font = cardFont(700, 17);
    const lakeDate = lake.date ? new Date(lake.date).toLocaleDateString("pt-BR") : "medição mais recente";
    ctx.fillText("Volume útil: " + (Number.isFinite(lake.volume) ? lake.volume.toFixed(2).replace(".", ",") + "%" : "não informado") + " • " + lakeDate, 50, 1462);
    drawReservoirChart(ctx, lake.history, 660, 1335, 365, 100);

    const celebrationGradient = ctx.createLinearGradient(20, 1518, 535, 1718);
    celebrationGradient.addColorStop(0, "#fff8d5");
    celebrationGradient.addColorStop(1, "#f6c864");
    rounded(ctx, 20, 1520, 515, 195, 24, celebrationGradient, "rgba(255,224,126,.95)");
    ctx.fillStyle = "#0a4c84";
    ctx.font = cardFont(900, 23);
    ctx.fillText("▣  HOJE SE COMEMORA", 48, 1561);
    ctx.fillStyle = "#123e68";
    ctx.font = detailFont(800, 19);
    const celebrationItems = String(dayCelebration.title || "").split(" • ").filter(Boolean).slice(0, 2);
    celebrationItems.forEach((item, index) => {
      ctx.fillText("•", 52, 1607 + index * 62);
      description(800, 19, item, 76, 1607 + index * 62, 425, 20, 2);
    });

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(550, 1520, 510, 195, 24);
    ctx.clip();
    drawImageCover(ctx, background, 550, 1520, 510, 195);
    ctx.fillStyle = "rgba(255,255,255,.79)";
    ctx.fillRect(550, 1520, 510, 195);
    ctx.restore();
    rounded(ctx, 550, 1520, 510, 195, 24, "", "rgba(174,228,255,.9)");
    ctx.fillStyle = "#07518e";
    ctx.font = cardFont(900, 23);
    ctx.fillText("☁  MENSAGEM DO DIA", 578, 1561);
    ctx.fillStyle = "#173f68";
    ctx.font = detailFont(850, 24);
    ctx.textAlign = "center";
    description(850, 24, "“" + dailyMotivation(date) + "”", 805, 1612, 425, 24, 3);
    ctx.strokeStyle = "#f1c52b";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(700, 1699); ctx.quadraticCurveTo(805, 1682, 910, 1699); ctx.stroke();
    ctx.textAlign = "left";

    rounded(ctx, 20, 1738, 1040, 142, 24, "rgba(0,48,91,.90)", "rgba(80,190,240,.45)");
    ctx.strokeStyle = "rgba(148,218,250,.45)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(360, 1760); ctx.lineTo(360, 1856); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = cardFont(800, 22);
    ctx.fillText("Quer saber como está", 60, 1787);
    ctx.fillText("o tempo ", 60, 1824);
    ctx.fillStyle = "#ffd63f";
    ctx.font = cardFont(900, 25);
    ctx.fillText("AGORA?", 164, 1824);
    ctx.fillStyle = "#dcefff";
    ctx.font = cardFont(750, 19);
    ctx.fillText("Acesse", 397, 1782);
    rounded(ctx, 395, 1796, 630, 56, 24, "#ffda57");
    ctx.fillStyle = "#073663";
    ctx.font = "900 27px Arial";
    ctx.textAlign = "center";
    ctx.fillText("olacarlopolis.com  ➜", 710, 1833);
    ctx.textAlign = "left";
    return canvas;
  }
  function openPreview(canvas, dateText) {
    document.querySelector(".clima-story-modal")?.remove();
    const modal = document.createElement("div");
    modal.className = "clima-story-modal";
    modal.innerHTML = `<div class="clima-story-dialog" role="dialog" aria-modal="true" aria-labelledby="climaStoryTitle">
      <button type="button" class="clima-story-close" aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
      <div class="clima-story-heading"><span>Instagram Stories • 1080 × 1920</span><h2 id="climaStoryTitle">Postagem do Clima do Dia</h2><p>Confira a arte e compartilhe diretamente ou salve no aparelho.</p>
        <div class="clima-story-font-control"><label for="climaStoryFontSize">Tamanho da fonte dos cards</label><div><input id="climaStoryFontSize" type="range" min="100" max="125" step="5" value="100"><output for="climaStoryFontSize">100%</output></div><small>Arraste para aumentar a leitura dos cards.</small></div>
      </div>
      <img alt="Prévia da postagem do Clima do Dia">
      <footer><button type="button" class="clima-story-download"><i class="fa-solid fa-download"></i> Baixar imagem</button><button type="button" class="clima-story-share"><i class="fa-brands fa-instagram"></i> Compartilhar</button></footer>
    </div>`;
    let currentCanvas = canvas;
    let dataUrl = "";
    const preview = modal.querySelector("img");
    const updatePreview = () => {
      dataUrl = currentCanvas.toDataURL("image/png", 1);
      preview.src = dataUrl;
    };
    updatePreview();
    const close = () => modal.remove();
    modal.querySelector(".clima-story-close").onclick = close;
    modal.onclick = (event) => { if (event.target === modal) close(); };
    const fontInput = modal.querySelector("#climaStoryFontSize");
    const fontOutput = modal.querySelector(".clima-story-font-control output");
    let renderTimer = 0;
    let renderToken = 0;
    fontInput.oninput = () => {
      fontOutput.value = fontInput.value + "%";
      clearTimeout(renderTimer);
      renderTimer = setTimeout(async () => {
        const token = ++renderToken;
        modal.classList.add("is-rendering");
        try {
          const updatedCanvas = await createCanvas(dateText, Number(fontInput.value) / 100);
          if (token !== renderToken) return;
          currentCanvas = updatedCanvas;
          updatePreview();
        } catch (error) {
          console.error("Erro ao ajustar a fonte da arte.", error);
          window.mostrarToast?.("Não foi possível ajustar a fonte agora.");
        } finally {
          if (token === renderToken) modal.classList.remove("is-rendering");
        }
      }, 180);
    };
    modal.querySelector(".clima-story-download").onclick = () => {
      const link = document.createElement("a");
      link.download = "clima-do-dia-ola-carlopolis-" + new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + ".png";
      link.href = dataUrl;
      link.click();
    };
    modal.querySelector(".clima-story-share").onclick = () => currentCanvas.toBlob(async (blob) => {
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
      openPreview(await createCanvas(date), date);
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
