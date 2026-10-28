import { Photo, TimelineEvent, SiteMeta, LetterDrop } from '../types';

/**
 * ==============================================================================
 * ARCHIVO CENTRAL DE CONTENIDO: NUESTRO ÁLBUM
 * ==============================================================================
 * Historia desde el 14 de Febrero de 2024 hasta el 9 de Septiembre de 2026 y más allá.
 */

// Fecha de inicio de la relación: Febrero 2024
export const START_DATE = '2024-02-14T20:00:00';

// Configuración general del sitio y metadatos
export const siteMeta: SiteMeta = {
  siteTitle: 'Nuestro Álbum',
  subtitle: 'Un baúl virtual para guardar nuestros recuerdos',
  herName: 'Sam',
  hisName: 'Alex',
  nickname: 'Mi persona favorita',
  accentColorHex: '#FF8FA3',
  authorName: 'Alex',
  anniversaryDate: '14 de Febrero de 2024',
  anniversaryCelebrationDate: '9 de Septiembre',
};

// PIN secreto para desbloquear el collage privado (Easter Egg)
export const easterEggPin = '0909'; // DDMM of anniversaryCelebrationDate

// Carta de amor única para el 9 de Septiembre
export const initialLetterDrops: LetterDrop[] = [
  {
    id: 'carta-cumple-09sep',
    title: 'Una carta para vos',
    date: '9 de Septiembre, 2026',
    tagline: 'Una carta íntima, escrita sin apuro',
    content: `Para la persona con la que todo se vuelve más simple: este año aprendí que un día cualquiera, con vos al lado, alcanza para sentirme en casa. Gracias por las risas a destiempo, por los mates compartidos y por cada plan improvisado. Canela, Trufa, Nube y Copo también te mandan un ronroneo. Esta es una carta de muestra: reemplazala por la tuya y guardala para el día que más lo necesitas. Te quiero hoy, mañana y todos los días que vengan.`,
    author: 'Alex',
    isNewDrop: true,
    waxSealColor: '#b7094c'
  }
];

// Texto de la carta inicial por compatibilidad
export const letterText = initialLetterDrops[0].content;

