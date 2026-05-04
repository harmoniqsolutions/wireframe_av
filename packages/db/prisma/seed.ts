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
  const balancedAudio = await prisma.signalType.findUniqueOrThrow({ where: { name: "Analog Audio Balanced" } });
  const network = await prisma.signalType.findUniqueOrThrow({ where: { name: "Network Data" } });
  const speaker = await prisma.signalType.findUniqueOrThrow({ where: { name: "Speaker Level Audio" } });

  const dsp = await prisma.productTemplate.upsert({
    where: { id: "seed-generic-dsp" },
    update: {},
    create: {
      id: "seed-generic-dsp",
      manufacturerId: generic.id,
      name: "Generic DSP",
      model: "DSP-1",
      category: "DSP",
      rackUnits: 1,
      verificationStatus: "MANUAL"
    }
  });

  const amplifier = await prisma.productTemplate.upsert({
    where: { id: "seed-generic-amplifier" },
    update: {},
    create: {
      id: "seed-generic-amplifier",
      manufacturerId: generic.id,
      name: "Generic Amplifier",
      model: "AMP-1",
      category: "Amplifier",
      rackUnits: 2,
      verificationStatus: "MANUAL"
    }
  });

  const seedPorts = [
    {
      id: "seed-dsp-input-1",
      productTemplateId: dsp.id,
      name: "Input 1",
      connectorTypeId: euroblock.id,
      signalTypeId: balancedAudio.id,
      direction: PortDirection.INPUT,
      side: PortSide.LEFT,
      sortOrder: 1
    },
    {
      id: "seed-dsp-output-1",
      productTemplateId: dsp.id,
      name: "Output 1",
      connectorTypeId: euroblock.id,
      signalTypeId: balancedAudio.id,
      direction: PortDirection.OUTPUT,
      side: PortSide.RIGHT,
      sortOrder: 2
    },
    {
      id: "seed-dsp-lan",
      productTemplateId: dsp.id,
      name: "LAN",
      connectorTypeId: rj45.id,
      signalTypeId: network.id,
      direction: PortDirection.BIDIRECTIONAL,
      side: PortSide.TOP,
      sortOrder: 3
    },
    {
      id: "seed-amp-input-1",
      productTemplateId: amplifier.id,
      name: "Input 1",
      connectorTypeId: euroblock.id,
      signalTypeId: balancedAudio.id,
      direction: PortDirection.INPUT,
      side: PortSide.LEFT,
      sortOrder: 1
    },
    {
      id: "seed-amp-speaker-out-1",
      productTemplateId: amplifier.id,
      name: "Speaker Out 1",
      connectorTypeId: nl4.id,
      signalTypeId: speaker.id,
      direction: PortDirection.OUTPUT,
      side: PortSide.RIGHT,
      sortOrder: 2
    }
  ];

  for (const port of seedPorts) {
    await prisma.productPortTemplate.upsert({
      where: { id: port.id },
      update: {},
      create: port
    });
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
