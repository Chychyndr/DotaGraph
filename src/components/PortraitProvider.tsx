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

export function PortraitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PortraitAssetState>({
    status: "loading",
    url: null
  });

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const fail = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      if (active) setState({ status: "failed", url: null });
    };

    fetch(HERO_ATLAS_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Hero atlas request failed with ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
          if (!active || !objectUrl) return;
          setState({ status: "ready", url: objectUrl });
        };
        image.onerror = fail;
        image.src = objectUrl;
      })
      .catch(fail);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
