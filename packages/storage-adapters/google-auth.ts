const clientId =
  "225177671658-gktplsqqjhb9dfma1oj3f05rih9fko40.apps.googleusercontent.com";
const scope = "https://www.googleapis.com/auth/drive.appdata";
type TokenResult = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
};
type GoogleIdentity = {
  accounts: {
    oauth2: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback: (result: TokenResult) => void;
        error_callback: () => void;
      }): { requestAccessToken(options: { prompt: string }): void };
    };
  };
};
let loading: Promise<void> | undefined;
const identity = () =>
  (window as unknown as { google?: GoogleIdentity }).google;
export function prepareGoogleDrive() {
  if (identity()) return Promise.resolve();
  return (loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error("driveUnavailable"));
    };
    document.head.appendChild(script);
  }));
}
export class GoogleSession {
  private token = "";
  private expires = 0;
  private account = "";
  connect(): Promise<void> {
    const google = identity();
    if (!google) return Promise.reject(new Error("driveUnavailable"));
    let expired = false;
    let timer: ReturnType<typeof setTimeout>;
    return new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => {
        expired = true;
        reject(new Error("driveCancelled"));
      }, 90000);
      google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope,
          callback: async (result) => {
            if (expired) return;
            if (
              !result.access_token ||
              !result.scope?.split(" ").includes(scope)
            ) {
              reject(new Error("drivePermission"));
              return;
            }
            try {
              const response = await fetch(
                "https://www.googleapis.com/drive/v2/about?fields=user(permissionId)",
                {
                  headers: { Authorization: "Bearer " + result.access_token },
                  cache: "no-store",
                  signal: AbortSignal.timeout(15000),
                },
              );
              if (!response.ok) throw new Error("drivePermission");
              const account: unknown = (await response.json()).user
                ?.permissionId;
              if (typeof account !== "string" || !account)
                throw new Error("drivePermission");
              if (this.account && this.account !== account)
                throw new Error("driveAccountChanged");
              const lifetime = Number(result.expires_in);
              if (!Number.isFinite(lifetime) || lifetime <= 60)
                throw new Error("driveExpired");
              if (expired) return;
              this.account = account;
              this.token = result.access_token;
              this.expires = Date.now() + (lifetime - 60) * 1000;
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error_callback: () => reject(new Error("driveCancelled")),
        })
        .requestAccessToken({ prompt: "select_account" });
    }).finally(() => {
      expired = true;
      clearTimeout(timer);
    });
  }
  async request(url: string, options: RequestInit = {}) {
    if (!/^https:\/\/www\.googleapis\.com\/(?:upload\/)?drive\/v2\//.test(url))
      throw new Error("invalidPath");
    if (!this.token || Date.now() >= this.expires)
      throw new Error("driveExpired");
    const headers = new Headers(options.headers);
    headers.set("Authorization", "Bearer " + this.token);
    const response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });
    if (response.status === 401) {
      this.token = "";
      throw new Error("driveExpired");
    }
    if (response.status === 403) throw new Error("drivePermission");
    if (!response.ok && response.status !== 412)
      throw new Error("storageError");
    return response;
  }
}
