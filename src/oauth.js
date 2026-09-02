import crypto from "node:crypto";
import { config } from "./config.js";
import {
  getProviderToken,
  saveProviderToken,
  withProviderLock
} from "./tokenStore.js";

const states = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function makeState(provider) {
  const state = crypto.randomBytes(24).toString("hex");
  states.set(state, { provider, createdAt: Date.now() });
  return state;
}

function consumeState(state, provider) {
  const item = states.get(state);
  states.delete(state);

  if (!item || item.provider !== provider) {
    throw new Error("Invalid or expired OAuth state.");
  }

  if (Date.now() - item.createdAt > STATE_TTL_MS) {
    throw new Error("OAuth state expired.");
  }
}

function basicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function readJsonResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function createXeroAuthUrl() {
  const state = makeState("xero");
  const url = new URL(config.xero.authorizeUrl);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.xero.clientId);
  url.searchParams.set("redirect_uri", config.xero.redirectUri);
  url.searchParams.set(
    "scope",
    [
      "openid",
      "profile",
      "email",
      "offline_access",
      "accounting.contacts.read"
    ].join(" ")
  );
  url.searchParams.set("state", state);

  return url.toString();
}

export async function handleXeroCallback(code, state) {
  consumeState(state, "xero");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.xero.redirectUri
  });

  const res = await fetch(config.xero.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(
        config.xero.clientId,
        config.xero.clientSecret
      )}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body
  });

  const data = await readJsonResponse(res);

  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(
      `Xero token exchange failed: ${JSON.stringify(data)}`
    );
  }

  await saveProviderToken("xero", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:
      Date.now() + Number(data.expires_in || 1800) * 1000,
    tokenType: data.token_type || "Bearer"
  });

  return data;
}

/*
 * Xero refresh tokens are rotated.
 * Every successful refresh returns a NEW refresh token and the old
 * refresh token must no longer be used.  Two simultaneous requests
 * trying to refresh the same token can therefore cause:
 *   invalid_grant / Refresh token has been consumed
 *
 * The provider lock guarantees that only one refresh request is sent
 * at a time.  The token is re-read after waiting for the lock so the
 * second request uses the newly stored access/refresh token.
 */
export async function getXeroAccessToken() {
  return withProviderLock("xero", async () => {
    const token = await getProviderToken("xero");

    if (!token?.refreshToken) {
      throw new Error("Xero is not connected. Please reconnect Xero.");
    }

    if (
      token.accessToken &&
      token.expiresAt &&
      Date.now() < token.expiresAt - 60_000
    ) {
      return token.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken
    });

    const res = await fetch(config.xero.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(
          config.xero.clientId,
          config.xero.clientSecret
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body
    });

    const data = await readJsonResponse(res);

    if (!res.ok || !data.access_token) {
      const detail = JSON.stringify(data);
      const invalidGrant =
        res.status === 400 &&
        String(data?.error || "").toLowerCase() === "invalid_grant";

      if (invalidGrant) {
        throw new Error(
          "Xero refresh token is invalid or has already been consumed. Reconnect Xero once from the UI, then select the Xero organization again."
        );
      }

      throw new Error(`Xero token refresh failed: ${detail}`);
    }

    if (!data.refresh_token) {
      throw new Error(
        "Xero token refresh succeeded but no replacement refresh token was returned."
      );
    }

    await saveProviderToken("xero", {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:
        Date.now() + Number(data.expires_in || 1800) * 1000,
      tokenType: data.token_type || "Bearer"
    });

    return data.access_token;
  });
}

export function createZohoAuthUrl() {
  const state = makeState("zoho");
  const url = new URL(`${config.zoho.accountsUrl}/oauth/v2/auth`);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.zoho.clientId);
  url.searchParams.set("scope", "ZohoBooks.fullaccess.ALL");
  url.searchParams.set("redirect_uri", config.zoho.redirectUri);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function handleZohoCallback(code, state) {
  consumeState(state, "zoho");

  const url = new URL(`${config.zoho.accountsUrl}/oauth/v2/token`);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", config.zoho.clientId);
  url.searchParams.set("client_secret", config.zoho.clientSecret);
  url.searchParams.set("redirect_uri", config.zoho.redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" }
  });

  const data = await readJsonResponse(res);

  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(
      `Zoho token exchange failed: ${JSON.stringify(data)}`
    );
  }

  await saveProviderToken("zoho", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:
      Date.now() + Number(data.expires_in || 3600) * 1000,
    apiDomain: data.api_domain || config.zoho.apiDomain
  });

  return data;
}

export async function getZohoAccessToken() {
  return withProviderLock("zoho", async () => {
    const token = await getProviderToken("zoho");

    if (!token?.refreshToken) {
      throw new Error("Zoho is not connected. Please reconnect Zoho.");
    }

    if (
      token.accessToken &&
      token.expiresAt &&
      Date.now() < token.expiresAt - 60_000
    ) {
      return token.accessToken;
    }

    const url = new URL(`${config.zoho.accountsUrl}/oauth/v2/token`);
    url.searchParams.set("refresh_token", token.refreshToken);
    url.searchParams.set("client_id", config.zoho.clientId);
    url.searchParams.set("client_secret", config.zoho.clientSecret);
    url.searchParams.set("grant_type", "refresh_token");

    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" }
    });

    const data = await readJsonResponse(res);

    if (!res.ok || !data.access_token) {
      throw new Error(
        `Zoho token refresh failed: ${JSON.stringify(data)}`
      );
    }

    await saveProviderToken("zoho", {
      accessToken: data.access_token,
      refreshToken: token.refreshToken,
      expiresAt:
        Date.now() + Number(data.expires_in || 3600) * 1000,
      apiDomain:
        data.api_domain || token.apiDomain || config.zoho.apiDomain
    });

    return data.access_token;
  });
}
