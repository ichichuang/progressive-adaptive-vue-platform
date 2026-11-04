interface RadiusProjectionParameters {
  readonly defaultValue: number
  readonly maximum: number
  readonly panelDefault: number
  readonly smallDefault: number
}

/** Input validation belongs to the Appearance boundary; this is also used before Vue. */
export function resolveRadius(radius: number, parameters: RadiusProjectionParameters) {
  return {
    control: radius,
    panel: Math.min(
      (radius * parameters.panelDefault) / parameters.defaultValue,
      parameters.maximum,
    ),
    small: Math.min(
      (radius * parameters.smallDefault) / parameters.defaultValue,
      parameters.smallDefault,
    ),
  }
}
