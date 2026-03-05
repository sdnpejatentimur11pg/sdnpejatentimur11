// --- 1. KONFIGURASI SUPABASE & VARIABEL GLOBAL ---
const SUPABASE_URL = 'https://fznapkpqrhevuxthvott.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6bmFwa3BxcmhldnV4dGh2b3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMzg3MjEsImV4cCI6MjA4NjcxNDcyMX0.haR_vhREOeIf29r52sfPhX_3zsvXFNihayJu9JmGCzM'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let quillSambutan, quillBerita, quillPrestasi;
let adminNewsData = [];
let adminPrestasiData = [];
let listKelas = [];
let listGuru = [];

// --- 2. INISIALISASI SAAT HALAMAN DIMUAT ---
document.addEventListener('DOMContentLoaded', () => {
    // A. Setup Rich Text Editor (Quill)
    const quillConfig = { theme: 'snow', modules: { toolbar: [['bold', 'italic', 'underline'], [{'list': 'ordered'}, {'list': 'bullet'}], ['clean']] } };
    const quillFullConfig = { ...quillConfig, modules: { toolbar: [ [{ 'header': [2, 3, 4, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'color': [] }, { 'background': [] }], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], ['link'], ['clean'] ] } };

    quillSambutan = new Quill('#editor-sambutan', Object.assign({}, quillConfig, { placeholder: 'Tulis sambutan di sini...' }));
    quillBerita = new Quill('#editor-berita', Object.assign({}, quillFullConfig, { placeholder: 'Tulis isi berita selengkapnya di sini...' }));
    quillPrestasi = new Quill('#editor-prestasi', Object.assign({}, quillFullConfig, { placeholder: 'Ceritakan detail prestasi di sini...' }));

    // B. Setup Event Listeners
    document.getElementById('sidebarToggle').addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('sb-sidenav-toggled');
    });

    const loginInputs = [document.getElementById('admin-user'), document.getElementById('admin-pass')];
    loginInputs.forEach(input => {
        if(input) {
            input.addEventListener('keypress', e => { if (e.key === 'Enter') attemptLogin(); });
        }
    });
    
    // Daftarkan form manajemen user
    document.getElementById('add-pengguna-form')?.addEventListener('submit', postPengguna);

    document.getElementById('form-profil')?.addEventListener('submit', postProfilSekolah);
    document.getElementById('add-guru-form')?.addEventListener('submit', postGuru);
    document.getElementById('add-news-form')?.addEventListener('submit', postNews);
    document.getElementById('add-prestasi-form')?.addEventListener('submit', postPrestasi);
    document.getElementById('add-galeri-form')?.addEventListener('submit', postGaleri);
    document.getElementById('add-murid-form')?.addEventListener('submit', postMurid);

    // Otomatis membuat 10 baris input form foto saat admin dibuka
    let fotoInputsHtml = '';
    for(let i=1; i<=10; i++){
        fotoInputsHtml += `
        <div class="d-flex gap-3 align-items-center">
            <div class="border rounded bg-light d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" style="width: 50px; height: 50px; overflow: hidden;">
                <img id="preview-gal-${i}" src="https://placehold.co/50x50?text=${i}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <input type="url" id="gal-foto-${i}" class="form-control" placeholder="URL Foto Ke-${i} (Opsional)" oninput="updatePreview('gal-foto-${i}', 'preview-gal-${i}', '${i}')">
        </div>`;
    }
    const galContainer = document.getElementById('galeri-fotos-container');
    if(galContainer) galContainer.innerHTML = fotoInputsHtml;

    // C. Munculkan Modal Login
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        // Jika sudah login, langsung buka panel tanpa modal
        document.getElementById('wrapper').classList.remove('d-none');
        fetchAdminStats();
        loadProfilSekolah(); 
        startInactivityTracker(); // Jalankan pelacak aktivitas
    } else {
        // Jika belum login, baru munculkan modal
        new bootstrap.Modal(document.getElementById('loginModal')).show();
    }
});

