// --- 1. KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://fznapkpqrhevuxthvott.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6bmFwa3BxcmhldnV4dGh2b3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMzg3MjEsImV4cCI6MjA4NjcxNDcyMX0.haR_vhREOeIf29r52sfPhX_3zsvXFNihayJu9JmGCzM'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. VARIABEL GLOBAL ---
let allTeachers = [];
let allNewsData = [];
let allPrestasiData = [];
let teacherRotateInterval;

// --- 3. INISIALISASI (saat web dimuat) ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProfilSekolah();
    fetchTeachers();
    fetchNews();
    fetchPrestasi();
    fetchGaleri();
    fetchMessages();
    updateVisitorCount();
    setupGuestbookForm();
});

// Event load untuk menghilangkan Preloader
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('hidden'); 
            document.body.classList.remove('no-scroll'); 
        }, 500);
    }
});

// --- 4. FUNGSI PENGAMBILAN DATA (FETCH) ---

// A. Profil Sekolah
async function fetchProfilSekolah() {
    try {
        const { data, error } = await supabaseClient.from('profil_sekolah').select('*').eq('id', 1).single();
        if (error) throw error;
        if (!data) return;

        // Navbar & Footer Teks
        if (data.nama_sekolah) {
            document.getElementById('nav-nama').innerText = data.nama_sekolah;
            document.getElementById('footer-nama').innerText = data.nama_sekolah;
            const judulSambutan = document.getElementById('judul-sambutan');
            if (judulSambutan) judulSambutan.innerText = `Sambutan Kepala ${data.nama_sekolah}`;
        }
        if (data.kota) document.getElementById('nav-kota').innerText = data.kota;
        
        // Logo & Favicon
        if (data.logo_url) {
            document.getElementById('nav-logo').src = data.logo_url;
            document.getElementById('footer-logo').src = data.logo_url;
            
            let favicon = document.querySelector("link[rel~='icon']");
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                document.head.appendChild(favicon);
            }
            favicon.href = data.logo_url;
        }

        // Teks Utama & Visi
        if (data.teks_utama) document.getElementById('hero-teks').innerHTML = data.teks_utama;
        if (data.deskripsi_utama) {
            const heroEl = document.getElementById('hero-visi');
            if (heroEl) heroEl.innerText = data.deskripsi_utama;
            const footerEl = document.getElementById('footer-visi');
            if (footerEl) footerEl.innerText = data.deskripsi_utama;
        }

        // Background Hero
        if (data.hero_bg_url) {
            const heroSection = document.getElementById('beranda');
            if (heroSection) {
                heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${data.hero_bg_url}')`;
            }
        }

        // Kepsek
        if (data.nama_kepsek) document.getElementById('kepsek-nama').innerText = data.nama_kepsek;
        if (data.foto_kepsek) document.getElementById('kepsek-foto').src = data.foto_kepsek;
        if (data.sambutan_kepsek) document.getElementById('kepsek-sambutan').innerHTML = data.sambutan_kepsek;

        // Kontak & Alamat
        if (data.jalan || data.kota) {
            const susunanAlamat = [
                data.jalan,
                data.kelurahan ? `Kel. ${data.kelurahan}` : '',
                data.kecamatan ? `Kec. ${data.kecamatan}` : '',
                data.kota,
                data.provinsi
            ].filter(Boolean).join(', ');
            document.getElementById('kontak-alamat').innerText = susunanAlamat;
        }
        
        // --- TAMBAHKAN BARIS INI UNTUK TELEPON/EMAIL ---
        if (data.kontak) document.getElementById('kontak-telp').innerText = data.kontak;
        if (data.email) document.getElementById('kontak-email').innerText = data.email;
        // -----------------------------------------------

        if (data.jam_operasional) document.getElementById('kontak-jam').innerText = data.jam_operasional;
        
        // Sosial Media
        const btnIg = document.getElementById('footer-ig');
        const btnYt = document.getElementById('footer-yt');
        if (btnIg) {
            btnIg.href = data.instagram || '#';
            btnIg.style.display = data.instagram ? 'flex' : 'none';
        }
        if (btnYt) {
            btnYt.href = data.youtube || '#';
            btnYt.style.display = data.youtube ? 'flex' : 'none';
        }
    } catch (e) {
        console.error("Gagal mengambil data profil:", e);
    }
}

