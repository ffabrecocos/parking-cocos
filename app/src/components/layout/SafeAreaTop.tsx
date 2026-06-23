/** Real DOM node — more reliable than ::before for iOS PWA safe area. */
export function SafeAreaTop() {
  return <div className="safe-area-top" aria-hidden="true" />;
}
