-- Pengajuan menunggu persetujuan disimpan terpisah dari data sanggar publik.
create table if not exists public.sanggar_pengajuan (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nama_sanggar text not null,
  kapanewon text not null,
  jenis_kesenian text,
  deskripsi text,
  alamat text,
  no_whatsapp text,
  foto_url text,
  status text not null default 'menunggu_persetujuan'
    check (status in ('menunggu_persetujuan', 'disetujui', 'perlu_perbaikan', 'ditolak')),
  catatan_dinas text,
  dibuat_pada timestamptz not null default now()
);

alter table public.sanggar_pengajuan add column if not exists jenis_kesenian text;
alter table public.sanggar_pengajuan add column if not exists deskripsi text;
alter table public.sanggar_pengajuan add column if not exists alamat text;
alter table public.sanggar_pengajuan add column if not exists no_whatsapp text;
alter table public.sanggar_pengajuan add column if not exists foto_url text;

alter table public.sanggar_pengajuan enable row level security;

-- Akses baca hanya diberikan kepada pemilik pengajuan dan Admin Dinas.
revoke all on table public.sanggar_pengajuan from anon, authenticated;
grant select on table public.sanggar_pengajuan to authenticated;

drop policy if exists "Sanggar dapat melihat pengajuannya sendiri"
  on public.sanggar_pengajuan;
create policy "Sanggar dapat melihat pengajuannya sendiri"
  on public.sanggar_pengajuan
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admin Dinas dapat melihat semua pengajuan"
  on public.sanggar_pengajuan;
create policy "Admin Dinas dapat melihat semua pengajuan"
  on public.sanggar_pengajuan
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin_dinas');

-- Buat satu baris pengajuan saat Supabase Auth membuat akun baru.
create or replace function public.buat_pengajuan_sanggar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nama text := pg_catalog.btrim(new.raw_user_meta_data ->> 'nama_sanggar');
  wilayah text := pg_catalog.btrim(new.raw_user_meta_data ->> 'kapanewon');
begin
  if nama is null or nama = '' or wilayah is null or wilayah = '' then
    raise exception 'Nama sanggar dan kapanewon wajib diisi.';
  end if;

  insert into public.sanggar_pengajuan (id, email, nama_sanggar, kapanewon)
  values (new.id, new.email, nama, wilayah);

  return new;
end;
$$;

revoke all on function public.buat_pengajuan_sanggar() from public, anon, authenticated;

-- Ganti trigger lama agar pendaftaran baru selalu memakai fungsi terbaru.
drop trigger if exists buat_pengajuan_sanggar_setelah_daftar on auth.users;
create trigger buat_pengajuan_sanggar_setelah_daftar
  after insert on auth.users
  for each row execute function public.buat_pengajuan_sanggar();

alter table public.sanggar_budaya
  add column if not exists pengajuan_id uuid;
alter table public.sanggar_budaya add column if not exists jenis_kesenian text;
alter table public.sanggar_budaya add column if not exists deskripsi text;
alter table public.sanggar_budaya add column if not exists alamat text;
alter table public.sanggar_budaya add column if not exists no_whatsapp text;
alter table public.sanggar_budaya add column if not exists foto_url text;

-- Kolom IDENTITY membuat ID sendiri; tabel lain memakai sequence jika belum punya.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sanggar_budaya'
      and column_name = 'id'
      and is_identity = 'YES'
  ) then
    create sequence if not exists public.sanggar_budaya_id_seq;
    alter table public.sanggar_budaya
      alter column id set default nextval('public.sanggar_budaya_id_seq');
    alter sequence public.sanggar_budaya_id_seq
      owned by public.sanggar_budaya.id;

    perform pg_catalog.setval(
      'public.sanggar_budaya_id_seq',
      coalesce((select max(id) from public.sanggar_budaya), 1),
      (select max(id) is not null from public.sanggar_budaya)
    );
  end if;
end;
$$;

-- Kaitkan baris publik dengan pengajuan asal untuk mencegah duplikasi saat disetujui.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'sanggar_budaya_pengajuan_id_fkey'
      and conrelid = 'public.sanggar_budaya'::regclass
  ) then
    alter table public.sanggar_budaya
      add constraint sanggar_budaya_pengajuan_id_fkey
      foreign key (pengajuan_id)
      references public.sanggar_pengajuan (id)
      on delete set null;
  end if;
end;
$$;

-- Satu pengajuan hanya boleh menghasilkan satu sanggar publik.
create unique index if not exists sanggar_budaya_pengajuan_id_key
  on public.sanggar_budaya (pengajuan_id)
  where pengajuan_id is not null;

-- RPC ini hanya boleh dipanggil Admin Dinas dan memproses satu pengajuan menunggu.
drop function if exists public.admin_dinas_proses_pengajuan(uuid, text);

