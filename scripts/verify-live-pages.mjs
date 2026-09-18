const siteUrl = process.env.SITE_URL;

if (!siteUrl) {
  console.error("Live Pages verification failed: SITE_URL is missing.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function validateHtml(html, currentUrl) {
  if (html.includes("/src/main.tsx")) {
    throw new Error("the public page is serving the repository Vite source entry");
  }

  if (html.includes("%BASE_URL%")) {
    throw new Error("the public page contains an unresolved Vite BASE_URL placeholder");
  }

  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => new URL(match[1], currentUrl));

  const appScript = scripts.find(
    (url) =>
      url.pathname.startsWith("/DotaGraph/assets/") &&
      url.pathname.endsWith(".js")
  );

  if (!appScript) {
    throw new Error("the public page does not reference a compiled /DotaGraph/assets/*.js bundle");
  }

  return appScript;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

  return response.text();
}

const attempts = 12;
const delayMs = 5_000;
let lastError;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const cacheBuster = new URL(siteUrl);
    cacheBuster.searchParams.set("_dotagraph_verify", Date.now().toString());

    const html = await fetchText(cacheBuster);
    const appScript = validateHtml(html, cacheBuster);

    const scriptResponse = await fetch(appScript, {
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache"
      },
      redirect: "follow"
    });

    if (!scriptResponse.ok) {
      throw new Error(
        `compiled app bundle returned ${scriptResponse.status} ${scriptResponse.statusText}`
      );
    }

    const contentType = scriptResponse.headers.get("content-type") ?? "";
    if (!contentType.includes("javascript") && !contentType.includes("text/plain")) {
      throw new Error(`compiled app bundle has unexpected content type: ${contentType || "missing"}`);
    }

    console.log(`Live GitHub Pages smoke test passed: ${siteUrl}`);
    console.log(`Compiled bundle: ${appScript.pathname}`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(
      `Live verification attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`
    );

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }
}

console.error(
  `Live Pages verification failed after ${attempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
);
process.exit(1);
