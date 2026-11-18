import { FilterOption, FramePatternOption, GalleryStrip, PhotoTemplate, SessionSettings } from '../types/photobooth';
import { formatPhotoboothTimestamp } from '../utils/photobooth';

export const SAMPLE_CANDID_PHOTOS = [
  '/assets/images/hero_booth_highangle_1794656995608.jpg', // 0 - wide-angle periwinkle booth couple
  '/assets/images/hero_booth_cinema_1794656996528.jpg', // 1 - navy curtain cinema popcorn couple
  '/assets/images/hero_booth_earphones_1794656997315.jpg', // 2 - studio backdrop sweet couple earphones
  '/assets/images/pb_navy_besties_single_1794582019710.jpg', // 3 - Indonesian besties hijab & curly hair peace sign
  '/assets/images/pb_peach_finger_heart_1794581981048.jpg', // 4 - Peach booth Indonesian girl two-hand heart
  '/assets/images/pb_skyblue_squad_silly_1794581981010.jpg', // 5 - Sky blue booth 4 friends silly faces
  '/assets/images/pb_lilac_couple_single_1794582020006.jpg', // 6 - Lilac wall Indonesian couple wink
  '/assets/images/booth_romantic_couple_1794579654630.jpg', // 7 - Blush curtain couple with pink roses
  '/assets/images/pb_butter_headband_duo_1794581983690.jpg', // 8 - Butter yellow booth plush headbands duo
  '/assets/images/pb_mint_remote_solo_1794581983356.jpg', // 9 - Mint booth denim guy shutter remote solo
  '/assets/images/pb_burgundy_sunglasses_1794581983907.jpg', // 10 - Burgundy velvet curtain amber sunglasses couple
  '/assets/images/booth_vintage_duo_1794579654187.jpg', // 11 - Maroon curtain laughing duo
  '/assets/images/pb_bw_booth_laugh_1794581984797.jpg', // 12 - Charcoal B&W laughing besties
  '/assets/images/pb_silver_tinsel_night_1794581985636.jpg', // 13 - Silver tinsel curtain Y2K duo
  '/assets/images/booth_y2k_pop_1794579654989.jpg', // 14 - Blue wall Y2K trio oval sunglasses
  '/assets/images/pb_pink_cheeks_single_1794582019437.jpg', // 15 - Baby pink booth cheek-cupping duo
  '/assets/images/pb_lavender_confetti_trio_1794581986686.jpg', // 16 - Lavender booth hijab trio confetti
  '/assets/images/pb_spooky_closeup_single_1794582021228.jpg', // 17 - Plum curtain Halloween pumpkin glasses duo
  '/assets/images/booth_solo_editorial_1794579655488.jpg', // 18 - Cream self-studio shutter remote solo
  '/assets/images/pb_sage_grad_besties_1794581988931.jpg', // 19 - Sage green booth Indonesian graduates trio
  '/assets/images/pb_cobalt_highangle_duo_1794581988297.jpg', // 20 - Cobalt corner high-angle 0.5x duo
  '/assets/images/pb_silver_star_mirror_1794581994963.jpg' // 21 - Gray curtain star clips & headphones duo
];

