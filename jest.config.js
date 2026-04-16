export default {
	testEnvironment: "node",
	testMatch: ["**/__tests__/**/*.test.js"],
	collectCoverageFrom: [
		"src/**/*.js",
		"!src/server.js",
		"!src/**/__tests__/**"
	],
	testTimeout: 10000,
	detectOpenHandles: true,
	transform: {}
};
