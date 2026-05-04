import type { PortDirection, ValidationSeverity } from "@wireframe-av/shared/src/types";

export type ValidatablePort = {
  id: string;
  deviceInstanceId: string;
  name: string;
  connectorTypeId: string;
  connectorTypeName?: string;
  signalTypeId: string;
  signalTypeName?: string;
  direction: PortDirection;
};

export type ConnectionValidationResult = {
  allowed: boolean;
  severity: ValidationSeverity;
  message: string;
};

type ValidateConnectionInput = {
  sourcePort: ValidatablePort;
  targetPort: ValidatablePort;
};

function isDirectionCompatible(source: PortDirection, target: PortDirection) {
  if (source === "OUTPUT" && target === "INPUT") return true;
  if (source === "INPUT" && target === "OUTPUT") return true;
  if (source === "BIDIRECTIONAL" && target !== "BIDIRECTIONAL") return true;
  if (target === "BIDIRECTIONAL" && source !== "BIDIRECTIONAL") return true;
  return source === "BIDIRECTIONAL" && target === "BIDIRECTIONAL";
}

function directionMessage(source: PortDirection, target: PortDirection) {
  if (source === target && source !== "BIDIRECTIONAL") {
    return `${source} ports cannot connect directly to other ${target} ports. Use an output-to-input path.`;
  }

  return `Port directions are not compatible: ${source} to ${target}.`;
}

function pairKey(a?: string, b?: string) {
  return [a ?? "", b ?? ""].sort().join("::");
}

const fieldTerminableConnectorPairs = new Set([
  pairKey("XLR 3-pin", "3-pin Euroblock"),
  pairKey("XLR 5-pin", "5-pin Euroblock"),
  pairKey("DB9", "3-pin Euroblock"),
  pairKey("DB9", "5-pin Euroblock"),
  pairKey("1/4 inch TRS", "3-pin Euroblock"),
  pairKey("RCA", "3-pin Euroblock"),
  pairKey("3.5mm TRS", "3-pin Euroblock")
]);

const compatibleSignalGroups = [
  new Set(["Network Data", "Dante/AES67", "AV-over-IP"]),
  new Set(["Analog Audio Balanced", "Digital Audio AES3"]),
  new Set(["RS-232 Control", "RS-485 Control", "GPIO"])
];

function signalCompatibility(sourcePort: ValidatablePort, targetPort: ValidatablePort): ConnectionValidationResult | null {
  if (sourcePort.signalTypeId === targetPort.signalTypeId) return null;

  const sourceSignal = sourcePort.signalTypeName;
  const targetSignal = targetPort.signalTypeName;
  const compatible = compatibleSignalGroups.some((group) => group.has(sourceSignal ?? "") && group.has(targetSignal ?? ""));

  if (!compatible) {
    return {
      allowed: false,
      severity: "error",
      message: `Signal mismatch: ${sourceSignal ?? "source signal"} cannot connect to ${targetSignal ?? "target signal"}.`
    };
  }

  return {
    allowed: true,
    severity: "warning",
    message: `Related signal types detected: ${sourceSignal} to ${targetSignal}. Verify the design intent before issuing.`
  };
}

function connectorCompatibility(sourcePort: ValidatablePort, targetPort: ValidatablePort): ConnectionValidationResult | null {
  if (sourcePort.connectorTypeId === targetPort.connectorTypeId) return null;

  const sourceConnector = sourcePort.connectorTypeName;
  const targetConnector = targetPort.connectorTypeName;

  if (fieldTerminableConnectorPairs.has(pairKey(sourceConnector, targetConnector))) {
    return {
      allowed: true,
      severity: "warning",
      message: `${sourceConnector} to ${targetConnector} is allowed as a field-terminated/custom-wired cable. Verify pinout and labeling.`
    };
  }

  return {
    allowed: true,
    severity: "warning",
    message: `Connector mismatch: ${sourceConnector ?? "source connector"} to ${
      targetConnector ?? "target connector"
    }. Treat this as an adapter or custom cable and verify termination details.`
  };
}

function mergeWarnings(warnings: ConnectionValidationResult[]) {
  if (!warnings.length) {
    return {
      allowed: true,
      severity: "success",
      message: "Connection is valid."
    } satisfies ConnectionValidationResult;
  }

  return {
    allowed: true,
    severity: "warning",
    message: warnings.map((warning) => warning.message).join(" ")
  } satisfies ConnectionValidationResult;
}

export function validateConnection({
  sourcePort,
  targetPort
}: ValidateConnectionInput): ConnectionValidationResult {
  if (sourcePort.id === targetPort.id) {
    return {
      allowed: false,
      severity: "error",
      message: "A port cannot connect to itself."
    };
  }

  if (sourcePort.deviceInstanceId === targetPort.deviceInstanceId) {
    return {
      allowed: false,
      severity: "error",
      message: "Connections between ports on the same device are blocked for the MVP."
    };
  }

  if (!isDirectionCompatible(sourcePort.direction, targetPort.direction)) {
    return {
      allowed: false,
      severity: "error",
      message: directionMessage(sourcePort.direction, targetPort.direction)
    };
  }

  const warnings: ConnectionValidationResult[] = [];
  const signalResult = signalCompatibility(sourcePort, targetPort);

  if (signalResult && !signalResult.allowed) {
    return signalResult;
  }

  if (signalResult) warnings.push(signalResult);

  const connectorResult = connectorCompatibility(sourcePort, targetPort);
  if (connectorResult) warnings.push(connectorResult);

  return mergeWarnings(warnings);
}
