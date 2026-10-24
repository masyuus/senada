"use strict";

(() => {
  const container = document.getElementById("parallaxContainer");
  const layers = document.querySelectorAll(".layer[data-depth]");
  const merapi = document.getElementById("merapi");
  const candi = document.getElementById("candi");
  const logo = document.getElementById("logo");
  const panel = document.getElementById("panel");
  const panelContent = document.getElementById("panelContent");
  const peta = document.getElementById("peta");
  const MAP_OFFSET_X = -200;
  const MAP_OFFSET_Y = 0;
  const MAP_START_SCALE = 0.85;
  const MAP_END_SCALE = 0.9;

  // Pastikan elemen utama tersedia sebelum menjalankan interaksi.
  if (!container || !merapi || !candi || !logo || !panel || !panelContent || !peta) {
    console.error("Jelajah Budaya Sleman: satu atau lebih elemen utama tidak ditemukan.");
    return;
  }

  // 1. Efek parallax mouse untuk layar dengan pointer halus.
  let mouseX = 0;
  let mouseY = 0;
  let parallaxFrame = null;

  function updateParallax() {
    if (parallaxFrame !== null) {
      window.cancelAnimationFrame(parallaxFrame);
    }

    parallaxFrame = window.requestAnimationFrame(() => {
      layers.forEach((layer) => {
        const depth = Number.parseFloat(layer.dataset.depth) || 0;
        const moveX = mouseX * depth * 0.04;
        const moveY = mouseY * depth * 0.04;
        layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
      });
      parallaxFrame = null;
    });
  }

  container.addEventListener("pointermove", (event) => {
    // Efek ini hanya diperlukan pada perangkat yang memiliki pointer halus,
    // bukan sentuhan layar ponsel/tablet.
    if (event.pointerType === "touch") return;

    mouseX = event.clientX - window.innerWidth / 2;
    mouseY = event.clientY - window.innerHeight / 2;
    updateParallax();
  });

  container.addEventListener("pointerleave", () => {
    mouseX = 0;
    mouseY = 0;
    updateParallax();
  });

  // 2. Animasi scroll tiga fase.
  function updateScrollAnimation() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    // Fase 1: Merapi memudar, candi/panel muncul, dan logo bergerak naik.
    const p1 = Math.min(Math.max(scrollY / viewportHeight, 0), 1);

    // Fase 2: panel informasi melebar.
    const p2 = Math.min(
      Math.max((scrollY - viewportHeight) / (viewportHeight * 1.2), 0),
      1
    );

    // Fase 3: panel/candi/logo memudar dan peta muncul.
    const p3 = Math.min(
      Math.max((scrollY - viewportHeight * 2.2) / (viewportHeight * 1.3), 0),
      1
    );

    merapi.style.opacity = String(1 - p1);
    candi.style.opacity = String(p1 * (1 - p3 * 0.8));

    const logoOffsetY = p1 * 140;
    logo.style.transform = `translate(-50%, calc(-50% - ${logoOffsetY}px)) scale(${1 - p1 * 0.1})`;
    logo.style.opacity = String(1 - p3);

    panel.style.opacity = String(p1 * (1 - p3));

    const targetWidth = Math.min(600, window.innerWidth * 0.85);
    const currentWidth = 280 + p2 * (targetWidth - 280);
    const currentHeight = 60 + p2 * 200;
    panel.style.width = `${currentWidth}px`;
    panel.style.height = `${currentHeight}px`;

    if (p2 > 0.4 && p3 < 0.2) {
      panelContent.style.opacity = String(Math.min((p2 - 0.4) / 0.6, 1));
    } else {
      panelContent.style.opacity = "0";
    }

    peta.style.opacity = p3;
    const mapScale = 
      MAP_START_SCALE + 
      p3 * (MAP_END_SCALE - MAP_START_SCALE);
    peta.style.transform = `translate(calc(-50% + ${MAP_OFFSET_X}px),
                                      calc(-50% + ${MAP_OFFSET_Y}px))
                            scale(${mapScale})`;
  }

  let scrollFrame = null;
  function requestScrollUpdate() {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(() => {
      updateScrollAnimation();
      scrollFrame = null;
    });
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);

  //Memuat SVG agar setiap wilayah dapat diakses.
  fetch("assets/petaSleman.svg")
    .then((response)=> {
      if (!response.ok) {
        throw new Error("File peta tidak ditemukan.");
      }
      return response.text();
    })
    .then((svgText) => {
      peta.innerHTML = svgText;

      const svg = peta.querySelector("svg");

      if (!svg) {
        console.error("Elemen SVG tidak ditemukan.");
        return;
      }

      svg.style.display = "block";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.overflow = "100%";

      peta.style.width = "min(80vw, 900px)";
      peta.style.aspectRatio = "1 / 1";

      console.log("SVG berhasil dimuat:", !!peta.querySelector("svg"));
      console.log("Ukuran elemen peta:", peta.getBoundingClientRect());
      console.log("Grup Kecamatan:", !!peta.querySelector("#Kecamatan"));

     
      const grupWilayah = svg?.querySelector("#Kecamatan");

      if (!grupWilayah) {
        console.error("Grup Kecamatan tidak ditemukan.");
        return;
      }

    //Tandai bentuk wilayah yang memiliki warna isi.
    const pathList = grupWilayah.querySelectorAll("path");
    const wilayahList = [];
    pathList.forEach((path) => {
      if (path.getAttribute("fill") !== "none") {
        wilayahList.push(path);
      }
    });

    const namaKapanewon = [
      "Berbah",
      "Cangkringan",
      "Depok",
      "Gamping",
      "Godean",
      "Kalasan",
      "Minggir",
      "Mlati",
      "Moyudan",
      "Ngaglik",
      "Ngemplak",
      "Pakem",
      "Prambanan",
      "Seyegan",
      "Sleman",
      "Tempel",
      "Turi"
    ];
    wilayahList.forEach((wilayah, index) => {
      wilayah.dataset.wilayah = `wilayah-${index + 1}`;
      wilayah.dataset.kapanewon = namaKapanewon[index];
      wilayah.style.cursor ="pointer";
      wilayah.style.pointerEvents = "visiblePainted";
    });

    console.log("Jumlah bentuk wilayah: ", wilayahList.length);

    
  let wilayahTerpilih = null;

  // Simpan warna asli setiap wilayah
    wilayahList.forEach((wilayah) => {
      wilayah.dataset.warnaAsli =
      wilayah.getAttribute("fill") || "";
      });

    peta.addEventListener("click", (event) => {
    const wilayah = event.target.closest("[data-wilayah]");
    const popup = document.getElementById("popupKapanewon");
    const namaPopup = document.getElementById("namaPopup");
    const deskripsiPopup = document.getElementById("deskripsiPopup");
    const popupKapanewon = document.getElementById ("popupKapanewon");
    const tombolTutup = document.getElementById("tutupPopup");

    namaPopup.textContent = wilayah.dataset.kapanewon;
    deskripsiPopup.textContent = `Jelajahi seni, sanggar, dan kekayaan di Kapanewon ${wilayah.dataset.kapanewon}.`;
    popup.classList.add("aktif");

    tombolTutup.addEventListener("click", () => {
      popupKapanewon.classList.remove("aktif");
    });

      if (!wilayah || !grupWilayah.contains(wilayah)) return;

  // Jika wilayah yang sama diklik lagi, batalkan pilihan
      if (wilayahTerpilih === wilayah) {
        wilayah.classList.remove("wilayah-terpilih");
        wilayah.style.removeProperty("fill");
        wilayah.setAttribute("fill", wilayah.dataset.warnaAsli);
        wilayah.removeAttribute("stroke");
        wilayah.removeAttribute("stroke-width");

      wilayahTerpilih = null;
      return;
     }

  // Pulihkan wilayah sebelumnya
      if (wilayahTerpilih) {
        wilayahTerpilih.classList.remove("wilayah-terpilih");
        wilayahTerpilih.style.removeProperty("fill");
        wilayahTerpilih.setAttribute(
          "fill",
          wilayahTerpilih.dataset.warnaAsli
        );
        wilayahTerpilih.removeAttribute("stroke");
        wilayahTerpilih.removeAttribute("stroke-width");
      }

      // Pilih wilayah baru
      wilayahTerpilih = wilayah;
      wilayah.style.fill = "#F4A340";
      wilayah.setAttribute("stroke", "#FFE7A3");
      wilayah.setAttribute("stroke-width", "2");
      wilayah.classList.add("wilayah-terpilih");

      console.log("Kapanewon dipilih:", wilayah.dataset.kapanewon);
      });

  })
    .catch((error) => {
      console.error("Gagal memuat peta:", error);
    });

  // Jalankan saat halaman pertama dibuka, termasuk bila browser memulihkan scroll.
  updateScrollAnimation();
})();
