import { requireAdmin } from '../auth-guard';
import { AuthService } from '@/service/auth';

jest.mock('@/service/auth', () => ({
  AuthService: { getCurrentUser: jest.fn() },
}));

const getCurrentUser = AuthService.getCurrentUser as jest.Mock;

describe('requireAdmin', () => {
  beforeEach(() => getCurrentUser.mockReset());

  it('lets an authenticated admin through', async () => {
    getCurrentUser.mockResolvedValue({ id: 'a1', email: 'admin@test.dev', role: 'admin' });
    expect(await requireAdmin()).toBeNull();
  });

  it.each([null, undefined])('returns 401 when session is %p', async (session) => {
    getCurrentUser.mockResolvedValue(session);

    const denied = await requireAdmin();

    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
    await expect(denied!.json()).resolves.toEqual({
      success: false,
      message: 'Unauthorized',
    });
  });
});
