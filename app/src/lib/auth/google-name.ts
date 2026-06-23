type GoogleUserMetadata = {
  full_name?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export function nameFromGoogleMetadata(
  metadata: GoogleUserMetadata | null | undefined
): string {
  if (!metadata) return "";

  const fullName = metadata.full_name?.trim();
  if (fullName) return fullName;

  const name = metadata.name?.trim();
  if (name) return name;

  const combined = [metadata.given_name, metadata.family_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return combined;
}

export function profileNeedsOnboarding(profile: {
  full_name: string | null;
  license_plates: string[] | null | undefined;
} | null): boolean {
  if (!profile?.full_name?.trim()) return true;
  return !profile.license_plates?.length;
}
