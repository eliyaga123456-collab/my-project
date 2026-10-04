// Extends app.json with environment-driven universal-link config.
// Set EXPO_PUBLIC_WEB_URL (e.g. https://ear.example.com) to enable https://<host>/u/<username> app links.
module.exports = ({ config }) => {
  let host = null;
  try {
    if (process.env.EXPO_PUBLIC_WEB_URL) host = new URL(process.env.EXPO_PUBLIC_WEB_URL).host;
  } catch {
    host = null;
  }
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {
    ...config,
    ios: { ...config.ios, ...(host ? { associatedDomains: [`applinks:${host}`] } : {}) },
    android: {
      ...config.android,
      versionCode: Number(process.env.EAR_VERSION_CODE) || 1,
      // Firebase config enables Android push notifications; CI decodes it from the GOOGLE_SERVICES_JSON_BASE64 secret when present.
      ...(process.env.EAR_GOOGLE_SERVICES_FILE ? { googleServicesFile: process.env.EAR_GOOGLE_SERVICES_FILE } : {}),
      ...(host
        ? {
            intentFilters: [
              {
                action: "VIEW",
                autoVerify: true,
                data: [
                  { scheme: "https", host, pathPrefix: "/u" },
                  { scheme: "https", host, pathPrefix: "/l" }
                ],
                category: ["BROWSABLE", "DEFAULT"]
              }
            ]
          }
        : {})
    },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) }
  };
};
