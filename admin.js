// Konfigurasi Supabase
const SUPABASE_URL = 'https://fznapkpqrhevuxthvott.supabase.co';
// PASTIKAN pakai Anon Key yang sama dengan script.js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6bmFwa3BxcmhldnV4dGh2b3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMzg3MjEsImV4cCI6MjA4NjcxNDcyMX0.haR_vhREOeIf29r52sfPhX_3zsvXFNihayJu9JmGCzM'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let quillSambutan;
let quillBerita;
let quillPrestasi;
let adminNewsData = [];
let adminPrestasiData = [];
document.addEventListener('DOMContentLoaded', () => {
    // Aktifkan editor teks
    quillSambutan = new Quill('#editor-sambutan', {
        theme: 'snow',
        placeholder: 'Tulis sambutan di sini...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean'] // Tombol untuk menghapus format
            ]
        }
    });

    quillBerita = new Quill('#editor-berita', {
        theme: 'snow',
        placeholder: 'Tulis isi berita selengkapnya di sini...',
        modules: {
            toolbar: [
                [{ 'header': [2, 3, 4, false] }], // Pilihan ukuran judul (H2, H3, dll)
                ['bold', 'italic', 'underline', 'strike'], // Format teks
                [{ 'color': [] }, { 'background': [] }], // Warna teks & background
                [{ 'list': 'ordered'}, { 'list': 'bullet' }], // List numbering/bullet
                [{ 'align': [] }], // Rata kiri/tengah/kanan
                ['link'], // Insert link
                ['clean'] // Hapus format
            ]
        }
    });

    quillPrestasi = new Quill('#editor-prestasi', {
        theme: 'snow',
        placeholder: 'Ceritakan detail prestasi di sini...',
        modules: {
            toolbar: [
                [{ 'header': [2, 3, 4, false] }], 
                ['bold', 'italic', 'underline', 'strike'], 
                [{ 'color': [] }, { 'background': [] }], 
                [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
                [{ 'align': [] }], 
                ['link'], 
                ['clean'] 
            ]
        }
    });

    const passInput = document.getElementById('admin-pass');
    if (passInput) {
        passInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Mencegah halaman refresh
                attemptLogin();     // Jalankan fungsi login
            }
        });
    }

    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();

    document.getElementById('sidebarToggle').addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('sb-sidenav-toggled');
    });

    document.getElementById('add-news-form').addEventListener('submit', postNews);
    document.getElementById('sidebarToggle').addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('sb-sidenav-toggled');
    });

    // DAFTARKAN INI AGAR FORM GURU TIDAK REFRESH HALAMAN
    document.getElementById('add-news-form').addEventListener('submit', postNews);
    document.getElementById('add-guru-form').addEventListener('submit', postGuru); // <--- TAMBAHKAN INI

    document.getElementById('add-prestasi-form')?.addEventListener('submit', postPrestasi);
});