export const PHOTO_TEMPLATES: PhotoTemplate[] = [
  {
    id: 'snap-express-4',
    name: 'Snap Express Ticket',
    shots: 4,
    type: '4-cut',
    category: 'ticket',
    ratioLabel: 'Rasio 2:6 (Tiket VIP)',
    description: 'Tiket ekspres edisi spesial dengan garis chevron pos, stempel verified & barcode #TK-9284.',
    badge: 'Edisi Spesial',
    badgeColor: 'bg-red-100 text-red-900',
    defaultBg: 'bg-surface-container-lowest',
    defaultPattern: 'snap-express',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[0],
      SAMPLE_CANDID_PHOTOS[1],
      SAMPLE_CANDID_PHOTOS[2],
      SAMPLE_CANDID_PHOTOS[3]
    ]
  },
  {
    id: 'airmail-vintage-3',
    name: 'Airmail Postcard 3-Cut',
    shots: 3,
    type: '3-cut',
    category: 'vintage',
    ratioLabel: 'Rasio 1:3 (Amplop Pos)',
    description: 'Border diagonal biru-merah aerogramme, stempel pos Par Avion, dan pita hitam estetik.',
    badge: 'Pinterest Hit',
    badgeColor: 'bg-blue-100 text-blue-900',
    defaultBg: 'bg-surface-container-lowest',
    defaultPattern: 'airmail',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[4],
      SAMPLE_CANDID_PHOTOS[8],
      SAMPLE_CANDID_PHOTOS[9]
    ]
  },
  {
    id: 'love-blooming-3',
    name: 'Love is Blooming',
    shots: 3,
    type: '3-cut',
    category: 'romantic',
    ratioLabel: 'Rasio 1:3 (Floral Love)',
    description: 'Bingkai romantis bernuansa kelopak bunga mawar & blush lembut untuk momen spesial berdua.',
    badge: 'Romantic',
    badgeColor: 'bg-rose-100 text-rose-900',
    defaultBg: 'bg-strawberry',
    defaultPattern: 'love-blooming',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[7],
      SAMPLE_CANDID_PHOTOS[15],
      SAMPLE_CANDID_PHOTOS[16]
    ]
  },
  {
    id: 'cinema-ticket-4',
    name: 'Theater Show Ticket',
    shots: 4,
    type: '4-cut',
    category: 'ticket',
    ratioLabel: 'Rasio 2:6 (Karcis Bioskop)',
    description: 'Lekukan tiket film klasik Row B2 Show 02, marun mewah, dan stempel karcis bioskop.',
    badge: 'Viral Stub',
    badgeColor: 'bg-rose-100 text-rose-900',
    defaultBg: 'bg-cherry',
    defaultPattern: 'cinema-ticket',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[10],
      SAMPLE_CANDID_PHOTOS[11],
      SAMPLE_CANDID_PHOTOS[12],
      SAMPLE_CANDID_PHOTOS[13]
    ]
  },
  {
    id: 'y2k-comic-blue-3',
    name: 'Y2K Sparkle Pop 3-Cut',
    shots: 3,
    type: '3-cut',
    category: 'y2k',
    ratioLabel: 'Rasio 1:3 (Cobalt Wave)',
    description: 'Ombak biru elektrik, stiker kartun kelinci, pixel stars, speech bubble & retro sticker tags.',
    badge: 'Y2K Pop',
    badgeColor: 'bg-blue-600 text-white',
    defaultBg: 'bg-secondary-container',
    defaultPattern: 'y2k-comic-blue',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[14],
      SAMPLE_CANDID_PHOTOS[20],
      SAMPLE_CANDID_PHOTOS[21]
    ]
  },
  {
    id: 'spooky-night-4',
    name: 'Spooky Night Halloween',
    shots: 4,
    type: '4-cut',
    category: 'seasonal',
    ratioLabel: 'Rasio 2:6 (Edisi Halloween)',
    description: 'Tema malam Halloween ceria dengan ikon labu, hantu imut, bintang ungu & bingkai gelap misterius.',
    badge: 'Seasonal',
    badgeColor: 'bg-amber-100 text-amber-900',
    defaultBg: 'bg-darkplum',
    defaultPattern: 'spooky-night',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[17],
      SAMPLE_CANDID_PHOTOS[5],
      SAMPLE_CANDID_PHOTOS[6],
      SAMPLE_CANDID_PHOTOS[19]
    ]
  },
  {
    id: 'navy-4-cut',
    name: 'Minimalist Navy 4-Cut',
    shots: 4,
    type: '4-cut',
    category: 'film',
    ratioLabel: 'Rasio 2:6 (Vertikal)',
    description: '4 frame vertikal bersih dengan nuansa deep navy modern khas Swiss graphic.',
    badge: 'Paling Populer',
    badgeColor: 'bg-secondary-container text-on-secondary-container',
    defaultBg: 'bg-primary-container',
    defaultPattern: 'none',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[18],
      SAMPLE_CANDID_PHOTOS[3],
      SAMPLE_CANDID_PHOTOS[9],
      SAMPLE_CANDID_PHOTOS[12]
    ]
  },
  {
    id: 'pastel-dream-3',
    name: 'Pastel Dream 3-Cut',
    shots: 3,
    type: '3-cut',
    category: 'y2k',
    ratioLabel: 'Rasio 1:3 (Klasik)',
    description: '3 frame square lebar bernuansa lavender dan aksen bintang playful.',
    badge: 'Playful Pastel',
    badgeColor: 'bg-tertiary-fixed text-primary-container',
    defaultBg: 'bg-tertiary-fixed',
    defaultPattern: 'stars',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[16],
      SAMPLE_CANDID_PHOTOS[15],
      SAMPLE_CANDID_PHOTOS[21]
    ]
  },
  {
    id: 'film-noir-duo',
    name: 'Film Noir Duo',
    shots: 2,
    type: 'polaroid',
    category: 'film',
    ratioLabel: 'Rasio 3:4 (Analog)',
    description: '2 frame lebar moody monokrom dengan date stamp dan grain 35mm film.',
    badge: 'Analog Grain',
    badgeColor: 'bg-inverse-surface text-inverse-on-surface',
    defaultBg: 'bg-primary',
    defaultPattern: 'film-sprocket',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[12],
      SAMPLE_CANDID_PHOTOS[11]
    ]
  },
  {
    id: 'collage-grid-4',
    name: 'Collage Grid 4',
    shots: 4,
    type: 'grid',
    category: 'y2k',
    ratioLabel: 'Rasio 1:1 (Square Grid)',
    description: 'Grid 2x2 seimbang dengan jarak presisi, cocok untuk feed & selebrasi bareng.',
    badge: 'Swiss Clean',
    badgeColor: 'bg-secondary-fixed text-primary',
    defaultBg: 'bg-surface-container-high',
    defaultPattern: 'none',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[19],
      SAMPLE_CANDID_PHOTOS[16],
      SAMPLE_CANDID_PHOTOS[5],
      SAMPLE_CANDID_PHOTOS[8]
    ]
  },
  {
    id: 'y2k-pastel-duo',
    name: 'Y2K Pastel Duo',
    shots: 2,
    type: 'polaroid',
    category: 'y2k',
    ratioLabel: 'Rasio 1:1 (Wide)',
    description: 'Format polaroid lebar dengan dekorasi stiker Y2K dan glow estetik.',
    badge: 'Baru',
    badgeColor: 'bg-tertiary-fixed text-primary-container',
    defaultBg: 'bg-tertiary-fixed',
    defaultPattern: 'gradient-aurora',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[15],
      SAMPLE_CANDID_PHOTOS[14]
    ]
  },
  {
    id: 'retro-film-3',
    name: 'Retro Film 3-Cut',
    shots: 3,
    type: '3-cut',
    category: 'vintage',
    ratioLabel: 'Rasio 4:5 (Vintage)',
    description: 'Aksen analog hangat dengan date-stamp klasik ala kamera film.',
    badge: 'Retro',
    badgeColor: 'bg-secondary-fixed text-primary',
    defaultBg: 'bg-butter',
    defaultPattern: 'vintage-kraft',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[8],
      SAMPLE_CANDID_PHOTOS[4],
      SAMPLE_CANDID_PHOTOS[13]
    ]
  },
  {
    id: 'wide-polaroid-1',
    name: 'Solo Classic Polaroid',
    shots: 1,
    type: 'polaroid',
    category: 'vintage',
    ratioLabel: 'Rasio 1:1 (Single Frame)',
    description: 'Polaroid tunggal ikonik dengan frame kertas luas di bawah untuk tanda tangan & pesan.',
    badge: 'Solo Iconic',
    badgeColor: 'bg-surface-container-lowest text-primary',
    defaultBg: 'bg-surface-container-lowest',
    defaultPattern: 'polaroid-ribbon',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[9]
    ]
  },
  {
    id: 'cinema-strip-6',
    name: 'Cinematic Story 6-Cut',
    shots: 6,
    type: '6-cut',
    category: 'film',
    ratioLabel: 'Rasio 1:4 (Roll Film)',
    description: '6 jepretan sinematik vertikal bagaikan klise roll film bioskop 35mm penuh ekspresi.',
    badge: 'Story Roll',
    badgeColor: 'bg-primary text-white',
    defaultBg: 'bg-primary',
    defaultPattern: 'film-sprocket',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[20],
      SAMPLE_CANDID_PHOTOS[10],
      SAMPLE_CANDID_PHOTOS[13],
      SAMPLE_CANDID_PHOTOS[12],
      SAMPLE_CANDID_PHOTOS[18],
      SAMPLE_CANDID_PHOTOS[9]
    ]
  },
  {
    id: 'heart-frame-3',
    name: 'Sweet Romance 3-Cut',
    shots: 3,
    type: '3-cut',
    category: 'romantic',
    ratioLabel: 'Rasio 1:3 (Soft Peach)',
    description: 'Nuansa peach dan blush hangat dengan aksen stiker cinta, cocok untuk foto pasangan & sahabat.',
    badge: 'Sweet Date',
    badgeColor: 'bg-rose-100 text-rose-800',
    defaultBg: 'bg-strawberry',
    defaultPattern: 'hearts',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[3],
      SAMPLE_CANDID_PHOTOS[7],
      SAMPLE_CANDID_PHOTOS[6]
    ]
  },
  {
    id: 'photobooth-grid-6',
    name: 'Squad Party Grid 6',
    shots: 6,
    type: 'grid',
    category: 'seasonal',
    ratioLabel: 'Rasio 2:3 (Grid 2x3)',
    description: 'Kolase 6 frame (2 kolom x 3 baris) pas untuk grup pesta atau hangout rame-rame.',
    badge: 'Party Squad',
    badgeColor: 'bg-secondary-container text-on-secondary-container',
    defaultBg: 'bg-secondary-container',
    defaultPattern: 'checker',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[5],
      SAMPLE_CANDID_PHOTOS[19],
      SAMPLE_CANDID_PHOTOS[16],
      SAMPLE_CANDID_PHOTOS[14],
      SAMPLE_CANDID_PHOTOS[8],
      SAMPLE_CANDID_PHOTOS[21]
    ]
  },
  {
    id: 'tokyo-neon-4',
    name: 'Harajuku Neon 4-Cut',
    shots: 4,
    type: '4-cut',
    category: 'y2k',
    ratioLabel: 'Rasio 2:6 (Cyber Y2K)',
    description: 'Bingkai gelap futuristik dengan vibe lampu malam Tokyo neon yang trendi & kontras.',
    badge: 'Cyber Y2K',
    badgeColor: 'bg-purple-900 text-purple-200',
    defaultBg: 'bg-primary',
    defaultPattern: 'metallic-stars',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[13],
      SAMPLE_CANDID_PHOTOS[21],
      SAMPLE_CANDID_PHOTOS[20],
      SAMPLE_CANDID_PHOTOS[10]
    ]
  },
  {
    id: 'monochrome-studio-4',
    name: 'Studio Editorial 4-Cut',
    shots: 4,
    type: '4-cut',
    category: 'film',
    ratioLabel: 'Rasio 2:6 (Editorial)',
    description: 'Tipografi Swiss Helvetica murni berpadu dengan frame putih museum untuk hasil artistik.',
    badge: 'Editorial',
    badgeColor: 'bg-stone-200 text-stone-900',
    defaultBg: 'bg-surface-container-lowest',
    defaultPattern: 'none',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[11],
      SAMPLE_CANDID_PHOTOS[18],
      SAMPLE_CANDID_PHOTOS[12],
      SAMPLE_CANDID_PHOTOS[4]
    ]
  },
  {
    id: 'barcode-film-4',
    name: 'Barcode 90s Film Strip',
    shots: 4,
    type: '4-cut',
    category: 'ticket',
    ratioLabel: 'Rasio 2:6 (Analog Barcode)',
    description: 'Barcode autentik di atas dan bawah strip dengan tulisan tangan Special Day & doodle kamera.',
    badge: 'Analog 90s',
    badgeColor: 'bg-stone-200 text-stone-900',
    defaultBg: 'bg-primary',
    defaultPattern: 'barcode-film',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[6],
      SAMPLE_CANDID_PHOTOS[3],
      SAMPLE_CANDID_PHOTOS[8],
      SAMPLE_CANDID_PHOTOS[9]
    ]
  },
  {
    id: 'dark-romance-4',
    name: 'Dark Romance Scrapbook',
    shots: 4,
    type: '4-cut',
    category: 'romantic',
    ratioLabel: 'Rasio 2:6 (Gothic Scrapbook)',
    description: 'Nuansa marun gelap, cap ciuman bibir merah, pita love & broken heart.',
    badge: 'Scrapbook',
    badgeColor: 'bg-red-950 text-red-200',
    defaultBg: 'bg-cherry',
    defaultPattern: 'dark-romance',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[2],
      SAMPLE_CANDID_PHOTOS[7],
      SAMPLE_CANDID_PHOTOS[10],
      SAMPLE_CANDID_PHOTOS[11]
    ]
  },
  {
    id: 'metallic-stars-4',
    name: 'Y2K Metallic Stars 4-Cut',
    shots: 4,
    type: '4-cut',
    category: 'y2k',
    ratioLabel: 'Rasio 2:6 (Star Collage)',
    description: 'Taburan bintang perak 3D chrome, denim, dan glitter bintang keliling bingkai foto.',
    badge: 'Chrome Star',
    badgeColor: 'bg-purple-900 text-purple-200',
    defaultBg: 'bg-primary',
    defaultPattern: 'metallic-stars',
    isPremium: true,
    previewImages: [
      SAMPLE_CANDID_PHOTOS[21],
      SAMPLE_CANDID_PHOTOS[14],
      SAMPLE_CANDID_PHOTOS[15],
      SAMPLE_CANDID_PHOTOS[17]
    ]
  },
  {
    id: 'polka-dots-4',
    name: 'Retro Polka Dots 4-Cut',
    shots: 4,
    type: '4-cut',
    category: 'y2k',
    ratioLabel: 'Rasio 2:6 (Polkadot Ceria)',
    description: 'Bintik polkadot estetik ceria ala photobooth club Korea yang cerah dan menggemaskan.',
    badge: 'Polkadot',
    badgeColor: 'bg-amber-100 text-amber-900',
    defaultBg: 'bg-secondary-container',
    defaultPattern: 'polka',
    previewImages: [
      SAMPLE_CANDID_PHOTOS[1],
      SAMPLE_CANDID_PHOTOS[2],
      SAMPLE_CANDID_PHOTOS[0],
      SAMPLE_CANDID_PHOTOS[19]
    ]
  }
];

