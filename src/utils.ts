export type UrlParseResult = {
  url?: URL,
  error?: any
}

export function getUrlListFromEnvOrThrow(variableName:string) :URL[] {
  const urlList = getEnvVarOrThrow(variableName);
  const parsedUrls = parseUrlList(urlList);
  const errors = parsedUrls.filter(o => o.error);
  if (errors.length > 0) {
    throw new Error(`Invalid URL(s) in the '${variableName}' environment variable: ${errors.map((o) => o.error.message).join(", ")}`);
  }
  return (parsedUrls).map(o => <URL>o.url);
}

export function getEnvVarOrThrow (name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

export function parseUrlList(urlList:string, separator:string = ",") : UrlParseResult[] {
  const parts = urlList.split(separator);
  const result: UrlParseResult[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    try {
      const url = new URL(part);
      result.push({url});
    } catch (error) {
      result.push({error});
    }
  }
  return result;
}