// --- 3. OTENTIKASI & LAYOUT ---
async function attemptLogin() {
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value;
    const btn = document.querySelector('#loginModal button');
    
    if(!user || !pass) {
        alert("Username dan Password wajib diisi!");
        return;
    }

    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memeriksa...';
    btn.disabled = true;

    try {
        // Cek kecocokan username dan password di tabel pengguna
        const { data, error } = await supabaseClient
            .from('pengguna')
            .select('*')
            .eq('username', user)
            .eq('password', pass)
            .single();
        
        if (error || !data) {
            alert('Username atau Password salah!');
        } else {
            // Login Sukses - SIMPAN KE SESSION STORAGE
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('adminUsername', data.username);
            sessionStorage.setItem('lastActivity', Date.now()); // Catat waktu login
            
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            document.getElementById('wrapper').classList.remove('d-none');
            
            fetchAdminStats();
            loadProfilSekolah(); 
            startInactivityTracker(); // Jalankan pelacak aktivitas
        }
    } catch(e) {
        alert('Gagal koneksi ke database.');
    } finally {
        btn.innerHTML = 'Masuk Panel';
        btn.disabled = false;
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.admin-view').forEach(el => el.classList.add('d-none'));
    document.getElementById(`view-${tabId}`).classList.remove('d-none');
    
    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active', 'fw-bold'));
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active', 'fw-bold');

    if (tabId === 'pengguna') fetchAdminPengguna();
    if (tabId === 'berita') fetchAdminNews();
    if (tabId === 'kelas') fetchAdminKelas();
    if (tabId === 'prestasi') fetchAdminPrestasi();
    if (tabId === 'guru') { fetchAdminGuru(); fetchKelas(); }
    if (tabId === 'galeri') fetchAdminGaleri();
    if (tabId === 'bukutamu') fetchAdminBukuTamu();
    if (tabId === 'murid') { fetchAdminMurid(); fetchDropdownKelas(); }
}

function logout() {
    if(confirm("Keluar dari admin panel?")) {
        sessionStorage.clear(); // Bersihkan semua sesi
        window.location.href = 'index.html'; // Arahkan kembali ke halaman utama (beranda)
    }
}

// MESIN PELACAK AKTIVITAS (AUTO-LOGOUT 30 MENIT)
function startInactivityTracker() {
    // Fungsi untuk memperbarui catatan waktu terakhir admin bergerak
    const updateActivity = () => {
        if (sessionStorage.getItem('adminLoggedIn') === 'true') {
            sessionStorage.setItem('lastActivity', Date.now());
        }
    };

    // Deteksi pergerakan mouse, ketikan, dan klik layar
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    // Mesin pengecek otomatis setiap 1 menit
    setInterval(() => {
        if (sessionStorage.getItem('adminLoggedIn') !== 'true') return;

        const lastAct = parseInt(sessionStorage.getItem('lastActivity') || '0');
        const now = Date.now();
        const diffMinutes = (now - lastAct) / (1000 * 60); // Ubah selisih milidetik ke menit

        // Jika tidak ada aktivitas lebih dari 30 menit
        if (diffMinutes > 30) {
            sessionStorage.clear(); // Bunuh sesi
            alert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali untuk keamanan.");
            location.reload(); // Tendang ke layar login
        }
    }, 60000); // 60000 ms = 1 menit
}

async function fetchAdminStats() {
    try {
        const { data } = await supabaseClient.from('statistik').select('count').eq('id', 1).single();
        document.getElementById('stat-visitor').innerText = data ? data.count : 0;
    } catch(e) { console.error(e); }
}

// Fungsi untuk memunculkan preview gambar secara real-time di form
window.updatePreview = function(inputId, imgId, defaultText) {
    const input = document.getElementById(inputId).value;
    const img = document.getElementById(imgId);
    if (input) {
        img.src = input;
    } else {
        const size = imgId === 'preview-hero' ? '100x60' : '60x60';
        img.src = `https://placehold.co/${size}?text=${defaultText}`;
    }
};

// --- 4. KELOLA PROFIL SEKOLAH ---
async function loadProfilSekolah() {
    try {
        const { data, error } = await supabaseClient.from('profil_sekolah').select('*').eq('id', 1).single();
        if(error) throw error;
        if(data) {
            document.getElementById('prof-nama').value = data.nama_sekolah || '';
            
            // Logo dengan Preview
            document.getElementById('prof-logo').value = data.logo_url || '';
            updatePreview('prof-logo', 'preview-logo', 'Logo');
            
            // Hero Background dengan Preview
            document.getElementById('prof-hero-bg').value = data.hero_bg_url || '';
            updatePreview('prof-hero-bg', 'preview-hero', 'Hero');

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
            document.getElementById('prof-email').value = data.email || '';
            document.getElementById('prof-ig').value = data.instagram || '';
            document.getElementById('prof-yt').value = data.youtube || '';
            document.getElementById('prof-namakepsek').value = data.nama_kepsek || '';
            
            // Foto Kepsek dengan Preview
            document.getElementById('prof-fotokepsek').value = data.foto_kepsek || '';
            updatePreview('prof-fotokepsek', 'preview-kepsek', 'Foto');

            if (data.sambutan_kepsek) quillSambutan.clipboard.dangerouslyPasteHTML(data.sambutan_kepsek);
        }
    } catch(e) { console.error("Gagal load profil:", e); }
}

async function postProfilSekolah(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';

    const payload = {
        nama_sekolah: document.getElementById('prof-nama').value,
        logo_url: document.getElementById('prof-logo').value,
        hero_bg_url: document.getElementById('prof-hero-bg').value,
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
        email: document.getElementById('prof-email').value,
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
        alert('Gagal menyimpan profil.');
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
}

// --- 5. KELOLA DATA KELAS ---
async function fetchAdminKelas() {
    const { data, error } = await supabaseClient.from('kelas').select('*').order('nama_kelas', { ascending: true });
    if (error) return;
    
    document.getElementById('admin-kelas-list').innerHTML = data.map(k => `
        <tr>
            <td class="fw-bold text-dark">${k.nama_kelas}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editKelas('${k.id}', '${k.nama_kelas}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="hapusKelas('${k.id}', '${k.nama_kelas}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function tambahKelas() {
    const nama = prompt("Masukkan Nama Kelas Baru (Contoh: Kelas 6D):");
    if (!nama) return;
    try {
        const { error } = await supabaseClient.from('kelas').insert([{ nama_kelas: nama }]);
        if (error) throw error;
        fetchAdminKelas();
    } catch (e) { alert('Gagal menambah kelas.'); }
}

async function editKelas(id, namaLama) {
    const namaBaru = prompt("Ubah Nama Kelas:", namaLama);
    if (!namaBaru || namaBaru === namaLama) return;
    try {
        const { error } = await supabaseClient.from('kelas').update({ nama_kelas: namaBaru }).eq('id', id);
        if (error) throw error;
        fetchAdminKelas();
        if(typeof fetchKelas === "function") fetchKelas(); 
    } catch (e) { alert('Gagal mengubah nama kelas.'); }
}

async function hapusKelas(id, nama) {
    if (!confirm(`Hapus ${nama}? Guru yang tertaut pada kelas ini akan kehilangan relasi mengajarnya.`)) return;
    try {
        const { error } = await supabaseClient.from('kelas').delete().eq('id', id);
        if (error) throw error;
        fetchAdminKelas();
    } catch (e) { alert('Gagal menghapus kelas.'); }
}

// --- 6. KELOLA DATA GURU ---
async function fetchKelas() {
    const { data } = await supabaseClient.from('kelas').select('*').order('nama_kelas');
    listKelas = data || [];
    document.getElementById('list-checkbox-kelas').innerHTML = listKelas.map(k => `
        <div class="form-check">
            <input class="form-check-input check-kelas" type="checkbox" value="${k.id}" id="k-${k.id}">
            <label class="form-check-label" for="k-${k.id}">${k.nama_kelas}</label>
        </div>
    `).join('');
}

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
    } else {
        kelasContainer.classList.add('d-none');
        tambahanContainer.classList.remove('d-none');
        labelTambahan.innerText = "Tugas Spesifik";
        inputTambahan.placeholder = "Contoh: Operator Sekolah, Penjaga Sekolah";
        document.querySelectorAll('.check-kelas').forEach(cb => cb.checked = false);
    }
}

async function fetchAdminGuru() {
    try {
        // Hapus fungsi .order() bawaan Supabase, karena kita akan sort secara kustom di JS
        const { data, error } = await supabaseClient
            .from('guru')
            .select(`*, guru_mengajar ( kelas_id, kelas (nama_kelas) )`);
            
        if (error) throw error;
        
        let rawData = data || [];

        // --- LOGIKA PENGURUTAN (SORTING) KUSTOM ---
        rawData.sort((a, b) => {
            // 1. Prioritas Jabatan Utama
            const prioritasJabatan = {
                'Guru Kelas': 1,
                'Guru Mata Pelajaran': 2,
                'Tenaga Kependidikan': 3
            };
            
            const pA = prioritasJabatan[a.jabatan] || 99;
            const pB = prioritasJabatan[b.jabatan] || 99;

            // Jika jabatannya berbeda, urutkan berdasarkan jabatan dulu
            if (pA !== pB) return pA - pB;

            // 2. Jika sama-sama Guru Kelas, urutkan nama kelas (1A, 1B, 1C, dst)
            if (a.jabatan === 'Guru Kelas') {
                const kelasA = a.guru_mengajar?.length > 0 ? a.guru_mengajar[0].kelas?.nama_kelas || 'Z' : 'Z';
                const kelasB = b.guru_mengajar?.length > 0 ? b.guru_mengajar[0].kelas?.nama_kelas || 'Z' : 'Z';
                
                // Gunakan localeCompare untuk mengurutkan abjad dan angka secara natural
                if (kelasA !== kelasB) return kelasA.localeCompare(kelasB);
            }

            // 3. Jika sama-sama Tenaga Kependidikan, urutkan tugas spesifiknya
            if (a.jabatan === 'Tenaga Kependidikan') {
                const getTugasScore = (tugas) => {
                    const t = (tugas || '').toLowerCase();
                    if (t.includes('operator')) return 1; // Prioritas 1
                    if (t.includes('penjaga')) return 2;  // Prioritas 2
                    return 3; // Sisanya di bawah
                };
                
                const tugasA = getTugasScore(a.mapel);
                const tugasB = getTugasScore(b.mapel);
                if (tugasA !== tugasB) return tugasA - tugasB;
            }

            // 4. Fallback Terakhir: Urutkan berdasarkan Nama (A-Z)
            return (a.nama || '').localeCompare(b.nama || '');
        });

        // Masukkan data yang sudah diurutkan ke list global
        listGuru = rawData;
        
        const tbody = document.getElementById('admin-guru-list');
        if (listGuru.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada data guru.</td></tr>';
            return;
        }

        // Tampilkan ke dalam tabel HTML
        tbody.innerHTML = listGuru.map((g, index) => {
            const daftarKelas = g.guru_mengajar.map(gm => gm.kelas?.nama_kelas).join(', ') || '-';
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
        
    } catch (e) { 
        console.error(e); 
    }
}

window.openGuruModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formGuruModal'));
    const form = document.getElementById('add-guru-form');
    
    form.reset();
    document.getElementById('guru-id').value = '';
    document.querySelectorAll('.check-kelas').forEach(cb => cb.checked = false);

    if (index !== null) {
        const g = listGuru[index];
        document.getElementById('formGuruModalLabel').innerText = "Edit Data Pendidik";
        document.getElementById('guru-id').value = g.id;
        document.getElementById('guru-nama').value = g.nama;
        document.getElementById('guru-nip').value = g.nip || '';
        document.getElementById('guru-jabatan').value = g.jabatan;
        document.getElementById('guru-foto').value = g.foto_url || '';
        document.getElementById('guru-tambahan').value = g.mapel || '';
        document.getElementById('guru-nik').value = g.nik || '';

        g.guru_mengajar.forEach(gm => {
            const cb = document.getElementById(`k-${gm.kelas_id}`);
            if (cb) cb.checked = true;
        });
    } else {
        document.getElementById('formGuruModalLabel').innerText = "Tambah Pendidik Baru";
    }

    toggleKelasInput(); 
    modal.show();
};

async function postGuru(e) {
    e.preventDefault();
    const id = document.getElementById('guru-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const payload = {
        nik: document.getElementById('guru-nik').value,
        nama: document.getElementById('guru-nama').value,
        nip: document.getElementById('guru-nip').value,
        jabatan: document.getElementById('guru-jabatan').value,
        foto_url: document.getElementById('guru-foto').value,
        mapel: document.getElementById('guru-tambahan').value
    };

    btn.disabled = true; btn.innerHTML = 'Menyimpan...';

    try {
        let guru_id = id;
        if (id) {
            const { error: errUpdate } = await supabaseClient.from('guru').update(payload).eq('id', id);
            if (errUpdate) throw errUpdate;
        } else {
            const { data: newData, error: errInsert } = await supabaseClient.from('guru').insert([payload]).select().single();
            if (errInsert) throw errInsert;
            guru_id = newData.id; 
        }

        await supabaseClient.from('guru_mengajar').delete().eq('guru_id', guru_id);

        if (payload.jabatan !== 'Tenaga Kependidikan') {
            const selectedKelas = Array.from(document.querySelectorAll('.check-kelas:checked')).map(cb => cb.value);
            if (selectedKelas.length > 0) {
                const relasi = selectedKelas.map(kId => ({ guru_id: guru_id, kelas_id: kId }));
                await supabaseClient.from('guru_mengajar').insert(relasi);
            }
        }

        alert('Data Pendidik Berhasil Disimpan!');
        bootstrap.Modal.getInstance(document.getElementById('formGuruModal'))?.hide();
        fetchAdminGuru();
    } catch (error) {
        alert("Gagal menyimpan data.");
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
}

window.deleteGuru = async function(id) {
    if (!confirm("Hapus data pendidik ini?")) return;
    try {
        const { error } = await supabaseClient.from('guru').delete().eq('id', id);
        if (error) throw error;
        fetchAdminGuru();
    } catch (e) { alert("Gagal menghapus data."); }
};

window.downloadTemplateGuru = function() {
    const templateData = [
        { "NIK": "'3174012345678901", "Nama": "Budi Santoso, S.Pd", "NIP": "'198001012005011001", "Jabatan": "Guru Kelas", "Foto": "https://ui-avatars.com/api/?name=Budi+Santoso" },
        { "NIK": "'3174012345678902", "Nama": "Ahmad Mulyadi", "NIP": "-", "Jabatan": "Tenaga Kependidikan", "Foto": "" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [ { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 45 } ]; 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Guru");
    XLSX.writeFile(wb, "Template_Data_Guru.xlsx");
};

async function handleImportExcel(input) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const json = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).Sheets[XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).SheetNames[0]]);
        if(confirm(`Impor ${json.length} data pendidik?`)) {
            for(let row of json) {
                if (!row.NIK) continue; 
                let nipBersih = row.NIP && row.NIP.toString().trim() !== "-" ? row.NIP.toString().trim() : null;
                await supabaseClient.from('guru').upsert([{ nik: row.NIK.toString().trim(), nama: row.Nama, nip: nipBersih, jabatan: row.Jabatan, foto_url: row.Foto }], { onConflict: 'nik' });
            }
            alert('Impor Berhasil!');
            fetchAdminGuru();
        }
    };
    reader.readAsArrayBuffer(input.files[0]);
}

// --- 7. KELOLA BERITA ---
async function fetchAdminNews() {
    try {
        const { data, error } = await supabaseClient.from('berita').select('*').order('id', { ascending: false });
        if(error) throw error;
        adminNewsData = data || [];
        
        const tbody = document.getElementById('admin-news-list');
        if(adminNewsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Belum ada berita.</td></tr>';
            return;
        }
        
        tbody.innerHTML = adminNewsData.map((n, index) => `
            <tr>
                <td class="text-muted small">${n.date || '-'}</td>
                <td class="fw-bold text-dark">${n.title}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openNewsModal(${index})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteNews(${n.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

window.openNewsModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formNewsModal'));
    const form = document.getElementById('add-news-form');
    
    form.reset();
    quillBerita.setContents([]);
    document.getElementById('news-id').value = '';
    
    if (index !== null) {
        const data = adminNewsData[index];
        document.getElementById('formNewsModalLabel').innerText = 'Edit Berita';
        document.getElementById('news-id').value = data.id;
        document.getElementById('news-title').value = data.title;
        document.getElementById('news-img').value = data.img || '';
        if(data.content) quillBerita.clipboard.dangerouslyPasteHTML(data.content);
    } else {
        document.getElementById('formNewsModalLabel').innerText = 'Tambah Berita Baru';
    }
    modal.show();
};

async function postNews(e) {
    e.preventDefault();
    const newsId = document.getElementById('news-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';
    const payload = { title: document.getElementById('news-title').value, content: quillBerita.root.innerHTML, img: document.getElementById('news-img').value };

    try {
        if (newsId) {
            await supabaseClient.from('berita').update(payload).eq('id', newsId);
        } else {
            await supabaseClient.from('berita').insert([payload]);
        }
        bootstrap.Modal.getInstance(document.getElementById('formNewsModal'))?.hide();
        fetchAdminNews();
    } catch(error) { alert("Gagal memposting berita."); } 
    finally { btn.disabled = false; btn.innerHTML = originalText; }
}

window.deleteNews = async function(id) {
    if(!confirm("Yakin ingin menghapus berita ini?")) return;
    try {
        await supabaseClient.from('berita').delete().eq('id', id);
        fetchAdminNews();
    } catch(e) { alert('Gagal menghapus berita.'); }
};

// --- 8. KELOLA PRESTASI ---
async function fetchAdminPrestasi() {
    try {
        const { data, error } = await supabaseClient.from('prestasi').select('*').order('id', { ascending: false });
        if(error) throw error;
        adminPrestasiData = data || [];
        
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
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openPrestasiModal(${index})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePrestasi(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

window.openPrestasiModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formPrestasiModal'));
    const form = document.getElementById('add-prestasi-form');
    
    form.reset();
    document.getElementById('prestasi-id').value = '';
    
    if (index !== null) {
        const data = adminPrestasiData[index];
        document.getElementById('formPrestasiModalLabel').innerText = 'Edit Prestasi';
        document.getElementById('prestasi-id').value = data.id;
        document.getElementById('prestasi-title').value = data.title;
        document.getElementById('prestasi-category').value = data.category || '';
        if (data.desc) quillPrestasi.clipboard.dangerouslyPasteHTML(data.desc);
        else quillPrestasi.setContents([]);
        document.getElementById('prestasi-img').value = data.img || '';
    } else {
        document.getElementById('formPrestasiModalLabel').innerText = 'Tambah Prestasi Baru';
    }
    modal.show();
};

async function postPrestasi(e) {
    e.preventDefault();
    const id = document.getElementById('prestasi-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';
    const payload = { title: document.getElementById('prestasi-title').value, category: document.getElementById('prestasi-category').value, desc: quillPrestasi.root.innerHTML, img: document.getElementById('prestasi-img').value };

    try {
        if (id) await supabaseClient.from('prestasi').update(payload).eq('id', id);
        else await supabaseClient.from('prestasi').insert([payload]);
        bootstrap.Modal.getInstance(document.getElementById('formPrestasiModal'))?.hide();
        fetchAdminPrestasi();
    } catch(error) { alert('Gagal menyimpan data prestasi.'); } 
    finally { btn.disabled = false; btn.innerHTML = originalText; }
}

window.deletePrestasi = async function(id) {
    if(!confirm("Yakin ingin menghapus data prestasi ini?")) return;
    try {
        await supabaseClient.from('prestasi').delete().eq('id', id);
        fetchAdminPrestasi();
    } catch(e) { alert('Gagal menghapus prestasi.'); }
};

/* --- 9. KELOLA GALERI FOTO --- */
let adminGaleriData = [];

async function fetchAdminGaleri() {
    try {
        const { data, error } = await supabaseClient.from('galeri').select('*').order('id', { ascending: false });
        if(error) throw error;
        adminGaleriData = data || [];
        
        const tbody = document.getElementById('admin-galeri-list');
        if(adminGaleriData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Belum ada data galeri.</td></tr>';
            return;
        }
        
        tbody.innerHTML = adminGaleriData.map((g, index) => {
            const fotos = JSON.parse(g.fotos || '[]');
            const cover = fotos.length > 0 ? fotos[0] : 'https://placehold.co/100x60?text=Kosong';
            return `
                <tr>
                    <td><img src="${cover}" class="rounded shadow-sm" style="width: 80px; height: 50px; object-fit: cover;"></td>
                    <td class="fw-bold text-dark">${g.title}</td>
                    <td class="text-center"><span class="badge bg-secondary">${fotos.length} Foto</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="openGaleriModal(${index})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGaleri(${g.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) { console.error(e); }
}

window.openGaleriModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formGaleriModal'));
    document.getElementById('add-galeri-form').reset();
    document.getElementById('galeri-id').value = '';
    
    // Reset seluruh preview ke angka default
    for(let i=1; i<=10; i++){ updatePreview(`gal-foto-${i}`, `preview-gal-${i}`, i); }
    
    if (index !== null) {
        const data = adminGaleriData[index];
        document.getElementById('formGaleriModalLabel').innerText = 'Edit Galeri';
        document.getElementById('galeri-id').value = data.id;
        document.getElementById('galeri-title').value = data.title;
        
        const fotos = JSON.parse(data.fotos || '[]');
        for(let i=1; i<=10; i++) {
            if(fotos[i-1]) {
                document.getElementById(`gal-foto-${i}`).value = fotos[i-1];
                updatePreview(`gal-foto-${i}`, `preview-gal-${i}`, i);
            }
        }
    } else {
        document.getElementById('formGaleriModalLabel').innerText = 'Tambah Galeri Baru';
    }
    modal.show();
};

async function postGaleri(e) {
    e.preventDefault();
    const id = document.getElementById('galeri-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    // Kumpulkan semua URL yang tidak kosong
    let fotosArray = [];
    for(let i=1; i<=10; i++){
        const url = document.getElementById(`gal-foto-${i}`).value.trim();
        if(url) fotosArray.push(url);
    }

    if(fotosArray.length === 0) {
        alert("Minimal harus memasukkan 1 URL foto!");
        return;
    }

    btn.disabled = true; btn.innerHTML = 'Menyimpan...';
    const payload = { title: document.getElementById('galeri-title').value, fotos: JSON.stringify(fotosArray) };

    try {
        if (id) await supabaseClient.from('galeri').update(payload).eq('id', id);
        else await supabaseClient.from('galeri').insert([payload]);
        bootstrap.Modal.getInstance(document.getElementById('formGaleriModal'))?.hide();
        fetchAdminGaleri();
    } catch(error) { alert('Gagal menyimpan galeri.'); } 
    finally { btn.disabled = false; btn.innerHTML = originalText; }
}

window.deleteGaleri = async function(id) {
    if(!confirm("Hapus galeri foto ini?")) return;
    try {
        await supabaseClient.from('galeri').delete().eq('id', id);
        fetchAdminGaleri();
    } catch(e) { alert('Gagal menghapus galeri.'); }
};

/* --- 10. KELOLA BUKU TAMU (MODERASI) --- */
async function fetchAdminBukuTamu() {
    try {
        const { data, error } = await supabaseClient.from('buku_tamu').select('*').order('id', { ascending: false });
        if(error) throw error;
        
        const tbody = document.getElementById('admin-bukutamu-list');
        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada pesan buku tamu.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(m => {
            // Mengubah format tanggal menjadi rapi (Contoh: 17 Agu 2025)
            const date = m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
            // Jika status 'tampil' false, saklar mati. Jika true/null, saklar nyala
            const isChecked = m.tampil !== false ? 'checked' : ''; 
            
            return `
                <tr>
                    <td class="small text-muted">${date}</td>
                    <td class="fw-bold text-dark">${m.name}</td>
                    <td class="small text-muted fst-italic">"${m.message}"</td>
                    <td class="text-center">
                        <div class="form-check form-switch d-flex justify-content-center">
                            <input class="form-check-input shadow-sm" type="checkbox" role="switch" style="cursor: pointer; width: 2.5em; height: 1.25em;" 
                                onchange="toggleBukuTamu(${m.id}, this.checked)" ${isChecked}>
                        </div>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger shadow-sm" onclick="deleteBukuTamu(${m.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) { console.error("Gagal load buku tamu:", e); }
}

/* --- 11. MANAJEMEN USER (ADMIN) --- */
let adminPenggunaData = [];

async function fetchAdminPengguna() {
    try {
        const { data, error } = await supabaseClient.from('pengguna').select('*').order('id', { ascending: true });
        if(error) throw error;
        adminPenggunaData = data || [];
        
        const tbody = document.getElementById('admin-pengguna-list');
        tbody.innerHTML = adminPenggunaData.map((u, index) => `
            <tr>
                <td class="fw-bold">${u.nama_lengkap}</td>
                <td class="text-primary">${u.username}</td>
                <td><span class="badge bg-dark">${u.role.toUpperCase()}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openPenggunaModal(${index})"><i class="fas fa-edit"></i></button>
                    ${u.id !== 1 ? `<button class="btn btn-sm btn-outline-danger" onclick="deletePengguna(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch(e) { console.error(e); }
}

window.openPenggunaModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formPenggunaModal'));
    document.getElementById('add-pengguna-form').reset();
    document.getElementById('pengguna-id').value = '';
    
    if (index !== null) {
        const data = adminPenggunaData[index];
        document.getElementById('formPenggunaModalLabel').innerText = 'Edit Akun Admin';
        document.getElementById('pengguna-id').value = data.id;
        document.getElementById('pengguna-nama').value = data.nama_lengkap;
        document.getElementById('pengguna-username').value = data.username;
        document.getElementById('pengguna-password').required = false; // Saat edit, password tidak wajib
    } else {
        document.getElementById('formPenggunaModalLabel').innerText = 'Tambah Akun Admin';
        document.getElementById('pengguna-password').required = true; // Saat tambah baru, password wajib
    }
    modal.show();
};

async function postPengguna(e) {
    e.preventDefault();
    const id = document.getElementById('pengguna-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';
    
    const payload = { 
        nama_lengkap: document.getElementById('pengguna-nama').value, 
        username: document.getElementById('pengguna-username').value,
        role: 'admin' // Sementara hardcode sebagai admin
    };

    const passwordInput = document.getElementById('pengguna-password').value;
    // Hanya update password jika form password diisi
    if (passwordInput) {
        payload.password = passwordInput;
    }

    try {
        if (id) {
            await supabaseClient.from('pengguna').update(payload).eq('id', id);
        } else {
            // Cek apakah username sudah ada
            const { data: exist } = await supabaseClient.from('pengguna').select('id').eq('username', payload.username).single();
            if(exist) throw new Error("Username sudah digunakan!");
            
            await supabaseClient.from('pengguna').insert([payload]);
        }
        bootstrap.Modal.getInstance(document.getElementById('formPenggunaModal'))?.hide();
        fetchAdminPengguna();
    } catch(error) { 
        alert(error.message.includes('Username') ? error.message : "Gagal menyimpan akun."); 
    } finally { 
        btn.disabled = false; btn.innerHTML = originalText; 
    }
}

window.deletePengguna = async function(id) {
    if(!confirm("Yakin ingin menghapus akun ini? Akun tidak bisa dikembalikan.")) return;
    try {
        await supabaseClient.from('pengguna').delete().eq('id', id);
        fetchAdminPengguna();
    } catch(e) { alert('Gagal menghapus akun.'); }
};

// Fungsi mengubah status tampil/sembunyi di database
window.toggleBukuTamu = async function(id, isTampil) {
    try {
        const { error } = await supabaseClient.from('buku_tamu').update({ tampil: isTampil }).eq('id', id);
        if (error) throw error;
    } catch (e) {
        alert('Gagal mengubah status pesan.');
        fetchAdminBukuTamu(); // Kembalikan saklar ke posisi semula jika error
    }
};

// Fungsi menghapus pesan
window.deleteBukuTamu = async function(id) {
    if(!confirm("Yakin ingin menghapus pesan ini secara permanen?")) return;
    try {
        await supabaseClient.from('buku_tamu').delete().eq('id', id);
        fetchAdminBukuTamu(); // Refresh tabel
    } catch(e) { alert('Gagal menghapus pesan.'); }
};

/* --- 12. KELOLA DATA MURID --- */
let adminMuridData = [];

// Fungsi khusus untuk mengisi dropdown pilihan kelas di Form Murid
async function fetchDropdownKelas() {
    const { data } = await supabaseClient.from('kelas').select('*').order('nama_kelas');
    const select = document.getElementById('murid-kelas');
    if(select) {
        select.innerHTML = '<option value="">Pilih Kelas...</option>' + 
            (data || []).map(k => `<option value="${k.id}">${k.nama_kelas}</option>`).join('');
    }
}

async function fetchAdminMurid() {
    try {
        // Tarik data murid sekaligus menarik nama kelas dari tabel 'kelas' yang berelasi
        const { data, error } = await supabaseClient
            .from('murid')
            .select(`*, kelas (nama_kelas)`)
            .order('kelas_id', { ascending: true }) // Urutkan per kelas
            .order('nama_murid', { ascending: true }); // Lalu urutkan per nama (A-Z)
            
        if(error) throw error;
        adminMuridData = data || [];
        
        const tbody = document.getElementById('admin-murid-list');
        if(adminMuridData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Belum ada data murid.</td></tr>';
            return;
        }
        
        tbody.innerHTML = adminMuridData.map((m, index) => {
            const namaKelas = m.kelas ? m.kelas.nama_kelas : '-';
            
            // Format Tanggal (Contoh: Jakarta, 17 Agu 2010)
            let ttl = '-';
            if (m.tempat_lahir || m.tanggal_lahir) {
                const tgl = m.tanggal_lahir ? new Date(m.tanggal_lahir).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '';
                ttl = `${m.tempat_lahir || ''}${m.tempat_lahir && tgl ? ', ' : ''}${tgl}`;
            }
            
            return `
                <tr>
                    <td>
                        <span class="fw-bold text-dark">${m.nisn || '-'}</span><br>
                        <small class="text-muted">NIS: ${m.nis || '-'}</small>
                    </td>
                    <td class="fw-bold text-dark">${m.nama_murid}</td>
                    <td class="text-center">${m.jenis_kelamin || '-'}</td>
                    <td><span class="badge bg-info text-dark">${namaKelas}</span></td>
                    <td><small>${ttl}</small></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="openMuridModal(${index})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMurid(${m.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) { console.error(e); }
}

window.openMuridModal = function(index = null) {
    const modal = new bootstrap.Modal(document.getElementById('formMuridModal'));
    document.getElementById('add-murid-form').reset();
    document.getElementById('murid-id').value = '';
    
    if (index !== null) {
        const data = adminMuridData[index];
        document.getElementById('formMuridModalLabel').innerText = 'Edit Data Murid';
        document.getElementById('murid-id').value = data.id;
        document.getElementById('murid-nisn').value = data.nisn || '';
        document.getElementById('murid-nis').value = data.nis || '';
        document.getElementById('murid-nama').value = data.nama_murid;
        document.getElementById('murid-jk').value = data.jenis_kelamin || '';
        document.getElementById('murid-kelas').value = data.kelas_id || '';
        document.getElementById('murid-tempat').value = data.tempat_lahir || '';
        document.getElementById('murid-tanggal').value = data.tanggal_lahir || '';
    } else {
        document.getElementById('formMuridModalLabel').innerText = 'Tambah Data Murid';
    }
    modal.show();
};

async function postMurid(e) {
    e.preventDefault();
    const id = document.getElementById('murid-id').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true; btn.innerHTML = 'Menyimpan...';
    
    const payload = { 
        nisn: document.getElementById('murid-nisn').value || null,
        nis: document.getElementById('murid-nis').value || null,
        nama_murid: document.getElementById('murid-nama').value,
        jenis_kelamin: document.getElementById('murid-jk').value,
        kelas_id: document.getElementById('murid-kelas').value || null,
        tempat_lahir: document.getElementById('murid-tempat').value || null,
        tanggal_lahir: document.getElementById('murid-tanggal').value || null
    };

    try {
        if (id) {
            const { error } = await supabaseClient.from('murid').update(payload).eq('id', id);
            if(error) throw error;
        } else {
            const { error } = await supabaseClient.from('murid').insert([payload]);
            if(error) throw error;
        }
        bootstrap.Modal.getInstance(document.getElementById('formMuridModal'))?.hide();
        fetchAdminMurid();
    } catch(error) { 
        alert("Gagal menyimpan data murid. Pastikan NISN tidak duplikat dengan murid lain!"); 
    } finally { 
        btn.disabled = false; btn.innerHTML = originalText; 
    }
}

window.deleteMurid = async function(id) {
    if(!confirm("Yakin ingin menghapus data murid ini?")) return;
    try {
        await supabaseClient.from('murid').delete().eq('id', id);
        fetchAdminMurid();
    } catch(e) { alert('Gagal menghapus murid.'); }
};

/* --- FITUR EXCEL MURID (TEMPLATE & IMPORT) --- */

// 1. Fungsi Membuat File Template Excel
window.downloadTemplateMurid = function() {
    const templateData = [
        { 
            "NISN": "'0123456789", // Gunakan kutip satu agar tidak jadi scientific (E+15)
            "NIS": "'1001", 
            "Nama Lengkap": "Ahmad Budi Santoso", 
            "L/P (L atau P)": "L", 
            "Nama Kelas": "Kelas 1A", // Admin cukup tulis ini
            "Tempat Lahir": "Jakarta", 
            "Tanggal Lahir (YYYY-MM-DD)": "2015-08-17" 
        },
        { 
            "NISN": "'0123456790", 
            "NIS": "'1002", 
            "Nama Lengkap": "Siti Aminah", 
            "L/P (L atau P)": "P", 
            "Nama Kelas": "Kelas 1B", 
            "Tempat Lahir": "Bandung", 
            "Tanggal Lahir (YYYY-MM-DD)": "2015-09-20" 
        }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    // Mengatur lebar kolom agar rapi
    ws['!cols'] = [ { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 } ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Murid");
    XLSX.writeFile(wb, "Template_Import_Murid.xlsx");
};

// 2. Fungsi Membaca dan Menerjemahkan Excel ke Database
window.handleImportMurid = async function(input) {
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            // A. Baca isi Excel menjadi Array JSON
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert("File Excel kosong!"); return;
            }

            if (!confirm(`Mulai impor ${jsonData.length} data murid?`)) {
                input.value = ''; return;
            }

            // B. AMBIL DATA KELAS DARI DATABASE UNTUK "KAMUS PENERJEMAH"
            const { data: listKelas, error: errKelas } = await supabaseClient.from('kelas').select('id, nama_kelas');
            if (errKelas) throw errKelas;
            
            // Buat kamus pencocokan (Contoh: { "kelas 1a": "uuid-xxx-yyy" })
            const kamusKelas = {};
            listKelas.forEach(k => {
                // Ubah semua huruf jadi kecil (lowercase) dan hapus spasi lebih agar toleran terhadap salah ketik
                kamusKelas[k.nama_kelas.toLowerCase().trim()] = k.id;
            });

            // C. Proses Data Excel
            const payload = [];
            for (let row of jsonData) {
                // Lewati baris jika NISN atau Nama kosong
                if (!row["NISN"] || !row["Nama Lengkap"]) continue;

                // Proses Terjemahan Kelas ke UUID
                let kelasId = null;
                const namaKelasExcel = row["Nama Kelas"];
                if (namaKelasExcel) {
                    const kataKunci = namaKelasExcel.toString().toLowerCase().trim();
                    if (kamusKelas[kataKunci]) {
                        kelasId = kamusKelas[kataKunci]; // Berhasil diterjemahkan!
                    }
                }

                // Bersihkan karakter kutip satu (') jika ada
                const nisnBersih = row["NISN"].toString().replace(/^'/, '').trim();
                const nisBersih = row["NIS"] ? row["NIS"].toString().replace(/^'/, '').trim() : null;
                const jk = row["L/P (L atau P)"]?.toString().toUpperCase().trim() === 'P' ? 'P' : 'L'; // Default ke L jika salah ketik

                // Masukkan ke gerbong pengiriman
                payload.push({
                    nisn: nisnBersih,
                    nis: nisBersih,
                    nama_murid: row["Nama Lengkap"],
                    jenis_kelamin: jk,
                    kelas_id: kelasId, // Ini sudah berupa UUID (atau null jika nama kelas di excel salah ketik)
                    tempat_lahir: row["Tempat Lahir"] || null,
                    tanggal_lahir: row["Tanggal Lahir (YYYY-MM-DD)"] || null
                });
            }

            if(payload.length === 0) {
                alert("Tidak ada data valid untuk diimpor. Pastikan kolom NISN dan Nama Lengkap terisi.");
                return;
            }

            // D. Kirim Masal ke Database (Upsert: Jika NISN sudah ada, update datanya. Jika belum, tambah baru)
            const { error: errInsert } = await supabaseClient.from('murid').upsert(payload, { onConflict: 'nisn' });
            if (errInsert) throw errInsert;

            alert(`Sukses! ${payload.length} data murid berhasil diimpor.`);
            fetchAdminMurid(); // Refresh tabel

        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan sistem saat mengimpor data. Cek console log.");
        } finally {
            input.value = ''; // Reset input agar bisa upload file yang sama lagi jika perlu
        }
    };
    
    reader.readAsArrayBuffer(file);
};

/* --- 13. SISTEM BACKUP, RESTORE & FACTORY RESET --- */

// Daftar tabel yang akan di-backup (KECUALI tabel pengguna/admin)
const TABLES_TO_BACKUP = ['profil_sekolah', 'statistik', 'kelas', 'guru', 'murid', 'guru_mengajar', 'berita', 'prestasi', 'galeri', 'buku_tamu'];

// A. FUNGSI DOWNLOAD BACKUP (.JSON)
window.backupDatabase = async function() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Memproses Backup...';
    btn.disabled = true;

    try {
        let backupData = {};
        
        // Tarik data dari semua tabel satu per satu
        for (let table of TABLES_TO_BACKUP) {
            const { data, error } = await supabaseClient.from(table).select('*');
            if (error) throw error;
            backupData[table] = data;
        }

        // Bungkus menjadi file JSON dan unduh
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `Backup_SD11_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        alert("Backup berhasil diunduh! Simpan file ini di tempat yang aman.");
    } catch (e) {
        console.error(e);
        alert("Gagal melakukan backup data.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// B. FUNGSI RESTORE DARI FILE
window.restoreDatabase = async function(input) {
    if (!input.files || input.files.length === 0) return;
    
    if(!confirm("PERHATIAN: Proses restore akan menimpa/memasukkan data dari file backup. Pastikan Anda melakukan Factory Reset terlebih dahulu jika ingin database benar-benar bersih sesuai file. Lanjutkan?")) {
        input.value = ''; return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const backupData = JSON.parse(e.target.result);
            alert("Memulai proses pemulihan (Restore). Mohon tunggu dan JANGAN tutup halaman ini!");

            // Restore harus berurutan agar ID relasi (seperti kelas_id) tidak eror
            const restoreOrder = ['profil_sekolah', 'statistik', 'kelas', 'guru', 'murid', 'guru_mengajar', 'berita', 'prestasi', 'galeri', 'buku_tamu'];

            for (let table of restoreOrder) {
                if (backupData[table] && backupData[table].length > 0) {
                    // Gunakan Upsert agar jika ID sudah ada, dia menimpa. Jika tidak ada, dia menambah.
                    await supabaseClient.from(table).upsert(backupData[table]);
                }
            }

            alert("Restore Database Berhasil! Halaman akan dimuat ulang.");
            location.reload();
        } catch (error) {
            console.error(error);
            alert("Gagal melakukan Restore. Pastikan file JSON tersebut adalah file backup yang valid.");
        } finally {
            input.value = ''; 
        }
    };
    reader.readAsText(file);
};

// C. FUNGSI HAPUS PARSIAL (PER KATEGORI)
window.deletePartial = async function(type) {
    let confirmText = type === 'murid' ? 'SELURUH DATA MURID' : type === 'guru' ? 'SELURUH DATA GURU' : 'SELURUH KELAS';
    
    if(!confirm(`⚠️ PERINGATAN! Anda akan menghapus ${confirmText}. Aksi ini tidak dapat dibatalkan. Lanjutkan?`)) return;

    try {
        if (type === 'murid') {
            await supabaseClient.from('murid').delete().not('id', 'is', null);
        } else if (type === 'guru') {
            // Hapus relasi mengajarnya dulu agar tidak error Foreign Key
            await supabaseClient.from('guru_mengajar').delete().not('guru_id', 'is', null);
            await supabaseClient.from('guru').delete().not('id', 'is', null);
        } else if (type === 'kelas') {
            // Hapus relasi mengajar dulu
            await supabaseClient.from('guru_mengajar').delete().not('kelas_id', 'is', null);
            await supabaseClient.from('kelas').delete().not('id', 'is', null);
        }
        alert(`${confirmText} berhasil dihapus dari database.`);
    } catch (e) {
        console.error(e);
        alert(`Gagal menghapus data ${type}.`);
    }
};

// D. FUNGSI KIAMAT (FACTORY RESET)
window.factoryReset = async function() {
    const userInput = prompt("⚠️ DANGER ZONE! ⚠️\n\nUntuk mengonfirmasi Factory Reset, ketik kata: RESET (huruf besar semua)");
    
    if (userInput !== "RESET") {
        alert("Konfirmasi gagal. Factory Reset dibatalkan.");
        return;
    }

    if(!confirm("YAKIN 100%? Seluruh konten website akan hilang. Pastikan Anda sudah mem-backup data Anda!")) return;

    try {
        // Hapus mulai dari ujung rantai (relasi) agar aman
        await supabaseClient.from('guru_mengajar').delete().not('guru_id', 'is', null);
        await supabaseClient.from('murid').delete().not('id', 'is', null);
        await supabaseClient.from('guru').delete().not('id', 'is', null);
        await supabaseClient.from('kelas').delete().not('id', 'is', null);
        
        // Hapus konten publik
        await supabaseClient.from('berita').delete().not('id', 'is', null);
        await supabaseClient.from('prestasi').delete().not('id', 'is', null);
        await supabaseClient.from('galeri').delete().not('id', 'is', null);
        await supabaseClient.from('buku_tamu').delete().not('id', 'is', null);

        // Jangan hapus Profil & Statistik (karena ID 1 sangat penting untuk load website), cukup reset nilainya
        await supabaseClient.from('profil_sekolah').update({
            nama_sekolah: 'SDN Pejaten Timur 11',
            teks_utama: 'Selamat Datang',
            visi: '', misi: '', sambutan_kepsek: ''
        }).eq('id', 1);
        
        await supabaseClient.from('statistik').update({ count: 0 }).eq('id', 1);

        alert("FACTORY RESET BERHASIL. Database Anda sekarang kembali suci/bersih.\nWebsite akan dimuat ulang.");
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan sistem saat mencoba mereset database.");
    }
};

/* --- FITUR CONVERT LINK GOOGLE DRIVE --- */

// 1. Membuka Modal Converter (Tanpa menutup modal Galeri)
window.openDriveConverter = function() {
    // Kosongkan inputan sebelumnya
    document.getElementById('drive-original').value = '';
    document.getElementById('drive-converted').value = '';
    document.getElementById('copy-icon').className = 'fas fa-copy'; // Reset icon copy
    
    // Munculkan modal kecil
    new bootstrap.Modal(document.getElementById('driveConvertModal')).show();
};

// 2. Logika Pemotongan dan Pembuatan Direct Link
window.processConvertDrive = function() {
    const original = document.getElementById('drive-original').value.trim();
    const convertedInput = document.getElementById('drive-converted');
    
    if (!original) return;

    // Rumus Cerdas (Regex) untuk mencari ID File di tengah-tengah URL Drive yang panjang
    const regexMatch = original.match(/\/d\/([a-zA-Z0-9_-]+)/) || original.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (regexMatch && regexMatch[1]) {
        const fileId = regexMatch[1];
        // Membentuk format standar Google Drive agar langsung dirender sebagai gambar
        const directLink = `https://lh3.googleusercontent.com/d/${fileId}`;
        convertedInput.value = directLink;
    } else {
        alert("Link Google Drive tidak valid! Pastikan link mengandung '/d/ID_FILE/'.");
        convertedInput.value = '';
    }
};

// 3. Fitur Tombol Copy Otomatis
window.copyDriveLink = function() {
    const copyText = document.getElementById('drive-converted');
    if (!copyText.value) return; // Jika kosong, batalkan
    
    // Proses seleksi dan copy ke sistem perangkat
    copyText.select();
    copyText.setSelectionRange(0, 99999); // Kompatibilitas untuk Mobile
    navigator.clipboard.writeText(copyText.value);
    
    // Efek visual centang hijau sebentar agar admin tahu sudah tercopy
    const icon = document.getElementById('copy-icon');
    icon.className = 'fas fa-check text-success';
    setTimeout(() => {
        icon.className = 'fas fa-copy';
    }, 1500); // Kembali seperti semula setelah 1.5 detik
};