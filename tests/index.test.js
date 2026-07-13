const { handler } = require("../functions/index");
const { test, expect, beforeAll, afterEach } = require("@jest/globals");

jest.mock("sharp", () => {
  return jest.fn().mockImplementation(() => {
    return {
      resize:   jest.fn().mockReturnThis(),
      grayscale: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue({
        data: Buffer.from("fake-compressed-webp-data"),
        info: { size: 100 }
      })
    };
  });
});

let originalFetch;

beforeAll(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test("Compatibility: returns correct response when no url query parameter is provided", async () => {
  const event = {
    headers: {},
    queryStringParameters: {},
  };

  const response = await handler(event);

  expect(response.statusCode).toBe(200);
  expect(response.body).toBe("bandwidth-hero-proxy");
});

test("Security: blocks invalid URLs with 400", async () => {
  const event = {
    headers: {},
    queryStringParameters: {
      url: "not-a-valid-url"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(400);
  expect(response.body).toBe("Invalid URL");
});

test("Security: blocks private hosts with 403", async () => {
  const event = {
    headers: {},
    queryStringParameters: {
      url: "http://localhost/test.jpg"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(403);
  expect(response.body).toBe("Forbidden");
});

test("Security: blocks redirects to private hosts with 500 (SSRF defense)", async () => {
  // Mock fetch to simulate a redirect to localhost
  global.fetch = jest.fn().mockImplementation((url, options) => {
    if (url === "https://legit-cdn.com/image.jpg") {
      return Promise.resolve({
        status: 302,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "http://127.0.0.1:8080/admin" : null)
        }
      });
    }
    return Promise.reject(new Error("Unexpected fetch call"));
  });

  const event = {
    headers: {},
    queryStringParameters: {
      url: "https://legit-cdn.com/image.jpg"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(500);
  expect(response.body).toBe("FORBIDDEN_PRIVATE_REDIRECT");
});

test("Security: enforces redirect limit with 500", async () => {
  // Mock fetch to create a loop
  global.fetch = jest.fn().mockImplementation((url) => {
    return Promise.resolve({
      status: 302,
      headers: {
        get: (name) => (name.toLowerCase() === "location" ? url : null)
      }
    });
  });

  const event = {
    headers: {},
    queryStringParameters: {
      url: "https://legit-cdn.com/image.jpg"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(500);
  expect(response.body).toBe("MAX_REDIRECTS_EXCEEDED");
});

test("Security: handles relative redirects correctly", async () => {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url === "https://legit-cdn.com/relative-redirect") {
      return Promise.resolve({
        status: 302,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "/target.jpg" : null)
        }
      });
    }
    if (url === "https://legit-cdn.com/target.jpg") {
      return Promise.resolve({
        status: 200,
        ok: true,
        headers: {
          get: (name) => (name.toLowerCase() === "content-type" ? "image/jpeg" : null),
          forEach: () => {}
        },
        arrayBuffer: () => Promise.resolve(Buffer.alloc(2000))
      });
    }
    return Promise.reject(new Error("Unexpected fetch call"));
  });

  const event = {
    headers: {},
    queryStringParameters: {
      url: "https://legit-cdn.com/relative-redirect"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(200);
});

test("Security: handles chained redirects up to limits", async () => {
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url === "https://legit-cdn.com/hop1") {
      return Promise.resolve({
        status: 302,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "https://legit-cdn.com/hop2" : null)
        }
      });
    }
    if (url === "https://legit-cdn.com/hop2") {
      return Promise.resolve({
        status: 302,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "https://legit-cdn.com/target.jpg" : null)
        }
      });
    }
    if (url === "https://legit-cdn.com/target.jpg") {
      return Promise.resolve({
        status: 200,
        ok: true,
        headers: {
          get: (name) => (name.toLowerCase() === "content-type" ? "image/jpeg" : null),
          forEach: () => {}
        },
        arrayBuffer: () => Promise.resolve(Buffer.alloc(2000))
      });
    }
    return Promise.reject(new Error("Unexpected fetch call"));
  });

  const event = {
    headers: {},
    queryStringParameters: {
      url: "https://legit-cdn.com/hop1"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(200);
});

