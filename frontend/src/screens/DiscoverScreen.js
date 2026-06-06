import React, { useState, useEffect, useRef } from 'react';
import { ALTIN, HABERLER, HOCA_MAKALELERI, MKA_KATEGORILER } from '../data/v10Data';
import { Ico } from '../components/Icons';

// ═══════════════════════════════════════════════════════════════════════════
// KEŞFET EKRANI v11 — Akademi Feed'i
// Story sistemi (gerçek içerik) + 3 bölüm filtresi + Arkeoloji/Coğrafya içerikleri
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  parchment: 'var(--bg-1)', charcoal: 'var(--txt-1)', gold: 'var(--altin)',
  goldLight: 'var(--altin)', muted: 'var(--txt-3)',
  faint: 'var(--border)', surface: 'var(--bg-2)', darkCard: 'var(--bg-deep)',
};
const dmSans = "'DM Sans', sans-serif";
const playfair = "'Playfair Display', serif";

// ─── BÖLÜM RENKLERİ ───────────────────────────────────────────────────────
const BOLUM_META = {
  kvo:       { renk: '#C8A45A', gradient: 'linear-gradient(135deg, #C8A45A, #9E6B20)', etiket: 'KV Koruma' },
  arkeoloji: { renk: '#7B9E87', gradient: 'linear-gradient(135deg, #7B9E87, #3A6B4A)', etiket: 'Arkeoloji' },
  cografya:  { renk: '#2E86AB', gradient: 'linear-gradient(135deg, #2E86AB, #0A4A6B)', etiket: 'Coğrafya' },
  default:   { renk: '#8E6B4E', gradient: 'linear-gradient(135deg, #8E6B4E, #4A2A10)', etiket: '' },
};

