export const TZ = 'Asia/Ho_Chi_Minh';

export function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function withHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      const status = e instanceof ApiError ? e.status : 500;
      res.status(status).json({ error: e.message || 'Lỗi server' });
    }
  };
}
