import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Champion, Competition, Draw, User, UserRole } from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

const ensureUser = async (
  email: string,
  defaults: {
    firstName: string;
    lastName: string;
    role?: UserRole;
    password?: string;
  }
) => {
  const existing = await User.findOne({ email });
  if (existing) {
    return existing;
  }

  return User.create({
    email,
    firstName: defaults.firstName,
    lastName: defaults.lastName,
    role: defaults.role ?? UserRole.USER,
    password: defaults.password ?? 'RoyalSeed123!',
    isVerified: true,
    isActive: true,
    subscribedToNewsletter: false,
  });
};

const competitionsSeed = [
  {
    title: 'Aston Martin DB11 V12 Coupe',
    slug: 'aston-martin-db11-v12-coupe',
    shortDescription:
      'Hand-built V12 power with bespoke trim and concierge delivery.',
    description:
      'Aston Martin’s DB11 V12 Coupe delivers a breathtaking blend of performance and craftsmanship. The prize includes concierge handover, 12-month manufacturer guarantee, and tailored insurance guidance.',
    prize: 'Aston Martin DB11 V12 Coupe',
    prizeValue: 18500000,
    cashAlternative: 16500000,
    ticketPrice: 395,
    maxTickets: 45000,
    soldTickets: 28930,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: true,
    question: {
      question: 'Which country is Aston Martin originally from?',
      options: ['United Kingdom', 'Germany', 'Sweden'],
      correctAnswer: 'United Kingdom',
      explanation: 'Aston Martin was founded in London in 1913.',
    },
    drawDate: new Date('2026-12-18T21:30:00Z'),
    startDate: new Date('2026-11-05T09:00:00Z'),
    endDate: new Date('2026-12-18T17:30:00Z'),
    features: [
      'Twin-turbocharged 5.2L V12',
      'Adaptive damping suspension',
      'Bang & Olufsen BeoSound audio',
      '360° surround camera',
    ],
    included: [
      '12 months Aston Martin warranty',
      'Full ceramic coating',
      'Complimentary nationwide delivery',
    ],
    specifications: [
      { label: 'Engine', value: '5.2L Twin-Turbo V12' },
      { label: 'Transmission', value: '8-Speed Automatic' },
      { label: 'Colour', value: 'Hyper Red' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711733/lux_car_01_cxgrpg.png',
        publicId: 'seed/luxury/lux_car_01_cxgrpg',
      },
    ],
    isGuaranteedDraw: true,
  },
  {
    title: 'Lamborghini Huracán EVO Spyder',
    slug: 'lamborghini-huracan-evo-spyder',
    shortDescription: 'Naturally aspirated V10 with Ad Personam interior.',
    description:
      'Drop the roof and feel the 640 hp V10. This Huracán EVO Spyder arrives with lifestyle handover, track-experience voucher, and a bespoke cover to protect the supercar at home.',
    prize: 'Lamborghini Huracán EVO Spyder',
    prizeValue: 22500000,
    cashAlternative: 20000000,
    ticketPrice: 425,
    maxTickets: 52000,
    soldTickets: 31210,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: true,
    question: {
      question: 'Which company owns Lamborghini?',
      options: ['Volkswagen Group', 'Tata Group', 'Stellantis'],
      correctAnswer: 'Volkswagen Group',
    },
    drawDate: new Date('2027-01-05T21:00:00Z'),
    startDate: new Date('2026-11-20T09:00:00Z'),
    endDate: new Date('2027-01-05T17:00:00Z'),
    features: [
      'Naturally aspirated 5.2L V10',
      'LDVI dynamic control system',
      'Carbon-ceramic brakes',
      'Sportivo Alcantara interior',
    ],
    included: [
      'Lamborghini lifestyle handover',
      'Two-day Italian Alps driving experience',
      '12-month premium insurance contribution',
    ],
    specifications: [
      { label: 'Engine', value: '5.2L NA V10' },
      { label: 'Transmission', value: '7-Speed LDF Dual-clutch' },
      { label: 'Colour', value: 'Verde Selvans' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711653/lux_car_02_m5azqh.png',
        publicId: 'seed/luxury/lux_car_02_m5azqh',
      },
    ],
    isGuaranteedDraw: true,
  },
  {
    title: 'Ferrari F8 Tributo Rosso Corsa',
    slug: 'ferrari-f8-tributo-rosso-corsa',
    shortDescription: 'Prancing horse pedigree with tailor-made specification.',
    description:
      'Ferrari F8 Tributo with carbon driver zone, forged wheels and Scuderia shields. Includes factory tour in Maranello for two and a masterclass with Ferrari’s Driver Academy.',
    prize: 'Ferrari F8 Tributo',
    prizeValue: 23800000,
    cashAlternative: 21000000,
    ticketPrice: 445,
    maxTickets: 55000,
    soldTickets: 37220,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: true,
    question: {
      question: 'What does the prancing horse logo represent?',
      options: ['Ferrari', 'Porsche', 'Lancia'],
      correctAnswer: 'Ferrari',
    },
    drawDate: new Date('2027-01-20T20:30:00Z'),
    startDate: new Date('2026-12-05T10:00:00Z'),
    endDate: new Date('2027-01-20T18:00:00Z'),
    features: [
      '3.9L Twin-Turbo V8 – 710 hp',
      'Carbon fibre driver zone LED steering wheel',
      'Adaptive front-lighting system',
      'Passenger display with telemetry',
    ],
    included: [
      'Ferrari factory tour for two',
      'Driver Academy track session',
      'Two-year Ferrari power warranty',
    ],
    specifications: [
      { label: 'Engine', value: '3.9L Twin-Turbo V8' },
      { label: 'Transmission', value: '7-Speed F1 Dual-clutch' },
      { label: 'Colour', value: 'Rosso Corsa' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711653/lux_car_03_matjwg.png',
        publicId: 'seed/luxury/lux_car_03_matjwg',
      },
    ],
    isGuaranteedDraw: false,
  },
  {
    title: 'Bentley Continental GT Speed',
    slug: 'bentley-continental-gt-speed',
    shortDescription: 'Grand touring luxury with handcrafted Mulliner details.',
    description:
      'The Bentley Continental GT Speed combines effortless W12 power with Mulliner craftsmanship. Complimentary chauffeur experience and bespoke luggage set included.',
    prize: 'Bentley Continental GT Speed',
    prizeValue: 21000000,
    cashAlternative: 19000000,
    ticketPrice: 365,
    maxTickets: 43000,
    soldTickets: 23350,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: false,
    question: {
      question: 'Bentley was founded in which year?',
      options: ['1919', '1931', '1950'],
      correctAnswer: '1919',
    },
    drawDate: new Date('2026-12-12T20:00:00Z'),
    startDate: new Date('2026-10-28T09:00:00Z'),
    endDate: new Date('2026-12-12T16:00:00Z'),
    features: [
      '6.0L twin-turbocharged W12',
      'Mulliner Driving Specification',
      'NAIM premium audio system',
      'Four-wheel steering',
    ],
    included: [
      '24-hour Bentley chauffeur experience',
      'Custom Mulliner luggage set',
      'Three-year service plan',
    ],
    specifications: [
      { label: 'Engine', value: '6.0L Twin-Turbo W12' },
      { label: 'Transmission', value: '8-Speed Dual-clutch' },
      { label: 'Colour', value: 'Ice White Satin' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711734/lux_car_04_wkkanx.png',
        publicId: 'seed/luxury/lux_car_04_wkkanx',
      },
    ],
    isGuaranteedDraw: true,
  },
  {
    title: 'Rolls-Royce Cullinan Black Badge',
    slug: 'rolls-royce-cullinan-black-badge',
    shortDescription: 'The ultimate statement SUV with Starlight headliner.',
    description:
      'Rolls-Royce Cullinan Black Badge, featuring bespoke Starlight headliner, immersive rear theatre, and artisan picnic hampers. Includes VIP chauffeur induction.',
    prize: 'Rolls-Royce Cullinan Black Badge',
    prizeValue: 32500000,
    cashAlternative: 29500000,
    ticketPrice: 485,
    maxTickets: 60000,
    soldTickets: 40890,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: true,
    question: {
      question: 'Which feature is unique to Rolls-Royce interiors?',
      options: ['Starlight Headliner', 'Ambient Cupholders', 'Gold Pedals'],
      correctAnswer: 'Starlight Headliner',
    },
    drawDate: new Date('2027-02-02T21:30:00Z'),
    startDate: new Date('2026-12-15T10:00:00Z'),
    endDate: new Date('2027-02-02T18:30:00Z'),
    features: [
      '6.75L twin-turbo V12',
      'Black Badge driving dynamics pack',
      'Immersive seating with massage',
      'Starlight headliner with shooting stars',
    ],
    included: [
      'Rolls-Royce chauffeur training',
      'Concierge servicing',
      'Five-year comprehensive warranty',
    ],
    specifications: [
      { label: 'Engine', value: '6.75L Twin-Turbo V12' },
      { label: 'Transmission', value: '8-Speed Automatic' },
      { label: 'Colour', value: 'Obsidian Black' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711657/lux_car_05_nhkus5.png',
        publicId: 'seed/luxury/lux_car_05_nhkus5',
      },
    ],
    isGuaranteedDraw: false,
  },
  {
    title: 'Porsche 911 Turbo S Cabriolet',
    slug: 'porsche-911-turbo-s-cabriolet',
    shortDescription:
      'Launch-control thrills with the roof down in 2.7 seconds.',
    description:
      'The Porsche 911 Turbo S Cabriolet blends blistering acceleration with everyday usability. Includes Porsche Experience Centre track day and specialist detailing package.',
    prize: 'Porsche 911 Turbo S Cabriolet',
    prizeValue: 19800000,
    cashAlternative: 17500000,
    ticketPrice: 355,
    maxTickets: 42000,
    soldTickets: 18760,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: false,
    question: {
      question: 'What is Porsche’s iconic sports car model?',
      options: ['911', '718', 'Panamera'],
      correctAnswer: '911',
    },
    drawDate: new Date('2026-12-08T19:30:00Z'),
    startDate: new Date('2026-10-15T09:00:00Z'),
    endDate: new Date('2026-12-08T16:30:00Z'),
    features: [
      '3.8L twin-turbo flat-six',
      'Sport Chrono package',
      'Rear-axle steering',
      'Burmester 3D sound system',
    ],
    included: [
      'Porsche Experience Centre track day',
      'Gtechniq ceramic detail',
      'Two-year service plan',
    ],
    specifications: [
      { label: 'Engine', value: '3.8L Twin-Turbo Flat-Six' },
      { label: 'Transmission', value: '8-Speed PDK' },
      { label: 'Colour', value: 'Carrera White Metallic' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711652/lux_car_06_l2gwso.png',
        publicId: 'seed/luxury/lux_car_06_l2gwso',
      },
    ],
    isGuaranteedDraw: true,
  },
  {
    title: 'McLaren 720S Performance Pack',
    slug: 'mclaren-720s-performance-pack',
    shortDescription:
      'Lightweight carbon pack with track telemetry and Senna seats.',
    description:
      'McLaren 720S with Performance Pack featuring Senna lightweight seats, track telemetry, and stealth finish. Includes two-day Silverstone GP tuition.',
    prize: 'McLaren 720S Performance Pack',
    prizeValue: 23500000,
    cashAlternative: 21000000,
    ticketPrice: 405,
    maxTickets: 54000,
    soldTickets: 27845,
    status: CompetitionStatus.DRAFT,
    category: 'Luxury Cars',
    featured: false,
    question: {
      question: 'McLaren Automotive is headquartered in which UK town?',
      options: ['Woking', 'Gaydon', 'Hethel'],
      correctAnswer: 'Woking',
    },
    drawDate: new Date('2027-03-10T21:00:00Z'),
    startDate: new Date('2027-01-15T09:00:00Z'),
    endDate: new Date('2027-03-10T18:00:00Z'),
    features: [
      '4.0L twin-turbo V8 – 710 hp',
      'Senna lightweight carbon seats',
      'McLaren track telemetry',
      'Stealth pack exterior',
    ],
    included: [
      'Silverstone GP two-day tuition',
      'Extended manufacturer warranty',
      'McLaren concierge delivery',
    ],
    specifications: [
      { label: 'Engine', value: '4.0L Twin-Turbo V8' },
      { label: 'Transmission', value: '7-Speed Dual-clutch' },
      { label: 'Colour', value: 'Papaya Spark' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711656/lux_car_09_uulg3q.png',
        publicId: 'seed/luxury/lux_car_09_uulg3q',
      },
    ],
    isGuaranteedDraw: false,
  },
  {
    title: 'Mercedes-AMG GT R Pro',
    slug: 'mercedes-amg-gt-r-pro',
    shortDescription:
      'Ring-bred aero with AMG track package and ceramic brakes.',
    description:
      'The Mercedes-AMG GT R Pro is bred on the Nürburgring. This example includes AMG Track Pack harnesses, carbon ceramics, and complimentary AMG Driving Academy Master program.',
    prize: 'Mercedes-AMG GT R Pro',
    prizeValue: 18000000,
    cashAlternative: 16000000,
    ticketPrice: 325,
    maxTickets: 39000,
    soldTickets: 14050,
    status: CompetitionStatus.ACTIVE,
    category: 'Luxury Cars',
    featured: false,
    question: {
      question: 'AMG originally stood for Aufrecht, Melcher and which town?',
      options: ['Grossaspach', 'Ingolstadt', 'Affalterbach'],
      correctAnswer: 'Grossaspach',
    },
    drawDate: new Date('2026-12-02T19:00:00Z'),
    startDate: new Date('2026-10-05T09:00:00Z'),
    endDate: new Date('2026-12-02T16:00:00Z'),
    features: [
      '4.0L twin-turbo V8',
      'AMG Track Package with harnesses',
      'Carbon ceramic brakes',
      'Adjustable coilover suspension',
    ],
    included: [
      'AMG Driving Academy Master programme',
      'Annual service plan',
      'Home delivery with AMG product expert',
    ],
    specifications: [
      { label: 'Engine', value: '4.0L Twin-Turbo V8' },
      { label: 'Transmission', value: '7-Speed DCT' },
      { label: 'Colour', value: 'AMG Matt Selenite Grey' },
    ],
    images: [
      {
        url: 'https://res.cloudinary.com/dm3586huj/image/upload/v1762711655/lux_car_10_fvcazy.png',
        publicId: 'seed/luxury/lux_car_10_fvcazy',
      },
    ],
    isGuaranteedDraw: true,
  },
];

