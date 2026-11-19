"use strict";

const SUPABASE_URL = "https://anjwlwnysttwyqbewyfj.supabase.co";
const SUPABASE_KEY = "sb_publishable_kRgEjIGEumAFpCvZf9oO4A_3YiETSkQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Referensi elemen yang diisi atau dikendalikan oleh logika dashboard.
const halamanLogin = document.querySelector("#halamanLogin");
const dashboardAdmin = document.querySelector("#dashboardAdmin");
const formLoginAdmin = document.querySelector("#formLoginAdmin");
const pesanLoginAdmin = document.querySelector("#pesanLoginAdmin");
const tombolKeluarAdmin = document.querySelector("#tombolKeluarAdmin");
const menuNavigasi = document.querySelector("#menuNavigasi");
const kartuRingkasan = document.querySelector("#kartuRingkasan");
const kontenRuangKerja = document.querySelector("#kontenRuangKerja");
const formResetPasswordAdmin = document.querySelector("#formResetPasswordAdmin");
const lupaPasswordAdmin = document.querySelector("#lupaPasswordAdmin");

document.querySelector("#togglePasswordAdmin").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const input = document.querySelector("#passwordAdmin");
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  button.setAttribute("aria-label", visible ? "Sembunyikan password" : "Lihat password");
  button.setAttribute("aria-pressed", String(visible));
});

document.querySelectorAll(".toggle-password-admin").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Sembunyikan" : "Lihat";
    button.setAttribute("aria-pressed", String(visible));
  });
});

// Label status internal dari database yang ditampilkan kepada admin.
const statusLabels = {
  menunggu_persetujuan: "Menunggu",
  disetujui: "Disetujui",
  perlu_perbaikan: "Perlu perbaikan",
  ditolak: "Ditolak",
};

const menu = [
  { label: "Ringkasan", icon: "▦", view: "ringkasan" },
  { label: "Pengajuan", icon: "◷", view: "pengajuan" },
  { label: "Data Sanggar", icon: "⌂", view: "sanggar" },
];

// Data cache halaman saat ini; diperbarui setiap dashboard memuat ulang dari Supabase.
let activeView = "ringkasan";
let pengajuan = [];
let sanggarPublik = [];
let refreshTimer = null;
let sedangResetPasswordAdmin = window.location.hash.includes("type=recovery");

function renderMenu() {
  // Buat ulang navigasi supaya status aktif dan badge jumlah pengajuan selalu update.
  menuNavigasi.replaceChildren();
  menu.forEach((item) => {
    const button = document.createElement("button");
    button.className = `nav-item${item.view === activeView ? " active" : ""}`;
    button.type = "button";
    button.setAttribute("aria-current", item.view === activeView ? "page" : "false");

    const icon = document.createElement("span");
    icon.className = "nav-icon";
    icon.textContent = item.icon;
    const label = document.createElement("span");
    label.textContent = item.label;
    button.append(icon, label);
    if (item.view === "pengajuan") {
      const pendingCount = pengajuan.filter(
        (submission) => submission.status === "menunggu_persetujuan"
      ).length;
      if (pendingCount > 0) {
        const badge = document.createElement("span");
        badge.className = "nav-badge";
        badge.textContent = String(pendingCount);
        badge.setAttribute("aria-label", `${pendingCount} pengajuan menunggu`);
        button.append(badge);
      }
    }
    button.addEventListener("click", () => {
      activeView = item.view;
      document.querySelector("#judulHalaman").textContent = item.label;
      document.querySelector("#judulKonten").textContent =
        item.view === "pengajuan" ? "Pengajuan pendaftaran" : item.label;
      renderMenu();
      renderActiveView();
    });
    menuNavigasi.append(button);
  });
}

function renderMetrics() {
  // Ringkas jumlah pengajuan berdasarkan status dan jumlah sanggar yang sudah publik.
  const pending = pengajuan.filter((item) => item.status === "menunggu_persetujuan").length;
  const approved = pengajuan.filter((item) => item.status === "disetujui").length;
  const metrics = [
    { label: "Pengajuan menunggu", icon: "◷", value: pending },
    { label: "Pengajuan disetujui", icon: "✓", value: approved },
    { label: "Sanggar dipublikasikan", icon: "⌂", value: sanggarPublik.length },
  ];

  kartuRingkasan.replaceChildren();
  metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "stat-card";
    const top = document.createElement("div");
    top.className = "stat-top";
    const label = document.createElement("span");
    label.textContent = metric.label;
    const icon = document.createElement("span");
    icon.className = "stat-icon";
    icon.textContent = metric.icon;
    top.append(label, icon);
    const value = document.createElement("p");
    value.className = "stat-value";
    value.textContent = String(metric.value);
    card.append(top, value);
    kartuRingkasan.append(card);
  });
}

