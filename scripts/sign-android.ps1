param(
    [Parameter(Mandatory=$true)][string]$ArtifactDirectory,
    [string]$NasRoot = '\\192.168.1.100\rody\GraphLiveAndroid'
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($NasRoot).TrimEnd('\')
$artifacts = [IO.Path]::GetFullPath($ArtifactDirectory)
if (-not $artifacts.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'APK input and output must remain within the NAS Android directory.'
}
$key = Join-Path $root 'signing\graphlive-development.p12'
$passwordFile = Join-Path $root 'signing\password.dpapi'
$java = Join-Path (Get-ChildItem -LiteralPath (Join-Path $root 'tools\jdk') -Directory | Select-Object -First 1).FullName 'bin\java.exe'
$signer = Join-Path $root 'sdk\build-tools\36.0.0\lib\apksigner.jar'
if (-not (Test-Path -LiteralPath $key)) { throw 'Persistent NAS signing key is missing; do not replace it automatically.' }
$secure = (Get-Content -LiteralPath $passwordFile -Raw).Trim() | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:GRAPHLIVE_SIGN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
try {
    $output = Join-Path $artifacts 'signed'
    New-Item -ItemType Directory -Path $output -Force | Out-Null
    foreach ($name in @('app-debug.apk', 'app-debug-androidTest.apk')) {
        $target = Join-Path $output $name
        & $java -jar $signer sign --ks $key --ks-key-alias graphlive-development --ks-pass env:GRAPHLIVE_SIGN_PASSWORD --key-pass env:GRAPHLIVE_SIGN_PASSWORD --out $target (Join-Path $artifacts $name)
        if ($LASTEXITCODE -ne 0) { throw "Signing failed: $name" }
        $certificate = & $java -jar $signer verify --verbose --print-certs $target
        if ($LASTEXITCODE -ne 0) { throw "Signature verification failed: $name" }
        $certificate | Set-Content -LiteralPath (Join-Path $output ($name + '.certificate.txt')) -Encoding utf8
        Get-FileHash -LiteralPath $target -Algorithm SHA256 | Select-Object Hash,Path
    }
} finally { Remove-Item Env:\GRAPHLIVE_SIGN_PASSWORD -ErrorAction SilentlyContinue }