// B. Data Guru
function getTeksJabatan(t) {
    if (t.jabatan === 'Guru Kelas') {
        const namaKelas = t.guru_mengajar?.[0]?.kelas?.nama_kelas || 'Belum ditugaskan';
        return `Guru ${namaKelas}`; 
    } else if (t.jabatan === 'Guru Mata Pelajaran') {
        return `Guru ${t.mapel || 'Mata Pelajaran'}`; 
    } else {
        return t.mapel || t.jabatan || 'Tenaga Kependidikan'; 
    }
}

async function fetchTeachers() {
    try {
        const { data, error } = await supabaseClient.from('guru').select(`*, guru_mengajar ( kelas (nama_kelas) )`);
        if (error) throw error;
        allTeachers = data || [];
        
        renderRotatingTeachers();
        if(teacherRotateInterval) clearInterval(teacherRotateInterval);
        teacherRotateInterval = setInterval(renderRotatingTeachers, 6000); 
    } catch(e) { console.error("Gagal load guru:", e); }
}

function renderRotatingTeachers() {
    const container = document.getElementById('rotating-teachers');
    if(!container) return;
    if(allTeachers.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">Belum ada data pendidik.</div>';
        return;
    }

    const shuffled = [...allTeachers].sort(() => 0.5 - Math.random()).slice(0, 3);
    container.innerHTML = shuffled.map(t => {
        const teksJabatan = getTeksJabatan(t);
        const namaAman = t.nama || 'Guru';
        const fotoUrl = t.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(namaAman)}&background=random&color=fff`;
        
        return `
        <div class="col-md-4 animate-fade">
            <div class="card h-100 text-center p-4 border-0 shadow-sm rounded-4">
                <img src="${fotoUrl}" class="rounded-circle mx-auto mb-3 border p-1" width="100" height="100" style="object-fit:cover;">
                <h5 class="fw-bold mb-1 text-dark">${namaAman}</h5>
                <small class="text-primary fw-bold text-uppercase">${teksJabatan}</small>
            </div>
        </div>
        `;
    }).join('');
}

window.openTeacherModal = function() {
    const modalEl = document.getElementById('teacherModal');
    const content = document.getElementById('modal-teacher-content');
    if (!modalEl || !content) return;
    
    let html = '';
    const renderSec = (title, list) => {
        if(!list.length) return '';
        return `<h5 class="fw-bold border-bottom pb-2 mb-3 mt-4 text-primary">${title}</h5>
                <div class="row g-3">
                    ${list.map(t => {
                        const teksJabatan = getTeksJabatan(t);
                        const namaAman = t.nama || 'Guru';
                        const fotoUrl = t.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(namaAman)}&background=random&color=fff`;
                        return `
                    <div class="col-md-6 col-lg-4">
                        <div class="d-flex align-items-center gap-3 bg-white p-3 rounded shadow-sm border">
                            <img src="${fotoUrl}" class="rounded-circle" width="45" height="45" style="object-fit:cover;">
                            <div style="line-height:1.2;">
                                <div class="fw-bold text-dark mb-1" style="font-size: 0.9rem;">${namaAman}</div>
                                <div class="text-primary" style="font-size:0.75rem; font-weight: 500;">${teksJabatan}</div>
                            </div>
                        </div>
                    </div>`;
                    }).join('')}
                </div>`;
    };

    // Guru Kelas 1-6 berurutan
    for(let i=1; i<=6; i++) {
        let guruKelasIni = allTeachers.filter(t => t.jabatan === 'Guru Kelas' && t.guru_mengajar?.some(gm => gm.kelas?.nama_kelas?.includes(`Kelas ${i}`)));
        guruKelasIni.sort((a, b) => {
            const kelasA = a.guru_mengajar?.find(gm => gm.kelas?.nama_kelas?.includes(`Kelas ${i}`))?.kelas?.nama_kelas || '';
            const kelasB = b.guru_mengajar?.find(gm => gm.kelas?.nama_kelas?.includes(`Kelas ${i}`))?.kelas?.nama_kelas || '';
            return kelasA.localeCompare(kelasB);
        });
        html += renderSec(`Kelas ${i}`, guruKelasIni);
    }
    
    html += renderSec('Guru Mata Pelajaran', allTeachers.filter(t => t.jabatan === 'Guru Mata Pelajaran'));
    html += renderSec('Tenaga Kependidikan', allTeachers.filter(t => t.jabatan === 'Tenaga Kependidikan'));

    content.innerHTML = html || '<div class="text-center text-muted py-5">Belum ada data pendidik.</div>';
    new bootstrap.Modal(modalEl).show();
}

// C. Data Berita
async function fetchNews() {
    try {
        const { data, error } = await supabaseClient.from('berita').select('*').order('id', { ascending: false });
        if(error) throw error;
        allNewsData = data || [];
        
        const container = document.getElementById('news-featured');
        const list = document.getElementById('news-archive-list');
        if(!container) return;

        if(allNewsData.length > 0) {
            container.innerHTML = allNewsData.slice(0, 3).map((n, idx) => `
                <div class="col-md-4">
                    <div class="card h-100 shadow-sm overflow-hidden" style="cursor: pointer;" onclick="openNewsModal(${idx})">
                        <div class="bg-light d-flex align-items-center justify-content-center" style="height:200px;">
                            <img src="${n.img || 'https://placehold.co/400'}" class="w-100 h-100 p-2" style="object-fit:contain;" alt="${n.title}">
                        </div>
                        <div class="card-body">
                            <h5 class="card-title fw-bold text-dark" style="font-size: 1.1rem;">${n.title}</h5>
                            <p class="card-text small text-muted" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${n.content.replace(/<[^>]+>/g, '').replace(/\[TOMBOL_PENDATAAN\]/g, '')}</p>
                        </div>
                        <div class="card-footer bg-white border-0 text-primary fw-bold small py-3">
                            Baca Selengkapnya <i class="fas fa-arrow-right ms-1"></i>
                        </div>
                    </div>
                </div>
            `).join('');

            if(list) {
                list.innerHTML = allNewsData.slice(3).map((n, idx) => `
                    <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" onclick="openNewsModal(${idx+3})">
                        <span class="text-truncate me-3">${n.title}</span>
                        <i class="fas fa-chevron-right small text-muted"></i>
                    </button>
                `).join('');
            }
        } else {
            container.innerHTML = '<div class="col-12 text-center text-muted py-4">Belum ada berita.</div>';
        }
    } catch(e) { console.error("Gagal load berita:", e); }
}

window.openNewsModal = function(index) {
    const data = allNewsData[index];
    document.getElementById('modal-news-img').src = data.img || 'https://placehold.co/800x400?text=No+Image';
    document.getElementById('modal-news-title').innerText = data.title;
    const dateEl = document.getElementById('modal-news-date');
    if(dateEl) dateEl.style.display = 'none'; 
    
    // --- TRIK TOMBOL RAHASIA DIMULAI DI SINI ---
    let isiBerita = data.content;
    
    // Jika ada teks [TOMBOL_PENDATAAN], ubah menjadi tombol HTML merah
    isiBerita = isiBerita.replace(/\[TOMBOL_PENDATAAN\]/g, '<div class="text-center my-4"><a href="pendataan-kelas6.html" target="_blank" rel="noopener noreferrer" class="btn btn-primary rounded-pill fw-bold text-white px-5 py-2 shadow" style="background-color: #DC2626; border-color: #DC2626; text-decoration: none;">Klik di Sini untuk Login</a></div>');
    // -------------------------------------------

    document.getElementById('modal-news-content').innerHTML = isiBerita;
    new bootstrap.Modal(document.getElementById('newsModal')).show();
}

// D. Data Prestasi
async function fetchPrestasi() {
    try {
        const { data, error } = await supabaseClient.from('prestasi').select('*').order('id', { ascending: false });
        if(error) throw error;
        allPrestasiData = data || []; 
        
        const container = document.getElementById('prestasi-featured');
        const listContainer = document.getElementById('prestasi-archive-list');
        if(!container) return;
        
        if(allPrestasiData.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">Belum ada data prestasi.</div>';
            return;
        }

        container.innerHTML = allPrestasiData.slice(0, 3).map((p, idx) => {
            const plainTextDesc = p.desc ? p.desc.replace(/<[^>]+>/g, '') : '';
            return `
            <div class="col-md-4">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style="cursor: pointer;" onclick="openPrestasiModal(${idx})">
                    <div class="bg-light position-relative" style="height:220px;">
                        <img src="${p.img || 'https://placehold.co/400?text=Prestasi'}" class="w-100 h-100 p-3" style="object-fit:contain;" alt="${p.title}">
                        <span class="badge bg-warning text-dark position-absolute top-0 end-0 m-3 shadow-sm">
                            <i class="fas fa-trophy me-1"></i> ${p.category || 'Juara'}
                        </span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title fw-bold text-dark mb-2">${p.title}</h5>
                        <p class="card-text small text-muted" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${plainTextDesc}</p>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        if (allPrestasiData.length > 3 && listContainer) {
            listContainer.innerHTML = allPrestasiData.slice(3).map((p, idx) => {
                return `
                <div class="list-group-item list-group-item-action p-3 border-bottom d-flex align-items-center gap-3" style="cursor: pointer;" onclick="openPrestasiModal(${idx + 3})">
                    <div class="bg-light rounded d-flex align-items-center justify-content-center flex-shrink-0" style="width: 60px; height: 60px;">
                        <img src="${p.img || 'https://placehold.co/100?text=Prestasi'}" class="mw-100 mh-100" style="object-fit: contain;">
                    </div>
                    <div class="overflow-hidden">
                        <span class="badge bg-danger bg-opacity-10 text-danger mb-1" style="font-size: 0.7rem;">${p.category || 'Prestasi'}</span>
                        <h6 class="fw-bold mb-0 text-dark text-truncate">${p.title}</h6>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            const btnArsip = document.querySelector('[data-bs-target="#collapsePrestasi"]');
            if(btnArsip) btnArsip.style.display = 'none';
        }
    } catch(e) { console.error("Gagal load prestasi:", e); }
}

window.openPrestasiModal = function(index) {
    const data = allPrestasiData[index];
    document.getElementById('modal-prestasi-img').src = data.img || 'https://placehold.co/800x400?text=Prestasi';
    document.getElementById('modal-prestasi-category').innerText = data.category || 'Prestasi';
    document.getElementById('modal-prestasi-title').innerText = data.title;
    document.getElementById('modal-prestasi-content').innerHTML = data.desc || '<p class="text-muted">Tidak ada detail.</p>';
    new bootstrap.Modal(document.getElementById('prestasiModal')).show();
}

// E. Buku Tamu & Statistik
async function fetchMessages() {
    const container = document.getElementById('messages-display');
    if (!container) return;
    
    try {
        // Ambil data dari database: URUTKAN terbaru, BATASI 3, HANYA YANG TAMPIL = TRUE
        const { data, error } = await supabaseClient
            .from('buku_tamu')
            .select('*')
            .eq('tampil', true) // <--- Filter ini yang membuat saklar bekerja!
            .order('created_at', { ascending: false })
            .limit(3);
            
        if(error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<small class="text-white-50">Belum ada ulasan yang ditampilkan.</small>';
            return;
        }
        
        container.innerHTML = data.map(m => {
            // Format Tanggal
            const date = m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
            
            return `
            <div class="p-3 rounded-4" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="fw-bold text-white">${m.name}</small>
                    <span class="badge bg-white text-dark bg-opacity-75 shadow-sm" style="font-size: 0.65rem;">
                        <i class="far fa-calendar-alt me-1"></i> ${date}
                    </span>
                </div>
                <p class="small fst-italic mb-0 opacity-75">"${m.message}"</p>
            </div>
        `}).join('');
    } catch(e) { 
        container.innerHTML = '<small class="text-white-50">Gagal memuat ulasan.</small>';
    }
}

function setupGuestbookForm() {
    const guestbookForm = document.getElementById('guestbook-form');
    if (guestbookForm) {
        guestbookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true; btn.innerHTML = 'Mengirim...';

            const payload = {
                name: document.getElementById('visitor-name').value,
                message: document.getElementById('visitor-message').value,
                tampil: false
            };
            try {
                const { error } = await supabaseClient.from('buku_tamu').insert([payload]);
                if(error) throw error;
                alert("Pesan terkirim! Terima kasih.");
                e.target.reset();
                fetchMessages(); 
            } catch(err) { 
                alert("Gagal mengirim pesan."); 
            } finally {
                btn.disabled = false; btn.innerHTML = originalText;
            }
        });
    }
}

async function updateVisitorCount() {
    try {
        const { data: getStat } = await supabaseClient.from('statistik').select('count').eq('id', 1).single();
        let currentCount = getStat ? getStat.count : 0;

        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem('lastVisitDate');

        if (lastVisit !== today) {
            currentCount++;
            
            await supabaseClient.from('statistik').update({ count: currentCount }).eq('id', 1);
            
            localStorage.setItem('lastVisitDate', today);
        }

        const vCount = document.getElementById('visitor-count');
        const sCount = document.getElementById('stat-visitor');
        if(vCount) vCount.innerText = currentCount.toLocaleString('id-ID');
        if(sCount) sCount.innerText = currentCount.toLocaleString('id-ID');
        
    } catch(e) { 
        console.error("Gagal update statistik:", e); 
    }
}

/* --- F. DATA GALERI FOTO --- */
let allGaleriData = [];

async function fetchGaleri() {
    try {
        const { data, error } = await supabaseClient.from('galeri').select('*').order('id', { ascending: false });
        if(error) throw error;
        allGaleriData = data || [];
        
        const container = document.getElementById('galeri-featured');
        const listContainer = document.getElementById('galeri-archive-list');
        if(!container) return;
        
        if(allGaleriData.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">Belum ada album galeri.</div>';
            return;
        }

        // Fungsi pembuat Kartu Galeri
        const createCard = (g, idx) => {
            const fotos = JSON.parse(g.fotos || '[]');
            const cover = fotos.length > 0 ? fotos[0] : 'https://placehold.co/400x300';
            return `
            <div class="col-md-6 col-lg-3">
                <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style="cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'" onclick="openLihatGaleri(${idx})">
                    
                    <div class="bg-light position-relative" style="height: 200px;">
                        <img src="${cover}" class="w-100 h-100 p-3" style="object-fit:contain;">
                        <span class="badge bg-danger text-white position-absolute top-0 end-0 m-3 shadow-sm">
                            <i class="fas fa-camera me-1"></i> ${fotos.length}
                        </span>
                    </div>
                    
                    <div class="card-body text-center d-flex align-items-center justify-content-center">
                        <h6 class="card-title fw-bold text-dark mb-0">${g.title}</h6>
                    </div>
                    
                </div>
            </div>`;
        };

        // 4 Galeri Utama
        container.innerHTML = allGaleriData.slice(0, 4).map((g, idx) => createCard(g, idx)).join('');

        // Sisanya masuk ke collapse
        if (allGaleriData.length > 4 && listContainer) {
            listContainer.innerHTML = allGaleriData.slice(4).map((g, idx) => createCard(g, idx + 4)).join('');
        } else {
            document.querySelectorAll('[data-bs-target="#collapseGaleri"]').forEach(btn => btn.style.display = 'none');
        }
    } catch(e) { console.error("Gagal load galeri:", e); }
}

window.openLihatGaleri = function(index) {
    const data = allGaleriData[index];
    const fotos = JSON.parse(data.fotos || '[]');
    
    document.getElementById('modal-lihat-gal-title').innerText = data.title;
    
    // Looping gambar ke dalam wadah Justified CSS
    document.getElementById('modal-lihat-gal-grid').innerHTML = fotos.map(url => `
        <img src="${url}" alt="Foto Galeri">
    `).join('');
    
    new bootstrap.Modal(document.getElementById('galeriLihatModal')).show();
}

