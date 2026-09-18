import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { HERO_ATLAS_URL } from "../data/heroSprite";

export type PortraitAssetState =
  | { status: "loading"; url: null }
  | { status: "ready"; url: string }
  | { status: "failed"; url: null };

const PortraitAssetContext = createContext<PortraitAssetState>({
  status: "ready",
  url: HERO_ATLAS_URL
});

let atlasPromise: Promise<string> | null = null;

function loadPortraitAtlas(): Promise<string> {
  if (atlasPromise) return atlasPromise;

  atlasPromise = fetch(HERO_ATLAS_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Hero atlas request failed with ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => resolve(objectUrl);
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Hero atlas could not be decoded"));
      };
      image.src = objectUrl;
    }));

  atlasPromise.catch(() => {
    atlasPromise = null;
  });

  return atlasPromise;
}

export function PortraitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortraitAssetState>({
    status: "loading",
    url: null
  });

  useEffect(() => {
    let active = true;

    loadPortraitAtlas()
      .then((url) => {
        if (active) setState({ status: "ready", url });
      })
      .catch(() => {
        if (active) setState({ status: "failed", url: null });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <PortraitAssetContext.Provider value={state}>
      {children}
    </PortraitAssetContext.Provider>
  );
}

export function usePortraitAsset() {
  return useContext(PortraitAssetContext);
}