async function attemptLogin() {
    const pass = document.getElementById('admin-pass').value;
    const btn = document.querySelector('#loginModal button');
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Loading...';
    btn.disabled = true;

    try {
        // Cek password dari tabel pengaturan di Supabase
        const { data, error } = await supabaseClient.from('pengaturan').select('nilai').eq('kunci', 'admin_password').single();
        
        if (error) throw error;

        if(data && pass === data.nilai) {
            // Login Sukses
            const modalEl = document.getElementById('loginModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            document.getElementById('wrapper').classList.remove('d-none');
            fetchAdminStats();
            loadProfilSekolah(); // <-- TAMBAHKAN INI
        } else {
            alert('Password salah!');
        }
    } catch(e) {
        alert('Gagal koneksi ke database.');
        console.error(e);
    } finally {
        btn.innerHTML = 'Masuk';
        btn.disabled = false;
    }
}

// --- FUNGSI PROFIL SEKOLAH ---

// Mengambil data profil dari Supabase ke form
async function loadProfilSekolah() {
    try {
        const { data, error } = await supabaseClient.from('profil_sekolah').select('*').eq('id', 1).single();
        if(error) throw error;
        
        if(data) {
            document.getElementById('prof-nama').value = data.nama_sekolah || '';
            document.getElementById('prof-logo').value = data.logo_url || '';
            document.getElementById('prof-teks').value = data.teks_utama || '';
            document.getElementById('prof-visi').value = data.visi || '';
            document.getElementById('prof-misi').value = data.misi || '';
            document.getElementById('prof-jalan').value = data.jalan || '';
            document.getElementById('prof-kel').value = data.kelurahan || '';
            document.getElementById('prof-kec').value = data.kecamatan || '';
            document.getElementById('prof-kota').value = data.kota || '';
            document.getElementById('prof-prov').value = data.provinsi || '';
            document.getElementById('prof-jam').value = data.jam_operasional || '';
            document.getElementById('prof-kontak').value = data.kontak || '';
            document.getElementById('prof-ig').value = data.instagram || '';
            document.getElementById('prof-yt').value = data.youtube || '';
            document.getElementById('prof-namakepsek').value = data.nama_kepsek || '';
            document.getElementById('prof-fotokepsek').value = data.foto_kepsek || '';
            if (data.sambutan_kepsek) {
                // Memasukkan data HTML dari Supabase ke dalam editor
                quillSambutan.clipboard.dangerouslyPasteHTML(data.sambutan_kepsek);
            }
        }
    } catch(e) {
        console.error("Gagal load profil:", e);
    }
}

// Event Listener untuk menyimpan data form
document.addEventListener('DOMContentLoaded', () => {
    // ... (kode yang sudah ada sebelumnya) ...

    // Tambahkan event listener untuk form profil
    document.getElementById('form-profil')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = 'Menyimpan...';

        const payload = {
            nama_sekolah: document.getElementById('prof-nama').value,
            logo_url: document.getElementById('prof-logo').value,
            teks_utama: document.getElementById('prof-teks').value,
            visi: document.getElementById('prof-visi').value,
            misi: document.getElementById('prof-misi').value,
            jalan: document.getElementById('prof-jalan').value,
            kelurahan: document.getElementById('prof-kel').value,
            kecamatan: document.getElementById('prof-kec').value,
            kota: document.getElementById('prof-kota').value,
            provinsi: document.getElementById('prof-prov').value,
            jam_operasional: document.getElementById('prof-jam').value,
            kontak: document.getElementById('prof-kontak').value,
            instagram: document.getElementById('prof-ig').value,
            youtube: document.getElementById('prof-yt').value,
            nama_kepsek: document.getElementById('prof-namakepsek').value,
            foto_kepsek: document.getElementById('prof-fotokepsek').value,
            sambutan_kepsek: quillSambutan.root.innerHTML
        };

        try {
            const { error } = await supabaseClient.from('profil_sekolah').update(payload).eq('id', 1);
            if(error) throw error;
            alert('Profil sekolah berhasil diperbarui!');
        } catch(err) {
            console.error(err);
            alert('Gagal menyimpan profil.');
        } finally {
            btn.disabled = false; btn.innerHTML = originalText;
        }
    });
});

function switchTab(tabId) {
    // Sembunyikan semua view
    document.querySelectorAll('.admin-view').forEach(el => el.classList.add('d-none'));
    // Tampilkan view yang dipilih
    document.getElementById(`view-${tabId}`).classList.remove('d-none');
    
    // Update status tombol aktif
    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active', 'fw-bold'));
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active', 'fw-bold');

    // Load data sesuai tab
    if (tabId === 'berita') fetchAdminNews();
    if (tabId === 'kelas') fetchAdminKelas();
    if (tabId === 'prestasi') fetchAdminPrestasi();
    if (tabId === 'guru') {
        fetchAdminGuru();
        fetchKelas(); // Mengambil data kelas untuk pilihan di form guru
    }
}

