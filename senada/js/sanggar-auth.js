"use strict";

const SUPABASE_URL = "https://anjwlwnysttwyqbewyfj.supabase.co";
const SUPABASE_KEY = "sb_publishable_kRgEjIGEumAFpCvZf9oO4A_3YiETSkQ";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elemen formulir, pesan, dan panel status yang dipakai oleh semua alur autentikasi.
const authForms = document.querySelector("#authForms");
const panelAkun = document.querySelector("#panelAkun");
const pesanAuth = document.querySelector("#pesanAuth");
const formLogin = document.querySelector("#formLogin");
const formDaftar = document.querySelector("#formDaftar");
const formResetPassword = document.querySelector("#formResetPassword");
const formTabs = document.querySelector(".form-tabs");
const tabLogin = document.querySelector("#tabLogin");
const tabDaftar = document.querySelector("#tabDaftar");
const lupaPassword = document.querySelector("#lupaPassword");
const statusLabels = {
  menunggu_persetujuan: {
    title: "Menunggu persetujuan Dinas",
    detail: "Pengajuan sudah tercatat dan belum ditampilkan kepada publik.",
  },
  disetujui: {
    title: "Disetujui",
    detail: "Pengajuan telah disetujui Dinas.",
  },
  perlu_perbaikan: {
    title: "Perlu perbaikan",
    detail: "Silakan hubungi Dinas untuk mengetahui bagian yang perlu diperbaiki.",
  },
  ditolak: {
    title: "Belum disetujui",
    detail: "Silakan hubungi Dinas untuk informasi lebih lanjut.",
  },
};
let sedangResetPassword = window.location.hash.includes("type=recovery");
let dataPengajuanAktif = null;

// Tombol mata hanya mengubah tipe input lokal, tidak mengirim password ke mana pun.
document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    const tampilkan = input.type === "password";
    input.type = tampilkan ? "text" : "password";
    button.setAttribute("aria-label", `${tampilkan ? "Sembunyikan" : "Lihat"} password`);
    button.setAttribute("aria-pressed", String(tampilkan));
  });
});

function showMessage(message, isError) {
  // Gunakan satu area pesan agar hasil proses mudah dilihat dan diumumkan pembaca layar.
  pesanAuth.textContent = message;
  pesanAuth.classList.toggle("error", Boolean(isError));
}

function setFormMode(mode) {
  // Tab hanya menukar tampilan antara login dan pendaftaran.
  const isLogin = mode === "login";
  const isDaftar = mode === "daftar";
  formLogin.hidden = !isLogin;
  formDaftar.hidden = !isDaftar;
  formResetPassword.hidden = true;
  formTabs.hidden = false;
  tabLogin.classList.toggle("active", isLogin);
  tabDaftar.classList.toggle("active", isDaftar);
  tabLogin.setAttribute("aria-pressed", String(isLogin));
  tabDaftar.setAttribute("aria-pressed", String(isDaftar));
  document.querySelector("#judulHalaman").textContent = isLogin ? "Login Sanggar" : "Daftar akun sanggar";
  document.querySelector("#keteranganForm").textContent = isLogin
    ? "Masuk untuk memantau akun dan pengajuan sanggar Anda."
    : "Buat akun dengan email dan password untuk mengajukan profil sanggar.";
  showMessage("", false);
}

function tampilkanFormResetPassword() {
  // Mode pemulihan dibuka setelah Supabase mengembalikan sesi dari tautan email.
  sedangResetPassword = true;
  authForms.hidden = false;
  panelAkun.hidden = true;
  formLogin.hidden = true;
  formDaftar.hidden = true;
  formResetPassword.hidden = false;
  formTabs.hidden = true;
  document.querySelector("#judulHalaman").textContent = "Atur ulang password";
  document.querySelector("#keteranganForm").textContent =
    "Buat password baru untuk akun sanggar Anda.";
  showMessage("", false);
}