function escapeHtml(value) {
  // Ubah teks database menjadi teks biasa sebelum dirangkai ke HTML.
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function statusClass(status) {
  // Pemetaan status ke kelas CSS untuk membedakan badge secara visual.
  if (status === "disetujui") return "approved";
  if (status === "ditolak" || status === "perlu_perbaikan") return "rejected";
  if (status === "menunggu_persetujuan") return "waiting";
  return "";
}

function renderPengajuan() {
  // Tampilkan seluruh pengajuan beserta tombol tindakan untuk item yang masih menunggu.
  const list = document.createElement("div");
  list.className = "submission-list";

  if (!pengajuan.length) {
    list.innerHTML = '<div class="empty-state"><h3>Belum ada pengajuan</h3><p>Pengajuan sanggar akan muncul setelah admin sanggar mendaftar.</p></div>';
    return list;
  }

  pengajuan.forEach((item) => {
    const card = document.createElement("article");
    card.className = "submission-card";
    const canApprove = item.status === "menunggu_persetujuan";
    card.innerHTML = `
      <div class="submission-name">
        <strong>${escapeHtml(item.nama_sanggar || "Nama belum tersedia")}</strong>
        <span>${escapeHtml(item.email || item.id || "-")}</span>
      </div>
      <div class="submission-detail">
        <strong>${escapeHtml(item.kapanewon || "-")}</strong>
        <span>Kapanewon</span>
      </div>
      <div class="submission-detail">
        <span class="status-badge ${statusClass(item.status)}">${escapeHtml(statusLabels[item.status] || "Status belum dikenali")}</span>
      </div>
      ${canApprove ? `
        <div class="submission-actions">
          <button class="approval-button approve" type="button" data-action="approve" data-id="${escapeHtml(item.id)}">Setujui</button>
          <button class="approval-button revise" type="button" data-action="revise" data-id="${escapeHtml(item.id)}">Perlu perbaikan</button>
          <button class="approval-button reject" type="button" data-action="reject" data-id="${escapeHtml(item.id)}">Tolak</button>
        </div>` : '<div></div>'}
    `;
    list.append(card);
  });

  list.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      await ubahStatusPengajuan(id, button.dataset.action, button);
    });
  });
  return list;
}

async function ubahStatusPengajuan(id, action, button) {
  // Pemrosesan dilakukan server melalui RPC yang memvalidasi peran admin dan status.
  const item = pengajuan.find((entry) => entry.id === id);
  if (!item) return;

  button.disabled = true;
  try {
    let catatan = "";
    if (action !== "approve") {
      catatan = window.prompt(
        action === "revise"
          ? "Tuliskan bagian yang perlu diperbaiki sanggar:"
          : "Tuliskan catatan penolakan:",
        ""
      );
      if (catatan === null) return;
      catatan = catatan.trim();
      if (!catatan) throw new Error("Catatan Dinas wajib diisi.");
    }
    const { error } = await supabaseClient.rpc("admin_dinas_proses_pengajuan", {
      p_pengajuan_id: id,
      p_status: action === "approve"
        ? "disetujui"
        : action === "revise" ? "perlu_perbaikan" : "ditolak",
      p_catatan: catatan,
    });
    if (error) throw new Error(`Pengajuan gagal diproses: ${error.message}`);
    await muatDashboard();
  } catch (error) {
    alert(error.message || "Pengajuan gagal diproses.");
  } finally {
    button.disabled = false;
  }
}

