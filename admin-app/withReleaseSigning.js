// Signs the release build with an upload keystore when EAR_KEYSTORE_PATH is set (CI decodes it from a secret).
// Without it the build keeps Expo's default (debug) signing, which is fine for sideloading but not for Google Play.
const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (!process.env.EAR_KEYSTORE_PATH || cfg.modResults.language !== "groovy") return cfg;
    let g = cfg.modResults.contents;
    if (g.includes("EAR_KEYSTORE_PATH")) return cfg;
    const release = `        release {
            storeFile file(System.getenv("EAR_KEYSTORE_PATH"))
            storePassword System.getenv("EAR_KEYSTORE_PASSWORD")
            keyAlias System.getenv("EAR_KEY_ALIAS")
            keyPassword System.getenv("EAR_KEY_PASSWORD")
        }
`;
    g = g.replace(/signingConfigs\s*\{\s*\n/, (m) => m + release);
    g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, "$1signingConfig signingConfigs.release");
    if (!g.includes("signingConfigs.release")) throw new Error("withReleaseSigning: could not patch app/build.gradle");
    cfg.modResults.contents = g;
    return cfg;
  });
