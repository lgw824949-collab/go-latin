// BAR-only MVP. Re-enable deliberately here after the corresponding verification.
export const RELEASE_FEATURES = Object.freeze({
  quickParties: false,
  passwordRecovery: false,
});

// Missing settings and non-boolean values must never enable a feature.
export function releaseFeatureEnabled(name, settings = RELEASE_FEATURES) {
  return settings?.[name] === true;
}
