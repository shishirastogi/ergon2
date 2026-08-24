/**
 * Wraps an async route handler so any thrown/rejected error flows into the
 * central Express error middleware instead of hanging the request.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
