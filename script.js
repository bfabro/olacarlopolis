const body = document.querySelector("body");
const darkLight = document.querySelector("#darkLight");
const sidebar = document.querySelector(".sidebar");
const submenuItems = document.querySelectorAll(".submenu_item");
const sidebarOpen = document.querySelector("#sidebarOpen");
const sidebarClose = document.querySelector(".collapse_sidebar");
const sidebarExpand = document.querySelector(".expand_sidebar");
sidebarOpen.addEventListener("click", () => sidebar.classList.toggle("close"));

sidebarClose.addEventListener("click", () => {
  sidebar.classList.add("close", "hoverable");
});
sidebarExpand.addEventListener("click", () => {
  sidebar.classList.remove("close", "hoverable");
});

sidebar.addEventListener("mouseenter", () => {
  if (sidebar.classList.contains("hoverable")) {
    sidebar.classList.remove("close");
  }
});
sidebar.addEventListener("mouseleave", () => {
  if (sidebar.classList.contains("hoverable")) {
    sidebar.classList.add("close");
  }
});

darkLight.addEventListener("click", () => {
  body.classList.toggle("dark");
  if (body.classList.contains("dark")) {
    document.setI;
    darkLight.classList.replace("bx-sun", "bx-moon");
  } else {
    darkLight.classList.replace("bx-moon", "bx-sun");
  }
});

submenuItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    item.classList.toggle("show_submenu");
    submenuItems.forEach((item2, index2) => {
      if (index !== index2) {
        item2.classList.remove("show_submenu");
      }
    });
  });
});

if (window.innerWidth < 768) {
  sidebar.classList.add("close");
} else {
  sidebar.classList.remove("close");
}


document.addEventListener("DOMContentLoaded", function () {
  // Captura o link do Supermercado
  const supermercadoLink = document.querySelector(".nav_link.sublink:nth-child(4)"); 
  const farmaciaLink = document.querySelector(".nav_link.sublink:nth-child(1)"); 
  const contentArea = document.querySelector(".content_area");

  // Adiciona evento de clique
  supermercadoLink.addEventListener("click", function (event) {
    event.preventDefault(); // Evita que a página recarregue

    // Define o conteúdo dinâmico
    contentArea.innerHTML = `
      <h2>Supermercados em Carlópolis</h2>
      </br>
      <ul>
        <li>🛒 Supermercado Rocha</li>
        <li>🛒 Supermercado Carreiro</li>
        <li>🛒 Mercado do Barateiro</li>
      </ul>
    `;
  });




   // Adiciona evento de clique
   farmaciaLink.addEventListener("click", function (event) {
    event.preventDefault(); // Evita que a página recarregue

    // Define o conteúdo dinâmico
    contentArea.innerHTML = `
      <h2>Farmacias em Carlópolis</h2>
      </br>
      <ul>
        <li>🛒 Aguera</li>
        <li>🛒 Jorginho</li>
        <li>🛒 Joao</li>
      </ul>
    `;
  });
});
