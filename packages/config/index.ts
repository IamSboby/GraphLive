const enabled = (key: string, fallback = false) =>
  process.env[key] === undefined ? fallback : process.env[key] === "true";
export function configuration() {
  return {
    auth: enabled("AUTH_ENABLED"),
    googleLogin: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    microsoftLogin: Boolean(
      process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET,
    ),
    server: enabled("SERVER_STORAGE_ENABLED", true),
    local: enabled("LOCAL_FOLDER_ENABLED", true),
    customFields: enabled("CUSTOM_FIELDS_ENABLED", true),
    googleDrive: false,
    oneDrive: false,
    sbobyPiShare: false,
    customEndpoints: false,
    avatars: false,
    edgeDrag: false,
  };
}
export type Configuration = ReturnType<typeof configuration>;
