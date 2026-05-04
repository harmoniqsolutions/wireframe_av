import { PrismaClient, PortDirection, PortSide } from "@prisma/client";

const prisma = new PrismaClient();

const connectorTypes = [
  "XLR 3-pin",
  "XLR 5-pin",
  "1/4 inch TRS",
  "1/4 inch TS",
  "RCA",
  "3.5mm TRS",
  "3-pin Euroblock",
  "5-pin Euroblock",
  "RJ45",
  "HDMI Type A",
  "DisplayPort",
  "USB-A",
  "USB-B",
  "USB-C",
  "BNC",
  "F-type",
  "NL2",
  "NL4",
  "IEC C14",
  "NEMA 5-15",
  "DB9",
  "DB25",
  "LC Fiber",
  "SC Fiber",
  "ST Fiber"
];

const signalTypes = [
  "Analog Audio Balanced",
  "Analog Audio Unbalanced",
  "Digital Audio AES3",
  "Dante/AES67",
  "Network Data",
  "HDMI Video",
  "SDI Video",
  "HDBaseT",
  "AV-over-IP",
  "RS-232 Control",
  "RS-485 Control",
  "GPIO",
  "DMX",
  "Speaker Level Audio",
  "RF",
  "Fiber",
  "AC Power",
  "DC Power",
  "USB"
];

