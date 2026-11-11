// Metro loads its configuration through CommonJS, as required by Expo's template.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
const blocked = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(blocked) ? blocked : blocked ? [blocked] : []),
  /[\\/](?:\.next|\.local|\.turbo)[\\/]/,
];
module.exports = config;
