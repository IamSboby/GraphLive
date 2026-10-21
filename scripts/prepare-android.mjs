import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// Run after Capacitor generation/sync. Never reads local credentials or .env files.
const javaPath = "android/app/src/main/java/com/graphlive/android";
const testPath = "android/app/src/androidTest/java/com/graphlive/android";
for (const [source, target] of [
  ["android-native", javaPath],
  ["android-native/tests", testPath],
]) {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source).filter((name) =>
    name.endsWith(".java"),
  )) {
    copyFileSync(join(source, name), join(target, name));
  }
}
const gradlePath = "android/app/build.gradle";
let gradle = readFileSync(gradlePath, "utf8");
if (!gradle.includes("androidx.work:work-runtime")) {
  gradle += `
dependencies {
    implementation 'androidx.work:work-runtime:2.11.2'
    implementation 'androidx.javascriptengine:javascriptengine:1.0.0'
    implementation 'com.google.android.gms:play-services-auth:22.0.0'
}
`;
}
writeFileSync(gradlePath, gradle);
const variables = "android/variables.gradle";
writeFileSync(
  variables,
  readFileSync(variables, "utf8").replace(
    /minSdkVersion = \d+/,
    "minSdkVersion = 26",
  ),
);
const manifest = "android/app/src/main/AndroidManifest.xml";
writeFileSync(
  manifest,
  readFileSync(manifest, "utf8").replace(
    'android:allowBackup="true"',
    'android:allowBackup="false"',
  ),
);

// Same network glyph and blue as app/icon.svg, within the adaptive safe zone.
const res = "android/app/src/main/res";
mkdirSync(join(res, "drawable"), { recursive: true });
mkdirSync(join(res, "mipmap-anydpi-v26"), { recursive: true });
writeFileSync(
  join(res, "drawable/graphlive_foreground.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <group android:translateX="22" android:translateY="22">
    <path android:pathData="M18,19 L45,25 L29,46 Z" android:fillColor="#00000000" android:strokeColor="#FFFFFFFF" android:strokeWidth="3"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M11,19 a7,7 0,1 0,14 0 a7,7 0,1 0,-14 0 M39,25 a6,6 0,1 0,12 0 a6,6 0,1 0,-12 0 M24,46 a5,5 0,1 0,10 0 a5,5 0,1 0,-10 0"/>
  </group>
</vector>`,
);
writeFileSync(
  join(res, "drawable/graphlive_background.xml"),
  `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#335eaa"/></shape>`,
);
for (const name of ["ic_launcher", "ic_launcher_round"]) {
  writeFileSync(
    join(res, `mipmap-anydpi-v26/${name}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@drawable/graphlive_background"/>
  <foreground android:drawable="@drawable/graphlive_foreground"/>
  <monochrome android:drawable="@drawable/graphlive_foreground"/>
</adaptive-icon>`,
  );
}

// Match the platform launch screen to the in-app animated logo.
for (const [directory, background] of [
  ["values", "#f5f8ff"],
  ["values-night", "#101827"],
]) {
  mkdirSync(join(res, directory), { recursive: true });
  writeFileSync(
    join(res, directory, "graphlive-startup.xml"),
    `<resources><color name="graphlive_startup">${background}</color></resources>`,
  );
}
const stylesPath = join(res, "values/styles.xml");
const launchTheme = `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="android:background">@color/graphlive_startup</item>
    <item name="windowSplashScreenBackground">@color/graphlive_startup</item>
    <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
    <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
  </style>`;
const styles = readFileSync(stylesPath, "utf8");
if (!styles.includes('name="AppTheme.NoActionBarLaunch"')) {
  throw new Error("Capacitor launch theme missing");
}
writeFileSync(
  stylesPath,
  styles.replace(
    /<style name="AppTheme.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/,
    launchTheme,
  ),
);
