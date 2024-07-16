const { handler } = require("../functions/index");
const { test, expect } = require("@jest/globals");

test("handler returns correct response when no url query parameter is provided", async () => {
  const event = {
    queryStringParameters: {},
  };

  const response = await handler(event);

  expect(response.statusCode).toBe(200);
  expect(response.body).toBe("Bandwidth Hero Data Compression Service");
});
beforeAll(async () => {
  // Wait for the fetch function to be imported and assigned
  await new Promise(resolve => {
    const checkFetch = setInterval(() => {
      if (fetch) {
        clearInterval(checkFetch);
        resolve();
      }
    }, 100);
  });
});
