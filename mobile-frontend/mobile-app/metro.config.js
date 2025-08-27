const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Include PNG, JPG, TTF, and other assets
  config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'ttf', 'webp');

  // Use SVG transformer if you have SVGs
  config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

  return config;
})();
