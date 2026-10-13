import type { Locale, UserRole } from '@teran/contracts';

/** The authenticated principal attached to a request by SessionMiddleware. */
export interface RequestAuth {
  userId: string;
  sessionId: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  locale: Locale;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express exposes request augmentation only through this global namespace.
  namespace Express {
    interface Request {
      auth?: RequestAuth | null;
    }
  }
}