const cableTypes = [
  "CAT6",
  "CAT6A",
  "HDMI",
  "SDI Coax",
  "Balanced Audio Cable",
  "Speaker Cable 12/2",
  "Speaker Cable 14/2",
  "USB Cable",
  "Duplex Fiber",
  "DMX Cable",
  "AC Power Cable"
];

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: "dev-org-id" },
    update: {},
    create: { id: "dev-org-id", name: "Development Organization" }
  });

  const user = await prisma.user.upsert({
    where: { id: "dev-user-id" },
    update: {},
    create: {
      id: "dev-user-id",
      email: "dev@example.com",
      name: "Development User"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "OWNER"
    }
  });

  for (const name of connectorTypes) {
    await prisma.connectorType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of signalTypes) {
    await prisma.signalType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of cableTypes) {
    await prisma.cableType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  const generic = await prisma.manufacturer.upsert({
    where: { name: "Generic" },
    update: {},
    create: { name: "Generic" }
  });

  const euroblock = await prisma.connectorType.findUniqueOrThrow({ where: { name: "3-pin Euroblock" } });
  const rj45 = await prisma.connectorType.findUniqueOrThrow({ where: { name: "RJ45" } });
  const nl4 = await prisma.connectorType.findUniqueOrThrow({ where: { name: "NL4" } });
  const hdmi = await prisma.connectorType.findUniqueOrThrow({ where: { name: "HDMI Type A" } });
  const xlr3 = await prisma.connectorType.findUniqueOrThrow({ where: { name: "XLR 3-pin" } });
  const iec = await prisma.connectorType.findUniqueOrThrow({ where: { name: "IEC C14" } });
  const usbc = await prisma.connectorType.findUniqueOrThrow({ where: { name: "USB-C" } });
  const lcFiber = await prisma.connectorType.findUniqueOrThrow({ where: { name: "LC Fiber" } });
  const balancedAudio = await prisma.signalType.findUniqueOrThrow({ where: { name: "Analog Audio Balanced" } });
  const network = await prisma.signalType.findUniqueOrThrow({ where: { name: "Network Data" } });
  const dante = await prisma.signalType.findUniqueOrThrow({ where: { name: "Dante/AES67" } });
  const speaker = await prisma.signalType.findUniqueOrThrow({ where: { name: "Speaker Level Audio" } });
  const hdmiVideo = await prisma.signalType.findUniqueOrThrow({ where: { name: "HDMI Video" } });
  const acPower = await prisma.signalType.findUniqueOrThrow({ where: { name: "AC Power" } });
  const usb = await prisma.signalType.findUniqueOrThrow({ where: { name: "USB" } });
  const fiber = await prisma.signalType.findUniqueOrThrow({ where: { name: "Fiber" } });

  const productSeeds = [
    {
      id: "seed-generic-dsp",
      name: "Generic DSP",
      model: "DSP-8X8",
      category: "DSP",
      rackUnits: 1,
      notes: "Eight-input/eight-output DSP with Dante and management network ports.",
      ports: [
        ...Array.from({ length: 8 }, (_, index) => ({
          id: `seed-dsp-input-${index + 1}`,
          name: `Input ${index + 1}`,
          connectorTypeId: euroblock.id,
          signalTypeId: balancedAudio.id,
          direction: PortDirection.INPUT,
          side: PortSide.LEFT,
          sortOrder: index + 1
        })),
        ...Array.from({ length: 8 }, (_, index) => ({
          id: `seed-dsp-output-${index + 1}`,
          name: `Output ${index + 1}`,
          connectorTypeId: euroblock.id,
          signalTypeId: balancedAudio.id,
          direction: PortDirection.OUTPUT,
          side: PortSide.RIGHT,
          sortOrder: index + 21
        })),
        {
          id: "seed-dsp-dante",
          name: "Dante",
          connectorTypeId: rj45.id,
          signalTypeId: dante.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.TOP,
          sortOrder: 41
        },
        {
          id: "seed-dsp-lan",
          name: "Control LAN",
          connectorTypeId: rj45.id,
          signalTypeId: network.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.TOP,
          sortOrder: 42
        },
        {
          id: "seed-dsp-power",
          name: "AC In",
          connectorTypeId: iec.id,
          signalTypeId: acPower.id,
          direction: PortDirection.INPUT,
          side: PortSide.REAR,
          sortOrder: 90
        }
      ]
    },
    {
      id: "seed-generic-amplifier",
      name: "Generic Amplifier",
      model: "AMP-2CH",
      category: "Amplifier",
      rackUnits: 2,
      notes: "Two-channel rack amplifier with balanced inputs and NL4 loudspeaker outputs.",
      ports: [
        ...Array.from({ length: 2 }, (_, index) => ({
          id: `seed-amp-input-${index + 1}`,
          name: `Input ${index + 1}`,
          connectorTypeId: euroblock.id,
          signalTypeId: balancedAudio.id,
          direction: PortDirection.INPUT,
          side: PortSide.LEFT,
          sortOrder: index + 1
        })),
        ...Array.from({ length: 2 }, (_, index) => ({
          id: `seed-amp-speaker-out-${index + 1}`,
          name: `Speaker Out ${index + 1}`,
          connectorTypeId: nl4.id,
          signalTypeId: speaker.id,
          direction: PortDirection.OUTPUT,
          side: PortSide.RIGHT,
          sortOrder: index + 11
        })),
        {
          id: "seed-amp-power",
          name: "AC In",
          connectorTypeId: iec.id,
          signalTypeId: acPower.id,
          direction: PortDirection.INPUT,
          side: PortSide.REAR,
          sortOrder: 90
        }
      ]
    },
    {
      id: "seed-generic-network-switch",
      name: "Generic Network Switch",
      model: "SW-24P",
      category: "Network",
      rackUnits: 1,
      notes: "Managed AV network switch with copper access ports and fiber uplinks.",
      ports: [
        ...Array.from({ length: 24 }, (_, index) => ({
          id: `seed-switch-rj45-${index + 1}`,
          name: `Port ${index + 1}`,
          connectorTypeId: rj45.id,
          signalTypeId: network.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.RIGHT,
          sortOrder: index + 1
        })),
        ...Array.from({ length: 2 }, (_, index) => ({
          id: `seed-switch-sfp-${index + 1}`,
          name: `SFP ${index + 1}`,
          connectorTypeId: lcFiber.id,
          signalTypeId: fiber.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.TOP,
          sortOrder: index + 41
        })),
        {
          id: "seed-switch-power",
          name: "AC In",
          connectorTypeId: iec.id,
          signalTypeId: acPower.id,
          direction: PortDirection.INPUT,
          side: PortSide.REAR,
          sortOrder: 90
        }
      ]
    },
    {
      id: "seed-generic-hdmi-display",
      name: "Generic HDMI Display",
      model: "DISP-55",
      category: "Display",
      rackUnits: null,
      notes: "Commercial display with HDMI, USB-C, LAN, and AC power.",
      ports: [
        {
          id: "seed-display-hdmi-1",
          name: "HDMI 1",
          connectorTypeId: hdmi.id,
          signalTypeId: hdmiVideo.id,
          direction: PortDirection.INPUT,
          side: PortSide.LEFT,
          sortOrder: 1
        },
        {
          id: "seed-display-hdmi-2",
          name: "HDMI 2",
          connectorTypeId: hdmi.id,
          signalTypeId: hdmiVideo.id,
          direction: PortDirection.INPUT,
          side: PortSide.LEFT,
          sortOrder: 2
        },
        {
          id: "seed-display-usbc",
          name: "USB-C",
          connectorTypeId: usbc.id,
          signalTypeId: usb.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.BOTTOM,
          sortOrder: 3
        },
        {
          id: "seed-display-lan",
          name: "LAN",
          connectorTypeId: rj45.id,
          signalTypeId: network.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.TOP,
          sortOrder: 4
        },
        {
          id: "seed-display-power",
          name: "AC In",
          connectorTypeId: iec.id,
          signalTypeId: acPower.id,
          direction: PortDirection.INPUT,
          side: PortSide.REAR,
          sortOrder: 90
        }
      ]
    },
    {
      id: "seed-generic-wireless-mic-receiver",
      name: "Generic Wireless Microphone Receiver",
      model: "WMR-4",
      category: "Wireless Microphone",
      rackUnits: 1,
      notes: "Four-channel receiver with balanced outputs and network management.",
      ports: [
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `seed-wmr-xlr-out-${index + 1}`,
          name: `Audio Out ${index + 1}`,
          connectorTypeId: xlr3.id,
          signalTypeId: balancedAudio.id,
          direction: PortDirection.OUTPUT,
          side: PortSide.RIGHT,
          sortOrder: index + 1
        })),
        {
          id: "seed-wmr-lan",
          name: "LAN",
          connectorTypeId: rj45.id,
          signalTypeId: network.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.TOP,
          sortOrder: 30
        },
        {
          id: "seed-wmr-power",
          name: "AC In",
          connectorTypeId: iec.id,
          signalTypeId: acPower.id,
          direction: PortDirection.INPUT,
          side: PortSide.REAR,
          sortOrder: 90
        }
      ]
    }
  ];

  for (const product of productSeeds) {
    await prisma.productTemplate.upsert({
      where: { id: product.id },
      update: {
        manufacturerId: generic.id,
        name: product.name,
        model: product.model,
        category: product.category,
        rackUnits: product.rackUnits,
        notes: product.notes,
        verificationStatus: "MANUAL"
      },
      create: {
        id: product.id,
        manufacturerId: generic.id,
        name: product.name,
        model: product.model,
        category: product.category,
        rackUnits: product.rackUnits,
        notes: product.notes,
        verificationStatus: "MANUAL"
      }
    });

    for (const port of product.ports) {
      await prisma.productPortTemplate.upsert({
        where: { id: port.id },
        update: {
          productTemplateId: product.id,
          name: port.name,
          connectorTypeId: port.connectorTypeId,
          signalTypeId: port.signalTypeId,
          direction: port.direction,
          side: port.side,
          sortOrder: port.sortOrder
        },
        create: {
          ...port,
          productTemplateId: product.id
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
