import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Run after Capacitor generation/sync. Never reads local credentials or .env files.
const javaPath = "android/app/src/main/java/com/graphlive/android";
const testPath = "android/app/src/androidTest/java/com/graphlive/android";
for (const [source, target] of [
  ["android-native", javaPath],
  ["android-native/tests", testPath],
]) {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source).filter((name) => name.endsWith(".java"))) {
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
writeFileSync(variables, readFileSync(variables, "utf8").replace(/minSdkVersion = \d+/, "minSdkVersion = 26"));
const manifest = "android/app/src/main/AndroidManifest.xml";
writeFileSync(manifest, readFileSync(manifest, "utf8").replace('android:allowBackup="true"', 'android:allowBackup="false"'));
