// Module augmentation so `req.user` is typed without an `as any` cast.
// Optional because it's only populated on routes guarded by requireAuth.
declare global {
  namespace Express {
    interface Request {
      user?: { recruiterId: number };
    }
  }
}

export {};
