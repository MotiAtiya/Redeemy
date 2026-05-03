// Expo config plugin: renames the Android APK output to include the app name
// and version (e.g. Redeemy-1.0.0-beta.1-release.apk) instead of the default
// app-release.apk. Injected into android/app/build.gradle on every prebuild,
// so the customization survives `expo prebuild --clean`.

const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// expo-apk-versioned-filename';

const SNIPPET = `
    ${MARKER}
    applicationVariants.all { variant ->
        variant.outputs.all { output ->
            output.outputFileName = "\${rootProject.name}-\${variant.versionName}-\${variant.buildType.name}.apk"
        }
    }`;

module.exports = function withApkVersionedFilename(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARKER)) return cfg;
    // Insert immediately before the signingConfigs block so the snippet sits
    // inside the top-level android { } block.
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /\n(\s*)signingConfigs\s*\{/,
      `${SNIPPET}\n$1signingConfigs {`,
    );
    return cfg;
  });
};
