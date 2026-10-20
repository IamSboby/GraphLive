param([string]$NasRoot = '\\192.168.1.100\rody\GraphLiveAndroid', [switch]$SkipWeb, [switch]$NativeOnly, [string]$ProjectPath)
$ErrorActionPreference = 'Stop'
$project = if ($ProjectPath) { [IO.Path]::GetFullPath($ProjectPath) } else { Split-Path -Parent $PSScriptRoot }
if (-not $project.StartsWith($NasRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Run this script from the project copy inside the configured NAS root. Android build data must remain on the NAS.'
}
$env:ANDROID_HOME = Join-Path $NasRoot 'sdk'
$env:ANDROID_USER_HOME = Join-Path $NasRoot 'android-user'
$env:ANDROID_AVD_HOME = Join-Path $NasRoot 'avd'
$env:GRADLE_USER_HOME = Join-Path $NasRoot 'gradle'
$env:npm_config_cache = Join-Path $NasRoot 'npm-cache'
$env:TEMP = Join-Path $NasRoot 'temp'
$env:TMP = $env:TEMP
$env:JAVA_HOME = (Get-ChildItem (Join-Path $NasRoot 'tools\jdk') -Directory | Select-Object -First 1).FullName
$env:JAVA_TOOL_OPTIONS = '-Duser.home="' + $env:ANDROID_USER_HOME + '" -Djava.io.tmpdir="' + $env:TEMP + '"'
$env:PAGES_BASE_PATH = ''
$env:GRAPHLIVE_ANDROID = 'true'
$env:NEXT_TELEMETRY_DISABLED = '1'
Set-Location $project
if (-not (Test-Path 'android\gradlew.bat')) {
    node node_modules/@capacitor/cli/bin/capacitor add android
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path 'android\gradlew.bat')) { throw 'Capacitor Android generation failed' }
}
if (-not $SkipWeb -and -not $NativeOnly) {
    node scripts/build-pages.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Static web build failed' }
}
New-Item -ItemType Directory -Force 'android\app\src\main\assets' | Out-Null
if ($NativeOnly) {
    # Java-only validation does not package or claim web assets.
    New-Item -ItemType Directory -Force 'android\app\src\main\assets\public' | Out-Null
    node node_modules/@capacitor/cli/bin/capacitor update android
} else { node node_modules/@capacitor/cli/bin/capacitor sync android }
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
$javaTarget = Join-Path $project 'android\app\src\main\java\com\graphlive\android'
New-Item -ItemType Directory -Force $javaTarget | Out-Null
Get-ChildItem 'android-native\*.java' | Copy-Item -Destination $javaTarget -Force
$testTarget = Join-Path $project 'android\app\src\androidTest\java\com\graphlive\android'
New-Item -ItemType Directory -Force $testTarget | Out-Null
Get-ChildItem 'android-native\tests\*.java' | Copy-Item -Destination $testTarget -Force
$gradleFile = Join-Path $project 'android\app\build.gradle'
$gradleText = Get-Content $gradleFile -Raw
if (-not $gradleText.Contains('androidx.work:work-runtime')) {
    $gradleText += "`ndependencies {`n    implementation 'androidx.work:work-runtime:2.11.2'`n    implementation 'androidx.javascriptengine:javascriptengine:1.0.0'`n    implementation 'com.google.android.gms:play-services-auth:22.0.0'`n}`n"
    Set-Content $gradleFile $gradleText -Encoding utf8
}
$properties = Join-Path $project 'android\gradle.properties'
$propertiesText = Get-Content -LiteralPath $properties -Raw
foreach ($setting in @('org.gradle.vfs.watch=false', 'org.gradle.native=false', 'org.gradle.workers.max=1')) {
    if (-not $propertiesText.Contains($setting)) { $propertiesText += "`n$setting`n" }
}
Set-Content -LiteralPath $properties -Value $propertiesText -Encoding utf8
$variables = Join-Path $project 'android\variables.gradle'
(Get-Content $variables -Raw) -replace 'minSdkVersion = \d+', 'minSdkVersion = 26' | Set-Content $variables -Encoding utf8
$manifest = Join-Path $project 'android\app\src\main\AndroidManifest.xml'
(Get-Content $manifest -Raw).Replace('android:allowBackup="true"', 'android:allowBackup="false"') | Set-Content $manifest -Encoding utf8
node (Join-Path $PSScriptRoot 'build-android-worker.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Background engine build failed' }
# Invoke the wrapper through Java: cmd.exe cannot use a UNC current directory.
& "$env:JAVA_HOME\bin\java.exe" '-Dorg.gradle.internal.instrumentation.agent=false' -classpath 'android\gradle\wrapper\gradle-wrapper.jar' org.gradle.wrapper.GradleWrapperMain --no-daemon -p android $(if ($NativeOnly) { 'compileDebugJavaWithJavac' } else { 'assembleDebug' })
if ($LASTEXITCODE -ne 0) { throw 'Android compilation failed' }
if ($NativeOnly) { return }
$apk = Join-Path $project 'android\app\build\outputs\apk\debug\app-debug.apk'
Get-Item $apk | Select-Object FullName,Length
Get-FileHash $apk -Algorithm SHA256








