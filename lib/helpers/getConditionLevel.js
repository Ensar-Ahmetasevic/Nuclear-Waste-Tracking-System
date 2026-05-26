// Ranges with 'optimal' as arrays
const ranges = {
  temperature: {
    optimal: [{ min: -5, max: 35 }],
    warning: [
      { min: -25, max: -5 },
      { min: 35, max: 40 },
    ],
    danger: [
      { min: -Infinity, max: -25 },
      { min: 40, max: Infinity },
    ],
  },
  radiation: {
    optimal: [{ min: 0, max: 0.1 }],
    warning: [{ min: 0.1, max: 0.5 }],
    danger: [{ min: 0.5, max: Infinity }],
  },
  humidity: {
    optimal: [{ min: 40, max: 60 }],
    warning: [
      { min: 30, max: 40 },
      { min: 60, max: 70 },
    ],
    danger: [
      { min: -Infinity, max: 30 },
      { min: 70, max: Infinity },
    ],
  },
  pressure: {
    optimal: [{ min: 1010, max: 1020 }],
    warning: [
      { min: 1000, max: 1010 },
      { min: 1020, max: 1030 },
    ],
    danger: [
      { min: -Infinity, max: 1000 },
      { min: 1030, max: Infinity },
    ],
  },
};

export default function getConditionLevel(parameters, value) {
  // Check if the parameter exists in ranges
  if (!ranges[parameters]) {
    return "unknown";
  }
  const paramsRage = ranges[parameters];

  // Check for Optimal
  for (const range of paramsRage.optimal) {
    if (value >= range.min && value <= range.max) {
      return "optimal";
    }
  }

  // Check for Warning

  for (const range of paramsRage.warning) {
    if (value > range.min && value <= range.max) {
      return "warning";
    }
  }

  // Check for Danger

  for (const range of paramsRage.danger) {
    if (value > range.min && value <= range.max) {
      return "danger";
    }
  }

  return "unknown";
}