async function fetchAdminStats() {
    try {
        const { data } = await supabaseClient.from('statistik').select('count').eq('id', 1).single();
        document.getElementById('stat-visitor').innerText = data ? data.count : 0;
    } catch(e) { console.error("Gagal ambil statistik:", e); }
}

// 5. Menyimpan (Insert Baru atau Update Edit)
async function postNews(e) {
    e.preventDefault();
    const newsId = document.getElementById('news-id').value;
    const actionText = newsId ? "menyimpan perubahan" : "memposting";
    
    if(!confirm(`Apakah Anda yakin ingin ${actionText} berita ini?`)) return;

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';

    const payload = {
        title: document.getElementById('news-title').value,
        content: quillBerita.root.innerHTML,
        img: document.getElementById('news-img').value
    };

    try {
        if (newsId) {
            // Jika ada ID, lakukan UPDATE
            const { error } = await supabaseClient.from('berita').update(payload).eq('id', newsId);
            if(error) throw error;
            alert('Berita berhasil diperbarui!');
        } else {
            // Jika tidak ada ID, lakukan INSERT (Tambah Baru)
            const { error } = await supabaseClient.from('berita').insert([payload]);
            if(error) throw error;
            alert('Berita berhasil diposting!');
        }
        
        // Tutup modal dan Refresh tabel berita
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('formNewsModal'));
        modalInstance.hide();
        fetchAdminNews();

    } catch(error) {
        console.error(error);
        alert(`Gagal ${actionText} berita.`);
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
}

/* --- KELOLA DATA KELAS --- */