async function tampilkanStatus(user) {
  // Setelah login, baca hanya pengajuan milik user yang sedang aktif.
  authForms.hidden = true;
  panelAkun.hidden = false;
  document.querySelector("#emailAkun").textContent = user.email || "";
  document.querySelector("#statusPengajuan").textContent = "Memuat...";
  document.querySelector("#detailPengajuan").textContent = "";
  showMessage("", false);

  const { data, error } = await supabaseClient
    .from("sanggar_pengajuan")
    .select("nama_sanggar, kapanewon, jenis_kesenian, deskripsi, alamat, no_whatsapp, foto_url, status, catatan_dinas")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Status pengajuan gagal dimuat: ${error.message}`);
  }

  if (!data) {
    document.querySelector("#statusPengajuan").textContent = "Pengajuan belum ditemukan";
    document.querySelector("#detailPengajuan").textContent =
      "Hubungi pengelola SENADA agar pengajuan akun Anda dapat diperiksa.";
    return;
  }
  dataPengajuanAktif = data;

  const status = statusLabels[data.status];
  document.querySelector("#statusPengajuan").textContent =
    status ? status.title : "Status belum dikenali";
  document.querySelector("#detailPengajuan").textContent = [
    data.nama_sanggar,
    data.kapanewon,
    status ? status.detail : "Hubungi Dinas untuk informasi status.",
  ].filter(Boolean).join(" · ");

  const catatanDinas = document.querySelector("#catatanDinas");
  if (data.catatan_dinas) {
    catatanDinas.hidden = false;
    catatanDinas.textContent = `Catatan Dinas: ${data.catatan_dinas}`;
  } else {
    catatanDinas.hidden = true;
    catatanDinas.textContent = "";
  }

  const tombolEdit = document.querySelector("#tombolEditProfil");
  tombolEdit.hidden = false;
}

async function withBusyButton(button, action) {
  // Cegah klik berulang dan tampilkan error jika permintaan Supabase gagal.
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    showMessage(error.message || "Terjadi kesalahan. Silakan coba lagi.", true);
  } finally {
    button.disabled = false;
  }
}

tabLogin.addEventListener("click", () => setFormMode("login"));
tabDaftar.addEventListener("click", () => setFormMode("daftar"));

lupaPassword.addEventListener("click", () => {
  const email = document.querySelector("#emailLogin").value.trim();
  if (!email) {
    showMessage("Masukkan email akun Anda terlebih dahulu.", true);
    document.querySelector("#emailLogin").focus();
    return;
  }

  withBusyButton(lupaPassword, async () => {
    showMessage("Mengirim tautan reset password...", false);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
    showMessage(
      "Jika email terdaftar, tautan reset password akan dikirim. Periksa inbox dan folder spam.",
      false
    );
  });
});

formLogin.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = formLogin.querySelector('button[type="submit"]');
  const email = document.querySelector("#emailLogin").value.trim();
  const password = document.querySelector("#passwordLogin").value;

  withBusyButton(button, async () => {
    showMessage("Sedang masuk...", false);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await tampilkanStatus(data.user);
  });
});

formResetPassword.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = formResetPassword.querySelector('button[type="submit"]');
  const password = document.querySelector("#passwordBaru").value;
  const konfirmasiPassword = document.querySelector("#konfirmasiPasswordBaru").value;

  if (password !== konfirmasiPassword) {
    showMessage("Konfirmasi password tidak sama.", true);
    return;
  }

  withBusyButton(button, async () => {
    showMessage("Menyimpan password baru...", false);
    const { data, error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    if (!data.user) throw new Error("Password berubah, tetapi data akun tidak ditemukan.");
    sedangResetPassword = false;
    await tampilkanStatus(data.user);
    showMessage("Password berhasil diperbarui.", false);
  });
});

formDaftar.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = formDaftar.querySelector('button[type="submit"]');
  const namaSanggar = document.querySelector("#namaSanggar").value.trim();
  const kapanewon = document.querySelector("#kapanewon").value;
  const email = document.querySelector("#emailDaftar").value.trim();
  const password = document.querySelector("#passwordDaftar").value;
  const konfirmasiPassword = document.querySelector("#konfirmasiPassword").value;

  if (password !== konfirmasiPassword) {
    showMessage("Konfirmasi password tidak sama.", true);
    return;
  }

  withBusyButton(button, async () => {
    showMessage("Mendaftarkan akun...", false);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nama_sanggar: namaSanggar, kapanewon },
      },
    });
    if (error) throw error;

    if (data.session && data.user) {
      await tampilkanStatus(data.user);
      showMessage("Akun berhasil dibuat. Pengajuan menunggu persetujuan Dinas.", false);
    } else {
      setFormMode("login");
      showMessage("Akun dibuat. Periksa email untuk verifikasi, lalu login untuk memantau pengajuan.", false);
    }
  });
});

document.querySelector("#tombolKeluar").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  await withBusyButton(button, async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    panelAkun.hidden = true;
    authForms.hidden = false;
    sedangResetPassword = false;
    formLogin.reset();
    setFormMode("login");
    showMessage("Anda telah keluar.", false);
  });
});

document.querySelector("#tombolEditProfil").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const form = document.querySelector("#formEditProfil");

    document.querySelector("#editNamaSanggar").value = dataPengajuanAktif?.nama_sanggar || "";
    document.querySelector("#editKapanewon").value = dataPengajuanAktif?.kapanewon || "";
    document.querySelector("#editJenisKesenian").value = dataPengajuanAktif?.jenis_kesenian || "";
    document.querySelector("#editDeskripsi").value = dataPengajuanAktif?.deskripsi || "";
    document.querySelector("#editAlamat").value = dataPengajuanAktif?.alamat || "";
    document.querySelector("#editNomorWA").value = dataPengajuanAktif?.no_whatsapp || "";
    document.querySelector("#editFotoUrl").value = dataPengajuanAktif?.foto_url || "";

    button.hidden = true;
    form.hidden = false;
  });

document.querySelector("#tombolBatalEdit").addEventListener("click", () => {
  document.querySelector("#formEditProfil").hidden = true;
  document.querySelector("#tombolEditProfil").hidden = false;
  showMessage("", false);
});

document.querySelector("#formEditProfil").addEventListener("submit", (event) => {
  event.preventDefault();
  const button = document.querySelector("#tombolSimpanProfil");
  const nama = document.querySelector("#editNamaSanggar").value.trim();
  const kapanewon = document.querySelector("#editKapanewon").value;
  const fotoUrl = document.querySelector("#editFotoUrl").value.trim();

  if (!nama || !kapanewon) {
    showMessage("Nama sanggar dan Kapanewon wajib diisi.", true);
    return;
  }
  if (fotoUrl) {
    try {
      const url = new URL(fotoUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      showMessage("URL foto harus berupa alamat http:// atau https://.", true);
      return;
    }
  }

  withBusyButton(button, async () => {
    const { error } = await supabaseClient.rpc("sanggar_edit_profil", {
      p_nama_sanggar: document.querySelector("#editNamaSanggar").value.trim(),
      p_kapanewon: document.querySelector("#editKapanewon").value,
      p_jenis_kesenian: document.querySelector("#editJenisKesenian").value.trim(),
      p_deskripsi: document.querySelector("#editDeskripsi").value.trim(),
      p_alamat: document.querySelector("#editAlamat").value.trim(),
      p_nomor_wa: document.querySelector("#editNomorWA").value.trim(),
      p_foto_url: document.querySelector("#editFotoUrl").value.trim(),
    });
    if (error) throw error;

    document.querySelector("#formEditProfil").hidden = true;
    document.querySelector("#tombolEditProfil").hidden = false;
    showMessage("Profil berhasil diperbarui.", false);
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (sessionData.session) {
      await tampilkanStatus(sessionData.session.user);
    }
  });
});

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    tampilkanFormResetPassword();
  }
});

supabaseClient.auth.getSession().then(({ data, error }) => {
  if (error) {
    showMessage(`Sesi gagal diperiksa: ${error.message}`, true);
    return;
  }
  if (data.session && !sedangResetPassword) {
    tampilkanStatus(data.session.user).catch((statusError) => {
      showMessage(statusError.message, true);
    });
  }
});

if (sedangResetPassword) {
  tampilkanFormResetPassword();
}
