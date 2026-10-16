// CrazyGames user module. Menus talk to this service and never to window.CrazyGames.
// CrazyGames draws the login popup (no Google, Apple, or our own OAuth). There is
// no backend in this version, so we do not call getUserToken or read __dangerousUserId.

export interface Account {
  username: string;
  profilePictureUrl: string;
}

/** What the menu should draw. Hidden on embeds and anywhere accounts are off. */
export type AccountView =
  | { kind: 'hidden' }
  | { kind: 'guest' }
  | { kind: 'signed-in'; username: string; profilePictureUrl: string };

export interface UserService {
  /** False when the SDK is missing or isUserAccountAvailable is false. */
  readonly available: boolean;
  /** Logged-in player, or null while they stay a guest. */
  readonly current: Account | null;
  /**
   * Open CrazyGames' own login / register popup.
   * Resolves null when the player closes it or the prompt cannot open.
   */
  signIn(): Promise<Account | null>;
  /** Login elsewhere. Logout reloads the page, so this is not a logout signal. */
  onChange(listener: (account: Account | null) => void): () => void;
}

/** Shape of window.CrazyGames.SDK.user. Only the calls this game makes. */
export interface SdkUser {
  username?: string;
  profilePictureUrl?: string;
}

export interface UserModule {
  isUserAccountAvailable: boolean;
  getUser(): Promise<SdkUser | null>;
  showAuthPrompt(): Promise<SdkUser | null>;
  addAuthListener(listener: (user: SdkUser | null) => void): void;
}

export function accountView(user: UserService): AccountView {
  if (!user.available) return { kind: 'hidden' };
  if (!user.current) return { kind: 'guest' };
  return {
    kind: 'signed-in',
    username: user.current.username,
    profilePictureUrl: user.current.profilePictureUrl,
  };
}

export function unavailableUser(): UserService {
  return {
    available: false,
    current: null,
    signIn: async () => null,
    onChange: () => () => {},
  };
}

/** https only, so a picture URL cannot be a script. Empty when it is not. */
function safePictureUrl(value: string | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function toAccount(raw: SdkUser | null | undefined): Account | null {
  const username = raw?.username?.trim() ?? '';
  if (!username) return null;
  return { username, profilePictureUrl: safePictureUrl(raw?.profilePictureUrl) };
}

function errorCode(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'unexpectedError';
}

function sameAccount(a: Account | null, b: Account | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.username === b.username && a.profilePictureUrl === b.profilePictureUrl;
}

/**
 * Read the current player and subscribe to later logins.
 * A missing or unavailable module never calls the SDK, and the menu hides the control.
 */
export async function createUserService(mod: UserModule | undefined): Promise<UserService> {
  if (!mod) return unavailableUser();
  let available = false;
  try {
    available = mod.isUserAccountAvailable === true;
  } catch {
    return unavailableUser();
  }
  if (!available) return unavailableUser();

  let current: Account | null = null;
  const listeners = new Set<(account: Account | null) => void>();

  const publish = (next: Account | null) => {
    if (sameAccount(current, next)) return;
    current = next;
    for (const listener of listeners) listener(current);
  };

  try {
    mod.addAuthListener((user) => publish(toAccount(user)));
  } catch {
    /* The chip still updates from getUser and showAuthPrompt. */
  }

  try {
    current = toAccount(await mod.getUser());
  } catch {
    current = null;
  }

  let prompt: Promise<Account | null> | null = null;

  const service: UserService = {
    available: true,
    get current() {
      return current;
    },
    signIn() {
      if (prompt) return prompt;
      prompt = runPrompt().finally(() => {
        prompt = null;
      });
      return prompt;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  async function runPrompt(): Promise<Account | null> {
    try {
      publish(toAccount(await mod!.showAuthPrompt()));
      return current;
    } catch (error) {
      if (errorCode(error) === 'userAlreadySignedIn') {
        try {
          publish(toAccount(await mod!.getUser()));
        } catch {
          /* Keep whoever we already had. */
        }
        return current;
      }
      // userCancelled, showAuthPromptInProgress, or a portal glitch: stay a guest.
      return current;
    }
  }

  return service;
}
