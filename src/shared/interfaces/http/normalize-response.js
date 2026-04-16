export const unwrapResponseBody = (body) => {
  if (body == null || Array.isArray(body) || typeof body !== "object") {
    return body;
  }

  const keys = Object.keys(body);
  if (keys.length === 1 && (keys[0] === "item" || keys[0] === "items")) {
    return body[keys[0]];
  }

  return body;
};

export const sendHttpResponse = (res, statusCode, body) => {
  if (statusCode === 204) {
    res.status(204).end();
    return;
  }

  const normalizedBody = unwrapResponseBody(body);
  if (typeof normalizedBody === "undefined") {
    res.status(statusCode).end();
    return;
  }

  res.status(statusCode).json(normalizedBody);
};