// ─── YENİ MKA_STORILER (gerçek içerikli) ──────────────────────────────────
const MKA_STORILER_V2 = [
  {
    id: 's_kvo', emoji: '🏛️', label: 'KV Koruma', bolum: 'kvo',
    slides: [
      {
        tip: 'infografik', baslik: "Venedik Tüzüğü'nün 5 İlkesi",
        govde: ['Minimum müdahale', 'Geri dönüşümlülük', 'Ayırt edilebilirlik', 'Belgeleme', 'Özgünlük'],
        renk: '#8E6B4E', emoji: '📜', kaynak: 'ICOMOS 1964'
      },
      {
        tip: 'alan', baslik: 'Göreme Açık Hava Müzesi',
        govde: "UNESCO Dünya Mirası (1985). 10. yy. Bizans dönemi kaya kiliseleri. Aktif fresko bozulması devam ediyor.",
        gorsel_renk: 'linear-gradient(135deg, #3a1a0a, #8E6B4E)', emoji: '⛰️', kaynak: 'KVKK 2025'
      },
      {
        tip: 'akademik', baslik: 'Paraloid B-72 Uygulama Rehberi',
        govde: "Konsolidasyon amaçlı kullanılan akrilik polimer. %3–5 aseton solüsyonu, yüzeye fırça veya sprey ile uygulanır. Tam geri dönüşlü.",
        hoca: 'Prof. Dr. Ali Akın Akyol', dergi: 'Journal of Cultural Heritage',
        renk: '#7B9E87', emoji: '⚗️', kaynak: 'JCH 2025'
      },
    ]
  },
  {
    id: 's_ark', emoji: '⛏️', label: 'Arkeoloji', bolum: 'arkeoloji',
    slides: [
      {
        tip: 'haber', baslik: 'Çatalhöyük 2025 Kazı Sezonu Başladı',
        govde: "İngiliz-Türk ortak ekibi, Güney Alanı'nda Neolitik depolar buluyor. C-14 tarihlendirmesi: MÖ 7500–5700.",
        renk: '#7B9E87', emoji: '🏺', kaynak: 'Arkeoloji Haber · Mayıs 2025'
      },
      {
        tip: 'infografik', baslik: "Türkiye'nin UNESCO Alan Sayısı",
        govde: ['21 Alan (2026)', "19'u Kültürel", "2'si Karma", 'En yenisi: Diyarbakır (2015)'],
        renk: '#2E86AB', emoji: '🌍', kaynak: 'UNESCO WHC 2026'
      },
      {
        tip: 'alan', baslik: 'Göbekli Tepe — Tarihöncesi Tapınak',
        govde: "MÖ ~10.000. Tarım öncesi döneme ait bilinen en eski anıtsal yapı. 2018 UNESCO tescili. Almanya-Türkiye ortak kazısı.",
        gorsel_renk: 'linear-gradient(135deg, #1a0a00, #6B4A20)', emoji: '🗿', kaynak: 'DAI 2025'
      },
    ]
  },
  {
    id: 's_cog', emoji: '🗺️', label: 'Coğrafya', bolum: 'cografya',
    slides: [
      {
        tip: 'alan', baslik: 'Kapadokya Volkanik Tüf Oluşumu',
        govde: "Erciyes, Hasan ve Güllü Dağı volkanlarından yayılan tüf tabakaları kaya kiliselerinin doğal ortamını oluşturur. Tüf, işlemesi kolay ama suya karşı hassas bir kayaçtır.",
        gorsel_renk: 'linear-gradient(135deg, #2a1a0a, #B35C3E)', emoji: '🌋', kaynak: 'Jeoloji Dergisi 2024'
      },
      {
        tip: 'infografik', baslik: "Türkiye'de Sit Alanı Dağılımı",
        govde: ['I. Derece: 12.450 alan', 'II. Derece: 8.320 alan', 'III. Derece: 4.190 alan', 'Kentsel Sit: 612 alan'],
        renk: '#C8A45A', emoji: '📍', kaynak: 'Kültür Bakanlığı 2025'
      },
      {
        tip: 'haber', baslik: "İklim Değişikliği Peri Bacalarını Tehdit Ediyor",
        govde: "20 yıllık gözlem: yıllık tüf kaybı %12 arttı. Don-çözülme döngüsündeki değişim en kritik etken. Acil koruma planları hazırlanıyor.",
        renk: '#2E86AB', emoji: '🌡️', kaynak: 'Quaternary Int. 2025'
      },
    ]
  },
  {
    id: 's_kimya', emoji: '⚗️', label: 'Kimya', bolum: 'kvo',
    slides: [
      {
        tip: 'infografik', baslik: 'Paraloid Ailesi Karşılaştırması',
        govde: ['B-72: Konsolidasyon/yüzey (aseton)', 'B-48N: Yapıştırma/seramik (toluen)', 'B-67: Ahşap konsolidasyonu (etanol)', 'Hepsi geri dönüşlü akrilik'],
        renk: '#7B9E87', emoji: '🧪', kaynak: 'KChem Lab 2025'
      },
      {
        tip: 'akademik', baslik: 'XRF vs XRD: Doğru Analizi Seç',
        govde: "XRF → Hangi elementler? (Fe, Cu, Pb) Tahribatsız, hızlı. XRD → Hangi mineraller? (hematit, kuvars) Kristalin faz analizi.",
        hoca: 'Prof. Dr. Ali Akın Akyol', dergi: 'Archaeometry',
        renk: '#5A7A9E', emoji: '🔬', kaynak: 'Lab Rehberi 2024'
      },
    ]
  },
  {
    id: 's_mevzuat', emoji: '📜', label: 'Mevzuat', bolum: 'kvo',
    slides: [
      {
        tip: 'haber', baslik: '2863 Sayılı Kanun Değişikliği',
        govde: "Kültür ve Turizm Bakanlığı, 1. derece arkeolojik sit alanlarında inşaat izin sürecini Mayıs 2025'te yeniden düzenledi. Temel değişiklik: izin süresi 60 günden 30 güne indi.",
        renk: '#C8A45A', emoji: '⚖️', kaynak: 'Resmi Gazete 2025'
      },
      {
        tip: 'infografik', baslik: 'Sit Alanı Dereceleri',
        govde: ['I. Derece: Kesin korunacak', 'II. Derece: Kontrollü kullanım', 'III. Derece: Koruma altında geliştirilebilir', 'Kentsel Sit: Özel planlama'],
        renk: '#B35C3E', emoji: '📐', kaynak: 'KVKK Mevzuat 2025'
      },
    ]
  },
  {
    id: 's_metal', emoji: '🔬', label: 'Metal', bolum: 'kvo',
    slides: [
      {
        tip: 'infografik', baslik: 'Bronz Hastalığı Döngüsü',
        govde: ['CuCl + nem → aktif korozyon', 'BTA inhibitörü uygula', '%35 RH altı depolama', 'SEM-EDX ile takip et'],
        renk: '#5A7A9E', emoji: '🔬', kaynak: 'Studies in Conservation 2024'
      },
    ]
  },
  {
    id: 's_fresko', emoji: '🎨', label: 'Fresko', bolum: 'kvo',
    slides: [
      {
        tip: 'infografik', baslik: 'Fresko vs Secco',
        govde: ['Fresko: Yaş sıva + mineral pigment', 'Secco: Kuru sıva + organik bağlayıcı', 'Fresko: Kimyasal bütünleşme → dayanıklı', 'Secco: Mekanik tutunma → kırılgan'],
        renk: '#B35C3E', emoji: '🎨', kaynak: 'Bizans Çalışmaları 2024'
      },
      {
        tip: 'alan', baslik: 'Kapadokya Kaya Kilisesi Freskoları',
        govde: "Göreme Milli Parkı'nda 10. yy. Bizans freskoları. Aktif nem bozulması. Paraloid B-72 ile konsolidasyon çalışmaları devam ediyor.",
        gorsel_renk: 'linear-gradient(135deg, #2a0a0a, #B35C3E)', emoji: '🕍', kaynak: 'KVKK 2025'
      },
    ]
  },
  {
    id: 's_analiz', emoji: '🔭', label: 'Analiz', bolum: 'kvo',
    slides: [
      {
        tip: 'akademik', baslik: 'Tahribatsız Analiz Yöntemleri',
        govde: "XRF (element analizi), XRD (mineral faz), FTIR (organik bileşen), Raman spektroskopisi. Tümü esere zarar vermez.",
        hoca: 'Prof. Dr. Ali Akın Akyol', dergi: 'Journal of Cultural Heritage',
        renk: '#8E6B4E', emoji: '📡', kaynak: 'JCH 2025'
      },
    ]
  },
];

