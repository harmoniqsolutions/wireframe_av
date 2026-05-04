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

  if (sourcePort.connectorTypeId !== targetPort.connectorTypeId) {
    return {
      allowed: false,
      severity: "error",
      message: `Connector mismatch: ${sourcePort.connectorTypeName ?? "source connector"} cannot connect to ${
        targetPort.connectorTypeName ?? "target connector"
      }.`
    };
  }

  if (sourcePort.signalTypeId !== targetPort.signalTypeId) {
    return {
      allowed: false,
      severity: "error",
      message: `Signal mismatch: ${sourcePort.signalTypeName ?? "source signal"} cannot connect to ${
        targetPort.signalTypeName ?? "target signal"
      } for the MVP.`
    };
  }

  return {
    allowed: true,
    severity: "success",
    message: "Connection is valid."
  };
}