// Lista de fotos y videos compartidos (Hero, galería y filtros: Canela, Trufa, Copo, Nube)
export const photos: Photo[] = [
  // GATOS DE ÉL: CANELA (Macho)
  {
    id: 'photo-canela-1',
    filePath: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Canela en modo inspector de sillones, controlando que no hagamos lío.',
    month: 'Marzo',
    year: 2026,
    dateStr: '12 Mar 2026',
    location: 'En casa',
    tags: ['Canela', 'Michis', 'Gatos', 'Hogar']
  },
  {
    id: 'photo-canela-2',
    filePath: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Siesta real de Canela atravesado encima del teclado cuando querías estudiar.',
    month: 'Mayo',
    year: 2026,
    dateStr: '08 May 2026',
    location: 'Escritorio',
    tags: ['Canela', 'Michis', 'Gatos']
  },

  // GATOS DE ÉL: TRUFA (Macho)
  {
    id: 'photo-trufa-1',
    filePath: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Trufa con esos ojazos enormes mirando la caja de cartón como si fuera su palacio.',
    month: 'Abril',
    year: 2026,
    dateStr: '19 Abr 2026',
    location: 'El rincón de Trufa',
    tags: ['Trufa', 'Michis', 'Gatos', 'Hogar']
  },
  {
    id: 'photo-trufa-2',
    filePath: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Trufa hecho un bollito debajo del acolchado en una mañana de frío.',
    month: 'Junio',
    year: 2026,
    dateStr: '28 Jun 2026',
    location: 'La cama',
    tags: ['Trufa', 'Michis', 'Gatos', 'Cozy']
  },

  // GATAS DE ELLA: COPO (Hembra)
  {
    id: 'photo-copo-1',
    filePath: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Copo, la reina de ella: posando como una verdadera princesa felina.',
    month: 'Abril',
    year: 2026,
    dateStr: '24 Abr 2026',
    location: 'Rincón de Copo',
    tags: ['Copo', 'Michis', 'Gatas', 'Familia Felina']
  },
  {
    id: 'photo-copo-2',
    filePath: 'https://images.unsplash.com/photo-1513360375582-619d49816d33?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513360375582-619d49816d33?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Copo con sus patitas dobladas mirándote con devoción absoluta.',
    month: 'Mayo',
    year: 2026,
    dateStr: '02 May 2026',
    location: 'Sillón',
    tags: ['Copo', 'Michis', 'Gatas', 'Hogar']
  },

  // GATAS DE ELLA: NUBE (Hembra)
  {
    id: 'photo-nube-1',
    filePath: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Nube, la otra consentida de Sam: ojos dulces y curiosidad interminable.',
    month: 'Junio',
    year: 2026,
    dateStr: '14 Jun 2026',
    location: 'Alféizar de la ventana',
    tags: ['Nube', 'Michis', 'Gatas', 'Familia Felina']
  },
  {
    id: 'photo-nube-2',
    filePath: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Nube durmiendo la siesta más profunda de su vida entre tus almohadones.',
    month: 'Agosto',
    year: 2026,
    dateStr: '11 Ago 2026',
    location: 'El dormitorio',
    tags: ['Nube', 'Michis', 'Gatas', 'Cozy']
  },

  // CANELA, TRUFA, COPO Y NUBE JUNTOS (LOS 4 MICHIS: 2 NENES Y 2 NENAS)
  {
    id: 'photo-los-cuatro-michis',
    filePath: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Nuestra familia felina completa: Canela y Trufa (los nenes) y Copo y Nube (las nenas).',
    month: 'Julio',
    year: 2026,
    dateStr: '06 Jul 2026',
    location: 'La ventana de casa',
    tags: ['Canela', 'Trufa', 'Copo', 'Nube', 'Michis', 'Gatos', 'Gatas', 'Los 4 Michis']
  },

  // VIDEO DESTACADO 1: LOS MICHIS EN ACCIÓN
  {
    id: 'video-michis-juego',
    filePath: 'https://assets.mixkit.co/videos/preview/mixkit-cat-looking-around-with-curiosity-33318-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
    mediaType: 'video',
    duration: '0:14',
    caption: 'Video: Curiosidad felina total cuando los cuatro escuchan el paquete de comida.',
    month: 'Agosto',
    year: 2026,
    dateStr: '18 Ago 2026',
    location: 'Living',
    tags: ['Video', 'Michis', 'Canela', 'Trufa', 'Copo', 'Nube']
  },

  // VIDEO DESTACADO 2: NUESTROS MOMENTOS DE PAZ
  {
    id: 'video-atardecer-paz',
    filePath: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=600&q=80',
    mediaType: 'video',
    duration: '0:18',
    caption: 'Video: Recordando la calma de aquel atardecer juntos contemplando el agua.',
    month: 'Julio',
    year: 2026,
    dateStr: '12 Jul 2026',
    location: 'Mirador',
    tags: ['Video', 'Atardecer', 'Magia', 'Paz']
  },

  // MOMENTOS DE LA HISTORIA
  {
    id: 'photo-feb-2026-1',
    filePath: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'El primer café en Febrero. Nos quedamos 4 horas hablando sin darnos cuenta de la hora.',
    month: 'Febrero',
    year: 2026,
    dateStr: '14 Feb 2026',
    location: 'Café del Barrio',
    tags: ['El Inicio', 'Café', 'San Valentín']
  },
  {
    id: 'photo-mar-2026-1',
    filePath: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Charlas eternas en la plaza bajo las luces doradas. Cuando me di cuenta de lo mucho que me gustabas.',
    month: 'Marzo',
    year: 2026,
    dateStr: '10 Mar 2026',
    location: 'Parque Central',
    tags: ['Noches', 'Miradas', 'Complicidad']
  },
  {
    id: 'photo-abr-2026-1',
    filePath: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Nuestra primera escapada de fin de semana. Cantando a los gritos en la ruta.',
    month: 'Abril',
    year: 2026,
    dateStr: '04 Abr 2026',
    location: 'Ruta hacia la costa',
    tags: ['Viaje', 'Ruta', 'Aventuras']
  },
  {
    id: 'photo-may-2026-1',
    filePath: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Tarde cocinando pasta juntos. Terminaste con harina en la nariz y una sonrisa hermosa.',
    month: 'Mayo',
    year: 2026,
    dateStr: '17 May 2026',
    location: 'En casa',
    tags: ['Cocina', 'Risas', 'Hogar']
  },
  {
    id: 'photo-jun-2026-1',
    filePath: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'El primer frío del año. Te presté mi abrigo gigante y nos tomamos un chocolate caliente.',
    month: 'Junio',
    year: 2026,
    dateStr: '21 Jun 2026',
    location: 'Mirador del Parque',
    tags: ['Invierno', 'Café Caliente', 'Abrazos']
  },
  {
    id: 'photo-jul-2026-1',
    filePath: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Tarde de lluvia viendo películas bajo una montaña de mantas y pochoclos.',
    month: 'Julio',
    year: 2026,
    dateStr: '15 Jul 2026',
    location: 'En el sillón',
    tags: ['Lluvia', 'Películas', 'Cozy']
  },
  {
    id: 'photo-ago-2026-1',
    filePath: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=600&q=80',
    mediaType: 'image',
    caption: 'Atardecer dorado compartiendo sueños de todo lo que queremos conocer juntos.',
    month: 'Agosto',
    year: 2026,
    dateStr: '22 Ago 2026',
    location: 'Mirador',
    tags: ['Golden Hour', 'Futuro', 'Amor']
  }
];