test("Image Pipeline: successfully processes and compresses a valid image response", async () => {
  // Make dummy buffer larger than 1024 bytes to bypass MIN_COMPRESS_LENGTH check
  const jpegBuffer = Buffer.alloc(2000);

  global.fetch = jest.fn().mockImplementation((url) => {
    if (url === "https://legit-cdn.com/image.jpg") {
      const headersMap = {
        "content-type": "image/jpeg",
        "content-length": jpegBuffer.length.toString()
      };
      return Promise.resolve({
        status: 200,
        ok: true,
        headers: {
          get: (name) => headersMap[name.toLowerCase()] || null,
          forEach: (cb) => {
            Object.entries(headersMap).forEach(([k, v]) => cb(v, k));
          }
        },
        arrayBuffer: () => Promise.resolve(jpegBuffer.buffer.slice(jpegBuffer.byteOffset, jpegBuffer.byteOffset + jpegBuffer.byteLength))
      });
    }
    return Promise.reject(new Error("Unexpected fetch call"));
  });

  const event = {
    headers: {},
    queryStringParameters: {
      url: "https://legit-cdn.com/image.jpg",
      quality: "50"
    },
  };

  const response = await handler(event);
  expect(response.statusCode).toBe(200);
  expect(response.isBase64Encoded).toBe(true);
  
  // Output should be webp by default
  expect(response.headers["content-type"]).toBe("image/webp");
  
  // Clean base64 payload should be parseable
  const outputBuffer = Buffer.from(response.body, "base64");
  expect(outputBuffer.toString()).toBe("fake-compressed-webp-data");
});

// ─── Protocol Header Tests ────────────────────────────────────────────────────

function makeMockEvent(extra = {}) {
  const jpegBuffer = Buffer.alloc(2000);
  const headersMap = {
    "content-type":   "image/jpeg",
    "content-length": jpegBuffer.length.toString(),
  };

  global.fetch = jest.fn().mockResolvedValue({
    status: 200,
    ok: true,
    headers: {
      get:     (name) => headersMap[name.toLowerCase()] || null,
      forEach: (cb)   => Object.entries(headersMap).forEach(([k, v]) => cb(v, k)),
    },
    arrayBuffer: () =>
      Promise.resolve(
        jpegBuffer.buffer.slice(jpegBuffer.byteOffset, jpegBuffer.byteOffset + jpegBuffer.byteLength)
      ),
  });

  return {
    headers: {},
    queryStringParameters: {
      url:     "https://legit-cdn.com/image.jpg",
      quality: "50",
      ...extra,
    },
  };
}

test("Protocol: x-bh-backend header identifies proxy on compressed response", async () => {
  const response = await handler(makeMockEvent());
  expect(response.headers["x-bh-backend"]).toBe("bandwidth-proxy-2");
});

test("Protocol: x-bh-version matches semantic version on compressed response", async () => {
  const response = await handler(makeMockEvent());
  expect(response.headers["x-bh-version"]).toMatch(/^\d+\.\d+\.\d+$/);
});

test("Protocol: x-bh-api reports integer API version as string on compressed response", async () => {
  const response = await handler(makeMockEvent());
  expect(response.headers["x-bh-api"]).toBe("1");
});

test("Protocol: x-bh-features is a comma-separated feature list on compressed response", async () => {
  const response = await handler(makeMockEvent());
  const features = response.headers["x-bh-features"].split(",");
  expect(features).toEqual(expect.arrayContaining(["webp", "grayscale", "maxwidth", "stats"]));
});

test("Protocol: x-bh-original-size, x-bh-compressed-size, x-bh-bytes-saved present on compressed response", async () => {
  const response = await handler(makeMockEvent());
  expect(response.headers["x-bh-original-size"]).toBeDefined();
  expect(response.headers["x-bh-compressed-size"]).toBeDefined();
  expect(response.headers["x-bh-bytes-saved"]).toBeDefined();
  // values should be numeric strings
  expect(Number(response.headers["x-bh-original-size"])).toBeGreaterThan(0);
  expect(Number(response.headers["x-bh-compressed-size"])).toBeGreaterThan(0);
});

test("Protocol: legacy x-original-size and x-bytes-saved headers still present (backward compat)", async () => {
  const response = await handler(makeMockEvent());
  expect(response.headers["x-original-size"]).toBeDefined();
  expect(response.headers["x-bytes-saved"]).toBeDefined();
});

test("Protocol: grayscale param bw=1 accepted without error", async () => {
  const response = await handler(makeMockEvent({ bw: "1" }));
  expect(response.statusCode).toBe(200);
});

test("Protocol: jpeg param jpeg=1 accepted without error", async () => {
  const response = await handler(makeMockEvent({ jpeg: "1" }));
  expect(response.statusCode).toBe(200);
});

test("Protocol: legacy quality param l= accepted alongside quality=", async () => {
  const response = await handler(makeMockEvent({ l: "70" }));
  expect(response.statusCode).toBe(200);
});

test("Protocol: max_width param accepted without error", async () => {
  const response = await handler(makeMockEvent({ max_width: "800" }));
  expect(response.statusCode).toBe(200);
});