function renderSanggar() {
  // Data di bagian ini hanya berisi sanggar yang sudah dipublikasikan.
  const list = document.createElement("div");
  list.className = "submission-list";
  if (!sanggarPublik.length) {
    list.innerHTML = '<div class="empty-state"><h3>Belum ada sanggar publik</h3><p>Sanggar yang disetujui akan muncul di sini.</p></div>';
    return list;
  }
  sanggarPublik.forEach((item) => {
    const card = document.createElement("article");
    card.className = "submission-card";
    card.innerHTML = `
      <div class="submission-name"><strong>${escapeHtml(item.nama || "Nama sanggar")}</strong><span>Dipublikasikan</span></div>
      <div class="submission-detail"><strong>${escapeHtml(item.kapanewon || "-")}</strong><span>Kapanewon</span></div>
      <div class="submission-detail"><strong>${escapeHtml(item.jenis_kesenian || "-")}</strong><span>Jenis kesenian</span></div>
      <div></div>
    `;
    list.append(card);
  });
  return list;
}

function renderRingkasan() {
  // Ringkasan hanya menampilkan antrean yang masih membutuhkan tindakan admin.
  const waiting = pengajuan.filter((item) => item.status === "menunggu_persetujuan");
  const content = document.createElement("div");
  if (!waiting.length) {
    content.innerHTML = '<div class="empty-state"><span class="empty-icon" aria-hidden="true">✓</span><h3>Tidak ada pengajuan menunggu</h3><p>Semua pengajuan yang masuk sudah diproses.</p></div>';
  } else {
    content.append(renderPengajuanForItems(waiting));
  }
  return content;
}

function renderPengajuanForItems(items) {
  // Pakai renderer pengajuan yang sama untuk daftar ringkasan yang sudah difilter.
  const original = pengajuan;
  pengajuan = items;
  const list = renderPengajuan();
  pengajuan = original;
  return list;
}

function renderActiveView() {
  // Ganti isi area kerja sesuai menu aktif tanpa memuat ulang halaman.
  kontenRuangKerja.replaceChildren();
  document.querySelector("#labelRuangLingkup").textContent =
    activeView === "sanggar" ? "Sanggar dipublikasikan" :
    activeView === "pengajuan" ? "Seluruh pengajuan" : "Pengajuan menunggu";

  if (activeView === "pengajuan") {
    kontenRuangKerja.append(renderPengajuan());
  } else if (activeView === "sanggar") {
    kontenRuangKerja.append(renderSanggar());
  } else {
    kontenRuangKerja.append(renderRingkasan());
  }
}

async function muatDashboard(showLoading = false) {
  // Muat pengajuan dan data publik bersamaan agar dashboard menampilkan snapshot terbaru.
  if (showLoading) {
    kontenRuangKerja.innerHTML = '<div class="loading-state">Memuat data pengajuan...</div>';
  }
  const [pengajuanResult, sanggarResult] = await Promise.all([
    supabaseClient
      .from("sanggar_pengajuan")
      .select("*")
      .order("dibuat_pada", { ascending: false }),
    supabaseClient.rpc("admin_dinas_daftar_sanggar"),
  ]);

  if (pengajuanResult.error) {
    kontenRuangKerja.innerHTML = `<div class="error-state">${escapeHtml(pengajuanResult.error.message)}</div>`;
    return;
  }
  if (sanggarResult.error) {
    throw new Error(sanggarResult.error.message);
  }

  pengajuan = pengajuanResult.data || [];
  sanggarPublik = sanggarResult.data || [];
  renderMetrics();
  renderMenu();
  renderActiveView();
}

function mulaiPembaruanOtomatis() {
  // Polling menjaga data tetap baru saat admin membiarkan dashboard terbuka.
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (!dashboardAdmin.hidden && document.visibilityState === "visible") {
      muatDashboard().catch((error) => {
        kontenRuangKerja.innerHTML =
          `<div class="error-state">${escapeHtml(error.message)}</div>`;
      });
    }
  }, 20000);
}

formLoginAdmin.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = formLoginAdmin.querySelector('button[type="submit"]');
  const email = document.querySelector("#emailAdmin").value.trim();
  const password = document.querySelector("#passwordAdmin").value;
  button.disabled = true;
  pesanLoginAdmin.textContent = "Memeriksa akun...";

  supabaseClient.auth.signInWithPassword({ email, password })
    .then(async ({ data, error }) => {
      if (error) throw error;
      await bukaDashboard(data.user);
    })
    .catch((error) => {
      pesanLoginAdmin.textContent = error.message || "Login gagal.";
    })
    .finally(() => {
      button.disabled = false;
    });
});

