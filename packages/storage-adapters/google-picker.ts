import type { GoogleSession } from "./google-auth";

// Public browser key, restricted in Google Cloud to Picker and allowed websites.
const developerKey = "AIzaSyBxMUwsq-DpK-QAtWMA0Hm8hLAdENXb4V8";
type PickerResult = { action: string; docs?: { id: string }[] };
type View = {
  setMimeTypes(types: string): View;
  setOwnedByMe(owned: boolean): View;
  setQuery(query: string): View;
  setLabel(label: string): View;
};
type Picker = { setVisible(visible: boolean): void; dispose(): void };
type Builder = {
  addView(view: View): Builder;
  enableFeature(feature: string): Builder;
  setOAuthToken(token: string): Builder;
  setDeveloperKey(key: string): Builder;
  setAppId(id: string): Builder;
  setOrigin(origin: string): Builder;
  setCallback(callback: (result: PickerResult) => void): Builder;
  build(): Picker;
};
type PickerWindow = {
  gapi?: {
    load(
      name: string,
      options: {
        callback: () => void;
        onerror: () => void;
        timeout: number;
        ontimeout: () => void;
      },
    ): void;
  };
  google?: {
    picker?: {
      DocsView: new () => View;
      PickerBuilder: new () => Builder;
      Feature: { MULTISELECT_ENABLED: string };
    };
  };
};
let loading: Promise<void> | undefined;
function preparePicker() {
  const host = window as unknown as PickerWindow;
  if (host.google?.picker) return Promise.resolve();
  return (loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      loading = undefined;
      script.remove();
      reject(new Error("driveUnavailable"));
    };
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onerror = fail;
    script.onload = () =>
      host.gapi
        ? host.gapi.load("picker", {
            callback: resolve,
            onerror: fail,
            timeout: 15000,
            ontimeout: fail,
          })
        : fail();
    document.head.appendChild(script);
  }));
}
export async function pickSharedNetworks(
  session: GoogleSession,
  labels: { networks: string; allJson: string },
): Promise<string[]> {
  await preparePicker();
  const api = (window as unknown as PickerWindow).google?.picker;
  if (!api) throw new Error("driveUnavailable");
  return new Promise((resolve) => {
    const picker = new api.PickerBuilder()
      .addView(
        new api.DocsView()
          .setMimeTypes("application/json")
          .setOwnedByMe(false)
          .setQuery("graphlive.json")
          .setLabel(labels.networks),
      )
      .addView(
        new api.DocsView()
          .setMimeTypes("application/json")
          .setOwnedByMe(false)
          .setLabel(labels.allJson),
      )
      .enableFeature(api.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(session.pickerToken)
      .setDeveloperKey(developerKey)
      .setAppId("225177671658")
      .setOrigin(window.location.origin)
      .setCallback((result) => {
        if (result.action === "picked" || result.action === "cancel") {
          picker.dispose();
          resolve(
            result.action === "picked"
              ? [...new Set((result.docs ?? []).map((doc) => doc.id))]
              : [],
          );
        }
      })
      .build();
    picker.setVisible(true);
  });
}
