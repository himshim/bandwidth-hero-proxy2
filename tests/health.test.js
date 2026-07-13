const { handler } = require("../functions/health");
const { test, expect } = require("@jest/globals");

test("Health: returns ok status and valid JSON metadata", async () => {
  const event = {
    httpMethod: "GET",
    headers: {},
  };

  const response = await handler(event);

  expect(response.statusCode).toBe(200);
  expect(response.headers["Content-Type"]).toBe("application/json");

  const body = JSON.parse(response.body);
  expect(body.status).toBe("ok");
  expect(body.service).toBe("Bandwidth Proxy 2");
  expect(body.version).toBe("2.0.0");
});

test("Health: responds with 204 to OPTIONS pre-flight", async () => {
  const event = {
    httpMethod: "OPTIONS",
    headers: {},
  };

  const response = await handler(event);

  expect(response.statusCode).toBe(204);
});

test("Health: exposes api version as integer 1", async () => {
  const event = { httpMethod: "GET", headers: {} };
  const response = await handler(event);
  const body = JSON.parse(response.body);
  expect(body.api).toBe(1);
});

test("Health: features list includes webp, grayscale, maxwidth, stats", async () => {
  const event = { httpMethod: "GET", headers: {} };
  const response = await handler(event);
  const body = JSON.parse(response.body);
  expect(Array.isArray(body.features)).toBe(true);
  expect(body.features).toEqual(expect.arrayContaining(["webp", "grayscale", "maxwidth", "stats"]));
});

test("Health: CORS headers present on GET response", async () => {
  const event = { httpMethod: "GET", headers: {} };
  const response = await handler(event);
  expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
  expect(response.headers["Access-Control-Allow-Methods"]).toBe("GET, OPTIONS");
});