export const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'normal',
    name: 'Original',
    icon: 'palette',
    cssFilter: 'none',
    previewImg: SAMPLE_CANDID_PHOTOS[5]
  },
  {
    id: 'monochrome',
    name: 'Soft B&W',
    icon: 'filter_b_and_w',
    cssFilter: 'grayscale(100%) contrast(115%) brightness(95%)',
    previewImg: SAMPLE_CANDID_PHOTOS[3]
  },
  {
    id: 'warm',
    name: 'Warm Film',
    icon: 'wb_sunny',
    cssFilter: 'sepia(35%) saturate(130%) contrast(105%) brightness(102%)',
    previewImg: SAMPLE_CANDID_PHOTOS[4]
  },
  {
    id: 'pastel',
    name: 'Pastel Glow',
    icon: 'auto_awesome',
    cssFilter: 'saturate(115%) brightness(110%) contrast(95%)',
    previewImg: SAMPLE_CANDID_PHOTOS[2]
  },
  {
    id: 'cool',
    name: 'Cool Tone',
    icon: 'ac_unit',
    cssFilter: 'hue-rotate(180deg) saturate(110%) brightness(100%)',
    previewImg: SAMPLE_CANDID_PHOTOS[1]
  },
  {
    id: 'kodak-gold',
    name: 'Kodak 90s',
    icon: 'wb_incandescent',
    cssFilter: 'sepia(25%) saturate(145%) contrast(110%) brightness(108%)',
    previewImg: SAMPLE_CANDID_PHOTOS[4],
    isPremium: true
  },
  {
    id: 'seoul-clean',
    name: 'Seoul Clean',
    icon: 'face_retouching_natural',
    cssFilter: 'brightness(108%) contrast(96%) saturate(108%)',
    previewImg: SAMPLE_CANDID_PHOTOS[5],
    isPremium: true
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    icon: 'electric_bolt',
    cssFilter: 'contrast(125%) saturate(160%) hue-rotate(280deg) brightness(105%)',
    previewImg: SAMPLE_CANDID_PHOTOS[7],
    isPremium: true
  },
  {
    id: 'noir-high',
    name: 'Film Noir',
    icon: 'contrast',
    cssFilter: 'grayscale(100%) contrast(175%) brightness(92%)',
    previewImg: SAMPLE_CANDID_PHOTOS[5],
    isPremium: true
  },
  {
    id: 'y2k-matrix',
    name: 'Emerald Vibe',
    icon: 'terminal',
    cssFilter: 'hue-rotate(90deg) saturate(130%) contrast(115%) brightness(95%)',
    previewImg: SAMPLE_CANDID_PHOTOS[3]
  },
  {
    id: 'rose',
    name: 'Rosé Soft',
    icon: 'flare',
    cssFilter: 'hue-rotate(-15deg) saturate(125%) contrast(105%) brightness(105%)',
    previewImg: SAMPLE_CANDID_PHOTOS[3]
  },
  {
    id: 'vintage',
    name: 'Vintage 90s',
    icon: 'photo_camera_back',
    cssFilter: 'sepia(45%) contrast(120%) brightness(90%) hue-rotate(10deg)',
    previewImg: SAMPLE_CANDID_PHOTOS[4]
  },
  {
    id: 'fuji-film',
    name: 'Fuji Astia',
    icon: 'park',
    cssFilter: 'hue-rotate(25deg) saturate(120%) contrast(108%) brightness(102%)',
    previewImg: SAMPLE_CANDID_PHOTOS[2],
    isPremium: true
  },
  {
    id: 'cinematic',
    name: 'Cinematic Teal',
    icon: 'movie',
    cssFilter: 'contrast(135%) brightness(90%) saturate(115%)',
    previewImg: SAMPLE_CANDID_PHOTOS[4],
    isPremium: true
  },
  {
    id: 'sunset',
    name: 'Golden Hour',
    icon: 'wb_twilight',
    cssFilter: 'sepia(40%) saturate(160%) brightness(105%) hue-rotate(-20deg)',
    previewImg: SAMPLE_CANDID_PHOTOS[0]
  },
  {
    id: 'dreamy',
    name: 'Dreamy Halo',
    icon: 'cloud',
    cssFilter: 'contrast(92%) brightness(115%) saturate(135%)',
    previewImg: SAMPLE_CANDID_PHOTOS[6]
  },
  {
    id: 'tokyo-drift',
    name: 'Tokyo Night',
    icon: 'nightlife',
    cssFilter: 'hue-rotate(210deg) contrast(125%) saturate(125%) brightness(95%)',
    previewImg: SAMPLE_CANDID_PHOTOS[5],
    isPremium: true
  }
];

