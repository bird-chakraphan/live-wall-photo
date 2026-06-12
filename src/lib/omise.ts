// Thin wrapper around the Omise SDK. The SDK has no types, so we declare the
// minimal surface area we use.
type OmiseSource = { id: string; type: string; scannable_code?: { image?: { download_uri?: string } } };
type OmiseCharge = { id: string; status: string; source?: OmiseSource };
type OmiseClient = {
  sources: { create: (params: Record<string, unknown>) => Promise<OmiseSource> };
  charges: {
    create: (params: Record<string, unknown>) => Promise<OmiseCharge>;
    retrieve: (id: string) => Promise<OmiseCharge>;
  };
};

let _client: OmiseClient | null = null;
export function omise(): OmiseClient {
  if (_client) return _client;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Omise = require("omise");
  _client = Omise({
    publicKey: process.env.OMISE_PUBLIC_KEY!,
    secretKey: process.env.OMISE_SECRET_KEY!,
  }) as OmiseClient;
  return _client;
}