tombolKeluarAdmin.addEventListener("click", async () => {
  tombolKeluarAdmin.disabled = true;
  const { error } = await supabaseClient.auth.signOut();
  tombolKeluarAdmin.disabled = false;
  if (error) {
    alert(error.message);
    return;
  }
  clearInterval(refreshTimer);
  dashboardAdmin.hidden = true;
  halamanLogin.hidden = false;
  formLoginAdmin.reset();
  pesanLoginAdmin.textContent = "Anda telah keluar.";
});

lupaPasswordAdmin.addEventListener("click", () => {
  const email = document.querySelector("#emailAdmin").value.trim();
  if (!email) {
    pesanLoginAdmin.textContent = "Masukkan email akun Admin terlebih dahulu.";
    document.querySelector("#emailAdmin").focus();
    return;
  }

  lupaPasswordAdmin.disabled = true;
  supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`,
  }).then(({ error }) => {
    if (error) throw error;
    pesanLoginAdmin.textContent =
      "Jika email terdaftar, tautan reset password dikirim. Periksa inbox dan folder spam.";
  }).catch((error) => {
    pesanLoginAdmin.textContent = error.message || "Gagal mengirim tautan reset password.";
  }).finally(() => {
    lupaPasswordAdmin.disabled = false;
  });
});

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    sedangResetPasswordAdmin = true;
    halamanLogin.hidden = false;
    dashboardAdmin.hidden = true;
    formLoginAdmin.hidden = true;
    lupaPasswordAdmin.hidden = true;
    formResetPasswordAdmin.hidden = false;
  }
});

formResetPasswordAdmin.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.querySelector("#passwordBaruAdmin").value;
  const confirmation = document.querySelector("#konfirmasiPasswordBaruAdmin").value;
  if (password !== confirmation) {
    pesanLoginAdmin.textContent = "Konfirmasi password tidak sama.";
    return;
  }

  const button = formResetPasswordAdmin.querySelector('button[type="submit"]');
  button.disabled = true;
  supabaseClient.auth.updateUser({ password }).then(({ data, error }) => {
    if (error) throw error;
    if (!data.user) throw new Error("Password berubah, tetapi data akun tidak ditemukan.");
    pesanLoginAdmin.textContent = "Password berhasil diperbarui. Silakan login kembali.";
    formResetPasswordAdmin.hidden = true;
    formLoginAdmin.hidden = false;
    formLoginAdmin.reset();
  }).catch((error) => {
    pesanLoginAdmin.textContent = error.message || "Gagal memperbarui password.";
  }).finally(() => {
    button.disabled = false;
  });
});

async function bukaDashboard(user) {
  // Login berhasil saja belum cukup; peran khusus harus ada di app_metadata.
  if (user.app_metadata?.role !== "admin_dinas") {
    await supabaseClient.auth.signOut();
    dashboardAdmin.hidden = true;
    halamanLogin.hidden = false;
    pesanLoginAdmin.textContent = "Akun ini tidak memiliki peran Admin Dinas.";
    return;
  }

  document.querySelector("#emailAdminAktif").textContent = user.email || "";
  halamanLogin.hidden = true;
  dashboardAdmin.hidden = false;
  activeView = "ringkasan";
  document.querySelector("#judulHalaman").textContent = "Ringkasan";
  document.querySelector("#judulKonten").textContent = "Pengajuan menunggu";
  renderMenu();
  try {
    await muatDashboard(true);
    mulaiPembaruanOtomatis();
  } catch (error) {
    kontenRuangKerja.innerHTML = `<div class="error-state">${escapeHtml(error.message)}</div>`;
  }
}

supabaseClient.auth.getSession().then(({ data, error }) => {
  if (error) {
    pesanLoginAdmin.textContent = error.message;
    return;
  }
  if (data.session && !sedangResetPasswordAdmin) {
    bukaDashboard(data.session.user).catch((error) => {
      pesanLoginAdmin.textContent = error.message;
    });
  }
});

if (sedangResetPasswordAdmin) {
  halamanLogin.hidden = false;
  dashboardAdmin.hidden = true;
  formLoginAdmin.hidden = true;
  lupaPasswordAdmin.hidden = true;
  formResetPasswordAdmin.hidden = false;
}