create or replace function public.admin_dinas_proses_pengajuan(
  p_pengajuan_id uuid,
  p_status text,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pengajuan public.sanggar_pengajuan%rowtype;
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin_dinas' then
    raise exception 'Hanya Admin Dinas yang dapat memproses pengajuan.';
  end if;

  if p_status is null or p_status not in ('disetujui', 'ditolak', 'perlu_perbaikan') then
    raise exception 'Status pengajuan tidak valid.';
  end if;

  if p_status in ('ditolak', 'perlu_perbaikan') and pg_catalog.btrim(coalesce(p_catatan, '')) = '' then
    raise exception 'Catatan Dinas wajib diisi.';
  end if;

  select *
  into v_pengajuan
  from public.sanggar_pengajuan
  where id = p_pengajuan_id
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if v_pengajuan.status <> 'menunggu_persetujuan' then
    raise exception 'Pengajuan ini sudah pernah diproses.';
  end if;

  if p_status = 'disetujui' then
    insert into public.sanggar_budaya (
      pengajuan_id,
      nama,
      kapanewon,
      jenis_kesenian,
      deskripsi,
      alamat,
      no_whatsapp,
      foto_url,
      dipublikasikan
    )
    values (
      v_pengajuan.id,
      v_pengajuan.nama_sanggar,
      v_pengajuan.kapanewon,
      v_pengajuan.jenis_kesenian,
      v_pengajuan.deskripsi,
      v_pengajuan.alamat,
      v_pengajuan.no_whatsapp,
      v_pengajuan.foto_url,
      true
    )
    on conflict (pengajuan_id) where pengajuan_id is not null do nothing;
  end if;

  update public.sanggar_pengajuan
  set status = p_status,
      catatan_dinas = case
        when p_status = 'disetujui' then null
        else pg_catalog.btrim(p_catatan)
      end
  where id = p_pengajuan_id;
end;
$$;

revoke all on function public.admin_dinas_proses_pengajuan(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_dinas_proses_pengajuan(uuid, text, text)
  to authenticated;

-- Sanggar dapat memperbarui profil sendiri. Sanggar yang perlu perbaikan atau
-- ditolak mengubah pengajuan menjadi menunggu setelah data diperbaiki.
create or replace function public.sanggar_edit_profil(
  p_nama_sanggar text,
  p_kapanewon text,
  p_jenis_kesenian text default null,
  p_deskripsi text default null,
  p_alamat text default null,
  p_nomor_wa text default null,
  p_foto_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu.';
  end if;

  if pg_catalog.btrim(coalesce(p_nama_sanggar, '')) = ''
    or pg_catalog.btrim(coalesce(p_kapanewon, '')) = '' then
    raise exception 'Nama sanggar dan kapanewon wajib diisi.';
  end if;

  select status
  into v_status
  from public.sanggar_pengajuan
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'Pengajuan sanggar tidak ditemukan.';
  end if;

  update public.sanggar_pengajuan
  set nama_sanggar = pg_catalog.btrim(p_nama_sanggar),
      kapanewon = pg_catalog.btrim(p_kapanewon),
      jenis_kesenian = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_jenis_kesenian, '')), ''),
      deskripsi = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_deskripsi, '')), ''),
      alamat = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_alamat, '')), ''),
      no_whatsapp = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_nomor_wa, '')), ''),
      foto_url = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_foto_url, '')), ''),
      status = case
        when v_status in ('perlu_perbaikan', 'ditolak') then 'menunggu_persetujuan'
        else v_status
      end,
      catatan_dinas = case
        when v_status in ('perlu_perbaikan', 'ditolak') then null
        else catatan_dinas
      end
  where id = auth.uid();

  update public.sanggar_budaya
  set nama = pg_catalog.btrim(p_nama_sanggar),
      kapanewon = pg_catalog.btrim(p_kapanewon),
      jenis_kesenian = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_jenis_kesenian, '')), ''),
      deskripsi = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_deskripsi, '')), ''),
      alamat = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_alamat, '')), ''),
      no_whatsapp = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_nomor_wa, '')), ''),
      foto_url = pg_catalog.nullif(pg_catalog.btrim(coalesce(p_foto_url, '')), ''),
      dipublikasikan = case
        when v_status in ('perlu_perbaikan', 'ditolak') then false
        else dipublikasikan
      end
  where pengajuan_id = auth.uid();
end;
$$;

revoke all on function public.sanggar_edit_profil(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.sanggar_edit_profil(text, text, text, text, text, text, text)
  to authenticated;

-- Daftar sanggar publik juga diambil melalui RPC khusus Admin Dinas.
create or replace function public.admin_dinas_daftar_sanggar()
returns setof public.sanggar_budaya
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin_dinas' then
    raise exception 'Hanya Admin Dinas yang dapat melihat daftar sanggar.';
  end if;

  return query
  select *
  from public.sanggar_budaya
  where dipublikasikan = true
  order by nama;
end;
$$;

revoke all on function public.admin_dinas_daftar_sanggar()
  from public, anon, authenticated;
grant execute on function public.admin_dinas_daftar_sanggar()
  to authenticated;

-- Setelah akun Admin dibuat, jalankan di SQL Editor (ganti email akun Admin):
-- update auth.users
-- set raw_app_meta_data =
--       coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin_dinas"}'::jsonb
-- where email = 'email-admin@contoh.com';
