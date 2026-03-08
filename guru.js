// --- 1. KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://fznapkpqrhevuxthvott.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6bmFwa3BxcmhldnV4dGh2b3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMzg3MjEsImV4cCI6MjA4NjcxNDcyMX0.haR_vhREOeIf29r52sfPhX_3zsvXFNihayJu9JmGCzM'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabel untuk menyimpan data guru yang sedang login
let currentGuru = null; 

// --- 2. INISIALISASI SAAT HALAMAN DIMUAT ---
document.addEventListener('DOMContentLoaded', () => {
    // Tombol untuk membuka/menutup sidebar di mode mobile
    document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('sb-sidenav-toggled');
    });
    // Tekan Enter untuk Login
    const loginInputs = [document.getElementById('guru-login-user'), document.getElementById('guru-login-pass')];
    loginInputs.forEach(input => {
        if(input) {
            input.addEventListener('keypress', e => { if (e.key === 'Enter') attemptGuruLogin(); });
        }
    });

    // Cek apakah guru sudah pernah login sebelumnya
    const savedGuru = sessionStorage.getItem('guruLoggedIn');
    if (savedGuru) {
        currentGuru = JSON.parse(savedGuru);
        tampilkanPanelGuru(); 
        startGuruInactivityTracker(); // <-- TAMBAHKAN BARIS INI
    } else {
        // INI DIA YANG MEMBUAT LAYAR TIDAK PUTIH LAGI!
        // Memunculkan pop-up modal login jika belum ada sesi
        new bootstrap.Modal(document.getElementById('loginGuruModal')).show();
    }
});

// --- 3. SISTEM LOGIN DENGAN USERNAME & PASSWORD ---
async function attemptGuruLogin() {
    // Ambil nilai dari input form yang baru
    const userVal = document.getElementById('guru-login-user').value.trim();
    const passVal = document.getElementById('guru-login-pass').value.trim();
    const btn = document.querySelector('#loginGuruModal button');

    if (!userVal || !passVal) {
        alert('Username dan Password wajib diisi!');
        return;
    }

    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Memeriksa Kredensial...';
    btn.disabled = true;

    try {
        // Cari data guru beserta relasi kelasnya berdasarkan USERNAME dan PASSWORD
        const { data, error } = await supabaseClient
            .from('guru')
            .select('*, guru_mengajar(kelas_id, kelas(nama_kelas))')
            .eq('username', userVal)
            .eq('password', passVal)
            .single();

        if (error || !data) {
            alert('Akses Ditolak! Username atau Password salah.');
        } else {
            // LOGIN BERHASIL
            currentGuru = data;
            sessionStorage.setItem('guruLoggedIn', JSON.stringify(data)); 
            sessionStorage.setItem('guruLastActivity', Date.now()); // <-- TAMBAHKAN BARIS INI
            
            bootstrap.Modal.getInstance(document.getElementById('loginGuruModal')).hide();
            tampilkanPanelGuru();
            startGuruInactivityTracker(); // <-- TAMBAHKAN BARIS INI
        }
    } catch (e) {
        console.error(e);
        alert('Gagal terhubung ke database.');
    } finally {
        btn.innerHTML = 'Masuk Portal';
        btn.disabled = false;
    }
}

// --- 4. PERSIAPAN TAMPILAN PANEL GURU ---
function tampilkanPanelGuru() {
    // 1. Munculkan halaman utama yang tadinya disembunyikan
    document.getElementById('wrapper').classList.remove('d-none');
    
    // 2. Tampilkan identitas guru di Sidebar (Kiri)
    document.getElementById('sidebar-guru-nama').innerText = currentGuru.nama;
    document.getElementById('sidebar-guru-jabatan').innerText = currentGuru.jabatan;
    
    // Jika tidak ada foto, buatkan avatar otomatis dengan inisial namanya
    document.getElementById('sidebar-guru-foto').src = currentGuru.foto_url || `https://ui-avatars.com/api/?name=${currentGuru.nama}&background=random&color=fff`;

    // 3. Tampilkan kelas yang diampu pada bagian atas layar
    const daftarKelas = currentGuru.guru_mengajar?.map(gm => gm.kelas?.nama_kelas).join(', ') || 'Belum ditugaskan di kelas manapun';
    document.getElementById('badge-kelas-aktif').innerText = `Kelas: ${daftarKelas}`;

    // 4. Langsung arahkan ke tab Daftar Murid
    switchGuruTab('murid');
}

