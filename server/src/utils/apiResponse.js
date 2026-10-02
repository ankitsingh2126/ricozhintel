// Standard response helpers. Every route in the API uses one of these,
// so the frontend always knows what shape to expect.

export const sendSuccess = (res, data, meta = undefined, status = 200) => {
  const body = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(status).json(body);
};

export const sendError = (res, options) => {
  const {
    status = 500,
    code = 'ERROR',
    message = 'Something went wrong',
    details = null,
  } = options || {};

  const body = {
    success: false,
    error: { code, message },
  };
  if (details) {
    body.error.details = details;
  }
  return res.status(status).json(body);
};
