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
  "ST Fiber",
  "DM 8G",
  "3-pin IR",
  "Cresnet (4-pin)"
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
  "DigitalMedia (DM)",
  "AV-over-IP",
  "RS-232 Control",
  "RS-485 Control",
  "IR Control",
  "Cresnet",
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

  const crestron = await prisma.manufacturer.upsert({
    where: { name: "Crestron" },
    update: { website: "https://www.crestron.com" },
    create: { name: "Crestron", website: "https://www.crestron.com" }
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
  const rs232 = await prisma.signalType.findUniqueOrThrow({ where: { name: "RS-232 Control" } });
  const irControl = await prisma.signalType.findUniqueOrThrow({ where: { name: "IR Control" } });
  const gpio = await prisma.signalType.findUniqueOrThrow({ where: { name: "GPIO" } });
  const cresnet = await prisma.signalType.findUniqueOrThrow({ where: { name: "Cresnet" } });
  const avOverIp = await prisma.signalType.findUniqueOrThrow({ where: { name: "AV-over-IP" } });
  const dm = await prisma.signalType.findUniqueOrThrow({ where: { name: "DigitalMedia (DM)" } });

  const db9 = await prisma.connectorType.findUniqueOrThrow({ where: { name: "DB9" } });
  const usba = await prisma.connectorType.findUniqueOrThrow({ where: { name: "USB-A" } });
  const dm8g = await prisma.connectorType.findUniqueOrThrow({ where: { name: "DM 8G" } });
  const irPlug = await prisma.connectorType.findUniqueOrThrow({ where: { name: "3-pin IR" } });
  const cresnetPlug = await prisma.connectorType.findUniqueOrThrow({ where: { name: "Cresnet (4-pin)" } });

  // Crestron product seeds (sourced from EasySchematic open-source device library)
  const crestronProductSeeds: Array<{
    id: string;
    name: string;
    model: string;
    category: string;
    rackUnits: number | null;
    widthInches: number | null;
    depthInches: number | null;
    heightInches: number | null;
    weightLbs: number | null;
    powerWatts: number | null;
    referenceUrl: string;
    notes: string;
    ports: Array<{
      id: string;
      name: string;
      connectorTypeId: string;
      signalTypeId: string;
      direction: PortDirection;
      side: PortSide;
      sortOrder: number;
    }>;
  }> = [
    {
      id: "seed-crestron-cp4n",
      name: "CP4N",
      model: "CP4N",
      category: "Control",
      rackUnits: 1,
      widthInches: 19.0,
      depthInches: 6.6,
      heightInches: 1.73,
      weightLbs: 3.1,
      powerWatts: 50,
      referenceUrl: "https://www.crestron.com/Products/Catalog/Control-and-Management/Control-System/Rack-Mount/CP4N",
      notes: "4-Series Control System (rack-mount). Ports: LAN, Control Subnet, 3× COM (RS-232), 8× IR/Serial, 8× Relay, 8× Versiport I/O, Cresnet, USB, AC Power.",
      ports: [
        { id: "seed-cp4n-lan", name: "LAN", connectorTypeId: rj45.id, signalTypeId: network.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 1 },
        { id: "seed-cp4n-control-subnet", name: "Control Subnet", connectorTypeId: rj45.id, signalTypeId: network.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 2 },
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `seed-cp4n-com-${i + 1}`,
          name: `COM ${i + 1}`,
          connectorTypeId: db9.id,
          signalTypeId: rs232.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.RIGHT,
          sortOrder: 3 + i
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `seed-cp4n-ir-${i + 1}`,
          name: `IR/Serial ${i + 1}`,
          connectorTypeId: irPlug.id,
          signalTypeId: irControl.id,
          direction: PortDirection.OUTPUT,
          side: PortSide.RIGHT,
          sortOrder: 10 + i
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `seed-cp4n-relay-${i + 1}`,
          name: `Relay ${i + 1}`,
          connectorTypeId: euroblock.id,
          signalTypeId: gpio.id,
          direction: PortDirection.OUTPUT,
          side: PortSide.RIGHT,
          sortOrder: 20 + i
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `seed-cp4n-versiport-${i + 1}`,
          name: `Versiport ${i + 1}`,
          connectorTypeId: euroblock.id,
          signalTypeId: gpio.id,
          direction: PortDirection.BIDIRECTIONAL,
          side: PortSide.RIGHT,
          sortOrder: 30 + i
        })),
        { id: "seed-cp4n-cresnet", name: "Cresnet", connectorTypeId: cresnetPlug.id, signalTypeId: cresnet.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 40 },
        { id: "seed-cp4n-usb", name: "USB", connectorTypeId: usba.id, signalTypeId: usb.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 41 },
        { id: "seed-cp4n-power", name: "AC In", connectorTypeId: iec.id, signalTypeId: acPower.id, direction: PortDirection.INPUT, side: PortSide.REAR, sortOrder: 90 }
      ]
    },
    {
      id: "seed-crestron-dm-nvx-351",
      name: "DM-NVX-351",
      model: "DM-NVX-351",
      category: "AV-over-IP",
      rackUnits: null,
      widthInches: 9.3,
      depthInches: 8.6,
      heightInches: 1.54,
      weightLbs: 2.0,
      powerWatts: 30,
      referenceUrl: "https://www.crestron.com/Products/Catalog/AV-Over-IP/DM-NVX-AV-Over-IP/Video-Endpoint/DM-NVX-351",
      notes: "DM NVX AV-over-IP encoder/decoder with dual HDMI inputs, HDMI output, dual Ethernet, analog audio, and USB. Includes SFP slot.",
      ports: [
        { id: "seed-nvx351-hdmi-in-1", name: "HDMI In 1", connectorTypeId: hdmi.id, signalTypeId: hdmiVideo.id, direction: PortDirection.INPUT, side: PortSide.LEFT, sortOrder: 1 },
        { id: "seed-nvx351-hdmi-in-2", name: "HDMI In 2", connectorTypeId: hdmi.id, signalTypeId: hdmiVideo.id, direction: PortDirection.INPUT, side: PortSide.LEFT, sortOrder: 2 },
        { id: "seed-nvx351-hdmi-out", name: "HDMI Out", connectorTypeId: hdmi.id, signalTypeId: hdmiVideo.id, direction: PortDirection.OUTPUT, side: PortSide.RIGHT, sortOrder: 3 },
        { id: "seed-nvx351-eth-1", name: "Ethernet 1", connectorTypeId: rj45.id, signalTypeId: avOverIp.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 4 },
        { id: "seed-nvx351-eth-2", name: "Ethernet 2", connectorTypeId: rj45.id, signalTypeId: avOverIp.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 5 },
        { id: "seed-nvx351-analog-audio", name: "Analog Audio", connectorTypeId: euroblock.id, signalTypeId: balancedAudio.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.LEFT, sortOrder: 6 },
        { id: "seed-nvx351-usb-host", name: "USB Host", connectorTypeId: usba.id, signalTypeId: usb.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 7 },
        { id: "seed-nvx351-usb-device", name: "USB Device", connectorTypeId: usba.id, signalTypeId: usb.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 8 },
        { id: "seed-nvx351-power", name: "AC In", connectorTypeId: iec.id, signalTypeId: acPower.id, direction: PortDirection.INPUT, side: PortSide.REAR, sortOrder: 90 }
      ]
    },
    {
      id: "seed-crestron-dm-md8x8",
      name: "DM-MD8X8-CPU3",
      model: "DM-MD8X8-CPU3",
      category: "Matrix Switcher",
      rackUnits: 4,
      widthInches: 19.1,
      depthInches: 18.1,
      heightInches: 6.97,
      weightLbs: 20.1,
      powerWatts: 80,
      referenceUrl: "https://www.crestron.com/Products/Video/DigitalMedia-Modular-Matrix/Switcher-Chassis/DM-MD8X8-CPU3",
      notes: "8×8 DigitalMedia modular matrix switcher chassis. Accepts Crestron DM input/output blades. Fixed ports: Ethernet, AC Power.",
      ports: [
        { id: "seed-dm-md8x8-eth", name: "Ethernet", connectorTypeId: rj45.id, signalTypeId: network.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 1 },
        { id: "seed-dm-md8x8-power", name: "AC In", connectorTypeId: iec.id, signalTypeId: acPower.id, direction: PortDirection.INPUT, side: PortSide.REAR, sortOrder: 90 }
      ]
    },
    {
      id: "seed-crestron-dm-md16x16",
      name: "DM-MD16X16-CPU3",
      model: "DM-MD16X16-CPU3",
      category: "Matrix Switcher",
      rackUnits: 7,
      widthInches: 19.1,
      depthInches: 15.7,
      heightInches: 12.24,
      weightLbs: 28.4,
      powerWatts: 120,
      referenceUrl: "https://www.crestron.com/Products/Video/DigitalMedia-Modular-Matrix/Switcher-Chassis/DM-MD16X16-CPU3",
      notes: "16×16 DigitalMedia modular matrix switcher chassis. Accepts Crestron DM input/output blades. Fixed ports: Ethernet, AC Power.",
      ports: [
        { id: "seed-dm-md16x16-eth", name: "Ethernet", connectorTypeId: rj45.id, signalTypeId: network.id, direction: PortDirection.BIDIRECTIONAL, side: PortSide.RIGHT, sortOrder: 1 },
        { id: "seed-dm-md16x16-power", name: "AC In", connectorTypeId: iec.id, signalTypeId: acPower.id, direction: PortDirection.INPUT, side: PortSide.REAR, sortOrder: 90 }
      ]
    }
  ];

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

  for (const product of crestronProductSeeds) {
    await prisma.productTemplate.upsert({
      where: { id: product.id },
      update: {
        manufacturerId: crestron.id,
        name: product.name,
        model: product.model,
        category: product.category,
        rackUnits: product.rackUnits,
        widthInches: product.widthInches,
        depthInches: product.depthInches,
        heightInches: product.heightInches,
        weightLbs: product.weightLbs,
        powerWatts: product.powerWatts,
        referenceUrl: product.referenceUrl,
        notes: product.notes,
        verificationStatus: "AI_DRAFT"
      },
      create: {
        id: product.id,
        manufacturerId: crestron.id,
        name: product.name,
        model: product.model,
        category: product.category,
        rackUnits: product.rackUnits,
        widthInches: product.widthInches,
        depthInches: product.depthInches,
        heightInches: product.heightInches,
        weightLbs: product.weightLbs,
        powerWatts: product.powerWatts,
        referenceUrl: product.referenceUrl,
        notes: product.notes,
        verificationStatus: "AI_DRAFT"
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