export interface FrameColorDef {
  id: string;
  label: string;
  hex: string;
  textTheme: 'light' | 'dark';
}

export const FRAME_COLOR_OPTIONS: FrameColorDef[] = [
  { id: 'bg-surface-container-lowest', label: 'Putih Bersih', hex: '#ffffff', textTheme: 'dark' },
  { id: 'bg-primary-container', label: 'Navy Modern', hex: '#142b4a', textTheme: 'light' },
  { id: 'bg-secondary-container', label: 'Soft Blue', hex: '#d5e4f8', textTheme: 'dark' },
  { id: 'bg-tertiary-fixed', label: 'Sweet Lavender', hex: '#e6dffb', textTheme: 'dark' },
  { id: 'bg-surface-container-high', label: 'Peach Sky', hex: '#dee9ff', textTheme: 'dark' },
  { id: 'bg-primary', label: 'Midnight Black', hex: '#001632', textTheme: 'light' },
  { id: 'bg-matcha', label: 'Matcha Sage', hex: '#d1e7dd', textTheme: 'dark' },
  { id: 'bg-butter', label: 'Butter Cream', hex: '#fff3cd', textTheme: 'dark' },
  { id: 'bg-strawberry', label: 'Strawberry Milk', hex: '#f8d7da', textTheme: 'dark' },
  { id: 'bg-cherry', label: 'Cherry Wine', hex: '#581845', textTheme: 'light' },
  { id: 'bg-terracotta', label: 'Warm Terracotta', hex: '#e07a5f', textTheme: 'light' },
  { id: 'bg-lilac', label: 'Lilac Mist', hex: '#d8b4e2', textTheme: 'dark' },
  { id: 'bg-mint', label: 'Fresh Mint', hex: '#cbf3f0', textTheme: 'dark' },
  { id: 'bg-darkplum', label: 'Dark Plum', hex: '#2b1b3d', textTheme: 'light' }
];

