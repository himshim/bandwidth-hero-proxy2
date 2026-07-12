const { isValidUrl, isPrivateHost } = require("./validate");

/**
 * Custom Fetch client that securely follows redirects up to maxRedirects depth.
 * Verifies that the redirect target is valid and is NOT a private host (SSRF mitigation).
 */
async function fetchWithRedirectCheck(url, options = {}, maxRedirects = 5) {
  let currentUrl = url;
  let redirectCount = 0;

  const timeoutMs = options.timeout || 8000;
  // Exclude timeout from options passed to fetch
  const { timeout, ...fetchOptions } = options;

  // Set manual redirect handling to intercept 3xx codes
  fetchOptions.redirect = "manual";

  while (true) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timerId);

      const status = response.status;
      if (status >= 300 && status < 400) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new Error("MAX_REDIRECTS_EXCEEDED");
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new Error("REDIRECT_MISSING_LOCATION");
        }

        // Resolve absolute or relative redirect URL
        const resolvedUrl = new URL(location, currentUrl).toString();

        // Security check redirect target
        if (!isValidUrl(resolvedUrl)) {
          throw new Error("INVALID_REDIRECT_URL");
        }

        const parsedUrl = new URL(resolvedUrl);
        if (isPrivateHost(parsedUrl.hostname)) {
          throw new Error("FORBIDDEN_PRIVATE_REDIRECT");
        }

        currentUrl = resolvedUrl;
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timerId);
      if (err.name === "AbortError") {
        throw new Error("FETCH_TIMEOUT");
      }
      throw err;
    }
  }
}

module.exports = {
  fetchWithRedirectCheck
};
