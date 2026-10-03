import Image from "next/image";

export function GoogleDriveIcon({ size = 21 }: { size?: number }) {
  return (
    <Image
      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/google-drive-2026.svg`}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      unoptimized
      style={{ flexShrink: 0 }}
    />
  );
}
