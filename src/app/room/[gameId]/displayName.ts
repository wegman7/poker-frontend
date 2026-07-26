/** Strip the Auth0 provider prefix and truncate the opaque ID. */
export const formatDisplayName = (sub: string) => {
  const sep = sub.indexOf('|');
  const id = sep >= 0 ? sub.slice(sep + 1) : sub;
  return id.slice(0, 10);
};
