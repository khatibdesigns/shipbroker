// Metro config — resolver tweaks the Firebase JS SDK needs under Hermes
// (otherwise auth fails with "Component auth has not been registered yet").
// Pure config; picked up on Metro restart, no native rebuild.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
