export function locationIsAvailable(location: { isActive: boolean; activeFrom: Date | string | null; activeTo: Date | string | null }, now = new Date()) {
  if (!location.isActive) return false;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const end = location.activeTo ? new Date(location.activeTo) : null; end?.setHours(23, 59, 59, 999);
  return !(location.activeFrom && new Date(location.activeFrom) > now) && !(end && end < today);
}