// --- 5. NAVIGASI TAB MENU ---
window.switchGuruTab = function(tabId) {
    // Sembunyikan semua tampilan
    document.querySelectorAll('.guru-view').forEach(el => el.classList.add('d-none'));
    // Munculkan tampilan yang diklik
    const view = document.getElementById(`view-${tabId}`);
    if(view) view.classList.remove('d-none');
    
    // Atur efek tebal/aktif pada menu di sidebar
    document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active', 'fw-bold'));
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active', 'fw-bold');

    // Jika masuk ke tab murid, tarik data dari database
    if (tabId === 'murid') fetchMuridSaya();
    if (tabId === 'absensi') initAbsensi();
};

window.logoutGuru = function() {
    if(confirm('Yakin ingin keluar dari Portal Pendidik?')) {
        sessionStorage.removeItem('guruLoggedIn');
        location.reload(); // Refresh kembali ke layar login
    }
};

// --- 6. TARIK DATA DAFTAR MURID ---
async function fetchMuridSaya() {
    // 1. Kumpulkan daftar ID kelas yang diajar oleh guru ini
    const kelasIds = currentGuru.guru_mengajar?.map(gm => gm.kelas_id) || [];
    const tbody = document.getElementById('guru-murid-list');

    // Jika guru belum ditugaskan di kelas mana pun oleh admin
    if (kelasIds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Anda belum memiliki akses ke data murid. Silakan hubungi Admin.</td></tr>';
        return;
    }

    try {
        // 2. Tarik HANYA data murid yang kelasnya cocok dengan kelas yang diajar guru ini
        // Gunakan perintah .in() dari Supabase untuk mencari banyak ID sekaligus
        const { data, error } = await supabaseClient
            .from('murid')
            .select('*, kelas(nama_kelas)')
            .in('kelas_id', kelasIds)
            .order('nama_murid', { ascending: true }); // Urutkan A-Z

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada murid yang terdaftar di kelas Anda.</td></tr>';
            return;
        }

        // 3. Tampilkan data murid ke tabel
        tbody.innerHTML = data.map((m, index) => {
            // Format Tanggal Lahir agar rapi
            let ttl = '-';
            if (m.tempat_lahir || m.tanggal_lahir) {
                const tgl = m.tanggal_lahir ? new Date(m.tanggal_lahir).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '';
                ttl = `${m.tempat_lahir || ''}${m.tempat_lahir && tgl ? ', ' : ''}${tgl}`;
            }

            return `
                <tr>
                    <td class="text-muted">${index + 1}</td>
                    <td>
                        <span class="fw-bold text-dark">${m.nisn || '-'}</span><br>
                        <small class="text-muted">NIS: ${m.nis || '-'}</small>
                    </td>
                    <td class="fw-bold text-dark">${m.nama_murid}</td>
                    <td class="text-center">${m.jenis_kelamin || '-'}</td>
                    <td><small>${ttl}</small></td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Gagal memuat data murid. Cek koneksi Anda.</td></tr>';
    }
}

// --- 7. MESIN PELACAK AKTIVITAS GURU (AUTO-LOGOUT 30 MENIT) ---
function startGuruInactivityTracker() {
    const updateActivity = () => {
        if (sessionStorage.getItem('guruLoggedIn')) {
            sessionStorage.setItem('guruLastActivity', Date.now());
        }
    };

    // Deteksi pergerakan mouse, ketikan, dan klik layar
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    // Mesin pengecek otomatis setiap 1 menit
    setInterval(() => {
        if (!sessionStorage.getItem('guruLoggedIn')) return;

        const lastAct = parseInt(sessionStorage.getItem('guruLastActivity') || '0');
        const now = Date.now();
        const diffMinutes = (now - lastAct) / (1000 * 60);

        // Jika tidak ada aktivitas lebih dari 30 menit
        if (diffMinutes > 30) {
            sessionStorage.removeItem('guruLoggedIn');
            sessionStorage.removeItem('guruLastActivity');
            alert("Sesi Portal Pendidik Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali untuk keamanan.");
            location.reload(); 
        }
    }, 60000); // 60000 ms = 1 menit
}

// --- 8. SISTEM ABSENSI MURID (KALENDER 12 BULAN) ---

let isAbsensiInit = false; // Mencegah kalender digenerate berkali-kali

// A. Fungsi Persiapan Bulan (Juli - Juni) & Dropdown Kelas
function initAbsensi() {
    if (isAbsensiInit) return; // Jika sudah pernah di-load, lewati

    // 1. Isi Dropdown Kelas (Hanya kelas yang diajar oleh guru ini)
    const selectKelas = document.getElementById('absensi-kelas');
    const kelasList = currentGuru.guru_mengajar?.map(gm => ({ id: gm.kelas_id, nama: gm.kelas?.nama_kelas })) || [];
    
    if (kelasList.length === 0) {
        selectKelas.innerHTML = '<option value="">Tidak ada kelas</option>';
    } else {
        selectKelas.innerHTML = kelasList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
    }

    // 2. Isi Dropdown Bulan (Tahun Ajaran: Juli Tahun A - Juni Tahun B)
    const selectBulan = document.getElementById('absensi-bulan');
    const now = new Date();
    // Jika sekarang bulan Jan-Jun (0-5), berarti Tahun Ajaran dimulai tahun lalu.
    const startYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
    
    const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    let bulanOptions = '';
    // Generate Juli (6) sampai Desember (11) untuk Tahun Pertama
    for (let i = 6; i <= 11; i++) {
        let valueStr = `${startYear}-${String(i + 1).padStart(2, '0')}`; // Format YYYY-MM
        let labelStr = `${namaBulan[i]} ${startYear}`;
        bulanOptions += `<option value="${valueStr}">${labelStr}</option>`;
    }
    // Generate Januari (0) sampai Juni (5) untuk Tahun Kedua
    for (let i = 0; i <= 5; i++) {
        let valueStr = `${startYear + 1}-${String(i + 1).padStart(2, '0')}`;
        let labelStr = `${namaBulan[i]} ${startYear + 1}`;
        bulanOptions += `<option value="${valueStr}">${labelStr}</option>`;
    }
    
    selectBulan.innerHTML = bulanOptions;
    
    // Set pilihan default ke bulan saat ini
    const currentMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (selectBulan.querySelector(`option[value="${currentMonthVal}"]`)) {
        selectBulan.value = currentMonthVal;
    }

    isAbsensiInit = true;
    loadAbsensiTable(); // Mulai gambar tabel
}

// B. Fungsi Menggambar Tabel & Menarik Data Absen
window.loadAbsensiTable = async function() {
    const kelasId = document.getElementById('absensi-kelas').value;
    const bulanVal = document.getElementById('absensi-bulan').value; // Contoh: "2025-08"
    const tbody = document.getElementById('tbody-absensi');
    const thead = document.getElementById('thead-absensi');

    if (!kelasId || !bulanVal) return;

    tbody.innerHTML = '<tr><td colspan="35" class="text-center py-5"><div class="spinner-border text-success"></div><p class="mt-2 text-muted">Memuat data...</p></td></tr>';

    // Cari tahu jumlah hari dalam bulan tersebut
    const [year, month] = bulanVal.split('-');
    const daysInMonth = new Date(year, month, 0).getDate(); // Trick JS untuk dapat hari terakhir
    
    try {
        // 1. Tarik Data Murid di kelas tersebut
        const { data: murids, error: errMurid } = await supabaseClient
            .from('murid').select('id, nama_murid, jenis_kelamin')
            .eq('kelas_id', kelasId).order('nama_murid', { ascending: true });
        if (errMurid) throw errMurid;

        // 2. Tarik Data Absensi bulan tersebut untuk murid-murid ini
        // Menggunakan rentang tanggal awal bulan sampai akhir bulan
        const startDate = `${bulanVal}-01`;
        const endDate = `${bulanVal}-${daysInMonth}`;
        const muridIds = murids.map(m => m.id);
        
        const { data: absensis, error: errAbsen } = await supabaseClient
            .from('absensi').select('murid_id, tanggal, status')
            .gte('tanggal', startDate).lte('tanggal', endDate)
            .in('murid_id', muridIds);
        if (errAbsen) throw errAbsen;

        // Buat Kamus Absensi agar pencarian sangat cepat (Format: "muridId_YYYY-MM-DD" = "H")
        const kamusAbsen = {};
        if (absensis) {
            absensis.forEach(a => { kamusAbsen[`${a.murid_id}_${a.tanggal}`] = a.status; });
        }

        // 3. Gambar HEADER Tabel (Kolom Tanggal 1 s.d. 31)
        let headerHtml = `<tr>
            <th class="bg-success text-white" style="min-width: 250px; text-align: left; padding-left: 15px;">Nama Siswa</th>
            <th class="bg-success text-white" width="50px">L/P</th>`;
        for (let d = 1; d <= daysInMonth; d++) {
            // Beri warna merah untuk hari Minggu (opsional jika tahu harinya, tapi kita pakai standar tanggal saja)
            headerHtml += `<th class="bg-success text-white" width="40px">${d}</th>`;
        }
        headerHtml += `</tr>`;
        thead.innerHTML = headerHtml;

        // 4. Gambar BODY Tabel (Baris Murid & Dropdown Absen)
        if (murids.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${daysInMonth + 2}" class="text-center text-muted py-4">Belum ada murid di kelas ini.</td></tr>`;
            return;
        }

        let bodyHtml = murids.map(m => {
            let rowHtml = `<tr>
                <td class="fw-bold text-start ps-3">${m.nama_murid}</td>
                <td class="text-muted">${m.jenis_kelamin || '-'}</td>`;
            
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${bulanVal}-${String(d).padStart(2, '0')}`; // "YYYY-MM-DD"
                const key = `${m.id}_${dateStr}`;
                const status = kamusAbsen[key] || ''; // 'H', 'S', 'I', 'A', atau kosong

                // Membuat Select (Dropdown) super kecil
                rowHtml += `
                <td class="p-1">
                    <select class="form-select form-select-sm border-0 bg-transparent fw-bold text-center" 
                            style="padding: 0; background-image: none; cursor: pointer; color: ${getColor(status)}"
                            onchange="saveAbsensi(${m.id}, '${dateStr}', this)">
                        <option value="" class="text-dark">-</option>
                        <option value="H" class="text-success" ${status === 'H' ? 'selected' : ''}>H</option>
                        <option value="S" class="text-warning" ${status === 'S' ? 'selected' : ''}>S</option>
                        <option value="I" class="text-info" ${status === 'I' ? 'selected' : ''}>I</option>
                        <option value="A" class="text-danger" ${status === 'A' ? 'selected' : ''}>A</option>
                    </select>
                </td>`;
            }
            rowHtml += `</tr>`;
            return rowHtml;
        }).join('');
        
        tbody.innerHTML = bodyHtml;

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="35" class="text-center text-danger py-4">Gagal memuat data absensi.</td></tr>`;
    }
};

// C. Fungsi Warna Teks Dropdown
function getColor(status) {
    if (status === 'H') return '#198754'; // Success (Hijau)
    if (status === 'S') return '#ffc107'; // Warning (Kuning)
    if (status === 'I') return '#0dcaf0'; // Info (Biru)
    if (status === 'A') return '#dc3545'; // Danger (Merah)
    return '#6c757d'; // Default (Abu-abu)
}

// D. Fungsi Simpan Absensi Saat Dropdown Diubah
window.saveAbsensi = async function(muridId, tanggal, selectElement) {
    const status = selectElement.value;
    
    // Ubah warna teks dropdown secara instan agar guru tahu bahwa inputnya terbaca
    selectElement.style.color = getColor(status);

    try {
        if (!status) {
            // Jika dikosongkan (pilih "-"), HAPUS dari database
            await supabaseClient.from('absensi').delete().eq('murid_id', muridId).eq('tanggal', tanggal);
        } else {
            // Gunakan UPSERT: Jika sudah ada absen hari itu, TIMPA. Jika belum, TAMBAH.
            const payload = { murid_id: muridId, tanggal: tanggal, status: status };
            const { error } = await supabaseClient.from('absensi').upsert([payload], { onConflict: 'murid_id, tanggal' });
            if (error) throw error;
        }
    } catch (e) {
        console.error(e);
        alert('Gagal menyimpan absen. Periksa koneksi internet Anda.');
        // Kembalikan warna ke abu-abu jika gagal
        selectElement.style.color = 'red';
    }
};