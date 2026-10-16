import { describe, expect, it } from 'vitest';
import { connectPortal, type CrazySDK } from './crazygames';
import {
  accountView,
  createUserService,
  type Account,
  type SdkUser,
  type UserModule,
} from './user';

const PICTURE = 'https://images.crazygames.com/userportal/avatars/4.png';

function player(username: string, profilePictureUrl = PICTURE): SdkUser & { __dangerousUserId: string } {
  return { username, profilePictureUrl, __dangerousUserId: 'do-not-use' };
}

function module(partial: Partial<UserModule> & Pick<UserModule, 'getUser'>): UserModule {
  return {
    isUserAccountAvailable: partial.isUserAccountAvailable ?? true,
    getUser: partial.getUser,
    showAuthPrompt: partial.showAuthPrompt ?? (async () => null),
    addAuthListener: partial.addAuthListener ?? (() => {}),
  };
}

describe('CrazyGames user service', () => {
  it('stays hidden when accounts are missing or unavailable', async () => {
    const missing = await createUserService(undefined);
    expect(missing.available).toBe(false);
    expect(missing.current).toBeNull();
    expect(accountView(missing)).toEqual({ kind: 'hidden' });
    await expect(missing.signIn()).resolves.toBeNull();

    const getUser = async () => player('Should.Not.Load');
    let prompted = false;
    let listened = false;
    const unavailable = await createUserService(module({
      isUserAccountAvailable: false,
      getUser,
      showAuthPrompt: async () => {
        prompted = true;
        return player('Nope');
      },
      addAuthListener: () => {
        listened = true;
      },
    }));
    expect(unavailable.available).toBe(false);
    expect(accountView(unavailable).kind).toBe('hidden');
    expect(prompted).toBe(false);
    expect(listened).toBe(false);
    await expect(unavailable.signIn()).resolves.toBeNull();
  });

  it('treats a logged-out player as a guest', async () => {
    const user = await createUserService(module({ getUser: async () => null }));
    expect(user.available).toBe(true);
    expect(user.current).toBeNull();
    expect(accountView(user)).toEqual({ kind: 'guest' });
  });

  it('loads the signed-in username and picture', async () => {
    const user = await createUserService(module({
      getUser: async () => player('SingingCheese.TLNU'),
    }));
    expect(user.current).toEqual({ username: 'SingingCheese.TLNU', profilePictureUrl: PICTURE });
    expect(user.current).not.toHaveProperty('__dangerousUserId');
    expect(accountView(user)).toEqual({
      kind: 'signed-in',
      username: 'SingingCheese.TLNU',
      profilePictureUrl: PICTURE,
    });
  });

  it('drops a picture that is not https', async () => {
    const user = await createUserService(module({
      getUser: async () => player('Rider.One', 'javascript:alert(1)'),
    }));
    expect(user.current).toEqual({ username: 'Rider.One', profilePictureUrl: '' });
  });

  it('stays a guest when getUser throws', async () => {
    const user = await createUserService(module({
      getUser: async () => {
        throw { code: 'unexpectedError', message: 'down' };
      },
    }));
    expect(user.available).toBe(true);
    expect(user.current).toBeNull();
    expect(accountView(user).kind).toBe('guest');
  });

  it('signs in when the auth prompt returns a user', async () => {
    const user = await createUserService(module({
      getUser: async () => null,
      showAuthPrompt: async () => player('Night.Rider'),
    }));
    const seen: Array<Account | null> = [];
    user.onChange((account) => seen.push(account));
    await expect(user.signIn()).resolves.toEqual({
      username: 'Night.Rider',
      profilePictureUrl: PICTURE,
    });
    expect(user.current?.username).toBe('Night.Rider');
    expect(seen.map((account) => account?.username)).toEqual(['Night.Rider']);
  });

  it('keeps the guest when the player cancels the prompt', async () => {
    const user = await createUserService(module({
      getUser: async () => null,
      showAuthPrompt: async () => {
        throw { code: 'userCancelled', message: 'The user closed the auth prompt' };
      },
    }));
    const seen: Array<Account | null> = [];
    user.onChange((account) => seen.push(account));
    await expect(user.signIn()).resolves.toBeNull();
    expect(user.current).toBeNull();
    expect(seen).toEqual([]);
    expect(accountView(user).kind).toBe('guest');
  });

  it('refreshes when the prompt says the player is already signed in', async () => {
    let reads = 0;
    const user = await createUserService(module({
      getUser: async () => {
        reads += 1;
        return reads === 1 ? null : player('Already.In');
      },
      showAuthPrompt: async () => {
        throw { code: 'userAlreadySignedIn', message: 'The user is already signed in' };
      },
    }));
    expect(user.current).toBeNull();
    await expect(user.signIn()).resolves.toMatchObject({ username: 'Already.In' });
    expect(user.current).not.toHaveProperty('__dangerousUserId');
  });

  it('shares one prompt when sign-in is already open', async () => {
    let opened = 0;
    let release: (user: SdkUser) => void = () => {};
    const user = await createUserService(module({
      getUser: async () => null,
      showAuthPrompt: () => {
        opened += 1;
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    }));
    const first = user.signIn();
    const second = user.signIn();
    expect(opened).toBe(1);
    release(player('Once.Only'));
    await expect(first).resolves.toMatchObject({ username: 'Once.Only' });
    await expect(second).resolves.toMatchObject({ username: 'Once.Only' });
  });

  it('updates from the auth listener when login happens outside the button', async () => {
    let listener: ((user: SdkUser | null) => void) | undefined;
    const user = await createUserService(module({
      getUser: async () => null,
      addAuthListener: (fn) => {
        listener = fn;
      },
    }));
    const names: Array<string | null> = [];
    const stop = user.onChange((account) => names.push(account?.username ?? null));
    expect(names).toEqual([]);
    listener?.(player('Elsewhere.In'));
    expect(user.current?.username).toBe('Elsewhere.In');
    expect(names).toEqual(['Elsewhere.In']);
    listener?.(player('Elsewhere.In'));
    expect(names).toEqual(['Elsewhere.In']);
    stop();
    listener?.(player('After.Stop'));
    expect(names).toEqual(['Elsewhere.In']);
    expect(user.current?.username).toBe('After.Stop');
  });
});

describe('portal user wiring', () => {
  it('exposes an unavailable user when the SDK is missing', async () => {
    const portal = await connectPortal(null);
    expect(portal.user.available).toBe(false);
    expect(accountView(portal.user).kind).toBe('hidden');
  });

  it('reads the user during connect without blocking a guest portal', async () => {
    const sdk: CrazySDK = {
      environment: 'local',
      init: async () => {},
      game: {
        loadingStart() {},
        loadingStop() {},
        gameplayStart() {},
        gameplayStop() {},
        happytime() {},
      },
      ad: { requestAd() {} },
      user: module({ getUser: async () => null }),
    };
    const portal = await connectPortal(sdk);
    expect(portal.mode).toBe('local');
    expect(portal.user.available).toBe(true);
    expect(portal.user.current).toBeNull();
    expect(portal.ads.rewardedAvailable()).toBe(true);
  });
});