export const FRAME_PATTERN_OPTIONS: FramePatternOption[] = [
  // Tren Pinterest & Y2K
  {
    id: 'snap-express',
    name: 'The Snap Express',
    icon: 'confirmation_number',
    description: 'Tiket VIP merah-krem-navy, stempel verified & barcode #TK-9284',
    category: 'trending',
    badge: 'Edisi Spesial',
    isPremium: true
  },
  {
    id: 'airmail',
    name: 'Airmail Vintage Pos',
    icon: 'mail',
    description: 'Border garis biru-merah amplop pos, cap stempel & pita',
    category: 'trending',
    badge: 'Pinterest Hit'
  },
  {
    id: 'love-blooming',
    name: 'Love is Blooming',
    icon: 'local_florist',
    description: 'Scrapbook bunga mawar lembut, love notes & stempel romantis',
    category: 'trending',
    badge: 'Romantic'
  },
  {
    id: 'cinema-ticket',
    name: 'Karcis Bioskop Retro',
    icon: 'theaters',
    description: 'Lekukan tiket film Row B2 Show 02 & stempel studio',
    category: 'trending',
    badge: 'Viral',
    isPremium: true
  },
  {
    id: 'barcode-film',
    name: 'Barcode 90s Film',
    icon: 'barcode',
    description: 'Barcode autentik atas-bawah & tulisan Special Day',
    category: 'trending',
    badge: 'Retro',
    isPremium: true
  },
  {
    id: 'y2k-comic-blue',
    name: 'Y2K Cobalt Waves',
    icon: 'waves',
    description: 'Ombak biru cerah, pixel stars, speech bubble & doodle',
    category: 'trending',
    badge: 'Y2K',
    isPremium: true
  },
  {
    id: 'dark-romance',
    name: 'Dark Romance Scrapbook',
    icon: 'favorite',
    description: 'Marun grunge, cap ciuman bibir, pita love & broken heart',
    category: 'trending',
    badge: 'Aesthetic',
    isPremium: true
  },
  {
    id: 'metallic-stars',
    name: 'Y2K Metallic Stars',
    icon: 'auto_awesome',
    description: 'Taburan bintang chrome, denim & glitter keliling foto',
    category: 'trending',
    badge: 'Popular',
    isPremium: true
  },
  {
    id: 'polaroid-ribbon',
    name: 'Coquette Red Bow',
    icon: 'loyalty',
    description: 'Pita merah satin di sudut, bunga & kamera vintage',
    category: 'trending',
    badge: 'Cute'
  },
  {
    id: 'vintage-lace',
    name: 'Scallop Emerald Lace',
    icon: 'filter_vintage',
    description: 'Renda bordir hijau zamrud & tipografi emas klasik',
    category: 'trending',
    badge: 'Elegant',
    isPremium: true
  },

  // Motif & Pola Populer
  {
    id: 'spooky-night',
    name: 'Spooky Night Halloween',
    icon: 'nights_stay',
    description: 'Tema Halloween ceria dengan labu, hantu & bintang malam',
    category: 'motif',
    badge: 'Seasonal'
  },
  {
    id: 'polka',
    name: 'Retro Polka Dots',
    icon: 'lens',
    description: 'Bintik polkadot ceria khas photobooth Korea',
    category: 'motif'
  },
  {
    id: 'checker',
    name: 'Retro Checker',
    icon: 'grid_view',
    description: 'Pola papan catur pop Y2K kekinian',
    category: 'motif'
  },
  {
    id: 'hearts',
    name: 'Sweet K-Hearts',
    icon: 'favorite_border',
    description: 'Pola hati manis photoclub Korea',
    category: 'motif'
  },
  {
    id: 'stars',
    name: 'Y2K Sparkle',
    icon: 'star',
    description: 'Bintang kilau retro 2000-an',
    category: 'motif'
  },
  {
    id: 'film-sprocket',
    name: 'Rol Film 35mm',
    icon: 'movie',
    description: 'Gerigi klise rol film analog di kedua sisi strip',
    category: 'motif'
  },

  // Tekstur & Gradasi
  {
    id: 'vintage-kraft',
    name: 'Vintage Kraft Scrapbook',
    icon: 'texture',
    description: 'Tekstur serat kertas daur ulang antik & selotip',
    category: 'texture'
  },
  {
    id: 'gradient-aurora',
    name: 'Aurora Pastel',
    icon: 'gradient',
    description: 'Gradasi lembut lavender, pink & biru langit',
    category: 'texture'
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset Glow',
    icon: 'wb_twilight',
    description: 'Gradasi jingga hangat cahaya senja keemasan',
    category: 'texture'
  },
  {
    id: 'none',
    name: 'Polos Minimalis',
    icon: 'crop_square',
    description: 'Warna kertas solid bersih tanpa motif',
    category: 'texture'
  }
];

