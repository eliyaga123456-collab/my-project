const { getDefaultConfig } = require("expo/metro-config");

// Expo's default config auto-detects npm workspaces (watchFolders + nodeModulesPaths).
const config = getDefaultConfig(__dirname);
module.exports = config;
