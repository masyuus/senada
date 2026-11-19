"use strict";

(() => {
  // Ambil elemen halaman yang akan diperbarui oleh animasi dan interaksi.
  const container = document.getElementById("parallaxContainer");
  const layers = document.querySelectorAll(".layer[data-depth]");
  const merapi = document.getElementById("merapi");
  const jathilan = document.getElementById("jathilan");
  const logo = document.getElementById("logo");
  const panel = document.getElementById("panel");
  const panelContent = document.getElementById("panelContent");
  const panelPeta = document.getElementById("panelPeta");
  const peta = document.getElementById("peta");
  const MAP_START_SCALE = 0.85;
  const MAP_END_SCALE = 1.65;
  // Daftar nama ini menjadi data awal dan harus cocok dengan identitas wilayah pada SVG.
  const dataSanggar = {
    "Godean" : [],
    "Moyudan" : [],
    "Minggir" : [],
    "Seyegan" : [],
    "Gamping" : [],
    "Mlati" : [],
    "Depok" : [],
    "Berbah" : [],
    "Prambanan" : [],
    "Kalasan" : [],
    "Ngemplak" : [],
    "Ngaglik" : [],
    "Sleman" : [],
    "Tempel" : [],
    "Turi" : [],
    "Pakem" : [],
    "Cangkringan" : []
  };
  // Informasi tambahan untuk kapanewon; wilayah lain memakai teks bawaan.
  const dataKapanewon = {
    "Godean" : {
      deskripsi : "Jelajah seni, sanggar, dan kekayaan budaya di Kapanewon Godean.",
      gambar : "assets/images/godean.jpg"
    }
  };

  const tombolLihatSanggar = document.getElementById("lihatSanggar");
  const tombolKembali = document.getElementById("kembaliPopup");
  const daftarSanggar = document.getElementById("daftarSanggar");
  const isiDaftarSanggar = document.getElementById("isiDaftarSanggar");
  const judulSanggar = document.getElementById("judulSanggar");
  const tampilanDaftarSanggar = document.getElementById("tampilanDaftarSanggar");
  const detailSanggar = document.getElementById("detailSanggar");
  const tombolKembaliDaftarSanggar = document.getElementById("kembaliDaftarSanggar");
  const detailNamaSanggar = document.getElementById("detailNamaSanggar");
  const detailGambar = document.querySelector("#detailSanggar .detail-gambar");
  const detailFotoSanggar = document.getElementById("detailFotoSanggar");
  const detailJenisKesenian = document.getElementById("detailJenisKesenian");
  const detailDeskripsi = document.getElementById("detailDeskripsi");
  const detailAlamat = document.getElementById("detailAlamat");
  const detailNomorWA = document.getElementById("detailNomorWA");
  const detailTombolWA = document.getElementById("detailTombolWA");
  const popup = document.getElementById("popupKapanewon");
  const namaPopup = document.getElementById("popupJudul");
  const deskripsiPopup = document.getElementById("deskripsiPopup");
  const gambarPopup = document.getElementById("popupGambar");
  const popupGambar = document.querySelector(".popup-gambar");
  const tombolTutup = document.getElementById("tutupPopup");
  const jumlahSanggar = document.getElementById("jumlahSanggar");
  // Konfigurasi klien untuk membaca data publik; akses tabel tetap diatur oleh RLS.
  const SUPABASE_URL = "https://anjwlwnysttwyqbewyfj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_kRgEjIGEumAFpCvZf9oO4A_3YiETSkQ";

  // Klien memakai publishable key; aturan RLS Supabase membatasi data yang boleh dibaca.
  const supabaseClient = window.supabase.createClient (
    SUPABASE_URL, SUPABASE_KEY
  );

  const backsound = document.getElementById("backsound");
  const tombolAudio = document.getElementById("tombolAudio");

  // Samakan ikon dan label tombol dengan status musik saat ini.
  function perbaruiTombolAudio() {
    const sedangDiputar = !backsound.paused;
    tombolAudio.textContent = sedangDiputar ? "🔊" : "🔇";
    tombolAudio.setAttribute(
      "aria-label",
      sedangDiputar ? "Matikan musik" : "Nyalakan musik"
    );
    tombolAudio.title = sedangDiputar ? "Matikan musik" : "Nyalakan musik";
  }

  // Volume backsound tetap 30%; kontrol hanya untuk menyalakan atau mematikan.
  backsound.volume = 0.3;
  backsound.addEventListener("play", perbaruiTombolAudio);
  backsound.addEventListener("pause", perbaruiTombolAudio);
  perbaruiTombolAudio();

  // Coba putar musik saat website dibuka; browser dapat menolak autoplay tanpa interaksi.
  backsound.play().catch(() => {
    console.log("Autoplay diblokir browser. ")
  });

  // Tombol audio mengubah status putar/jeda dan label aksesibilitasnya.
  tombolAudio.addEventListener("click", async () => {
    if (backsound.paused) {
      try {
        await backsound.play();
      } catch (error) {
        console.error("Gagal memutar musik:", error);
      }
    } else {
      backsound.pause();
    }
  });

  function putarSound(id, volume = 0.5) {
    const audio = document.getElementById(id);
    if (!audio) {
      console.error("Audio tidak ditemukan:", id);
      return;
    }
    
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch((error) => {
      console.error(`Gagal memutar sound:`, error);
    });
  }

  // Hentikan inisialisasi jika HTML belum menyediakan elemen yang dibutuhkan.
  // Pastikan elemen utama tersedia sebelum menjalankan interaksi.
  if (
    !container ||
    !merapi ||
    !jathilan ||
    !logo ||
    !panel ||
    !panelContent ||
    !panelPeta ||
    !peta
  ) {
    console.error("Jelajah Budaya Sleman: satu atau lebih elemen utama tidak ditemukan.");
    return;
  }

  if (
    !tombolLihatSanggar ||
    !tombolKembali ||
    !daftarSanggar ||
    !isiDaftarSanggar ||
    !judulSanggar ||
    !popup ||
    !namaPopup ||
    !deskripsiPopup ||
    !gambarPopup ||
    !popupGambar ||
    !tombolTutup ||
    !jumlahSanggar
  ) {
    console.error("Jelajah Budaya Sleman: elemen popup atau sanggar tidak ditemukan.");
    return;
  }

  gambarPopup.addEventListener("error", () => {
    if (gambarPopup.dataset.fallback !== "true") {
      gambarPopup.dataset.fallback = "true";
      gambarPopup.src = "assets/images/budaya-default.jpg";
      gambarPopup.alt = "Ilustrasi budaya Sleman";
      return;
    }
    gambarPopup.hidden = true;
    popupGambar.hidden = true;
  });
  gambarPopup.addEventListener("load", () => {
    gambarPopup.hidden = false;
  });

  // 1. Efek parallax mouse untuk layar dengan pointer halus.
  // Gerakan mouse hanya mengubah layer dekorasi; layer peta tetap stabil.
  let mouseX = 0;
  let mouseY = 0;
  let parallaxFrame = null;

  function updateParallax() {
    if (parallaxFrame !== null) {
      window.cancelAnimationFrame(parallaxFrame);
    }

    parallaxFrame = window.requestAnimationFrame(() => {
      layers.forEach((layer) => {
        if (layer.classList.contains("map-layer")) return;

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
  // Mengubah posisi scroll menjadi nilai 0-1 untuk mengendalikan animasi peta.
  function getMapProgress(scrollY, viewportHeight) {
    return Math.min(
      Math.max((scrollY - viewportHeight * 2.2) / (viewportHeight * 1.3), 0),
      1
    );
  }

  function updateScrollAnimation() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    // Fase 1: Merapi meredup, jathilan/panel muncul, dan logo bergerak naik.
    const p1 = Math.min(Math.max(scrollY / viewportHeight, 0), 1);

    // Fase 2: panel informasi melebar.
    const p2 = Math.min(
      Math.max((scrollY - viewportHeight) / (viewportHeight * 1.2), 0),
      1
    );

    // Fase 3: panel/jathilan/logo dan Merapi memudar, lalu peta muncul.
    const p3 = getMapProgress(scrollY, viewportHeight);
    merapi.style.opacity = String(Math.max(0.50, 1 - p1) * (1 - p3));
    jathilan.style.opacity = String(p1 * (1 - p3 * 0.8));

    const logoOffsetY = p1 * 10 + p2 * viewportHeight * 0.14;
    const logoScale = 1 - p1 * 0.1 - p2 * 0.4;
    logo.style.transform = `translate(-50%, calc(-50% - ${logoOffsetY}px)) scale(${logoScale})`;
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

    panelPeta.style.opacity = String(p3);
    panelPeta.style.transform = `translate(-50%, -50%) scale(${0.92 + p3 * 0.08})`;

    peta.style.opacity = p3;
    peta.style.pointerEvents = p3 > 0 ? "auto" : "none";
    peta.inert = p3 === 0;
    if (p3 === 0) {
      popup.classList.remove("aktif");
      popup.classList.remove("mode-daftar");
      container.classList.remove("popup-terbuka");
      document.body.style.overflow = "";
    }

    const mapScale = 
      MAP_START_SCALE + 
      p3 * (MAP_END_SCALE - MAP_START_SCALE);
    peta.style.transform = `translate(-50%, -50%) scale(${mapScale})`;
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

  // Muat SVG dari aset lokal, validasi daftar wilayah, lalu siapkan kontrol aksesibel.
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
      svg.style.height = "auto";
      svg.style.overflow = "visible";
      svg.setAttribute("role", "group");
      svg.setAttribute("aria-label", "Pilih salah satu kapanewon di Kabupaten Sleman");

      console.log("SVG berhasil dimuat:", !!peta.querySelector("svg"));
      console.log("Ukuran elemen peta:", peta.getBoundingClientRect());
      console.log("Grup Kecamatan:", !!peta.querySelector("#Kecamatan"));

     
      const grupWilayah = svg?.querySelector("#Kecamatan");

      if (!grupWilayah) {
        console.error("Grup Kecamatan tidak ditemukan.");
        return;
      }

    const wilayahList = Array.from(
      grupWilayah.querySelectorAll("path[data-kapanewon]")
    );
    const namaKapanewonTersedia = new Set(
      wilayahList.map((wilayah) => wilayah.dataset.kapanewon)
    );
    const semuaNamaKapanewon = Object.keys(dataSanggar);

    if (
      wilayahList.length !== semuaNamaKapanewon.length ||
      namaKapanewonTersedia.size !== wilayahList.length ||
      !semuaNamaKapanewon.every((nama) => namaKapanewonTersedia.has(nama))
    ) {
      console.error("Identitas wilayah pada SVG tidak lengkap atau tidak valid.");
      return;
    }

    wilayahList.forEach((wilayah) => {
      const namaKapanewon = wilayah.dataset.kapanewon;
      wilayah.dataset.wilayah = wilayah.id;
      wilayah.setAttribute("role", "button");
      wilayah.setAttribute("tabindex", "0");
      wilayah.setAttribute("aria-label", `Pilih Kapanewon ${namaKapanewon}`);
      wilayah.setAttribute("aria-pressed", "false");
      wilayah.style.cursor = "pointer";
      wilayah.style.pointerEvents = "visiblePainted";

      const bounds = wilayah.getBBox();
      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      label.setAttribute("class", "label-kapanewon");
      label.setAttribute("x", String(bounds.x + bounds.width / 2));
      label.setAttribute("y", String(bounds.y + bounds.height / 2));
      label.textContent = namaKapanewon;
      grupWilayah.append(label);
    });

    let wilayahTerpilih = null;

    wilayahList.forEach((wilayah) => {
      wilayah.dataset.warnaAsli = wilayah.getAttribute("fill") || "";
    });

    // Perbarui popup dan sorotan wilayah yang sedang dipilih.
    function pilihWilayah(wilayah) {
      if (peta.inert) return;

      const namaKapanewon = wilayah.dataset.kapanewon;
      const data = dataKapanewon[namaKapanewon];

      daftarSanggar.hidden = true;
      popup.classList.remove("mode-daftar");
      tombolLihatSanggar.hidden = false;
      namaPopup.hidden = false;
      gambarPopup.hidden = false;
      deskripsiPopup.hidden = false;

      namaPopup.textContent = namaKapanewon;
      deskripsiPopup.textContent = data
        ? data.deskripsi
        : `Jelajah seni dan budaya di Kapanewon ${namaKapanewon}.`;
      popupGambar.hidden = false;
      gambarPopup.hidden = false;
      gambarPopup.dataset.fallback = "false";
      gambarPopup.src = data?.gambar || `assets/images/${namaKapanewon}.jpg`;
      gambarPopup.alt = `Ilustrasi budaya ${namaKapanewon}`;
      popup.classList.add("aktif");
      container.classList.add("popup-terbuka");
      document.body.style.overflow = "hidden";

      jumlahSanggar.textContent = "Menghitung sanggar...";

      hitungSanggar(namaKapanewon).then((jumlah) => {
        if (namaPopup.textContent !== namaKapanewon) return;

        jumlahSanggar.textContent = jumlah === null
          ? "Jumlah sanggar belum tersedia"
          : `${jumlah} sanggar budaya`;
      });

      if (wilayahTerpilih === wilayah) {
        wilayah.classList.remove("wilayah-terpilih");
        wilayah.style.removeProperty("fill");
        wilayah.setAttribute("fill", wilayah.dataset.warnaAsli);
        wilayah.removeAttribute("stroke");
        wilayah.removeAttribute("stroke-width");
        wilayah.setAttribute("aria-pressed", "false");
        wilayahTerpilih = null;
        return;
      }

      if (wilayahTerpilih) {
        wilayahTerpilih.classList.remove("wilayah-terpilih");
        wilayahTerpilih.style.removeProperty("fill");
        wilayahTerpilih.setAttribute("fill", wilayahTerpilih.dataset.warnaAsli);
        wilayahTerpilih.removeAttribute("stroke");
        wilayahTerpilih.removeAttribute("stroke-width");
        wilayahTerpilih.setAttribute("aria-pressed", "false");
      }

      wilayahTerpilih = wilayah;
      wilayah.style.fill = "#F4A340";
      wilayah.setAttribute("stroke", "#FFE7A3");
      wilayah.setAttribute("stroke-width", "2");
      wilayah.setAttribute("aria-pressed", "true");
      wilayah.classList.add("wilayah-terpilih");
    }

    // Cari path wilayah dari target event, termasuk saat target berasal dari SVG.
    function dapatkanWilayah(target) {
      if (!(target instanceof Element)) return null;

      const wilayah = target.closest("path[data-kapanewon]");
      return wilayah && grupWilayah.contains(wilayah) ? wilayah : null;
    }

    peta.addEventListener("click", (event) => {
      const wilayah = dapatkanWilayah(event.target);
      if (wilayah) pilihWilayah(wilayah);
    });

    peta.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const wilayah = dapatkanWilayah(event.target);
      if (!wilayah) return;

      event.preventDefault();
      pilihWilayah(wilayah);
    });

  })
    .catch((error) => {
      console.error("Gagal memuat peta:", error);
    });

  tombolTutup.addEventListener("click", () => {
    popup.classList.remove("aktif");
    popup.classList.remove("mode-daftar");
    container.classList.remove("popup-terbuka");
    document.body.style.overflow = "";
  });

    // Ambil hanya sanggar yang sudah dipublikasikan pada kapanewon terpilih.
    async function ambilDataSanggar(namaKapanewon) {
    const {data, error } = await supabaseClient
    .from("sanggar_budaya")
    .select("*")
    .eq("kapanewon", namaKapanewon)
    .eq("dipublikasikan", true)
    .order("nama", {ascending : true});

    if (error) {
      console.error("Gagal mengambil data sanggar:", error);
      return null;
    }
    return data;
  };

  // Hitung jumlah sanggar publik untuk ditampilkan di popup wilayah.
  async function hitungSanggar(namaKapanewon) {
    const { count, error } = await supabaseClient
    .from("sanggar_budaya")
    .select("*", {count : "exact", head : true})
    .eq("kapanewon", namaKapanewon)
    .eq("dipublikasikan", true);

    if (error) {
      console.error ("Gagal menghitung sanggar:", error.message);
      return null;
    }
    return count ?? 0;
  };

  // Buang tanda baca dan spasi agar nomor dapat dipakai di URL wa.me.
  function ambilNomorWhatsApp(sanggar) {
    return String(sanggar.no_whatsapp || sanggar.whatsapp || "").replace(/\D/g, "");
  }

  // Isi tampilan detail fullscreen dengan data sanggar yang dipilih.
  // Beberapa nama kolom foto/WhatsApp dicoba agar kompatibel dengan data lama.
  function isiDetailPopupSanggar(sanggar) {
    detailNamaSanggar.textContent = sanggar.nama || "Nama sanggar";
    detailJenisKesenian.textContent =
      `Jenis kesenian: ${sanggar.jenis_kesenian || "-"}`;
    detailDeskripsi.textContent = sanggar.deskripsi || "Deskripsi belum tersedia.";
    detailAlamat.textContent = `Alamat: ${sanggar.alamat || "-"}`;

    const nomor = ambilNomorWhatsApp(sanggar);
    detailNomorWA.textContent = nomor ? `WhatsApp: ${nomor}` : "WhatsApp: -";
    detailTombolWA.hidden = !nomor;
    if (nomor) {
      detailTombolWA.href = `https://wa.me/${nomor}`;
    } else {
      detailTombolWA.removeAttribute("href");
    }

    const foto =
      sanggar.foto_url ||
      sanggar.url_foto ||
      sanggar.gambar_url ||
      sanggar.foto ||
      sanggar.gambar ||
      "";
    detailFotoSanggar.onerror = () => {
      detailFotoSanggar.hidden = true;
      detailGambar.hidden = true;
    };
    detailFotoSanggar.onload = () => {
      detailFotoSanggar.hidden = false;
      detailGambar.hidden = false;
    };
    detailGambar.hidden = !foto;
    detailFotoSanggar.hidden = !foto;
    detailFotoSanggar.src = foto;
    detailFotoSanggar.alt = foto
      ? `Dokumentasi ${sanggar.nama || "sanggar"}`
      : "";
  }

  // Muat daftar sanggar wilayah dan tampilkan detail saat salah satu dipilih.
  // Elemen daftar dibangun dengan DOM agar teks dari database tidak diperlakukan sebagai HTML.
  tombolLihatSanggar.addEventListener("click", async () => {
    const nama = namaPopup.textContent;
    const daftar = await ambilDataSanggar(nama);
    judulSanggar.textContent = `Kapanewon ${nama}`;

    isiDaftarSanggar.replaceChildren();

    if (daftar === null) {
      isiDaftarSanggar.textContent =
      "Data sanggar gagal dimuat. Silahkan coba lagi,";
    } else if (daftar.length === 0) {
      isiDaftarSanggar.textContent =
      "Data sanggar untuk kapanewon ini belum tersedia.";
    } else {
      daftar.forEach((sanggar) => {
        const kartu = document.createElement("article");
        kartu.className = "kartu-sanggar";

        const judul = document.createElement("h4");
        judul.textContent = sanggar.nama;

        const kesenian = document.createElement("p");
        kesenian.textContent = `Jenis kesenian: ${sanggar.jenis_kesenian || "-"}`;

        const alamat = document.createElement("p");
        alamat.textContent = `Alamat: ${sanggar.alamat || "-"}`;

        const tombolDetail = document.createElement("button");
        tombolDetail.type = "button";
        tombolDetail.className = "btn-lihat-detail";
        tombolDetail.textContent = "Lihat detail";

        kartu.append(judul, kesenian, alamat);

        // Kartu dan tombolnya sama-sama membuka layar detail yang dipilih.
        const bukaDetail = () => {
          isiDetailPopupSanggar(sanggar);
          tampilanDaftarSanggar.hidden = true;
          detailSanggar.hidden = false;
          document.body.classList.add("detail-sanggar-terbuka");
          popup.classList.remove("aktif");

          document.body.style.overflow = "hidden";
          detailSanggar.scrollTop = 0;
        };
        kartu.addEventListener("click", bukaDetail);
        tombolDetail.addEventListener("click", (event) => {
          event.stopPropagation();
          bukaDetail();
        });
        kartu.appendChild(tombolDetail);

        isiDaftarSanggar.appendChild(kartu);
      });
    }
    daftarSanggar.hidden = false;
    popup.classList.add("mode-daftar");
    tampilanDaftarSanggar.hidden = false;
    detailSanggar.hidden = true;
    namaPopup.hidden = true;
    popupGambar.hidden = true;
    deskripsiPopup.hidden = true;
    tombolLihatSanggar.hidden = true;
  });

  tombolKembali.addEventListener("click", () => {
    daftarSanggar.hidden = true;
    popup.classList.remove("mode-daftar");
    tampilanDaftarSanggar.hidden = false;
    detailSanggar.hidden = true;
    namaPopup.hidden = false;
    popupGambar.hidden = false;
    deskripsiPopup.hidden = false;
    tombolLihatSanggar.hidden = false;
    popup.classList.add("aktif");
    document.body.style.overflow = "";
  });

  tombolKembaliDaftarSanggar.addEventListener("click", () => {
    detailSanggar.hidden = true;
    document.body.classList.remove("detail-sanggar-terbuka");
    tampilanDaftarSanggar.hidden = false;
    popup.classList.add("aktif");
    document.body.style.overflow = "";
  });

  // Jalankan saat halaman pertama dibuka, termasuk bila browser memulihkan scroll.
  updateScrollAnimation();
})();