export const FRAME_CORNER_OPTIONS = [
  { id: 'rounded', label: 'Lengkung', icon: 'rounded_corner' },
  { id: 'sharp', label: 'Tegak Rapi', icon: 'crop_square' },
  { id: 'pill', label: 'Oval Lembut', icon: 'panorama_horizontal' }
];

export const FRAME_INNER_BORDER_OPTIONS = [
  { id: 'none', label: 'Tanpa Garis', icon: 'border_clear' },
  { id: 'white', label: 'Border Putih', icon: 'border_outer' },
  { id: 'double', label: 'Garis Ganda', icon: 'line_weight' },
  { id: 'dashed', label: 'Jahitan Retro', icon: 'border_style' }
];

export const STICKER_LIBRARY = [
  '✨', '🌸', '🎀', '✌️', '📸', '💭', '💖', '⭐', '🧸', '🕶️', '🎈', '❤️', '🔥', '👑', '🎉', '☕'
];

export const INITIAL_SESSION_SETTINGS: SessionSettings = {
  templateId: 'navy-4-cut',
  filter: 'normal',
  countdown: 3,
  screenFlash: true,
  frameColor: 'bg-surface-container-lowest',
  framePattern: 'none',
  frameCorner: 'rounded',
  frameInnerBorder: 'none',
  caption: 'Besties Night Out ❤️',
  showTimestamp: true,
  timestamp: formatPhotoboothTimestamp(),
  stickers: ['✨', '✨']
};

