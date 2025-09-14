import { AuthController } from '../auth.controller';

describe('AuthController', () => {
  const mockAuthService: any = {
    exchangeClerkToken: jest.fn(),
  };

  const mockClerkIntegration: any = {
    verifyToken: jest.fn(),
    getOrCreateUser: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    mockAuthService.exchangeClerkToken.mockReset();
    controller = new AuthController(mockClerkIntegration, mockAuthService);
  });

  it('should return accessToken and user when token is provided in body', async () => {
    const fakeResult = { success: true, data: { accessToken: 'tok', user: { id: '1', email: 'a@b.com' } } };
    mockAuthService.exchangeClerkToken.mockResolvedValue(fakeResult);

    const res = await controller.verifyClerkToken({ token: 'abc' }, { headers: {} });
    expect(mockAuthService.exchangeClerkToken).toHaveBeenCalledWith('abc');
    expect((res as any).data.accessToken).toBe('tok');
    expect((res as any).data.user.email).toBe('a@b.com');
  });

  it('should read token from Authorization header if not in body', async () => {
    const fakeResult = { success: true, data: { accessToken: 'hdr', user: { id: '2', email: 'h@d.com' } } };
    mockAuthService.exchangeClerkToken.mockResolvedValue(fakeResult);

    const req: any = { headers: { authorization: 'Bearer hdrtoken' } };
    const res = await controller.verifyClerkToken({}, req);

    expect(mockAuthService.exchangeClerkToken).toHaveBeenCalledWith('hdrtoken');
    expect((res as any).data.accessToken).toBe('hdr');
    expect((res as any).data.user.email).toBe('h@d.com');
  });

  it('should throw 400 when no token provided', async () => {
    await expect(controller.verifyClerkToken({}, { headers: {} })).rejects.toBeDefined();
  });

  it('should propagate errors from AuthService as HttpException', async () => {
    mockAuthService.exchangeClerkToken.mockImplementation(() => { throw new Error('bad'); });
    await expect(controller.verifyClerkToken({ token: 'x' }, { headers: {} })).rejects.toBeDefined();
  });
});