const drawsSeed = [
  {
    competitionSlug: 'aston-martin-db11-v12-coupe',
    winner: {
      email: 'imogen.boyle@seedmail.com',
      firstName: 'Imogen',
      lastName: 'Boyle',
      location: 'London',
    },
    winningTicketNumber: 28764,
    totalTickets: 45000,
    drawDate: new Date('2026-12-18T21:30:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711632/royal_winner_01_jmbyec.png',
    publicId: 'seed/winners/royal_winner_01_jmbyec',
  },
  {
    competitionSlug: 'lamborghini-huracan-evo-spyder',
    winner: {
      email: 'marcus.hanley@seedmail.com',
      firstName: 'Marcus',
      lastName: 'Hanley',
      location: 'Dublin',
    },
    winningTicketNumber: 41022,
    totalTickets: 52000,
    drawDate: new Date('2027-01-05T21:00:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711633/royal_winner_02_lna8dg.png',
    publicId: 'seed/winners/royal_winner_02_lna8dg',
  },
  {
    competitionSlug: 'ferrari-f8-tributo-rosso-corsa',
    winner: {
      email: 'amelia.preston@seedmail.com',
      firstName: 'Amelia',
      lastName: 'Preston',
      location: 'Edinburgh',
    },
    winningTicketNumber: 19754,
    totalTickets: 55000,
    drawDate: new Date('2027-01-20T20:30:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711634/royal_winner_03_epzku7.png',
    publicId: 'seed/winners/royal_winner_03_epzku7',
  },
  {
    competitionSlug: 'bentley-continental-gt-speed',
    winner: {
      email: 'jacob.lister@seedmail.com',
      firstName: 'Jacob',
      lastName: 'Lister',
      location: 'Birmingham',
    },
    winningTicketNumber: 12487,
    totalTickets: 43000,
    drawDate: new Date('2026-12-12T20:00:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711631/royal_winner_04_deiloa.png',
    publicId: 'seed/winners/royal_winner_04_deiloa',
  },
  {
    competitionSlug: 'rolls-royce-cullinan-black-badge',
    winner: {
      email: 'sophia.cho@seedmail.com',
      firstName: 'Sophia',
      lastName: 'Cho',
      location: 'Singapore',
    },
    winningTicketNumber: 50210,
    totalTickets: 60000,
    drawDate: new Date('2027-02-02T21:30:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711631/royal_winner_05_jtwgjo.png',
    publicId: 'seed/winners/royal_winner_05_jtwgjo',
  },
  {
    competitionSlug: 'porsche-911-turbo-s-cabriolet',
    winner: {
      email: 'daniel.mercer@seedmail.com',
      firstName: 'Daniel',
      lastName: 'Mercer',
      location: 'Auckland',
    },
    winningTicketNumber: 9821,
    totalTickets: 42000,
    drawDate: new Date('2026-12-08T19:30:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711632/royal_winner_01_jmbyec.png',
    publicId: 'seed/winners/royal_winner_01_jmbyec',
  },
  {
    competitionSlug: 'mclaren-720s-performance-pack',
    winner: {
      email: 'leon.madrid@seedmail.com',
      firstName: 'Leon',
      lastName: 'Madrid',
      location: 'Barcelona',
    },
    winningTicketNumber: 21567,
    totalTickets: 54000,
    drawDate: new Date('2027-03-10T21:00:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711633/royal_winner_02_lna8dg.png',
    publicId: 'seed/winners/royal_winner_02_lna8dg',
  },
  {
    competitionSlug: 'mercedes-amg-gt-r-pro',
    winner: {
      email: 'olivia.fischer@seedmail.com',
      firstName: 'Olivia',
      lastName: 'Fischer',
      location: 'Munich',
    },
    winningTicketNumber: 7642,
    totalTickets: 39000,
    drawDate: new Date('2026-12-02T19:00:00Z'),
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711634/royal_winner_03_epzku7.png',
    publicId: 'seed/winners/royal_winner_03_epzku7',
  },
];

const championsSeed = [
  {
    competitionSlug: 'aston-martin-db11-v12-coupe',
    drawDate: new Date('2026-12-18T21:30:00Z'),
    testimonial:
      'I still can’t believe I got the winning call! Royal Competitions handled everything seamlessly and the Aston looks incredible on my drive.',
    prizeValue: '£185,000',
    featured: true,
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711632/royal_winner_01_jmbyec.png',
    imagePublicId: 'seed/winners/royal_winner_01_jmbyec',
  },
  {
    competitionSlug: 'lamborghini-huracan-evo-spyder',
    drawDate: new Date('2027-01-05T21:00:00Z'),
    testimonial:
      'Taking delivery of a V10 Lambo is a dream come true. The whole team made the experience unforgettable.',
    prizeValue: '£225,000',
    featured: true,
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711633/royal_winner_02_lna8dg.png',
    imagePublicId: 'seed/winners/royal_winner_02_lna8dg',
  },
  {
    competitionSlug: 'ferrari-f8-tributo-rosso-corsa',
    drawDate: new Date('2027-01-20T20:30:00Z'),
    testimonial:
      'Flying out to Maranello for the handover was the highlight of my year. Thank you Royal Competitions!',
    prizeValue: '£238,000',
    featured: true,
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711634/royal_winner_03_epzku7.png',
    imagePublicId: 'seed/winners/royal_winner_03_epzku7',
  },
  {
    competitionSlug: 'bentley-continental-gt-speed',
    drawDate: new Date('2026-12-12T20:00:00Z'),
    testimonial:
      'The Bentley arrived with a custom luggage set and the concierge service was next level. Truly effortless.',
    prizeValue: '£210,000',
    featured: false,
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711631/royal_winner_04_deiloa.png',
    imagePublicId: 'seed/winners/royal_winner_04_deiloa',
  },
  {
    competitionSlug: 'rolls-royce-cullinan-black-badge',
    drawDate: new Date('2027-02-02T21:30:00Z'),
    testimonial:
      'Royal Competitions treated us like royalty from start to finish. The Cullinan is everything we hoped for.',
    prizeValue: '£325,000',
    featured: true,
    imageUrl:
      'https://res.cloudinary.com/dm3586huj/image/upload/v1762711631/royal_winner_05_jtwgjo.png',
    imagePublicId: 'seed/winners/royal_winner_05_jtwgjo',
  },
];

const SEED_ADMIN_EMAIL = 'seed.admin@royalcompetitions.co.uk';

const seedShowcaseData = async () => {
  try {
    await connectDatabase();

    if (process.env.SEED_RESET === 'true') {
      logger.warn(
        'SEED_RESET=true detected – clearing existing competitions, draws, champions'
      );
      await Champion.deleteMany({});
      await Draw.deleteMany({});
      await Competition.deleteMany({});
    }

    const seedAdmin = await ensureUser(SEED_ADMIN_EMAIL, {
      firstName: 'Seed',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      password: process.env.SEED_ADMIN_PASSWORD || 'SeedAdmin123!',
    });

    logger.info(
      `Using seed admin ${seedAdmin.email} (${seedAdmin._id}) as competition creator`
    );

    const competitionDocs = [];
    for (const comp of competitionsSeed) {
      const slug = comp.slug ?? slugify(comp.title);

      const existing = await Competition.findOne({ slug });
      if (existing) {
        logger.info(`Competition already exists: ${existing.title} (${slug})`);
        competitionDocs.push(existing);
        continue;
      }

      const created = await Competition.create({
        ...comp,
        slug,
        createdBy: seedAdmin._id,
        isActive: comp.status !== CompetitionStatus.DRAFT,
      });

      logger.info(`Competition created: ${created.title}`);
      competitionDocs.push(created);
    }

    const competitionMap = new Map(
      competitionDocs.map((doc) => [doc.slug, doc])
    );

    const drawDocs = [];
    for (const drawSeed of drawsSeed) {
      const competition = competitionMap.get(drawSeed.competitionSlug);

      if (!competition) {
        logger.warn(
          `Skipping draw – competition not found for slug ${drawSeed.competitionSlug}`
        );
        continue;
      }

      const competitionId = competition._id as mongoose.Types.ObjectId;

      const winnerUser = await ensureUser(drawSeed.winner.email, {
        firstName: drawSeed.winner.firstName,
        lastName: drawSeed.winner.lastName,
      });

      const existingDraw = await Draw.findOne({
        competitionId,
        drawDate: drawSeed.drawDate,
      });

      if (existingDraw) {
        logger.info(`Draw already exists for competition ${competition.title}`);
        drawDocs.push(existingDraw);
        continue;
      }

      const draw = await Draw.create({
        competitionId,
        competitionTitle: competition.title,
        prizeName: competition.prize,
        prizeValue: competition.prizeValue,
        winnerId: winnerUser._id as mongoose.Types.ObjectId,
        winnerName: `${winnerUser.firstName} ${winnerUser.lastName}`,
        winnerLocation: drawSeed.winner.location,
        drawDate: drawSeed.drawDate,
        drawnAt: new Date(),
        totalTickets: drawSeed.totalTickets,
        winningTicketNumber: drawSeed.winningTicketNumber,
        imageUrl: drawSeed.imageUrl,
        publicId: drawSeed.publicId,
        isActive: true,
      });

      // Update competition status to completed
      competition.status = CompetitionStatus.COMPLETED;
      competition.drawnAt = draw.drawnAt;
      competition.winnerId = winnerUser._id as mongoose.Types.ObjectId;
      competition.isActive = true;
      await competition.save();

      drawDocs.push(draw);
      logger.info(
        `Draw created for ${competition.title} (winner: ${draw.winnerName})`
      );
    }

    for (const champSeed of championsSeed) {
      const competition = competitionMap.get(champSeed.competitionSlug);
      if (!competition) {
        logger.warn(
          `Skipping champion – competition not found for slug ${champSeed.competitionSlug}`
        );
        continue;
      }

      const competitionId = competition._id as mongoose.Types.ObjectId;

      const draw = drawDocs.find(
        (doc) =>
          doc.competitionId.toString() === competitionId.toString() &&
          doc.drawDate.toISOString() ===
            new Date(champSeed.drawDate).toISOString()
      );

      if (!draw) {
        logger.warn(
          `Skipping champion – draw not found for competition ${competition.title}`
        );
        continue;
      }

      const existingChampion = await Champion.findOne({ drawId: draw._id });
      if (existingChampion) {
        logger.info(`Champion already exists for draw ${draw._id}`);
        continue;
      }

      const winnerUser = await User.findById(draw.winnerId);
      if (!winnerUser) {
        logger.warn(
          `Skipping champion – winner user missing for draw ${draw._id}`
        );
        continue;
      }

      const winnerUserId = draw.winnerId as mongoose.Types.ObjectId;
      const championPrizeValue = draw.prizeValue ?? competition.prizeValue ?? 0;

      await Champion.create({
        drawId: draw._id,
        competitionId,
        winnerId: winnerUserId,
        winnerName: draw.winnerName,
        winnerLocation: draw.winnerLocation,
        prizeName: draw.prizeName,
        prizeValue:
          champSeed.prizeValue ??
          `£${(championPrizeValue / 100).toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        testimonial: champSeed.testimonial,
        featured: champSeed.featured ?? false,
        image: {
          url: champSeed.imageUrl,
          publicId: champSeed.imagePublicId,
        },
        isActive: true,
      });

      logger.info(
        `Champion created for ${competition.title} (${draw.winnerName})`
      );
    }

    console.log('✅ Showcase data seeded successfully!');
    console.log(`   Competitions: ${competitionDocs.length}`);
    console.log(`   Draws:        ${drawDocs.length}`);
    console.log(`   Champions:   ${await Champion.countDocuments({})}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    logger.error('Error seeding showcase data', error);
    console.error('❌ Error seeding showcase data:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seedShowcaseData();
}

export default seedShowcaseData;