// ─── BÖLÜM FİLTRE ─────────────────────────────────────────────────────────
const BOLUM_FILTRE = [
  { id: 'hepsi',     emoji: '✦',  label: 'Tümü'      },
  { id: 'kvo',       emoji: '🏛️', label: 'KV Koruma' },
  { id: 'arkeoloji', emoji: '⛏️', label: 'Arkeoloji' },
  { id: 'cografya',  emoji: '🗺️', label: 'Coğrafya'  },
];

// ─── STORY GÖRÜNTÜLEYİCİ ──────────────────────────────────────────────────
function StoryGoruntuleyici({ story, onKapat, onAiSor }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [ilerleme, setIlerleme] = useState(0);
  const timerRef = useRef(null);
  const SURE = 4000; // 4 saniye

  const slide = story.slides[slideIdx];
  const bolumMeta = BOLUM_META[story.bolum] || BOLUM_META.default;

  useEffect(() => {
    setIlerleme(0);
    const baslangic = Date.now();
    timerRef.current = setInterval(() => {
      const gecen = Date.now() - baslangic;
      const pct = Math.min((gecen / SURE) * 100, 100);
      setIlerleme(pct);
      if (gecen >= SURE) {
        clearInterval(timerRef.current);
        if (slideIdx < story.slides.length - 1) {
          setSlideIdx(i => i + 1);
        } else {
          onKapat();
        }
      }
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [slideIdx]); // eslint-disable-line

  const onceki = () => {
    clearInterval(timerRef.current);
    if (slideIdx > 0) setSlideIdx(i => i - 1);
    else onKapat();
  };

  const sonraki = () => {
    clearInterval(timerRef.current);
    if (slideIdx < story.slides.length - 1) setSlideIdx(i => i + 1);
    else onKapat();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0A0604',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* İlerleme çubukları */}
      <div style={{ display: 'flex', gap: 4, padding: '50px 12px 8px', flexShrink: 0 }}>
        {story.slides.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 1,
              background: '#FFF',
              width: i < slideIdx ? '100%' : i === slideIdx ? `${ilerleme}%` : '0%',
              transition: i === slideIdx ? 'none' : 'width 0.1s',
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 14px', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: bolumMeta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '2px solid rgba(255,255,255,0.3)' }}>
          {story.emoji}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', fontFamily: dmSans }}>{story.label}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: dmSans }}>{slide.kaynak}</div>
        </div>
        <button onClick={onKapat} style={{
          marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none',
          borderRadius: '50%', width: 30, height: 30, fontSize: 14, color: '#FFF',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* İçerik */}
      <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {slide.tip === 'infografik' && (
          <div style={{ background: slide.renk + '22', border: `1px solid ${slide.renk}55`, borderRadius: 20, padding: '24px 20px' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>{slide.emoji}</div>
            <div style={{ fontFamily: playfair, fontSize: 18, fontWeight: 700, color: '#FFF', textAlign: 'center', marginBottom: 20, lineHeight: 1.3 }}>{slide.baslik}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(slide.govde || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: slide.renk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFF', flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontFamily: dmSans, fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {slide.tip === 'haber' && (
          <div style={{ background: slide.renk + '18', border: `1px solid ${slide.renk}44`, borderRadius: 20, padding: '28px 20px' }}>
            <span style={{ fontSize: 32 }}>{slide.emoji}</span>
            <div style={{ fontFamily: playfair, fontSize: 20, fontWeight: 800, color: '#FFF', margin: '12px 0 16px', lineHeight: 1.3 }}>{slide.baslik}</div>
            <div style={{ fontFamily: dmSans, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>{slide.govde}</div>
            <div style={{ marginTop: 16, display: 'inline-block', background: slide.renk + '33', border: `1px solid ${slide.renk}55`, borderRadius: 20, padding: '4px 12px', fontSize: 10, color: slide.renk, fontWeight: 700, fontFamily: dmSans }}>
              {slide.kaynak}
            </div>
          </div>
        )}

        {slide.tip === 'alan' && (
          <div style={{ background: slide.gorsel_renk || 'linear-gradient(135deg, #1a0a00, #4A2A10)', borderRadius: 20, padding: '32px 20px', minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{slide.emoji}</div>
            <div style={{ fontFamily: playfair, fontSize: 20, fontWeight: 800, color: '#FFF', marginBottom: 12, lineHeight: 1.3 }}>{slide.baslik}</div>
            <div style={{ fontFamily: dmSans, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>{slide.govde}</div>
          </div>
        )}

        {slide.tip === 'akademik' && (
          <div style={{ background: 'rgba(250,247,242,0.05)', border: '1px solid rgba(250,247,242,0.12)', borderRadius: 20, padding: '24px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{slide.emoji}</div>
            <div style={{ fontFamily: playfair, fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 14, lineHeight: 1.35 }}>{slide.baslik}</div>
            <div style={{ fontFamily: dmSans, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, marginBottom: 16 }}>{slide.govde}</div>
            {slide.hoca && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: ALTIN + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: ALTIN, fontWeight: 700, fontFamily: dmSans }}>
                  {slide.hoca.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: ALTIN, fontFamily: dmSans }}>{slide.hoca}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: dmSans }}>{slide.dergi}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alt butonlar */}
      <div style={{ padding: '16px', flexShrink: 0, display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '11px', fontFamily: dmSans, fontSize: 12, color: '#FFF', cursor: 'pointer' }}>
          🔖 Kaydet
        </button>
        <button onClick={() => { onAiSor && onAiSor(slide.baslik); onKapat(); }}
          style={{ flex: 1, background: ALTIN + '22', border: `1px solid ${ALTIN}55`, borderRadius: 12, padding: '11px', fontFamily: dmSans, fontSize: 12, color: ALTIN, cursor: 'pointer', fontWeight: 600 }}>
          🤖 AI'ya Sor
        </button>
      </div>

      {/* Tıklama alanları */}
      <div style={{ position: 'absolute', top: 80, bottom: 100, left: 0, width: '40%' }} onClick={onceki} />
      <div style={{ position: 'absolute', top: 80, bottom: 100, right: 0, width: '40%' }} onClick={sonraki} />
    </div>
  );
}

// ─── STORY HALKALARI ──────────────────────────────────────────────────────
function StoryRings({ onStoryAc }) {
  const [gorulen, setGorulen] = useState({});

  return (
    <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px 10px', marginBottom: 4 }} className="scrollbar-hide">
      {MKA_STORILER_V2.map(st => {
        const goruld = gorulen[st.id];
        const bolumMeta = BOLUM_META[st.bolum] || BOLUM_META.default;
        return (
          <div key={st.id} onClick={() => { setGorulen(s => ({ ...s, [st.id]: true })); onStoryAc(st); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, width: 58, cursor: 'pointer' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', padding: 2.5,
              background: goruld ? 'rgba(154,135,110,0.3)' : bolumMeta.gradient,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '2px solid var(--bg-0)' }}>
                {st.emoji}
              </div>
            </div>
            <span style={{ fontSize: 9, color: '#7A6A5A', textAlign: 'center', lineHeight: 1.2, maxWidth: 54, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontFamily: dmSans }}>
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── İNFOGRAFİK KART ──────────────────────────────────────────────────────
function InfographicCard() {
  return (
    <div style={{ margin: '0 16px 12px', background: 'linear-gradient(135deg, #1A0E06, #2A1608)', borderRadius: 14, border: `1px solid ${ALTIN}33`, padding: '14px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', color: '#EDD89A', marginBottom: 3 }}>İstatistik · UNESCO 2026</div>
      <div style={{ fontFamily: playfair, fontSize: 13, color: C.parchment, lineHeight: 1.3, marginBottom: 11 }}>Türkiye Dünya Mirası: Koruma Durumu</div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
        {[['21', 'UNESCO Listesi'], ['% 34', 'İklim Riski'], ['2.4K', 'Korumacı']].map(([n, l]) => (
          <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 9, padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontFamily: playfair, fontSize: 18, color: ALTIN, lineHeight: 1, marginBottom: 3 }}>{n}</div>
            <div style={{ fontSize: 9, color: 'rgba(250,247,242,0.55)', lineHeight: 1.3, fontFamily: dmSans }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[['Kültürel Alan', '19', '#7B9E87'], ['Karma Alan', '2', '#C8A45A'], ['Risk Altında', '3', '#B35C3E']].map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: dmSans, fontSize: 10, color: 'rgba(250,247,242,0.6)', flex: 1 }}>{l}</span>
            <div style={{ flex: 2, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${(parseInt(v) / 21) * 100}%`, height: '100%', background: c, borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: dmSans, fontSize: 10, color: c, fontWeight: 700, minWidth: 16, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── İÇERİK KARTI ─────────────────────────────────────────────────────────
function IcerikKarti({ icerik }) {
  const bolumMeta = BOLUM_META[icerik.bolum] || BOLUM_META.default;
  const solRenk = bolumMeta.renk;
  return (
    <div style={{
      background: 'var(--bg-1)', borderRadius: 12, overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: '0 2px 8px var(--shadow)',
      borderLeft: `3px solid ${solRenk}`,
      marginBottom: 10,
    }}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: icerik.gorselRenk || `linear-gradient(135deg, ${solRenk}22, ${solRenk}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {icerik.emoji || '📄'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Bölüm + Kaynak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {icerik.bolum && (
                <span style={{ fontSize: 8, fontWeight: 700, color: solRenk, background: solRenk + '18', borderRadius: 4, padding: '1px 5px', fontFamily: dmSans, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {bolumMeta.etiket || icerik.bolum}
                </span>
              )}
              <span style={{ fontSize: 9, color: C.muted, fontFamily: dmSans }}>{icerik.kaynak || icerik.dergi || icerik.tarih || ''}</span>
            </div>
            <h4 style={{ fontFamily: playfair, fontSize: 13, fontWeight: 700, color: C.charcoal, lineHeight: 1.35, margin: '0 0 5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {icerik.baslik}
            </h4>
            <p style={{ fontFamily: dmSans, fontSize: 11, color: C.muted, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {icerik.ozet || icerik.govde}
            </p>
          </div>
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(28,20,16,0.06)' }}>
          {icerik.hoca && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: icerik.avatarRenk || solRenk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#FFF', fontWeight: 700 }}>
                {icerik.avatar || (icerik.hoca[0])}
              </div>
              <span style={{ fontFamily: dmSans, fontSize: 9, color: C.muted }}>{icerik.hoca}</span>
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {icerik.okumaSuresi && <span style={{ fontFamily: dmSans, fontSize: 9, color: C.muted }}>⏱ {icerik.okumaSuresi}</span>}
            {icerik.begeni && <span style={{ fontFamily: dmSans, fontSize: 9, color: ALTIN, fontWeight: 600 }}>♥ {icerik.begeni}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ANA EKRAN ─────────────────────────────────────────────────────────────
export default function DiscoverScreen({ t }) {
  const [aktivSekme, setAktivSekme] = useState('feed');
  const [bolumFiltre, setBolumFiltre] = useState('hepsi');
  const [kategoriFiltre, setKategoriFiltre] = useState('hepsi');
  const [aktifStory, setAktifStory] = useState(null);

  // Tüm içerik: makaleler + haberler (bolum alanı eklendi)
  const TUM_ICERIK = [
    ...HOCA_MAKALELERI.map(m => ({ ...m, tur: 'makale', kategori: m.kategori })),
    ...HABERLER.map(h => ({ ...h, tur: 'haber', bolum: h.kategori === 'Arkeoloji' ? 'arkeoloji' : h.kategori === 'Coğrafya' ? 'cografya' : 'kvo' })),
  ];

  const filtreli = TUM_ICERIK.filter(ic => {
    const bolumOk = bolumFiltre === 'hepsi' || ic.bolum === bolumFiltre;
    const katOk = kategoriFiltre === 'hepsi' || ic.tur === kategoriFiltre || ic.kategori === kategoriFiltre;
    return bolumOk && katOk;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)' }}>
      {/* Story görüntüleyici */}
      {aktifStory && (
        <StoryGoruntuleyici
          story={aktifStory}
          onKapat={() => setAktifStory(null)}
          onAiSor={(konu) => console.log('AI soru:', konu)}
        />
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, #1A0E06, #3A1F0C)`, border: `1px solid ${ALTIN}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🏛️
          </div>
          <div>
            <h2 style={{ margin: 0, fontFamily: playfair, fontSize: 16, fontWeight: 800, color: 'var(--txt-1)' }}>{t ? t('kesif_baslik') : "Akademi Feed'i"}</h2>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--txt-3)', fontFamily: dmSans }}>Keşfet · KV Koruma · Arkeoloji · Coğrafya</p>
          </div>
        </div>
      </div>

      {/* Ana sekme (Feed/Harita/Kategoriler) */}
      <div style={{ display: 'flex', gap: 0, margin: '0 16px 0', borderRadius: 12, background: C.faint, padding: 2, flexShrink: 0 }}>
        {[{ id: 'feed', emoji: '📰', label: 'Feed' }, { id: 'harita', emoji: '🗺️', label: 'Harita' }, { id: 'kategoriler', emoji: '📚', label: 'Kategoriler' }].map(tab => (
          <button key={tab.id} onClick={() => setAktivSekme(tab.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
            background: aktivSekme === tab.id ? 'var(--bg-1)' : 'transparent',
            boxShadow: aktivSekme === tab.id ? '0 1px 4px var(--shadow)' : 'none',
            cursor: 'pointer', fontFamily: dmSans, fontSize: 11,
            fontWeight: aktivSekme === tab.id ? 700 : 400,
            color: aktivSekme === tab.id ? 'var(--txt-1)' : 'var(--txt-3)',
            transition: 'all 0.15s',
          }}>
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }} className="scrollbar-hide">
        {/* ── FEED SEKMESİ ── */}
        {aktivSekme === 'feed' && (
          <>
            {/* Story halkaları */}
            <StoryRings onStoryAc={setAktifStory} />

            {/* İnfografik kart */}
            <InfographicCard />

            {/* Bölüm filtre tab */}
            <div style={{ overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0, marginBottom: 6 }} className="scrollbar-hide">
              <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px' }}>
                {BOLUM_FILTRE.map(bf => (
                  <button key={bf.id} onClick={() => setBolumFiltre(bf.id)} style={{
                    fontFamily: dmSans, fontSize: 11, fontWeight: bolumFiltre === bf.id ? 700 : 400,
                    background: bolumFiltre === bf.id ? 'var(--txt-1)' : 'transparent',
                    border: `0.5px solid ${bolumFiltre === bf.id ? 'var(--txt-1)' : 'var(--border)'}`,
                    borderRadius: '999px', padding: '5px 12px', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                    color: bolumFiltre === bf.id ? 'var(--bg-1)' : 'var(--txt-1)'
                  }}>
                    {bf.emoji} {bf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kategori filtre */}
            <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 8 }} className="scrollbar-hide">
              <div style={{ display: 'flex', gap: 5, padding: '0 16px' }}>
                {MKA_KATEGORILER.slice(0, 7).map(k => (
                  <button key={k.id} onClick={() => setKategoriFiltre(k.id)} style={{
                    fontFamily: dmSans, fontSize: 10, fontWeight: kategoriFiltre === k.id ? 700 : 400,
                    color: kategoriFiltre === k.id ? '#FFF' : C.muted,
                    background: kategoriFiltre === k.id ? ALTIN : 'transparent',
                    border: `0.5px solid ${kategoriFiltre === k.id ? ALTIN : C.faint}`,
                    borderRadius: '999px', padding: '4px 10px', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
                  }}>
                    {k.emoji} {k.label}
                  </button>
                ))}
              </div>
            </div>

            {/* İçerik listesi */}
            <div style={{ padding: '0 16px 16px' }}>
              {filtreli.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontFamily: dmSans, fontSize: 12 }}>
                  Bu filtreye uygun içerik bulunamadı.
                </div>
              ) : (
                filtreli.map(ic => <IcerikKarti key={ic.id} icerik={ic} />)
              )}
            </div>
          </>
        )}

        {/* ── HARİTA SEKMESİ ── */}
        {aktivSekme === 'harita' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: '#E8E0D0', borderRadius: 16, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, border: '1px solid rgba(28,20,16,0.1)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #D4C4A8 0%, #C4B090 100%)' }}>
                {[
                  { name: 'Göbekli Tepe', x: '68%', y: '50%', renk: ALTIN },
                  { name: 'Efes', x: '22%', y: '58%', renk: '#4A90B8' },
                  { name: 'Çatalhöyük', x: '48%', y: '56%', renk: '#7B9E87' },
                  { name: 'Troya', x: '18%', y: '40%', renk: '#C45E8A' },
                  { name: 'Nemrut', x: '72%', y: '44%', renk: '#8B6F4A' },
                ].map(p => (
                  <div key={p.name} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.renk, border: '2px solid #FFF', boxShadow: `0 0 6px ${p.renk}66` }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(28,20,16,0.4)', fontFamily: dmSans, zIndex: 1, textAlign: 'center' }}>
                🗺️ Türkiye UNESCO Alanları
              </div>
            </div>
            {[
              { name: 'Göbekli Tepe', renk: ALTIN, tip: 'UNESCO' },
              { name: 'Efes', renk: '#4A90B8', tip: 'UNESCO' },
              { name: 'Çatalhöyük', renk: '#7B9E87', tip: 'Arkeoloji' },
              { name: 'Troya', renk: '#C45E8A', tip: 'UNESCO' },
              { name: 'Nemrut Dağı', renk: '#8B6F4A', tip: 'UNESCO' },
            ].map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(28,20,16,0.06)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.renk, flexShrink: 0 }} />
                <span style={{ fontFamily: playfair, fontSize: 13, color: C.charcoal, flex: 1 }}>{p.name}</span>
                <span style={{ fontFamily: dmSans, fontSize: 9, color: p.renk, background: p.renk + '18', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{p.tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── KATEGORİLER SEKMESİ ── */}
        {aktivSekme === 'kategoriler' && (
          <div style={{ padding: '0 16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'KV Koruma', emoji: '🏛️', count: '5', renk: ALTIN },
                { label: 'Arkeoloji', emoji: '⛏️', count: '3', renk: '#7B9E87' },
                { label: 'Coğrafya', emoji: '🗺️', count: '2', renk: '#2E86AB' },
                { label: 'Mevzuat', emoji: '📜', count: '2', renk: '#B35C3E' },
                { label: 'Teknoloji', emoji: '🤖', count: '1', renk: '#5A7A9E' },
                { label: 'Kimya', emoji: '⚗️', count: '2', renk: '#8E6B4E' },
              ].map(k => (
                <div key={k.label} onClick={() => { setAktivSekme('feed'); setBolumFiltre('hepsi'); }}
                  style={{ background: k.renk + '12', border: `1px solid ${k.renk}33`, borderRadius: 14, padding: '14px', cursor: 'pointer' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{k.emoji}</div>
                  <div style={{ fontFamily: playfair, fontSize: 13, fontWeight: 700, color: C.charcoal, marginBottom: 3 }}>{k.label}</div>
                  <div style={{ fontFamily: dmSans, fontSize: 10, color: k.renk, fontWeight: 600 }}>{k.count} içerik</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
