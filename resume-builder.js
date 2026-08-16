(function () {
  "use strict";

  const STORAGE_KEY = "olaCarlopolis.resume.professional.v1";
  const LEVELS = ["Básico", "Intermediário", "Avançado", "Fluente", "Nativo"];
  const EMPTY = {
    fullName: "", desiredRole: "", phone: "", email: "", city: "", state: "PR", linkedin: "", photo: "",
    birthDate: "", maritalStatus: "", driverLicense: "", availability: "", objective: "", summary: "",
    experiences: [], education: [], courses: [], skills: [], languages: []
  };
  let data = load();
  let modal = null;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function load() {
    try { return { ...clone(EMPTY), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch (_) { return clone(EMPTY); }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }
  function lines(value) { return String(value || "").split(/\r?\n/).map((item) => item.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean); }
  function slug(value) {
    return String(value || "curriculo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "curriculo";
  }
  function phone(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length > 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length > 6) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return digits.length ? `(${digits}` : "";
  }
  function dateMonth(value) {
    if (!value) return "";
    const [year, month] = value.split("-");
    const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return month ? `${names[Number(month) - 1]}/${year}` : year;
  }
  function birth(value) {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  function field(label, name, opts = {}) {
    const type = opts.type || "text";
    const value = esc(data[name]);
    const required = opts.required ? " required" : "";
    const hint = opts.hint ? `<small>${esc(opts.hint)}</small>` : "";
    if (opts.options) return `<label>${label}${hint}<select data-field="${name}"${required}>${opts.options.map((item) => `<option${data[name] === item ? " selected" : ""}>${esc(item)}</option>`).join("")}</select></label>`;
    return `<label>${label}${hint}<input data-field="${name}" type="${type}" value="${value}" placeholder="${esc(opts.placeholder)}"${required}${opts.accept ? ` accept="${opts.accept}"` : ""}></label>`;
  }
  function textarea(label, name, placeholder) {
    return `<label class="rb-wide">${label}<textarea data-field="${name}" rows="4" placeholder="${esc(placeholder)}">${esc(data[name])}</textarea></label>`;
  }
  function itemInput(array, index, key, label, opts = {}) {
    const item = data[array][index] || {};
    if (opts.textarea) return `<label class="rb-wide">${label}<textarea rows="3" data-array="${array}" data-index="${index}" data-key="${key}" placeholder="${esc(opts.placeholder)}">${esc(item[key])}</textarea></label>`;
    if (opts.options) return `<label>${label}<select data-array="${array}" data-index="${index}" data-key="${key}">${opts.options.map((choice) => `<option${item[key] === choice ? " selected" : ""}>${choice}</option>`).join("")}</select></label>`;
    return `<label>${label}<input type="${opts.type || "text"}" data-array="${array}" data-index="${index}" data-key="${key}" value="${esc(item[key])}" placeholder="${esc(opts.placeholder)}"></label>`;
  }
  function repeatCard(array, index, title, body) {
    return `<article class="rb-repeat-card"><div class="rb-repeat-head"><strong>${title} ${index + 1}</strong><button type="button" class="rb-icon-btn" data-remove="${array}" data-index="${index}" aria-label="Excluir"><i class="fa-solid fa-trash"></i></button></div><div class="rb-grid">${body}</div></article>`;
  }
  function renderForm() {
    const form = modal.querySelector(".rb-form");
    form.innerHTML = `
      <section class="rb-form-section" data-progress="personal"><h3><i class="fa-regular fa-user"></i> Dados principais</h3><div class="rb-grid">
        ${field("Nome completo *", "fullName", { required: true, placeholder: "Seu nome completo" })}
        ${field("Cargo ou área de interesse *", "desiredRole", { required: true, placeholder: "Ex.: Atendimento e vendas" })}
        ${field("Telefone / WhatsApp *", "phone", { required: true, placeholder: "(43) 99999-9999" })}
        ${field("E-mail", "email", { type: "email", placeholder: "voce@email.com" })}
        ${field("Cidade *", "city", { required: true, placeholder: "Carlópolis" })}
        ${field("Estado", "state", { placeholder: "PR" })}
        ${field("LinkedIn", "linkedin", { placeholder: "linkedin.com/in/seu-perfil" })}
        <label>Foto <small>Opcional · JPG, PNG ou WEBP</small><input data-photo type="file" accept="image/jpeg,image/png,image/webp"></label>
      </div>${data.photo ? `<div class="rb-photo-status"><img src="${data.photo}" alt=""><span>Foto selecionada</span><button type="button" data-remove-photo>Remover</button></div>` : ""}</section>

      <section class="rb-form-section"><h3><i class="fa-regular fa-id-card"></i> Dados pessoais <span>opcionais</span></h3><div class="rb-grid">
        ${field("Data de nascimento", "birthDate", { type: "date" })}${field("Estado civil", "maritalStatus", { placeholder: "Ex.: Solteiro(a)" })}
        ${field("CNH", "driverLicense", { placeholder: "Ex.: AB" })}${field("Disponibilidade", "availability", { placeholder: "Ex.: Imediata" })}
      </div></section>

      <section class="rb-form-section" data-progress="objective"><h3><i class="fa-solid fa-bullseye"></i> Perfil profissional</h3><div class="rb-grid">
        ${textarea("Objetivo profissional", "objective", "Busco oportunidade na área de atendimento, vendas ou serviços, contribuindo com responsabilidade, organização e bom relacionamento com clientes e equipe.")}
        ${textarea("Resumo profissional", "summary", "Profissional comprometido, com facilidade para aprender novas rotinas, boa comunicação e foco em resultados.")}
      </div></section>

      <section class="rb-form-section" data-progress="experience"><h3><i class="fa-solid fa-briefcase"></i> Experiências profissionais</h3><div data-repeat-list="experiences">
        ${data.experiences.map((item, i) => repeatCard("experiences", i, "Experiência", `${itemInput("experiences", i, "company", "Nome da empresa")}${itemInput("experiences", i, "role", "Cargo")}${itemInput("experiences", i, "start", "Início", { type: "month" })}${itemInput("experiences", i, "end", "Término", { type: "month" })}<label class="rb-check"><input type="checkbox" data-array="experiences" data-index="${i}" data-key="current"${item.current ? " checked" : ""}> Trabalho atualmente aqui</label>${itemInput("experiences", i, "description", "Atividades", { textarea: true, placeholder: "Uma atividade por linha" })}`)).join("")}
      </div><button type="button" class="rb-add-btn" data-add="experiences"><i class="fa-solid fa-plus"></i> Adicionar experiência</button></section>

      <section class="rb-form-section" data-progress="education"><h3><i class="fa-solid fa-graduation-cap"></i> Formação acadêmica</h3><div data-repeat-list="education">
        ${data.education.map((item, i) => repeatCard("education", i, "Formação", `${itemInput("education", i, "course", "Curso / escolaridade")}${itemInput("education", i, "institution", "Instituição")}${itemInput("education", i, "year", "Conclusão", { placeholder: "Ex.: 2021" })}${itemInput("education", i, "status", "Situação", { options: ["Concluído", "Cursando", "Incompleto"] })}`)).join("")}
      </div><button type="button" class="rb-add-btn" data-add="education"><i class="fa-solid fa-plus"></i> Adicionar formação</button></section>

      <section class="rb-form-section"><h3><i class="fa-solid fa-certificate"></i> Cursos e qualificações</h3><div data-repeat-list="courses">
        ${data.courses.map((item, i) => repeatCard("courses", i, "Curso", `${itemInput("courses", i, "name", "Nome do curso")}${itemInput("courses", i, "institution", "Instituição")}${itemInput("courses", i, "hours", "Carga horária", { placeholder: "Ex.: 40h" })}${itemInput("courses", i, "year", "Ano de conclusão")}`)).join("")}
      </div><button type="button" class="rb-add-btn" data-add="courses"><i class="fa-solid fa-plus"></i> Adicionar curso</button></section>

      <section class="rb-form-section"><h3><i class="fa-solid fa-star"></i> Competências</h3><div class="rb-tag-entry"><input data-skill-input placeholder="Digite e pressione Enter"><button type="button" data-add-skill>Adicionar</button></div><div class="rb-tags">${data.skills.map((skill, i) => `<button type="button" data-remove-skill="${i}">${esc(skill)} <span>×</span></button>`).join("")}</div></section>

      <section class="rb-form-section"><h3><i class="fa-solid fa-language"></i> Idiomas</h3><div data-repeat-list="languages">
        ${data.languages.map((item, i) => repeatCard("languages", i, "Idioma", `${itemInput("languages", i, "name", "Idioma")}${itemInput("languages", i, "level", "Nível", { options: LEVELS })}`)).join("")}
      </div><button type="button" class="rb-add-btn" data-add="languages"><i class="fa-solid fa-plus"></i> Adicionar idioma</button></section>
      <div class="rb-mobile-actions"><button type="button" class="rb-secondary-btn" data-view-preview><i class="fa-regular fa-eye"></i> Visualizar currículo</button><button type="button" class="rb-primary-btn" data-pdf><i class="fa-regular fa-file-pdf"></i> Gerar CV em PDF</button></div>`;
    bindForm();
  }
  function has(value) { return String(value || "").trim(); }
  function previewSection(title, content) { return content ? `<section class="cv-section"><h3>${title}</h3>${content}</section>` : ""; }
  function renderPreview() {
    if (!modal) return;
    const contact = [data.city && `${data.city}${data.state ? ` - ${data.state}` : ""}`, data.phone, data.email].filter(has).map(esc).join(" <b>|</b> ");
    const subcontact = [data.linkedin, data.availability].filter(has).map(esc).join(" <b>|</b> ");
    const personal = [["Nascimento", birth(data.birthDate)], ["Estado civil", data.maritalStatus], ["CNH", data.driverLicense], ["Cidade", [data.city, data.state].filter(has).join(" - ")]].filter(([, v]) => has(v));
    const experiences = data.experiences.filter((item) => has(item.company) || has(item.role)).map((item) => `<article class="cv-entry"><div class="cv-entry-title"><strong>${esc(item.company || "Empresa")}</strong><time>${esc([dateMonth(item.start), item.current ? "Atual" : dateMonth(item.end)].filter(has).join(" - "))}</time></div><em>${esc(item.role)}</em>${lines(item.description).length ? `<ul>${lines(item.description).map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : ""}</article>`).join("");
    const education = data.education.filter((item) => has(item.course) || has(item.institution)).map((item) => `<article class="cv-entry"><strong>${esc(item.course)}</strong><p>${esc([item.institution, item.year && `Conclusão: ${item.year}`, item.status].filter(has).join(" · "))}</p></article>`).join("");
    const courses = data.courses.filter((item) => has(item.name)).map((item) => `<li><strong>${esc(item.name)}</strong>${has(item.hours) ? ` — ${esc(item.hours)}` : ""}${has(item.institution) || has(item.year) ? `<small>${esc([item.institution, item.year].filter(has).join(" · "))}</small>` : ""}</li>`).join("");
    modal.querySelector(".rb-preview-stage").innerHTML = `<article class="cv-sheet" id="resumePreview">
      <header class="cv-header">${data.photo ? `<img src="${data.photo}" alt="Foto de ${esc(data.fullName)}">` : `<div class="cv-avatar"><i class="fa-regular fa-user"></i></div>`}<div><h1>${esc(data.fullName || "SEU NOME COMPLETO")}</h1><h2>${esc(data.desiredRole || "Cargo ou área de interesse")}</h2><p>${contact || "Cidade - Estado | Telefone | E-mail"}</p>${subcontact ? `<p class="cv-header-secondary">${subcontact}</p>` : ""}</div></header>
      <div class="cv-body"><aside>${personal.length ? `<section><h3>Dados pessoais</h3>${personal.map(([k, v]) => `<p><strong>${esc(k)}</strong><span>${esc(v)}</span></p>`).join("")}</section>` : ""}${data.skills.length ? `<section><h3>Competências</h3><ul>${data.skills.map((skill) => `<li>${esc(skill)}</li>`).join("")}</ul></section>` : ""}${data.languages.some((item) => has(item.name)) ? `<section><h3>Idiomas</h3>${data.languages.filter((item) => has(item.name)).map((item) => `<p><strong>${esc(item.name)}</strong><span>${esc(item.level)}</span></p>`).join("")}</section>` : ""}</aside>
      <main>${previewSection("Objetivo profissional", has(data.objective) ? `<p>${esc(data.objective)}</p>` : "")}${previewSection("Resumo profissional", has(data.summary) ? `<p>${esc(data.summary)}</p>` : "")}${previewSection("Experiência profissional", experiences)}${previewSection("Formação acadêmica", education)}${previewSection("Cursos e qualificações", courses ? `<ul class="cv-courses">${courses}</ul>` : "")}${!has(data.objective) && !has(data.summary) && !experiences && !education && !courses ? `<div class="cv-empty"><i class="fa-regular fa-pen-to-square"></i><p>Preencha o formulário para montar seu currículo.</p></div>` : ""}</main></div></article>`;
    updateProgress();
  }
  function updateProgress() {
    const checks = [has(data.fullName) && has(data.phone) && has(data.city) && has(data.desiredRole), has(data.objective) || has(data.summary), data.experiences.length > 0, data.education.length > 0, false];
    modal.querySelectorAll(".rb-progress li").forEach((li, index) => li.classList.toggle("done", Boolean(checks[index])));
  }
  function setField(target) {
    if (target.dataset.field) data[target.dataset.field] = target.dataset.field === "phone" ? phone(target.value) : target.value;
    if (target.dataset.array) data[target.dataset.array][Number(target.dataset.index)][target.dataset.key] = target.type === "checkbox" ? target.checked : target.value;
    if (target.dataset.field === "phone") target.value = data.phone;
    save(); renderPreview();
  }
  function addSkill() {
    const input = modal.querySelector("[data-skill-input]");
    const value = input.value.trim();
    if (value && !data.skills.some((item) => item.toLowerCase() === value.toLowerCase())) data.skills.push(value);
    save(); renderForm(); renderPreview();
  }
  function bindForm() {
    const form = modal.querySelector(".rb-form");
    if (form.dataset.resumeBound) return;
    form.dataset.resumeBound = "true";
    form.addEventListener("input", (event) => { if (event.target.matches("[data-field],[data-array]")) setField(event.target); }, { once: false });
    form.addEventListener("change", (event) => {
      if (event.target.matches("[data-field],[data-array]")) setField(event.target);
      if (event.target.matches("[data-photo]")) readPhoto(event.target.files?.[0]);
    });
    form.addEventListener("keydown", (event) => { if (event.target.matches("[data-skill-input]") && (event.key === "Enter" || event.key === ",")) { event.preventDefault(); addSkill(); } });
  }
  function readPhoto(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 6 * 1024 * 1024) return alert("Escolha uma imagem JPG, PNG ou WEBP de até 6 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const limit = 900;
        const canvas = document.createElement("canvas");
        canvas.width = limit;
        canvas.height = limit;
        const context = canvas.getContext("2d");
        context.fillStyle = "#143b5d";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = (image.naturalWidth - sourceSize) / 2;
        const sourceY = (image.naturalHeight - sourceSize) / 2;
        context.beginPath();
        context.arc(limit / 2, limit / 2, limit / 2 - 3, 0, Math.PI * 2);
        context.clip();
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, limit, limit);
        data.photo = canvas.toDataURL("image/jpeg", .9);
        save(); renderForm(); renderPreview();
      };
      image.onerror = () => alert("Não foi possível ler essa imagem.");
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function defaultsFor(array) {
    return ({ experiences: { company: "", role: "", start: "", end: "", current: false, description: "" }, education: { course: "", institution: "", year: "", status: "Concluído" }, courses: { name: "", institution: "", hours: "", year: "" }, languages: { name: "", level: "Básico" } })[array];
  }
  function validate() {
    const missing = [["fullName", "nome completo"], ["desiredRole", "cargo/área de interesse"], ["phone", "telefone"], ["city", "cidade"]].filter(([key]) => !has(data[key])).map(([, label]) => label);
    if (missing.length) { alert(`Preencha os campos obrigatórios: ${missing.join(", ")}.`); modal.querySelector(`[data-field="${[["fullName"], ["desiredRole"], ["phone"], ["city"]].find(([key]) => !has(data[key]))?.[0]}"]`)?.focus(); return false; }
    if (has(data.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { alert("Informe um e-mail válido."); modal.querySelector('[data-field="email"]')?.focus(); return false; }
    if (String(data.phone).replace(/\D/g, "").length < 10) { alert("Informe um telefone brasileiro válido com DDD."); return false; }
    return true;
  }
  function pdfText(doc, text, x, y, width, size = 9, color = [45, 55, 65], style = "normal") {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    const rows = doc.splitTextToSize(String(text || ""), width); doc.text(rows, x, y); return y + rows.length * size * 0.42;
  }
  async function generatePdf() {
    if (!validate()) return;
    if (!window.jspdf?.jsPDF) return alert("O gerador de PDF ainda está carregando. Tente novamente em instantes.");
    const button = modal.querySelector("[data-pdf]"); button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando PDF...';
    try {
      const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
      let page = 1, y = 52, mainX = 63, mainW = 133;
      const header = (continuation = false) => {
        doc.setFillColor(20, 59, 93); doc.rect(0, 0, 210, continuation ? 27 : 43, "F");
        if (!continuation && data.photo) { try { doc.addImage(data.photo, "JPEG", 11, 7, 29, 29, undefined, "FAST"); } catch (_) {} }
        const hx = !continuation && data.photo ? 47 : 15;
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(continuation ? 15 : 21); doc.text(data.fullName.toUpperCase(), hx, continuation ? 11 : 15);
        doc.setFont("helvetica", "normal"); doc.setFontSize(continuation ? 8 : 11); doc.setTextColor(179, 218, 242); doc.text(data.desiredRole, hx, continuation ? 17 : 23);
        doc.setFontSize(7.5); doc.setTextColor(255, 255, 255); doc.text([data.city && `${data.city}${data.state ? ` - ${data.state}` : ""}`, data.phone, data.email].filter(has).join(" | "), hx, continuation ? 22 : 30);
        if (!continuation) doc.text([data.linkedin, data.availability].filter(has).join(" | "), hx, 36);
      };
      const sidebar = () => {
        doc.setFillColor(243, 246, 249); doc.rect(0, 43, 55, 254, "F"); let sy = 53;
        const group = (title, values) => { if (!values.length) return; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(20, 59, 93); doc.text(title.toUpperCase(), 8, sy); sy += 5; values.forEach(([k, v]) => { if (k) { doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(65); doc.text(k, 8, sy); sy += 3; } sy = pdfText(doc, v, 8, sy, 39, 7.3, [70, 80, 90]) + 2; }); sy += 4; };
        group("Dados pessoais", [["Nascimento", birth(data.birthDate)], ["Estado civil", data.maritalStatus], ["CNH", data.driverLicense], ["Cidade", [data.city, data.state].filter(has).join(" - ")]].filter(([, v]) => has(v)));
        group("Competências", data.skills.map((v) => ["", `• ${v}`]));
        group("Idiomas", data.languages.filter((i) => has(i.name)).map((i) => [i.name, i.level]));
      };
      const nextPage = () => { doc.addPage(); page += 1; header(true); y = 36; mainX = 15; mainW = 180; };
      const ensure = (height) => { if (y + height > 285) nextPage(); };
      const sectionTitle = (title) => { ensure(12); doc.setFillColor(27, 103, 153); doc.rect(mainX, y - 4, 1.5, 6, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(20, 59, 93); doc.text(title.toUpperCase(), mainX + 4, y); doc.setDrawColor(215, 222, 228); doc.line(mainX + 4, y + 2.5, mainX + mainW, y + 2.5); y += 8; };
      header(false); sidebar();
      const paragraphSection = (title, value) => { if (!has(value)) return; const rows = doc.splitTextToSize(value, mainW); ensure(13 + rows.length * 4); sectionTitle(title); y = pdfText(doc, value, mainX, y, mainW, 8.7, [45, 55, 65]) + 5; };
      paragraphSection("Objetivo profissional", data.objective); paragraphSection("Resumo profissional", data.summary);
      const exps = data.experiences.filter((i) => has(i.company) || has(i.role));
      if (exps.length) { sectionTitle("Experiência profissional"); exps.forEach((item) => { const bullets = lines(item.description); const estimate = 13 + bullets.reduce((sum, line) => sum + doc.splitTextToSize(line, mainW - 4).length * 3.5, 0); ensure(estimate); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(35, 45, 55); doc.text(item.company || "Empresa", mainX, y); const period = [dateMonth(item.start), item.current ? "Atual" : dateMonth(item.end)].filter(has).join(" - "); if (period) { doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(period, mainX + mainW, y, { align: "right" }); } y += 4.5; if (has(item.role)) y = pdfText(doc, item.role, mainX, y, mainW, 8, [27, 103, 153], "bold") + 1; bullets.forEach((line) => { y = pdfText(doc, `• ${line}`, mainX + 2, y, mainW - 2, 7.8) + 0.7; }); y += 4; }); }
      const edus = data.education.filter((i) => has(i.course) || has(i.institution));
      if (edus.length) { sectionTitle("Formação acadêmica"); edus.forEach((item) => { ensure(13); y = pdfText(doc, item.course, mainX, y, mainW, 8.8, [35,45,55], "bold") + 1; y = pdfText(doc, [item.institution, item.year && `Conclusão: ${item.year}`, item.status].filter(has).join(" · "), mainX, y, mainW, 7.7) + 4; }); }
      const courses = data.courses.filter((i) => has(i.name));
      if (courses.length) { sectionTitle("Cursos e qualificações"); courses.forEach((item) => { ensure(8); y = pdfText(doc, `• ${[item.name, item.hours].filter(has).join(" — ")}`, mainX, y, mainW, 8, [35,45,55], "bold"); if (has(item.institution) || has(item.year)) y = pdfText(doc, [item.institution, item.year].filter(has).join(" · "), mainX + 3, y, mainW - 3, 7.3) + 2; }); }
      for (let i = 1; i <= doc.getNumberOfPages(); i += 1) { doc.setPage(i); doc.setFontSize(6.5); doc.setTextColor(130); doc.text(`${data.fullName} · Página ${i} de ${doc.getNumberOfPages()}`, 195, 292, { align: "right" }); }
      doc.save(`curriculo-${slug(data.fullName)}.pdf`);
    } catch (error) { console.error(error); alert("Não foi possível gerar o PDF. Tente novamente."); }
    finally { button.disabled = false; button.innerHTML = '<i class="fa-regular fa-file-pdf"></i> Gerar CV em PDF'; }
  }
  async function generatePng() {
    if (!validate()) return;
    if (typeof html2canvas !== "function") return alert("O gerador de imagem ainda está carregando.");
    const sheet = modal.querySelector("#resumePreview"); const canvas = await html2canvas(sheet, { scale: 2.2, useCORS: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a"); link.download = `curriculo-${slug(data.fullName)}.png`; link.href = canvas.toDataURL("image/png", 1); link.click();
  }
  function click(event) {
    const button = event.target.closest("button"); if (!button) return;
    if (button.dataset.close !== undefined) return close();
    if (button.dataset.add) { data[button.dataset.add].push(clone(defaultsFor(button.dataset.add))); save(); renderForm(); renderPreview(); modal.querySelector(`[data-repeat-list="${button.dataset.add}"] article:last-child`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }
    if (button.dataset.remove) { data[button.dataset.remove].splice(Number(button.dataset.index), 1); save(); renderForm(); renderPreview(); }
    if (button.dataset.removeSkill !== undefined) { data.skills.splice(Number(button.dataset.removeSkill), 1); save(); renderForm(); renderPreview(); }
    if (button.dataset.addSkill !== undefined) addSkill();
    if (button.dataset.removePhoto !== undefined) { data.photo = ""; save(); renderForm(); renderPreview(); }
    if (button.dataset.viewPreview !== undefined) modal.querySelector(".rb-preview-column")?.scrollIntoView({ behavior: "smooth" });
    if (button.dataset.clear !== undefined && confirm("Deseja apagar todos os dados deste currículo?")) { data = clone(EMPTY); localStorage.removeItem(STORAGE_KEY); renderForm(); renderPreview(); }
    if (button.dataset.pdf !== undefined) generatePdf();
    if (button.dataset.png !== undefined) generatePng();
  }
  function open() {
    if (modal) return;
    modal = document.createElement("div"); modal.className = "rb-overlay"; modal.innerHTML = `<section class="rb-modal" role="dialog" aria-modal="true" aria-labelledby="rbTitle"><header class="rb-top"><div><span class="rb-eyebrow">Modelo 1 · Profissional</span><h2 id="rbTitle">Crie seu currículo grátis</h2><p>Preencha seus dados, visualize seu currículo e baixe o PDF pronto para enviar às empresas.</p></div><button type="button" class="rb-close" data-close aria-label="Fechar">×</button></header><ol class="rb-progress"><li>Dados pessoais</li><li>Objetivo</li><li>Experiência</li><li>Formação</li><li>Finalizar</li></ol><div class="rb-workspace"><form class="rb-form" novalidate></form><aside class="rb-preview-column"><div class="rb-preview-toolbar"><strong>Prévia em tempo real</strong><div><button type="button" class="rb-secondary-btn" data-png><i class="fa-regular fa-image"></i> PNG</button><button type="button" class="rb-primary-btn" data-pdf><i class="fa-regular fa-file-pdf"></i> Gerar CV em PDF</button></div></div><div class="rb-preview-stage"></div></aside></div><footer class="rb-footer"><button type="button" class="rb-danger-btn" data-clear><i class="fa-regular fa-trash-can"></i> Limpar currículo</button><span>Seus dados ficam somente neste navegador.</span></footer></section>`;
    document.body.appendChild(modal); document.body.classList.add("rb-open"); modal.addEventListener("click", click); modal.addEventListener("click", (event) => { if (event.target === modal) close(); }); document.addEventListener("keydown", keydown); renderForm(); renderPreview(); setTimeout(() => modal.querySelector('[data-field="fullName"]')?.focus(), 80);
  }
  function keydown(event) { if (event.key === "Escape") close(); }
  function close() { if (!modal) return; modal.remove(); modal = null; document.body.classList.remove("rb-open"); document.removeEventListener("keydown", keydown); }
  window.ResumeBuilder = { open, close };
  document.addEventListener("click", (event) => { if (event.target.closest("[data-open-resume-builder]")) { event.preventDefault(); open(); } });
  function mountVacancyCta() {
    document.querySelectorAll(".sidebar-version").forEach((item) => { item.textContent = "Olá Carlópolis v380"; });
    const area = document.querySelector(".content_area");
    if (!area || area.querySelector(".vagas-resume-cta")) return;
    const vacancyPage = area.querySelector(".vagas-public-page");
    const heading = Array.from(area.querySelectorAll("h2")).find((item) => /vagas de trabalho/i.test(item.textContent || ""));
    if (!vacancyPage && !heading) return;
    const cta = document.createElement("section");
    cta.className = "vagas-resume-cta";
    cta.setAttribute("aria-label", "Gerador de currículo");
    cta.innerHTML = `<div><h3><i class="fa-regular fa-file-lines"></i> Precisa de um currículo profissional?</h3><p>Preencha seus dados, veja a prévia e baixe grátis em PDF ou PNG.</p></div><button type="button" data-open-resume-builder><i class="fa-solid fa-wand-magic-sparkles"></i> Criar CV grátis</button>`;
    if (vacancyPage) vacancyPage.insertBefore(cta, vacancyPage.querySelector(".vagas-filter-card") || vacancyPage.firstElementChild?.nextSibling || null);
    else heading.insertAdjacentElement("afterend", cta);
  }
  const vacancyObserver = new MutationObserver(mountVacancyCta);
  const startObserver = () => {
    const area = document.querySelector(".content_area");
    if (area) vacancyObserver.observe(area, { childList: true, subtree: true });
    mountVacancyCta();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  else startObserver();
})();