// 1. Memuat daftar kelas ke tabel admin
async function fetchAdminKelas() {
    const { data, error } = await supabaseClient.from('kelas').select('*').order('nama_kelas', { ascending: true });
    if (error) {
        console.error(error);
        return;
    }
    
    const tbody = document.getElementById('admin-kelas-list');
    tbody.innerHTML = data.map(k => `
        <tr>
            <td class="fw-bold text-dark">${k.nama_kelas}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editKelas('${k.id}', '${k.nama_kelas}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="hapusKelas('${k.id}', '${k.nama_kelas}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    listKelas = data; 
}

// 2. Tambah Kelas Baru
async function tambahKelas() {
    const nama = prompt("Masukkan Nama Kelas Baru (Contoh: Kelas 6D):");
    if (!nama) return;

    try {
        const { error } = await supabaseClient.from('kelas').insert([{ nama_kelas: nama }]);
        if (error) throw error;
        
        alert('Kelas berhasil ditambahkan!');
        fetchAdminKelas(); // Refresh tabel kelas
    } catch (e) {
        alert('Gagal menambah kelas. Mungkin nama kelas sudah ada.');
    }
}

// Fungsi untuk mengubah nama kelas
async function editKelas(id, namaLama) {
    const namaBaru = prompt("Ubah Nama Kelas:", namaLama);
    
    // Validasi: Jika batal atau nama tetap sama, tidak usah proses
    if (!namaBaru || namaBaru === namaLama) return;

    try {
        const { error } = await supabaseClient
            .from('kelas')
            .update({ nama_kelas: namaBaru })
            .eq('id', id);

        if (error) throw error;
        
        alert('Nama kelas berhasil diperbarui!');
        fetchAdminKelas(); // Refresh tabel agar nama berubah
        
        // Opsional: Jika sedang di tab guru, refresh juga pilihannya
        if(typeof fetchKelas === "function") fetchKelas(); 
        
    } catch (e) {
        console.error(e);
        alert('Gagal mengubah nama kelas. Nama mungkin sudah digunakan.');
    }
}

// 3. Hapus Kelas
async function hapusKelas(id, nama) {
    if (!confirm(`Hapus ${nama}? Guru yang tertaut pada kelas ini akan kehilangan relasi mengajarnya.`)) return;

    try {
        const { error } = await supabaseClient.from('kelas').delete().eq('id', id);
        if (error) throw error;
        
        fetchAdminKelas();
    } catch (e) {
        alert('Gagal menghapus kelas.');
    }
}

let listKelas = [];
let listGuru = [];

// 1. Ambil Data Kelas
async function fetchKelas() {
    const { data } = await supabaseClient.from('kelas').select('*').order('nama_kelas');
    listKelas = data || [];
    renderCheckboxKelas();
}

function renderCheckboxKelas() {
    const container = document.getElementById('list-checkbox-kelas');
    container.innerHTML = listKelas.map(k => `
        <div class="form-check">
            <input class="form-check-input check-kelas" type="checkbox" value="${k.id}" id="k-${k.id}">
            <label class="form-check-label" for="k-${k.id}">${k.nama_kelas}</label>
        </div>
    `).join('');
}

// 2. Kontrol Tampilan Input Kelas berdasarkan Jabatan
window.toggleKelasInput = function() {
    const jabatan = document.getElementById('guru-jabatan').value;
    const kelasContainer = document.getElementById('input-kelas-container');
    const tambahanContainer = document.getElementById('input-tambahan-container');
    const labelTambahan = document.getElementById('label-tambahan');
    const inputTambahan = document.getElementById('guru-tambahan');

    if (jabatan === 'Guru Kelas') {
        kelasContainer.classList.remove('d-none');
        tambahanContainer.classList.add('d-none');
    } else if (jabatan === 'Guru Mata Pelajaran') {
        kelasContainer.classList.remove('d-none');
        tambahanContainer.classList.remove('d-none');
        labelTambahan.innerText = "Mata Pelajaran";
        inputTambahan.placeholder = "Contoh: PJOK, Agama, Inggris";
    } else if (jabatan === 'Tenaga Kependidikan') {
        kelasContainer.classList.add('d-none');
        tambahanContainer.classList.remove('d-none');
        labelTambahan.innerText = "Tugas Spesifik";
        inputTambahan.placeholder = "Contoh: Operator Sekolah, Penjaga Sekolah";
        
        // Uncheck semua kelas untuk Tenaga Kependidikan
        document.querySelectorAll('.check-kelas').forEach(cb => cb.checked = false);
    }
}

// 3. Impor dari Excel
async function handleImportExcel(input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if(confirm(`Impor ${json.length} data pendidik?`)) {
            for(let row of json) {
                // Pastikan NIK ada, jika tidak, skip atau beri peringatan
                if (!row.NIK) continue; 
                
                // Bersihkan NIP jika isinya cuma strip (-)
                let nipBersih = row.NIP && row.NIP.toString().trim() !== "-" ? row.NIP.toString().trim() : null;

                await supabaseClient.from('guru').upsert([{
                    nik: row.NIK.toString().trim(), // <--- NIK dimasukkan
                    nama: row.Nama,
                    nip: nipBersih,
                    jabatan: row.Jabatan,
                    foto_url: row.Foto
                }], { 
                    onConflict: 'nik' // <--- KUNCIAN SEKARANG MENGGUNAKAN NIK
                });
            }
            alert('Impor Berhasil!');
            fetchAdminGuru();
        }
    };
    reader.readAsArrayBuffer(file);
}

// 4. CRUD Guru (Create & Update)
async function postGuru(e) {
    e.preventDefault();
    
    const id = document.getElementById('guru-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    // 1. Ambil data dari form
    const payload = {
        nik: document.getElementById('guru-nik').value,
        nama: document.getElementById('guru-nama').value,
        nip: document.getElementById('guru-nip').value,
        jabatan: document.getElementById('guru-jabatan').value,
        foto_url: document.getElementById('guru-foto').value,
        mapel: document.getElementById('guru-tambahan').value
    };

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';

    try {
        let guru_id = id;

        // 2. Proses Simpan atau Update ke tabel 'guru'
        if (id) {
            // Mode Update
            const { error: errUpdate } = await supabaseClient.from('guru').update(payload).eq('id', id);
            if (errUpdate) throw errUpdate;
        } else {
            // Mode Insert Baru
            const { data: newData, error: errInsert } = await supabaseClient.from('guru').insert([payload]).select().single();
            if (errInsert) throw errInsert;
            guru_id = newData.id; // Ambil UUID yang baru dibuat
        }

        // 3. Update Relasi Kelas (Hapus relasi lama, buat baru)
        // Kita hapus dulu relasi lama agar tidak duplikat saat edit
        await supabaseClient.from('guru_mengajar').delete().eq('guru_id', guru_id);

        // Jika jabatannya bukan staf (mengajar kelas), simpan relasi kelasnya
        if (payload.jabatan !== 'Tenaga Kependidikan') {
            const selectedKelas = Array.from(document.querySelectorAll('.check-kelas:checked')).map(cb => cb.value);
            
            if (selectedKelas.length > 0) {
                const relasi = selectedKelas.map(kId => ({
                    guru_id: guru_id,
                    kelas_id: kId
                }));
                const { error: errRelasi } = await supabaseClient.from('guru_mengajar').insert(relasi);
                if (errRelasi) throw errRelasi;
            }
        }

        alert('Data Pendidik Berhasil Disimpan!');
        
        // 4. Tutup Modal dan Refresh Data
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('formGuruModal'));
        if (modalInstance) modalInstance.hide();
        
        fetchAdminGuru(); // Refresh tabel guru

    } catch (error) {
        console.error("Gagal menyimpan data guru:", error.message);
        alert("Gagal menyimpan data: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

window.downloadTemplateGuru = function() {
    const templateData = [
        {
            "NIK": "3174012345678901", // <--- NIK wajib diisi
            "Nama": "Budi Santoso, S.Pd",
            "NIP": "198001012005011001",
            "Jabatan": "Guru Kelas",
            "Foto": "https://ui-avatars.com/api/?name=Budi+Santoso"
        },
        {
            "NIK": "3174012345678902",
            "Nama": "Ahmad Mulyadi",
            "NIP": "-",
            "Jabatan": "Tenaga Kependidikan",
            "Foto": ""
        }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [ { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 45 } ]; // Lebar kolom disesuaikan
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Guru");
    XLSX.writeFile(wb, "Template_Data_Guru.xlsx");
};

/* --- KELOLA DATA GURU --- */

// 1. Ambil data guru dan relasi kelasnya
async function fetchAdminGuru() {
    try {
        // Kita ambil data guru dan join dengan tabel relasi guru_mengajar serta nama kelasnya
        const { data, error } = await supabaseClient
            .from('guru')
            .select(`
                *,
                guru_mengajar (
                    kelas_id,
                    kelas (nama_kelas)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        listGuru = data || [];
        renderAdminGuru();
    } catch (e) {
        console.error("Gagal load guru:", e);
    }
}

// 2. Render data guru ke dalam tabel
function renderAdminGuru() {
    const tbody = document.getElementById('admin-guru-list');
    if (!tbody) return;

    if (listGuru.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada data guru.</td></tr>';
        return;
    }

    tbody.innerHTML = listGuru.map((g, index) => {
        // Menggabungkan nama-nama kelas menjadi satu teks (string)
        const daftarKelas = g.guru_mengajar.map(gm => gm.kelas.nama_kelas).join(', ') || '-';
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${g.foto_url || 'https://ui-avatars.com/api/?name=' + g.nama}" class="rounded-circle border" width="40" height="40" style="object-fit:cover;">
                        <span class="fw-bold">${g.nama}</span>
                    </div>
                </td>
                <td>${g.nip || '-'}</td>
                <td><span class="badge bg-info text-dark">${g.jabatan}</span></td>
                <td><small>${daftarKelas}</small></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openGuruModal(${index})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteGuru('${g.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// 3. Membuka Modal Guru
window.openGuruModal = function(index = null) {
    const modalEl = document.getElementById('formGuruModal');
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('add-guru-form');
    const label = document.getElementById('formGuruModalLabel');
    
    form.reset();
    document.getElementById('guru-id').value = '';
    
    // Uncheck semua checkbox kelas dulu
    document.querySelectorAll('.check-kelas').forEach(cb => cb.checked = false);

    if (index !== null) {
        // MODE EDIT
        const g = listGuru[index];
        label.innerText = "Edit Data Pendidik";
        document.getElementById('guru-id').value = g.id;
        document.getElementById('guru-nama').value = g.nama;
        document.getElementById('guru-nip').value = g.nip || '';
        document.getElementById('guru-jabatan').value = g.jabatan;
        document.getElementById('guru-foto').value = g.foto_url || '';
        document.getElementById('guru-tambahan').value = g.mapel || '';
        document.getElementById('guru-nik').value = g.nik || '';

        // Centang kelas yang sesuai
        const idsKelasAjar = g.guru_mengajar.map(gm => gm.kelas_id || ''); // Kita perlu simpan kelas_id di join sebelumnya
        // Catatan: Pastikan di fetchAdminGuru, guru_mengajar juga menarik id kelas
        g.guru_mengajar.forEach(gm => {
            const cb = document.getElementById(`k-${gm.kelas_id}`); // Menggunakan ID kelas_id dari join
            if (cb) cb.checked = true;
        });
    } else {
        // MODE TAMBAH
        label.innerText = "Tambah Pendidik Baru";
    }

    toggleKelasInput(); // Sesuaikan tampilan input kelas (sembunyikan jika TU)
    modal.show();
};

window.deleteGuru = async function(id) {
    if (!confirm("Hapus data pendidik ini?")) return;

    try {
        const { error } = await supabaseClient.from('guru').delete().eq('id', id);
        if (error) throw error;
        alert("Data berhasil dihapus!");
        fetchAdminGuru();
    } catch (e) {
        alert("Gagal menghapus data.");
    }
};

/* --- KELOLA BERITA --- */

// 1. Mengambil data list berita
async function fetchAdminNews() {
    try {
        const { data, error } = await supabaseClient.from('berita').select('*').order('id', { ascending: false });
        if(error) throw error;
        adminNewsData = data || [];
        renderAdminNews();
    } catch(e) { console.error("Gagal load berita admin:", e); }
}

// 2. Menampilkan data ke tabel
function renderAdminNews() {
    const tbody = document.getElementById('admin-news-list');
    if(adminNewsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Belum ada berita.</td></tr>';
        return;
    }
    
    tbody.innerHTML = adminNewsData.map((n, index) => `
        <tr>
            <td class="text-muted small">${n.date}</td>
            <td class="fw-bold text-dark">${n.title}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openNewsModal(${index})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteNews(${n.id})" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// 3. Membuka Modal (Bisa Mode Tambah / Edit)
window.openNewsModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formNewsModal'));
    const form = document.getElementById('add-news-form');
    const titleEl = document.getElementById('formNewsModalLabel');
    
    // Reset isi form
    form.reset();
    quillBerita.setContents([]);
    
    if (index !== null) {
        // Jika index ada, berarti MODE EDIT
        const data = adminNewsData[index];
        titleEl.innerText = 'Edit Berita';
        document.getElementById('news-id').value = data.id;
        document.getElementById('news-title').value = data.title;
        document.getElementById('news-img').value = data.img || '';
        
        // Memasukkan format HTML ke editor
        if(data.content) quillBerita.clipboard.dangerouslyPasteHTML(data.content);
    } else {
        // Jika index null, berarti MODE TAMBAH BARU
        titleEl.innerText = 'Tambah Berita Baru';
        document.getElementById('news-id').value = '';
    }
    
    modal.show();
};

// 4. Menghapus Berita
window.deleteNews = async function(id) {
    if(!confirm("Yakin ingin menghapus berita ini? Tindakan ini tidak dapat dibatalkan.")) return;
    
    try {
        const { error } = await supabaseClient.from('berita').delete().eq('id', id);
        if(error) throw error;
        alert('Berita berhasil dihapus!');
        fetchAdminNews(); // Refresh tabel setelah dihapus
    } catch(e) {
        console.error(e);
        alert('Gagal menghapus berita.');
    }
};

/* --- KELOLA DATA PRESTASI --- */

// 1. Mengambil data dari database
async function fetchAdminPrestasi() {
    try {
        const { data, error } = await supabaseClient.from('prestasi').select('*').order('id', { ascending: false });
        if(error) throw error;
        adminPrestasiData = data || [];
        renderAdminPrestasi();
    } catch(e) { console.error("Gagal load prestasi admin:", e); }
}

// 2. Menampilkan data ke tabel
function renderAdminPrestasi() {
    const tbody = document.getElementById('admin-prestasi-list');
    if(adminPrestasiData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Belum ada data prestasi.</td></tr>';
        return;
    }
    
    tbody.innerHTML = adminPrestasiData.map((p, index) => `
        <tr>
            <td><span class="badge bg-warning text-dark">${p.category || 'Juara'}</span></td>
            <td class="fw-bold text-dark">${p.title}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openPrestasiModal(${index})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePrestasi(${p.id})" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// 3. Membuka Modal (Tambah / Edit)
window.openPrestasiModal = function(index = null) {
    const modalEl = document.getElementById('formPrestasiModal');
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('add-prestasi-form');
    const titleEl = document.getElementById('formPrestasiModalLabel');
    
    form.reset();
    document.getElementById('prestasi-id').value = '';
    
    if (index !== null) {
        // MODE EDIT
        const data = adminPrestasiData[index];
        titleEl.innerText = 'Edit Prestasi';
        document.getElementById('prestasi-id').value = data.id;
        document.getElementById('prestasi-title').value = data.title;
        document.getElementById('prestasi-category').value = data.category || '';
        if (data.desc) {
            quillPrestasi.clipboard.dangerouslyPasteHTML(data.desc);
        } else {
            quillPrestasi.setContents([]);
        }
        document.getElementById('prestasi-img').value = data.img || '';
    } else {
        // MODE TAMBAH
        titleEl.innerText = 'Tambah Prestasi Baru';
    }
    
    modal.show();
};

// 4. Menyimpan Prestasi (Tambah / Update)
async function postPrestasi(e) {
    e.preventDefault();
    const id = document.getElementById('prestasi-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';

    const payload = {
        title: document.getElementById('prestasi-title').value,
        category: document.getElementById('prestasi-category').value,
        desc: quillPrestasi.root.innerHTML,
        img: document.getElementById('prestasi-img').value
    };

    try {
        if (id) {
            // Update
            const { error } = await supabaseClient.from('prestasi').update(payload).eq('id', id);
            if(error) throw error;
            alert('Prestasi berhasil diperbarui!');
        } else {
            // Insert
            const { error } = await supabaseClient.from('prestasi').insert([payload]);
            if(error) throw error;
            alert('Prestasi berhasil ditambahkan!');
        }
        
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('formPrestasiModal'));
        if(modalInstance) modalInstance.hide();
        fetchAdminPrestasi(); // Refresh tabel

    } catch(error) {
        console.error(error);
        alert('Gagal menyimpan data prestasi.');
    } finally {
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}

// 5. Menghapus Prestasi
window.deletePrestasi = async function(id) {
    if(!confirm("Yakin ingin menghapus data prestasi ini?")) return;
    
    try {
        const { error } = await supabaseClient.from('prestasi').delete().eq('id', id);
        if(error) throw error;
        alert('Prestasi berhasil dihapus!');
        fetchAdminPrestasi();
    } catch(e) {
        console.error(e);
        alert('Gagal menghapus prestasi.');
    }
};

function logout() {
    if(confirm("Keluar dari admin panel?")) location.reload();
}