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
  expect(body.service).toBe("bandwidth-hero-proxy");
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
