// babel-preset-expo automatically adds the react-native-worklets (Reanimated 4) plugin.
module.exports = function (api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"] };
};