export const INITIAL_GALLERY_STRIPS: GalleryStrip[] = [
  {
    id: 'strip-01',
    title: 'Weekend Hangout & Coffee',
    dateStr: '24 Okt 2024',
    timestamp: Date.now() - 3600 * 1000 * 24 * 2,
    templateId: 'navy-4-cut',
    templateName: 'Minimalist Navy 4-Cut',
    frameType: '4-cut',
    frameColor: 'bg-primary-container',
    caption: 'Weekend Hangout & Coffee ☕',
    isFavorite: true,
    fileSizeStr: '2.4 MB • PNG HQ',
    formatStr: '4-Frame • 300 DPI',
    stickers: ['☕', '✨'],
    frames: [
      { id: 1, dataUrl: SAMPLE_CANDID_PHOTOS[0], altText: 'Coffee portrait smile', capturedAt: 1 },
      { id: 2, dataUrl: SAMPLE_CANDID_PHOTOS[1], altText: 'Peace sign laughing friends', capturedAt: 2 },
      { id: 3, dataUrl: SAMPLE_CANDID_PHOTOS[2], altText: 'Candid silly face photo', capturedAt: 3 },
      { id: 4, dataUrl: SAMPLE_CANDID_PHOTOS[3], altText: 'Editorial mug cheers', capturedAt: 4 }
    ]
  },
  {
    id: 'strip-02',
    title: 'Birthday Bash Putri 🎂',
    dateStr: '18 Okt 2024',
    timestamp: Date.now() - 3600 * 1000 * 24 * 8,
    templateId: 'pastel-dream-3',
    templateName: 'Pastel Dream 3-Cut',
    frameType: '3-cut',
    frameColor: 'bg-tertiary-fixed',
    caption: "Putri's 22nd Memory 🎉",
    isFavorite: false,
    fileSizeStr: '1.8 MB • PNG HQ',
    formatStr: '3-Frame • 300 DPI',
    stickers: ['🎀', '🌸'],
    frames: [
      { id: 1, dataUrl: SAMPLE_CANDID_PHOTOS[6], altText: 'Birthday girl portrait', capturedAt: 1 },
      { id: 2, dataUrl: SAMPLE_CANDID_PHOTOS[7], altText: 'Party hat group cheer', capturedAt: 2 },
      { id: 3, dataUrl: SAMPLE_CANDID_PHOTOS[1], altText: 'Candle celebration', capturedAt: 3 }
    ]
  },
  {
    id: 'strip-03',
    title: 'Analog Vibes Duo',
    dateStr: '05 Okt 2024',
    timestamp: Date.now() - 3600 * 1000 * 24 * 21,
    templateId: 'film-noir-duo',
    templateName: 'Film Noir Duo',
    frameType: 'polaroid',
    frameColor: 'bg-primary',
    caption: 'POSARA NOIR // ISO 400',
    isFavorite: true,
    fileSizeStr: '1.5 MB • PNG HQ',
    formatStr: '2-Frame • Analog B&W',
    stickers: ['📸'],
    frames: [
      { id: 1, dataUrl: SAMPLE_CANDID_PHOTOS[4], altText: 'Noir duo portrait', capturedAt: 1 },
      { id: 2, dataUrl: SAMPLE_CANDID_PHOTOS[5], altText: 'Moody studio close up', capturedAt: 2 }
    ]
  },
  {
    id: 'strip-04',
    title: 'Campus Besties Squad',
    dateStr: '28 Sep 2024',
    timestamp: Date.now() - 3600 * 1000 * 24 * 28,
    templateId: 'collage-grid-4',
    templateName: 'Collage Grid 4',
    frameType: 'grid',
    frameColor: 'bg-surface-container-high',
    caption: 'SELEBRASI KAMPUS 2024 🎓',
    isFavorite: false,
    fileSizeStr: '2.1 MB • PNG HQ',
    formatStr: '4-Frame • Grid 2x2',
    stickers: ['🎓', '✌️'],
    frames: [
      { id: 1, dataUrl: SAMPLE_CANDID_PHOTOS[0], altText: 'Graduation smiles', capturedAt: 1 },
      { id: 2, dataUrl: SAMPLE_CANDID_PHOTOS[2], altText: 'Oversized glasses cheer', capturedAt: 2 },
      { id: 3, dataUrl: SAMPLE_CANDID_PHOTOS[3], altText: 'Hug group snapshot', capturedAt: 3 },
      { id: 4, dataUrl: SAMPLE_CANDID_PHOTOS[1], altText: 'Confetti toss joy', capturedAt: 4 }
    ]
  }
];
