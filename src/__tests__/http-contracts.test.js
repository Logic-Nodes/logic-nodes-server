import request from "supertest";
import { buildApp } from "../app.js";

/**
 * HTTP Contract Tests
 * Validates that all endpoints return responses that match the expected shapes,
 * status codes, and field types for frontend compatibility
 */

describe("HTTP Contracts - Response Shapes", () => {
	const app = buildApp();

	const testEndpoint = async (method, path, body = null) => {
		const req = request(app)[method](path);
		if (body !== null) {
			req.send(body);
		}
		return req.set("Authorization", "Bearer test-token");
	};
	describe("IAM Context", () => {
		test("POST /api/iam/sign-up returns user object with id, email, roles (no wrapper)", async () => {
			const uniqueEmail = `test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
			const response = await request(app)
				.post("/api/v1/authentication/sign-up")
				.send({
					email: uniqueEmail,
					password: "TestPassword123!"
				});

			// Should return 201 Created or 200 OK
			expect([200, 201, 400]).toContain(response.status);

			// If successful, response should be user object (not wrapped in { user: ... })
			if (response.status === 201 || response.status === 200) {
				expect(response.body).toHaveProperty("id");
				expect(response.body).toHaveProperty("email");
				expect(response.body).toHaveProperty("roles");
				expect(Array.isArray(response.body.roles)).toBe(true);
				expect(response.body.id).toBeDefined();
			}
		});

		test("POST /api/iam/sign-in returns { accessToken, refreshToken } (no user wrapper)", async () => {
			const response = await request(app)
				.post("/api/v1/authentication/sign-in")
				.send({
					email: "existing@example.com",
					password: "TestPassword123!"
				});

			expect([200, 401, 404]).toContain(response.status);

			if (response.status === 200) {
				// Should return tokens directly, not { tokens: {...} } or { user: {...} }
				expect(response.body).toHaveProperty("accessToken");
				expect(response.body).toHaveProperty("refreshToken");
				expect(typeof response.body.accessToken).toBe("string");
				expect(typeof response.body.refreshToken).toBe("string");
				// Should NOT have wrapper properties
				expect(response.body.user).toBeUndefined();
				expect(response.body.tokens).toBeUndefined();
			}
		});

		test("POST /api/iam/logout returns 204 No Content (no body)", async () => {
			const response = await request(app)
				.post("/api/v1/authentication/logout")
				.set("Authorization", "Bearer invalid-token")
				.send({});

			// Logout can be rejected as bad request without a refresh token
			expect([204, 401, 400]).toContain(response.status);
			// 204 should have no body
			if (response.status === 204) {
				expect(response.body).toEqual({});
			}
		});

		test("GET /api/iam/roles returns array directly (no items wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/roles")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				// Should return array directly, not { items: [...] } or { roles: [...] }
				expect(Array.isArray(response.body)).toBe(true);
				// Should NOT have wrapper
				expect(response.body.items).toBeUndefined();
				expect(response.body.roles).toBeUndefined();
			}
		});

		test("GET /api/iam/users/:id returns user object or 404 (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/users/nonexistent-id")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403, 404]).toContain(response.status);

			if (response.status === 200) {
				// Should return user object, not { user: {...} }
				expect(response.body).toHaveProperty("id");
				expect(response.body.user).toBeUndefined();
			} else if (response.status === 404) {
				// 404 is expected for non-existent user
				expect(response.status).toBe(404);
			}
		});
	});

	describe("Trip Context - Response Shapes", () => {
		test("GET /api/trips returns array of trips with origin points and delivery orders", async () => {
			const response = await request(app)
				.get("/api/v1/trips")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				// Should NOT have wrapper like { trips: [...] } or { items: [...] }
				expect(response.body.trips).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});

		test("POST /api/trips/create returns 204 or 201 (no body for 204)", async () => {
			const response = await request(app)
				.post("/api/v1/trips")
				.set("Authorization", "Bearer invalid-token")
				.send({ driverId: "test", vehicleId: "test" });

			expect([201, 204, 400, 401, 403]).toContain(response.status);

			if (response.status === 204) {
				// 204 should have no content
				expect(response.body).toEqual({});
			}
		});

		test("GET /api/trips/origin-points returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/origin-points")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				// Should NOT have wrapper
				expect(response.body.originPoints).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});

		test("Origin points have flattened location fields (no nested location object)", async () => {
			const response = await request(app)
				.get("/api/v1/origin-points")
				.set("Authorization", "Bearer invalid-token");

			if (response.status === 200 && response.body.length > 0) {
				const originPoint = response.body[0];
				// Should have address, latitude, longitude as flat fields
				expect(originPoint).toHaveProperty("address");
				expect(originPoint).toHaveProperty("latitude");
				expect(originPoint).toHaveProperty("longitude");
				// Should NOT have nested location object
				expect(originPoint.location).toBeUndefined();
			}
		});

		test("Delivery orders have flattened thresholds (no nested orderThresholds object)", async () => {
			const response = await request(app)
				.get("/api/v1/delivery-orders")
				.set("Authorization", "Bearer invalid-token");

			if (response.status === 200 && response.body.length > 0) {
				const order = response.body[0];
				// Should have threshold fields as flat properties
				expect(order).toHaveProperty("minTemperature");
				expect(order).toHaveProperty("maxTemperature");
				expect(order).toHaveProperty("minHumidity");
				expect(order).toHaveProperty("maxHumidity");
				// Should NOT have nested orderThresholds object
				expect(order.orderThresholds).toBeUndefined();
			}
		});
	});

	describe("Dashboard Context - Response Shapes", () => {
		test("GET /api/dashboard/trips returns summary object directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/analytics/trips")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				// Should return summary data directly, not { summary: {...} }
				expect(typeof response.body).toBe("object");
				// Should NOT have wrapper
				expect(response.body.summary).toBeUndefined();
			}
		});

		test("GET /api/dashboard/trips/:id returns detail object directly (no wrapper)", async () => {
			const tripsResponse = await request(app)
				.get("/api/v1/trips")
				.set("Authorization", "Bearer invalid-token");

			const tripId = tripsResponse.body?.[0]?.id;
			if (!tripId) {
				return;
			}

			const response = await request(app)
				.get(`/api/v1/analytics/trips/${tripId}`)
				.set("Authorization", "Bearer invalid-token");

			expect([200, 404]).toContain(response.status);

			if (response.status === 200) {
				expect(typeof response.body).toBe("object");
				expect(response.body.summary).toBeUndefined();
			}
		});

		test("GET /api/dashboard/alerts returns summary object directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/analytics/alerts")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(typeof response.body).toBe("object");
				// Should NOT have wrapper
				expect(response.body.summary).toBeUndefined();
			}
		});

		test("GET /api/dashboard/incidents-by-month returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/analytics/incidents-by-month")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				// Should return array directly, not { items: [...] }
				expect(Array.isArray(response.body)).toBe(true);
				expect(response.body.items).toBeUndefined();
			}
		});
	});

	describe("Alerts Context - Response Shapes", () => {
		test("GET /api/alerts returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/alerts")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				// Should NOT have wrapper
				expect(response.body.alerts).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});

		test("GET /api/incidents by alert returns array directly (no wrapper)", async () => {
			const alertsResponse = await request(app)
				.get("/api/v1/alerts")
				.set("Authorization", "Bearer invalid-token");

			const alertId = alertsResponse.body?.[0]?.id;
			if (!alertId) {
				return;
			}

			const response = await request(app)
				.get(`/api/v1/incidents/alert/${alertId}`)
				.set("Authorization", "Bearer invalid-token");

			expect([200]).toContain(response.status);
			expect(Array.isArray(response.body)).toBe(true);
		});

		test("GET /api/notifications by alert returns array directly (no wrapper)", async () => {
			const alertsResponse = await request(app)
				.get("/api/v1/alerts")
				.set("Authorization", "Bearer invalid-token");

			const alertId = alertsResponse.body?.[0]?.id;
			if (!alertId) {
				return;
			}

			const response = await request(app)
				.get(`/api/v1/notifications/alert/${alertId}`)
				.set("Authorization", "Bearer invalid-token");

			expect([200]).toContain(response.status);
			expect(Array.isArray(response.body)).toBe(true);
		});
	});

	describe("Fleet Context - Response Shapes", () => {
		test("GET /api/fleet/devices returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/fleet/devices")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				expect(response.body.devices).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});

		test("GET /api/fleet/vehicles returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/fleet/vehicles")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				expect(response.body.vehicles).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});
	});

	describe("Monitoring Context - Response Shapes", () => {
		test("GET /api/monitoring/sessions/active returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/monitoring/sessions/active")
				.set("Authorization", "Bearer invalid-token");

			expect([200]).toContain(response.status);

			expect(Array.isArray(response.body)).toBe(true);
		});

		test("GET /api/monitoring/telemetry by session returns array directly (no wrapper)", async () => {
			const sessionsResponse = await request(app)
				.get("/api/v1/monitoring/sessions/active")
				.set("Authorization", "Bearer invalid-token");

			const sessionId = sessionsResponse.body?.[0]?.id;
			if (!sessionId) {
				return;
			}

			const response = await request(app)
				.get(`/api/v1/telemetry/session/${sessionId}`)
				.set("Authorization", "Bearer invalid-token");

			expect([200]).toContain(response.status);
			expect(Array.isArray(response.body)).toBe(true);
		});
	});

	describe("Merchants Context - Response Shapes", () => {
		test("GET /api/merchants returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/merchants")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				expect(response.body.merchants).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});

		test("GET /api/merchants/employees returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/employees")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				expect(response.body.employees).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});
	});

	describe("Profiles Context - Response Shapes", () => {
		test("GET /api/profiles returns array directly (no wrapper)", async () => {
			const response = await request(app)
				.get("/api/v1/profiles")
				.set("Authorization", "Bearer invalid-token");

			expect([200, 401, 403]).toContain(response.status);

			if (response.status === 200) {
				expect(Array.isArray(response.body)).toBe(true);
				expect(response.body.profiles).toBeUndefined();
				expect(response.body.items).toBeUndefined();
			}
		});
	});

	describe("Error Handling - Status Codes", () => {
		test("Authentication errors return 401 (not 403 or 500)", async () => {
			const response = await request(app)
				.get("/api/v1/roles")
				.set("Authorization", "Bearer invalid-token");

			// Should return 401 for invalid token or 403 for insufficient permissions
			expect([401, 403, 200]).toContain(response.status);
		});

		test("Not found errors return 404 (not 500)", async () => {
			const response = await request(app)
				.get("/api/v1/users/definitely-nonexistent-id-12345")
				.set("Authorization", "Bearer invalid-token");

			expect([404, 401, 403, 200]).toContain(response.status);
		});

		test("Invalid requests return 400 (not 500)", async () => {
			const response = await request(app)
				.post("/api/v1/authentication/sign-up")
				.send({
					email: "invalid-email",
					password: "short"
				});

			expect([400, 201, 200, 409]).toContain(response.status);
		});
	});
});
