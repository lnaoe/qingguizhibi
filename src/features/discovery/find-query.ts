export interface FindSearchParams {
  [key: string]: string | string[] | undefined;
}

export function createDiscoverySearchParams(
  input: FindSearchParams,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      searchParams.set(key, value);
    }
  }

  if (!searchParams.has('recommend')) {
    searchParams.set('recommend', 'true');
  }

  return searchParams;
}
