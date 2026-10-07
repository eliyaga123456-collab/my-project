module.exports = {
  expo: {
    name: "EAR Admin",
    slug: "ear-admin",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    backgroundColor: "#0c0612",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    splash: { image: "./assets/splash-icon.png", backgroundColor: "#0c0612", resizeMode: "contain" },
    android: {
      package: "app.ear.admin",
      versionCode: Number(process.env.EAR_VERSION_CODE) || 1,
      adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0c0612" },
      permissions: ["INTERNET", "REQUEST_INSTALL_PACKAGES"]
    },
    plugins: ["./withReleaseSigning"],
    extra: { updateRepo: process.env.EXPO_PUBLIC_UPDATE_REPO || "eliyaga123456-collab/my-project" }
  }
};
