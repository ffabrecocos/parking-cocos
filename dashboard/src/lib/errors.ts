export function friendlyError(
  fallback = "Algo salió mal. Intentá de nuevo.",
  cause?: unknown
): string {
  if (cause !== undefined) {
    console.error(cause);
  }
  return fallback;
}
