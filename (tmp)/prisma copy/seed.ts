/**
 * @license GPL-3.0-or-later
 * © 2025 Caleb Gyamfi – Omnixys Technologies
 *
 * Prisma Seeder for Event Service
 * Creates a mock premium event including:
 * - Event root, address, settings, theme
 * - Media blocks
 * - Description blocks (hero, text, gallery, features, timeline, location, team, faq, quote)
 * - Optional minimal seating structure
 */

    import { PrismaClient } from '../src/prisma/generated/client.js';
    import { PrismaPg } from '@prisma/adapter-pg';
    import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Event Service...');

  //
  // 1) Create Event
  //
  const event = await prisma.event.create({
    data: {
      name: 'The Future Experience',
      startsAt: new Date('2025-08-20T18:00:00.000Z'),
      endsAt: new Date('2025-08-21T02:00:00.000Z'),
      allowReEntry: true,
      rotateSeconds: 300,
      maxSeats: 300,
    },
  });

  console.log('✔ Event created:', event.id);

  //
  // 2) Address with latitude + longitude
  //
  await prisma.eventAddress.create({
    data: {
      eventId: event.id,
      street: 'Kulturhalle Zenith, Lilienthalallee 29',
      city: 'München',
      zip: '80939',
      country: 'Deutschland',
      latitude: 48.1924,
      longitude: 11.617,
    },
  });

  //
  // 3) Settings (generic JSON)
  //
  await prisma.eventSettings.create({
    data: {
      eventId: event.id,
      data: {
        rsvpRequired: true,
        plusOnesAllowed: true,
        ticketSecurity: 'strict',
        checkInMode: 'dual-gate',
        themeMode: 'vision-pro',
      },
    },
  });

  //
  // 4) Theme (colors, layout, typography)
  //
  await prisma.eventTheme.create({
    data: {
      eventId: event.id,
      colors: {
        primary: '#6A4BBC',
        secondary: '#4E3792',
        accent: '#A3E635',
      },
      layout: {
        radius: 28,
        blur: 22,
        glassOpacity: 0.18,
      },
      typography: {
        heading: 'Poppins',
        body: 'Inter',
      },
    },
  });

  //
  // 5) Media (hero + gallery as preview)
  //
  await prisma.eventMedia.createMany({
    data: [
      {
        eventId: event.id,
        kind: 'hero',
        url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80',
        alt: 'Hero Background',
        order: 0,
      },
      {
        eventId: event.id,
        kind: 'gallery',
        url: 'https://images.unsplash.com/photo-1503264116251-35a269479413?q=80',
        alt: 'Gallery Image 1',
        order: 1,
      },
      {
        eventId: event.id,
        kind: 'gallery',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80',
        alt: 'Gallery Image 2',
        order: 2,
      },
      {
        eventId: event.id,
        kind: 'gallery',
        url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80',
        alt: 'Gallery Image 3',
        order: 3,
      },
    ],
  });

  //
  // 6) Description Blocks (based on your mock)
  //
  const blocks = [
    {
      id: 'hero-1',
      type: 'hero',
      order: 0,
      visible: true,
      props: {
        title: 'The Future Experience',
        subtitle:
          'Eine exklusive Nacht voller Vision, Technologie und Inspiration.',
        backgroundImage:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80',
        overlayOpacity: 0.32,
        height: '82vh',
      },
    },

    {
      id: 'text-1',
      type: 'text',
      order: 1,
      visible: true,
      props: {
        title: 'Eine Nacht, die du nie vergessen wirst',
        content: `
Willkommen zu einem Erlebnis, das weit über klassische Events hinausgeht.  
Wir bringen Menschen zusammen, die Neues entdecken möchten – durch beeindruckende Visuals, Live-Performances und immersive Installationen.

Tauche ein in eine Welt, in der Technologie und Kreativität miteinander verschmelzen.
        `,
        align: 'left',
      },
    },

    {
      id: 'gallery-1',
      type: 'gallery',
      order: 2,
      visible: true,
      props: {
        images: [
          'https://images.unsplash.com/photo-1503264116251-35a269479413?q=80',
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80',
          'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80',
        ],
        aspectRatio: '16:9',
      },
    },

    {
      id: 'features-1',
      type: 'features',
      order: 3,
      visible: true,
      props: {
        items: [
          {
            icon: 'star',
            title: 'Live Performance',
            description:
              'Erlebe internationale Artists in einer spektakulären Show.',
          },
          {
            icon: 'bolt',
            title: 'Immersive Technology',
            description:
              'Interaktive Installationen, AR-Momente und visuelle Highlights.',
          },
          {
            icon: 'groups',
            title: 'Community',
            description:
              'Treffe visionäre Menschen aus Design, Tech, Kunst & Business.',
          },
        ],
      },
    },

    {
      id: 'timeline-1',
      type: 'timeline',
      order: 4,
      visible: true,
      props: {
        steps: [
          {
            time: '18:00',
            title: 'Einlass & Welcome Lounge',
            description:
              'Soft Drinks, Networking, Ambient Sound & Lichtinstallation.',
          },
          {
            time: '19:30',
            title: 'Keynote – The Future Experience',
            description:
              'Inspirierende Opening-Session über Kreativität & Technologie.',
          },
          {
            time: '20:30',
            title: 'Main Show',
            description:
              'Live Performance, audiovisuelles Immersive-Set, Spezialeffekte.',
          },
          {
            time: '22:00',
            title: 'After Lounge',
            description:
              'Chill Vibes, Drinks, Networking und Interaktionen mit Künstlern.',
          },
        ],
      },
    },

    {
      id: 'location-1',
      type: 'location',
      order: 5,
      visible: true,
      props: {
        title: 'Location',
        address: 'Kulturhalle Zenith, Lilienthalallee 29, 80939 München',
        image:
          'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80',
        mapEmbedUrl:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2663.5135!2d11.617!3d48.1924',
      },
    },

    {
      id: 'team-1',
      type: 'team',
      order: 6,
      visible: true,
      props: {
        members: [
          {
            name: 'Sophia Kramer',
            role: 'Creative Director',
            image:
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80',
            bio: 'Expertin für immersive Experiences & audiovisuelle Kunst.',
          },
          {
            name: 'Luca Benetti',
            role: 'Lead Producer',
            image:
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80',
            bio: 'Verantwortlich für Showproduktion & internationale Künstler.',
          },
          {
            name: 'Amina Watanabe',
            role: 'Experience Designer',
            image:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80',
            bio: 'Gestaltet Interaktion & Atmosphären, die unvergesslich bleiben.',
          },
        ],
      },
    },

    {
      id: 'faq-1',
      type: 'faq',
      order: 7,
      visible: true,
      props: {
        items: [
          {
            question: 'Gibt es eine Abendkasse?',
            answer:
              'Ja, jedoch empfehlen wir Tickets im Voraus zu buchen – die Kapazität ist begrenzt.',
          },
          {
            question: 'Gibt es eine Altersbeschränkung?',
            answer:
              'Empfohlen ab 16 Jahren. Minderjährige benötigen Begleitung.',
          },
          {
            question: 'Ist die Location barrierefrei?',
            answer:
              'Ja, alle Bereiche sind vollständig barrierefrei zugänglich.',
          },
        ],
      },
    },

    {
      id: 'quote-1',
      type: 'quote',
      order: 8,
      visible: true,
      props: {
        quote: '“Innovation entsteht dort, wo Technologie auf Emotion trifft.”',
        author: 'The Future Experience Team',
      },
    },
  ];

  await prisma.eventDescriptionBlock.createMany({
    data: blocks.map((b) => ({
      id: b.id,
      eventId: event.id,
      type: b.type,
      order: b.order,
      visible: b.visible,
      props: b.props,
    })),
  });

  console.log('✔ Description Blocks inserted');

  //
  // ⭐ OPTIONAL: add minimal seating structure
  //
  const vipSection = await prisma.eventSection.create({
    data: {
      eventId: event.id,
      name: 'VIP',
      order: 0,
      capacity: 20,
      meta: { color: '#FFD700' },
    },
  });

  const vipTable = await prisma.eventTable.create({
    data: {
      eventId: event.id,
      sectionId: vipSection.id,
      name: '1',
      order: 0,
      capacity: 10,
      meta: { shape: 'round' },
    },
  });

  await prisma.seat.createMany({
    data: Array.from({ length: 10 }).map((_, i) => ({
      eventId: event.id,
      sectionId: vipSection.id,
      tableId: vipTable.id,
      number: i + 1,
      x: Math.cos((2 * Math.PI * i) / 10) * 120,
      y: Math.sin((2 * Math.PI * i) / 10) * 120,
    })),
  });

  console.log('✔ Seating created');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
  })
  .finally(() => prisma.$disconnect());