// Eventos narrativos del timeline con múltiples fotos por mes (carrusel dedicado para cada mes)
export const timelineEvents: TimelineEvent[] = [
  {
    id: 'event-ene-2026',
    kind: 'month',
    month: 'Enero',
    year: 2026,
    monthAnchor: 'mes-enero-2026',
    title: 'El día que te cruzaste en mi cabeza',
    subtitle: 'Antes de conocernos ya eras inevitable',
    tone: 'nostalgico',
    text: 'Todavía no nos habíamos visto, pero algo ya estaba escrito. Recuerdo ese mes como el preludio silencioso de lo que vendría.',
    internalJoke: 'Te juro que no sabía que ese iba a ser el mes que cambiaría todo.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1499914485622-a88fe5369e89?auto=format&fit=crop&w=1200&q=80',
        caption: 'Atardecer de enero, ventana abierta y vos en mi cabeza',
        location: 'El preludio'
      },
      {
        url: 'https://images.unsplash.com/photo-1419833173245-f59e1b93f9ee?auto=format&fit=crop&w=1200&q=80',
        caption: 'Caminatas pensando en qué dirías si te hablaba',
        location: 'Calles de enero'
      }
    ],
    date: '20 de Enero, 2026',
    tags: ['AntesdeVos', 'Enero', 'ElComienzo']
  },
  {
    id: 'event-feb-2026',
    kind: 'month',
    month: 'Febrero',
    year: 2026,
    monthAnchor: 'mes-febrero-2026',
    title: 'El primer café y el flechazo',
    subtitle: 'Donde empezó a escribirse todo',
    tone: 'nostalgico',
    text: 'Cuatro horas de café que se sintieron como cinco minutos y la certeza inmediata de que no quería que esa tarde terminara nunca.',
    internalJoke: 'Dijiste que no tomabas café de tarde y te tomaste dos cortados seguidos.',
    imageId: 'photo-feb-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80',
        caption: 'El primer café: 4 horas que se sintieron como 5 minutos',
        location: 'Café del Barrio'
      },
      {
        url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
        caption: 'Tus dos tazas de café y las servilletas con notas garabateadas',
        location: 'La mesita de la ventana'
      },
      {
        url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80',
        caption: 'La caminata de vuelta bajo el cielo estrellado de verano',
        location: 'Calles del barrio'
      }
    ],
    date: '14 de Febrero, 2026',
    tags: ['El inicio', 'Café', 'San Valentín']
  },
  {
    id: 'event-mar-2026',
    kind: 'month',
    month: 'Marzo',
    year: 2026,
    monthAnchor: 'mes-marzo-2026',
    title: 'Charlas hasta las 3 AM',
    subtitle: 'Cuando el tiempo no alcanzaba',
    tone: 'nostalgico',
    text: 'Un auricular cada uno en el banco de la plaza, risas cómplices y Canela adueñándose para siempre de nuestro sillón.',
    internalJoke: 'Te sabías todas las canciones de memoria inventando la mitad en inglés.',
    imageId: 'photo-mar-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
        caption: 'Plaza iluminada y nuestras miradas de cómplices',
        location: 'Parque Central'
      },
      {
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
        caption: 'Canela asomándose con curiosidad total en su primer mes',
        location: 'En casa'
      },
      {
        url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        caption: 'Compartiendo auriculares y descubriendo canciones',
        location: 'Banco del parque'
      }
    ],
    date: '10 de Marzo, 2026',
    tags: ['Música', 'Noches', 'Canela', 'Confidencias']
  },
  {
    id: 'event-abr-2026',
    kind: 'month',
    month: 'Abril',
    year: 2026,
    monthAnchor: 'mes-abril-2026',
    title: 'Familia felina completa',
    subtitle: 'Nuestros cuatro amores de cuatro patas',
    tone: 'romantico',
    text: 'La ruta cantando a viva voz y la casa convertida en un verdadero hogar junto a Canela, Trufa, Copo y Nube.',
    internalJoke: 'Canela intentando impresionar a Copo mientras Nube duerme ignorándolo todo.',
    imageId: 'photo-abr-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80',
        caption: 'Copo custodiando la ventana con su elegancia habitual',
        location: 'En casa'
      },
      {
        url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=1200&q=80',
        caption: 'Trufa asomándose para ver qué traman las chicas',
        location: 'El pasillo'
      },
      {
        url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80',
        caption: 'Ruta soleada cantando a viva voz',
        location: 'De camino'
      }
    ],
    date: '04 de Abril, 2026',
    tags: ['Copo', 'Nube', 'Canela', 'Trufa', 'Familia Felina']
  },
  {
    id: 'event-may-2026',
    kind: 'month',
    month: 'Mayo',
    year: 2026,
    monthAnchor: 'mes-mayo-2026',
    title: 'Pasta casera y harina',
    subtitle: 'El desastre culinario más rico',
    tone: 'humor',
    text: 'La masa pegada por todos lados, harina en la punta de tu nariz y una carcajada que todavía me alegra el corazón.',
    internalJoke: 'Todavía sigo encontrando harina en rincones insólitos de la cocina.',
    imageId: 'photo-may-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
        caption: 'Tu sonrisa hermosa con harina en la punta de la nariz',
        location: 'En la cocina'
      },
      {
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        caption: 'Nuestra pasta artesanal antes de que se pegara al colador',
        location: 'Mesa de amasar'
      },
      {
        url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=1200&q=80',
        caption: 'Canela durmiendo tranquilo ignorando el caos de la cocina',
        location: 'Sillón'
      }
    ],
    date: '17 de Mayo, 2026',
    tags: ['Cocina', 'Risas', 'Pasta Casera', 'Michis']
  },
  {
    id: 'event-jun-2026',
    kind: 'month',
    month: 'Junio',
    year: 2026,
    monthAnchor: 'mes-junio-2026',
    title: 'El primer frío del año',
    subtitle: 'Cualquier excusa para estar pegados',
    tone: 'romantico',
    text: 'Te presté mi abrigo gigante, me agarraste la mano en el bolsillo y el invierno se volvió la estación más cálida.',
    internalJoke: 'Sos la única persona que usa bufanda dentro de un bar con calefacción.',
    imageId: 'photo-jun-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=1200&q=80',
        caption: 'Nube durmiendo enroscada en tu bufanda favorita',
        location: 'Living'
      },
      {
        url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80',
        caption: 'Con mi campera gigante y chocolate caliente en mano',
        location: 'Parque de invierno'
      },
      {
        url: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=1200&q=80',
        caption: 'Trufa esperándonos tapadito hasta el cuello con su mantita',
        location: 'En casa'
      }
    ],
    date: '21 de Junio, 2026',
    tags: ['Invierno', 'Copo', 'Nube', 'Abrazos', 'Cozy']
  },
  {
    id: 'event-jul-2026',
    kind: 'month',
    month: 'Julio',
    year: 2026,
    monthAnchor: 'mes-julio-2026',
    title: 'Lluvia, mantas y siestas',
    subtitle: 'Nuestro refugio favorito',
    tone: 'humor',
    text: 'Elegiste una película de tres horas y a los veinte minutos ya estabas profundamente dormida sobre mi hombro.',
    internalJoke: 'Cuando despertaste dijiste: "No me dormí, solo estaba descansando la vista".',
    imageId: 'photo-jul-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
        caption: 'Lluvia en la ventana, sillón, mantas y paz absoluta',
        location: 'Living'
      },
      {
        url: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=1200&q=80',
        caption: 'Los michis compartiendo el acolchado en paz total',
        location: 'El sillón'
      },
      {
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
        caption: 'Café caliente y galletitas mientras descansabas',
        location: 'La mesita ratona'
      }
    ],
    date: '15 de Julio, 2026',
    tags: ['Canela', 'Trufa', 'Copo', 'Nube', 'Lluvia', 'Cozy']
  },
  {
    id: 'event-ago-2026',
    kind: 'month',
    month: 'Agosto',
    year: 2026,
    monthAnchor: 'mes-agosto-2026',
    title: 'Atardecer y certeza',
    subtitle: 'Planear el futuro con una sonrisa',
    tone: 'romantico',
    text: 'Sentados en el pasto viendo caer el sol dorado, confirmé que elegirte es lo más fácil y lindo que hago cada día.',
    internalJoke: 'Llegar a casa y ver a Copo y Nube recibirte como la reina absoluta.',
    imageId: 'photo-ago-2026-1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=1200&q=80',
        caption: 'Atardecer de oro puro mientras soñábamos el futuro',
        location: 'Mirador'
      },
      {
        url: 'https://images.unsplash.com/photo-1513360375582-619d49816d33?auto=format&fit=crop&w=1200&q=80',
        caption: 'Copo descansando bajo el rayito dorado del atardecer',
        location: 'Living'
      },
      {
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
        caption: 'Canela esperándonos en el balcón al llegar',
        location: 'El balcón'
      }
    ],
    date: '22 de Agosto, 2026',
    tags: ['Golden Hour', 'Certeza', 'Complicidad', 'Los 4 Michis']
  },
  {
    // ponytail: declared FIRST so it scrolls before the cumple, mirroring
    // chronology: Sept 1 (previa) → Sept 16 (cumple).
    id: 'event-sep-2026-antes',
    kind: 'month',
    month: 'Septiembre',
    year: 2026,
    monthAnchor: 'mes-septiembre-2026-antes',
    title: 'La previa al gran día',
    subtitle: 'Conteo regresivo y mimos extras',
    tone: 'romantico',
    text: 'Septiembre arrancó con esa mezcla de nervios y felicidad que solo vos me sacás: cada mensaje, cada llamada y cada plan soñado juntos sabiendo que este mes trae tu cumple.',
    internalJoke: 'Me preguntaste tres veces qué te iba a regalar y las tres veces te hice la misma cara de poker.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
        caption: 'Canela y Trufa en modo cómplices conspirando tu regalo',
        location: 'En casa'
      },
      {
        url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80',
        caption: 'Copo y Nube preparando la sorpresa',
        location: 'Living'
      }
    ],
    date: '1 de Septiembre, 2026',
    tags: ['Septiembre', 'Previa', 'Los 4 Michis', 'CuentaRegresiva']
  },
  {
    id: 'event-sep-2026-cumple',
    kind: 'event',
    month: 'Septiembre',
    year: 2026,
    monthAnchor: 'mes-septiembre-2026',
    eventAnchor: 'event-cumple-demo-2026',
    title: '¡Tu Cumpleaños!',
    subtitle: '9 de Septiembre de 2026',
    tone: 'romantico',
    text: 'Hoy todo es para vos: festejar tu vida, tu risa hermosa y este amor que no para de crecer.',
    internalJoke: 'Toca el marco para elegir o subir nuestra foto de hoy juntitos.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=1200&q=80',
        caption: '¡Velitas encendidas y todos los deseos del mundo para vos!',
        location: 'Festejo de Cumpleaños'
      },
      {
        url: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=1200&q=80',
        caption: 'Los cuatro michis saludando a su mamá humana favorita',
        location: 'En casa'
      }
    ],
    date: '9 de Septiembre, 2026',
    tags: ['event', 'Cumpleaños', '9DeSeptiembre', 'Hoy', 'ParaSiempre', 'Los 4 Michis']
  }
];

// Fotos secretas del collage privado (Easter Egg con PIN 0909)
export const secretCollagePhotos = [
  {
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
    caption: '¡Desbloqueaste nuestro rincón secreto! Te amo con locura, mi amor.',
    iconName: 'Heart'
  },
  {
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    caption: 'Canela custodiando el secreto con su mirada más seria.',
    iconName: 'Cat'
  },
  {
    url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80',
    caption: 'Trufa aprobando este mensaje de amor absoluto.',
    iconName: 'Cat'
  },
  {
    url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80',
    caption: 'Copo, la reina de Sam, vigilando el collage.',
    iconName: 'Sparkles'
  },
  {
    url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=800&q=80',
    caption: 'Nube, la dulce compañera felina de Sam.',
    iconName: 'Heart'
  },
  {
    url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80',
    caption: 'Promesa de seguir sumando recuerdos y cartas mes a mes.',
    iconName: 'Feather'
  }
];

