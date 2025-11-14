import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import {
  Champion,
  Competition,
  Draw,
  User,
  UserRole,
  Winner,
  Ticket,
  TicketStatus,
} from '../models';
import { CompetitionStatus, DrawMode } from '../models/Competition.model';
import { DrawMethod } from '../models/Draw.model';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';
import drawService from '../services/draw.service';

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
    prizeValue: 18500000, // £185,000 in pence
    cashAlternative: 16500000, // £165,000 in pence
    ticketPricePence: 39500, // £395 in pence
    ticketLimit: 45000,
    ticketsSold: 28930,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: true,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2026-12-18T21:30:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 28931,
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
    question: {
      question: 'What is the displacement of the Aston Martin DB11 V12 engine?',
      options: ['4.0L', '5.2L', '6.0L', '6.75L'],
      answerOptions: ['4.0L', '5.2L', '6.0L', '6.75L'],
      correctAnswer: '5.2L',
      explanation:
        'The Aston Martin DB11 V12 features a twin-turbocharged 5.2L V12 engine.',
    },
  },
  {
    title: 'Lamborghini Huracán EVO Spyder',
    slug: 'lamborghini-huracan-evo-spyder',
    shortDescription: 'Naturally aspirated V10 with Ad Personam interior.',
    description:
      'Drop the roof and feel the 640 hp V10. This Huracán EVO Spyder arrives with lifestyle handover, track-experience voucher, and a bespoke cover to protect the supercar at home.',
    prize: 'Lamborghini Huracán EVO Spyder',
    prizeValue: 22500000, // £225,000 in pence
    cashAlternative: 20000000, // £200,000 in pence
    ticketPricePence: 42500, // £425 in pence
    ticketLimit: 52000,
    ticketsSold: 31210,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: true,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2027-01-05T21:00:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 31211,
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
    question: {
      question: 'Which Italian city is Lamborghini headquartered in?',
      options: ['Milan', 'Bologna', 'Turin', 'Modena'],
      answerOptions: ['Milan', 'Bologna', 'Turin', 'Modena'],
      correctAnswer: 'Bologna',
      explanation:
        "Lamborghini is headquartered in Sant'Agata Bolognese, near Bologna, Italy.",
    },
  },
  {
    title: 'Ferrari F8 Tributo Rosso Corsa',
    slug: 'ferrari-f8-tributo-rosso-corsa',
    shortDescription: 'Prancing horse pedigree with tailor-made specification.',
    description:
      'Ferrari F8 Tributo with carbon driver zone, forged wheels and Scuderia shields. Includes factory tour in Maranello for two and a masterclass with Ferrari’s Driver Academy.',
    prize: 'Ferrari F8 Tributo',
    prizeValue: 23800000, // £238,000 in pence
    cashAlternative: 21000000, // £210,000 in pence
    ticketPricePence: 44500, // £445 in pence
    ticketLimit: 55000,
    ticketsSold: 37220,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: true,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2027-01-20T20:30:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 37221,
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
    question: {
      question: 'What does the "F8" in Ferrari F8 Tributo stand for?',
      options: [
        'Formula 8',
        'Ferrari 8-cylinder',
        'Ferrari 8th generation',
        'It represents 8 cylinders',
      ],
      answerOptions: [
        'Formula 8',
        'Ferrari 8-cylinder',
        'Ferrari 8th generation',
        'It represents 8 cylinders',
      ],
      correctAnswer: 'It represents 8 cylinders',
      explanation:
        'The F8 Tributo name celebrates the 8-cylinder engine, which has been a Ferrari hallmark for over 70 years.',
    },
  },
  {
    title: 'Bentley Continental GT Speed',
    slug: 'bentley-continental-gt-speed',
    shortDescription: 'Grand touring luxury with handcrafted Mulliner details.',
    description:
      'The Bentley Continental GT Speed combines effortless W12 power with Mulliner craftsmanship. Complimentary chauffeur experience and bespoke luggage set included.',
    prize: 'Bentley Continental GT Speed',
    prizeValue: 21000000, // £210,000 in pence
    cashAlternative: 19000000, // £190,000 in pence
    ticketPricePence: 36500, // £365 in pence
    ticketLimit: 43000,
    ticketsSold: 23350,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: false,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2026-12-12T20:00:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 23351,
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
    question: {
      question:
        'What type of engine configuration does the Bentley Continental GT Speed use?',
      options: ['V8', 'V10', 'V12', 'W12'],
      answerOptions: ['V8', 'V10', 'V12', 'W12'],
      correctAnswer: 'W12',
      explanation:
        'The Bentley Continental GT Speed features a 6.0L twin-turbocharged W12 engine.',
    },
  },
  {
    title: 'Rolls-Royce Cullinan Black Badge',
    slug: 'rolls-royce-cullinan-black-badge',
    shortDescription: 'The ultimate statement SUV with Starlight headliner.',
    description:
      'Rolls-Royce Cullinan Black Badge, featuring bespoke Starlight headliner, immersive rear theatre, and artisan picnic hampers. Includes VIP chauffeur induction.',
    prize: 'Rolls-Royce Cullinan Black Badge',
    prizeValue: 32500000, // £325,000 in pence
    cashAlternative: 29500000, // £295,000 in pence
    ticketPricePence: 48500, // £485 in pence
    ticketLimit: 60000,
    ticketsSold: 40890,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: true,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2027-02-02T21:30:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 40891,
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
    question: {
      question:
        "What is the name of Rolls-Royce's signature feature that creates a starry sky effect in the ceiling?",
      options: [
        'Starlight Headliner',
        'Celestial Roof',
        'Starry Night',
        'Galaxy Ceiling',
      ],
      answerOptions: [
        'Starlight Headliner',
        'Celestial Roof',
        'Starry Night',
        'Galaxy Ceiling',
      ],
      correctAnswer: 'Starlight Headliner',
      explanation:
        "The Starlight Headliner is a Rolls-Royce signature feature that uses fiber-optic lights to create a starry sky effect in the vehicle's ceiling.",
    },
  },
  {
    title: 'Porsche 911 Turbo S Cabriolet',
    slug: 'porsche-911-turbo-s-cabriolet',
    shortDescription:
      'Launch-control thrills with the roof down in 2.7 seconds.',
    description:
      'The Porsche 911 Turbo S Cabriolet blends blistering acceleration with everyday usability. Includes Porsche Experience Centre track day and specialist detailing package.',
    prize: 'Porsche 911 Turbo S Cabriolet',
    prizeValue: 19800000, // £198,000 in pence
    cashAlternative: 17500000, // £175,000 in pence
    ticketPricePence: 35500, // £355 in pence
    ticketLimit: 42000,
    ticketsSold: 18760,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: false,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2026-12-08T19:30:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 18761,
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
    question: {
      question: 'What does "PDK" stand for in Porsche transmissions?',
      options: [
        'Porsche Dual Clutch',
        'Porsche Direct Kinematic',
        'Porsche Doppelkupplung',
        'Porsche Dynamic Kinetic',
      ],
      answerOptions: [
        'Porsche Dual Clutch',
        'Porsche Direct Kinematic',
        'Porsche Doppelkupplung',
        'Porsche Dynamic Kinetic',
      ],
      correctAnswer: 'Porsche Doppelkupplung',
      explanation:
        'PDK stands for Porsche Doppelkupplung, which is German for "double clutch" - Porsche\'s dual-clutch transmission system.',
    },
  },
  {
    title: 'McLaren 720S Performance Pack',
    slug: 'mclaren-720s-performance-pack',
    shortDescription:
      'Lightweight carbon pack with track telemetry and Senna seats.',
    description:
      'McLaren 720S with Performance Pack featuring Senna lightweight seats, track telemetry, and stealth finish. Includes two-day Silverstone GP tuition.',
    prize: 'McLaren 720S Performance Pack',
    prizeValue: 23500000, // £235,000 in pence
    cashAlternative: 21000000, // £210,000 in pence
    ticketPricePence: 40500, // £405 in pence
    ticketLimit: 54000,
    ticketsSold: 27845,
    status: CompetitionStatus.DRAFT,
    category: 'Luxury Cars',
    featured: false,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2027-03-10T21:00:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 27846,
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
    question: {
      question:
        'Which Formula 1 driver is the McLaren 720S Performance Pack named after?',
      options: ['Lewis Hamilton', 'Ayrton Senna', 'Alain Prost', 'Niki Lauda'],
      answerOptions: [
        'Lewis Hamilton',
        'Ayrton Senna',
        'Alain Prost',
        'Niki Lauda',
      ],
      correctAnswer: 'Ayrton Senna',
      explanation:
        'The McLaren 720S Performance Pack features Senna lightweight seats, named after the legendary Formula 1 driver Ayrton Senna.',
    },
  },
  {
    title: 'Mercedes-AMG GT R Pro',
    slug: 'mercedes-amg-gt-r-pro',
    shortDescription:
      'Ring-bred aero with AMG track package and ceramic brakes.',
    description:
      'The Mercedes-AMG GT R Pro is bred on the Nürburgring. This example includes AMG Track Pack harnesses, carbon ceramics, and complimentary AMG Driving Academy Master program.',
    prize: 'Mercedes-AMG GT R Pro',
    prizeValue: 18000000, // £180,000 in pence
    cashAlternative: 16000000, // £160,000 in pence
    ticketPricePence: 32500, // £325 in pence
    ticketLimit: 39000,
    ticketsSold: 14050,
    status: CompetitionStatus.LIVE,
    category: 'Luxury Cars',
    featured: false,
    drawMode: DrawMode.AUTOMATIC,
    drawAt: new Date('2026-12-02T19:00:00Z'),
    freeEntryEnabled: false,
    nextTicketNumber: 14051,
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
    question: {
      question:
        'Which famous race track is the Mercedes-AMG GT R Pro "bred on" according to its description?',
      options: ['Silverstone', 'Monaco', 'Nürburgring', 'Spa-Francorchamps'],
      answerOptions: [
        'Silverstone',
        'Monaco',
        'Nürburgring',
        'Spa-Francorchamps',
      ],
      correctAnswer: 'Nürburgring',
      explanation:
        'The Mercedes-AMG GT R Pro is bred on the Nürburgring, one of the most challenging race tracks in the world.',
    },
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
    const winnerLocationMap = new Map<string, string>(); // Map competition slug to winner location
    for (const drawSeed of drawsSeed) {
      const competition = competitionMap.get(drawSeed.competitionSlug);

      if (!competition) {
        logger.warn(
          `Skipping draw – competition not found for slug ${drawSeed.competitionSlug}`
        );
        continue;
      }

      const competitionId = competition._id as mongoose.Types.ObjectId;

      // Store winner location for later use in champion creation
      winnerLocationMap.set(
        drawSeed.competitionSlug,
        drawSeed.winner.location || 'UK'
      );

      const winnerUser = await ensureUser(drawSeed.winner.email, {
        firstName: drawSeed.winner.firstName,
        lastName: drawSeed.winner.lastName,
      });

      // Check if draw already exists (by drawTime matching drawDate)
      const existingDraw = await Draw.findOne({
        competitionId,
        drawTime: drawSeed.drawDate,
      });

      if (existingDraw) {
        logger.info(`Draw already exists for competition ${competition.title}`);

        // Check if winner exists for this draw
        const existingWinner = await Winner.findOne({
          drawId: existingDraw._id,
        });

        if (!existingWinner) {
          // Draw exists but no winner, create the winner
          logger.info(
            `Creating winner for existing draw: ${competition.title}`
          );

          // Get or create winning ticket
          let ticketId: mongoose.Types.ObjectId;
          const winningTicket = await Ticket.findOne({
            competitionId,
            ticketNumber: drawSeed.winningTicketNumber,
          });

          if (!winningTicket) {
            const newTicket = await Ticket.create({
              competitionId,
              ticketNumber: drawSeed.winningTicketNumber,
              userId: winnerUser._id,
              status: TicketStatus.ACTIVE,
            });
            ticketId = newTicket._id as mongoose.Types.ObjectId;
          } else {
            ticketId = winningTicket._id as mongoose.Types.ObjectId;
            if (winningTicket.status !== TicketStatus.ACTIVE) {
              winningTicket.status = TicketStatus.ACTIVE;
              winningTicket.userId = winnerUser._id as mongoose.Types.ObjectId;
              await winningTicket.save();
            }
          }

          // Generate claim code
          const generateClaimCode = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const part1 = Array.from({ length: 4 }, () =>
              chars.charAt(Math.floor(Math.random() * chars.length))
            ).join('');
            const part2 = Array.from({ length: 4 }, () =>
              chars.charAt(Math.floor(Math.random() * chars.length))
            ).join('');
            return `${part1}-${part2}`;
          };

          // Create winner for existing draw
          await Winner.create({
            drawId: existingDraw._id,
            competitionId,
            ticketId,
            userId: winnerUser._id as mongoose.Types.ObjectId,
            ticketNumber: drawSeed.winningTicketNumber,
            prize: competition.prize,
            notified: false,
            claimed: false,
            claimCode: generateClaimCode(),
            proofImageUrl: drawSeed.imageUrl,
            drawVideoUrl: drawSeed.imageUrl,
          });

          // Mark ticket as winner
          const ticket = await Ticket.findById(ticketId);
          if (ticket) {
            ticket.status = TicketStatus.WINNER;
            await ticket.save();
          }

          logger.info(
            `Winner created for existing draw: ${competition.title} (winner: ${winnerUser.firstName} ${winnerUser.lastName})`
          );
        } else {
          logger.info(`Winner already exists for draw: ${competition.title}`);
        }

        drawDocs.push(existingDraw);
        continue;
      }

      // Create tickets for the draw (simplified - create winning ticket)
      // In a real scenario, you'd create all tickets, but for seeding we'll just create the winning ticket
      const winningTicket = await Ticket.findOne({
        competitionId,
        ticketNumber: drawSeed.winningTicketNumber,
      });

      let ticketId: mongoose.Types.ObjectId;
      if (!winningTicket) {
        // Create the winning ticket if it doesn't exist
        const newTicket = await Ticket.create({
          competitionId,
          ticketNumber: drawSeed.winningTicketNumber,
          userId: winnerUser._id,
          status: TicketStatus.ACTIVE,
        });
        ticketId = newTicket._id as mongoose.Types.ObjectId;
      } else {
        ticketId = winningTicket._id as mongoose.Types.ObjectId;
        // Update ticket to active if it's not
        if (winningTicket.status !== TicketStatus.ACTIVE) {
          winningTicket.status = TicketStatus.ACTIVE;
          winningTicket.userId = winnerUser._id as mongoose.Types.ObjectId;
          await winningTicket.save();
        }
      }

      // Create draw with new structure
      // For seeding, create a snapshot with the winning ticket
      // In production, we'd fetch all active tickets, but for seeding we'll use a simplified approach
      const drawSeedValue = drawService.generateSeed();

      // Get total tickets that should exist for this competition (for snapshotTicketCount)
      const totalTickets =
        drawSeed.totalTickets ||
        competition.ticketsSold ||
        competition.ticketLimit ||
        1;

      // Create snapshot with the winning ticket
      // For showcase data, we'll create a simplified snapshot with just the winning ticket
      // In production, this would include all active tickets at the time of the draw
      const snapshot: Array<{
        ticketNumber: number;
        ticketId: string;
        userId?: string;
      }> = [
        {
          ticketNumber: drawSeed.winningTicketNumber,
          ticketId: String(ticketId),
          userId: String(winnerUser._id),
        },
      ];

      // Create draw record (drawService will set snapshotTicketCount to snapshot.length)
      const draw = await drawService.createDrawRecord(
        String(competitionId),
        drawSeedValue,
        [
          {
            ticketNumber: drawSeed.winningTicketNumber,
            ticketId: ticketId,
            userId: winnerUser._id as mongoose.Types.ObjectId,
          },
        ],
        snapshot,
        DrawMethod.MANUAL,
        String(seedAdmin._id),
        'Seed data draw', // notes
        drawSeed.imageUrl, // evidenceUrl
        'https://youtu.be/9tjYe__vGCw?si=kOhgSeEAvNvL9l3T', // liveUrl
        'youtube' // urlType
      );

      // Update drawTime to match drawDate (must be done after creation)
      draw.drawTime = drawSeed.drawDate;

      // Update snapshotTicketCount to match totalTickets from seed (for showcase purposes)
      // This represents the total number of tickets that existed at the time of the draw
      draw.snapshotTicketCount = totalTickets;
      await draw.save();

      // Generate claim code (same logic as Winner model pre-save hook)
      const generateClaimCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const part1 = Array.from({ length: 4 }, () =>
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
        const part2 = Array.from({ length: 4 }, () =>
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
        return `${part1}-${part2}`;
      };

      // Create winner
      await Winner.create({
        drawId: draw._id,
        competitionId,
        ticketId,
        userId: winnerUser._id as mongoose.Types.ObjectId,
        ticketNumber: drawSeed.winningTicketNumber,
        prize: competition.prize,
        notified: false,
        claimed: false,
        claimCode: generateClaimCode(),
        proofImageUrl: drawSeed.imageUrl,
      });

      // Mark ticket as winner
      const ticket = await Ticket.findById(ticketId);
      if (ticket) {
        ticket.status = TicketStatus.WINNER;
        await ticket.save();
      }

      // Update competition status to drawn
      competition.status = CompetitionStatus.DRAWN;
      competition.drawnAt = drawSeed.drawDate;
      await competition.save();

      drawDocs.push(draw);
      logger.info(
        `Draw created for ${competition.title} (winner: ${winnerUser.firstName} ${winnerUser.lastName})`
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

      // Find draw by drawTime matching drawDate
      const draw = drawDocs.find(
        (doc) =>
          doc.competitionId.toString() === competitionId.toString() &&
          doc.drawTime.toISOString() ===
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

      // Get winner from draw
      const winner = await Winner.findOne({ drawId: draw._id });
      if (!winner || !winner.userId) {
        logger.warn(
          `Skipping champion – winner not found for draw ${draw._id}`
        );
        continue;
      }

      const winnerUser = await User.findById(winner.userId);
      if (!winnerUser) {
        logger.warn(
          `Skipping champion – winner user missing for draw ${draw._id}`
        );
        continue;
      }

      // Get winner location from draw seed (stored in winnerLocationMap)
      const winnerLocation =
        winnerLocationMap.get(champSeed.competitionSlug) || 'UK';

      // Convert prizeValue from pence to formatted string if not provided in champSeed
      const championPrizeValue = competition.prizeValue ?? 0;
      const formattedPrizeValue = champSeed.prizeValue
        ? champSeed.prizeValue
        : `£${(championPrizeValue / 100).toLocaleString('en-GB', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`;

      await Champion.create({
        drawId: draw._id,
        competitionId,
        winnerId: winner.userId as mongoose.Types.ObjectId,
        winnerName: `${winnerUser.firstName} ${winnerUser.lastName}`,
        winnerLocation: winnerLocation,
        prizeName: competition.prize,
        prizeValue: formattedPrizeValue,
        testimonial: champSeed.testimonial,
        featured: champSeed.featured ?? false,
        image: {
          url: champSeed.imageUrl,
          publicId: champSeed.imagePublicId,
        },
        isActive: true,
      });

      logger.info(
        `Champion created for ${competition.title} (${winnerUser.firstName} ${winnerUser.lastName})`
      );
    }

    const winnerCount = await Winner.countDocuments({});

    console.log('✅ Showcase data seeded successfully!');
    console.log(`   Competitions: ${competitionDocs.length}`);
    console.log(`   Draws:        ${drawDocs.length}`);
    console.log(`   Winners:      ${winnerCount}`);
    console.log(`   Champions:    ${await Champion.countDocuments({})}`);

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
