const { isValidUrl, isPrivateHost } = require("./validate");

/**
 * Custom fetch that securely follows redirects up to maxRedirects depth.
 * Verifies redirect targets are valid and non-private (SSRF mitigation).
 *
 * A single AbortController is created before the redirect loop so the timeout
 * is a wall-clock deadline for the entire chain — not reset on every hop.
 */
async function fetchWithRedirectCheck(url, options = {}, maxRedirects = 5) {
  let currentUrl = url;
  let redirectCount = 0;

  const timeoutMs = options.timeout || 8000;
  const { timeout, ...fetchOptions } = options;
  fetchOptions.redirect = "manual";

  // One controller, one timer for the whole redirect chain.
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  fetchOptions.signal = controller.signal;

  try {
    while (true) {
      const response = await fetch(currentUrl, fetchOptions);
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

        // Resolve absolute or relative redirect URL.
        const resolvedUrl = new URL(location, currentUrl).toString();

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
    }
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("FETCH_TIMEOUT");
    }
    throw err;
  } finally {
    // Always clear the timer whether the fetch succeeded, failed, or timed out.
    clearTimeout(timerId);
  }
}

module.exports = {
  fetchWithRedirectCheck
};
