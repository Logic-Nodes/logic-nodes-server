import crypto from "crypto";

import jwt from "jsonwebtoken";

import { env } from "../../../shared/config/env.js";
import {
  createRefreshToken,
  createUser,
  getUserByEmail,
  isRefreshTokenRevoked,
  listRoles,
  listUsers,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
  updateUserPassword,
  verifyPassword
} from "../infrastructure/persistence/iam-repository.js";

const tokenPayloadFromUser = (user) => ({
  sub: String(user.id),
  email: user.email,
  roles: user.roles
});

const authError = (message = "Unauthorized") => Object.assign(new Error(message), { status: 401 });

const parseBearerToken = (authorization) => {
  const value = String(authorization || "").trim();
  if (!value.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return value.slice(7).trim() || null;
};

const verifyJwt = (token, errorMessage = "Invalid token") => {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch {
    throw authError(errorMessage);
  }
};

const signTokens = async (user) => {
  const tokenPayload = tokenPayloadFromUser(user);
  const refreshJti = crypto.randomUUID();
  const accessToken = jwt.sign({ ...tokenPayload, tokenType: "access" }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
  const refreshToken = jwt.sign({ ...tokenPayload, tokenType: "refresh", jti: refreshJti }, env.jwt.secret, {
    expiresIn: env.jwt.refreshExpiresIn
  });

  const refreshExpiresAt = new Date(Date.now() + parseDurationToMs(env.jwt.refreshExpiresIn));
  await createRefreshToken({ userId: user.id, jti: refreshJti, expiresAt: refreshExpiresAt });

  return {
    accessToken,
    refreshToken
  };
};

export const signUp = async ({ email, password, roles }) => {
  if (!email || !password) {
    throw Object.assign(new Error("Email and password are required"), { status: 400 });
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw Object.assign(new Error("User already exists"), { status: 409 });
  }

  const user = await createUser({ email, password, roles });
  return {
    id: user.id,
    email: user.email,
    roles: user.roles
  };
};

export const signIn = async ({ email, password }) => {
  if (!email || !password) {
    throw Object.assign(new Error("Email and password are required"), { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const passwordMatches = await verifyPassword(password, user.password);
  if (!passwordMatches) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  const tokens = await signTokens(user);

  return tokens;
};

export const verifyAccessToken = async ({ authorization, token }) => {
  const bearerToken = parseBearerToken(authorization) || token;
  if (!bearerToken) {
    throw authError("Token is required");
  }

  const decoded = verifyJwt(bearerToken, "Invalid or expired token");
  if (decoded.tokenType && decoded.tokenType !== "access") {
    throw authError("Access token is required");
  }

  const user = await getUserByEmail(decoded.email);
  if (!user) {
    throw authError("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
    token: bearerToken
  };
};

export const refreshTokens = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw authError("Refresh token is required");
  }

  const decoded = verifyJwt(refreshToken, "Invalid or expired refresh token");
  if (decoded.tokenType !== "refresh") {
    throw authError("Invalid refresh token");
  }

  if (decoded.jti && await isRefreshTokenRevoked(decoded.jti)) {
    throw authError("Refresh token revoked");
  }

  const payload = {
    id: Number(decoded.sub),
    email: decoded.email,
    roles: decoded.roles || ["USER"]
  };

  return signTokens(payload);
};

export const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw Object.assign(new Error("Refresh token is required"), { status: 400 });
  }

  const decoded = verifyJwt(refreshToken, "Invalid or expired refresh token");
  if (decoded.tokenType !== "refresh") {
    throw authError("Invalid refresh token");
  }

  if (decoded.jti) {
    await revokeRefreshToken(decoded.jti);
  }
};

export const logoutAll = async ({ authorization, userId }) => {
  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const accessToken = parseBearerToken(authorization);
    if (!accessToken) {
      throw authError("Access token is required");
    }

    const decoded = verifyJwt(accessToken, "Invalid or expired access token");
    if (decoded.tokenType && decoded.tokenType !== "access") {
      throw authError("Access token is required");
    }

    resolvedUserId = Number(decoded.sub);
  }

  if (!resolvedUserId) {
    throw authError("User id is required");
  }

  await revokeAllRefreshTokensForUser(resolvedUserId);
};

export const requestPasswordReset = async ({ email }) => {
  if (!email) {
    throw Object.assign(new Error("Email is required"), { status: 400 });
  }

  const user = await getUserByEmail(email);

  // Always respond the same way so the endpoint does not reveal which emails
  // exist. When the user is found we mint a short-lived reset token; without
  // an email provider the token is returned so the mobile flow can continue.
  if (!user) {
    return {
      message: "If the account exists, password reset instructions were issued.",
      resetToken: null
    };
  }

  const resetToken = jwt.sign(
    { sub: String(user.id), email: user.email, tokenType: "reset" },
    env.jwt.secret,
    { expiresIn: "15m" }
  );

  return {
    message: "If the account exists, password reset instructions were issued.",
    resetToken
  };
};

export const resetPassword = async ({ resetToken, password }) => {
  if (!resetToken || !password) {
    throw Object.assign(new Error("Reset token and password are required"), { status: 400 });
  }

  if (String(password).length < 8) {
    throw Object.assign(new Error("Password must be at least 8 characters"), { status: 400 });
  }

  const decoded = verifyJwt(resetToken, "Invalid or expired reset token");
  if (decoded.tokenType !== "reset") {
    throw authError("Invalid reset token");
  }

  const userId = Number(decoded.sub);
  const updated = await updateUserPassword(userId, password);
  if (!updated) {
    throw authError("User not found");
  }

  // Invalidate existing sessions after a password change.
  await revokeAllRefreshTokensForUser(userId);

  return { message: "Password updated successfully" };
};

export const getIamUsers = async () => listUsers();

export const getIamRoles = async () => listRoles();

function parseDurationToMs(duration) {
  if (typeof duration === "number" && Number.isFinite(duration)) {
    return duration;
  }

  const value = String(duration || "7d").trim();
  const match = value.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}