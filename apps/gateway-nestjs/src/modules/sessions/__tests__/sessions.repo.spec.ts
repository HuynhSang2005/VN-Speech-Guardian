import { SessionsRepository } from '../repository/sessions.repo';

describe('SessionsRepository', () => {
  let repo: SessionsRepository;
  const mockPrisma: any = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    transcript: { findMany: jest.fn() },
  };

  beforeEach(() => {
    repo = new SessionsRepository(mockPrisma as any);
  });

  it('list returns items and total', async () => {
    mockPrisma.session.findMany.mockResolvedValueOnce([{ id: 's1' }]);
    mockPrisma.session.count.mockResolvedValueOnce(1);

    const res = await repo.list({ skip: 0, take: 10 });
    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it('findById returns session or null', async () => {
    mockPrisma.session.findUnique.mockResolvedValueOnce({ id: 's1' });
  const s = await repo.findById('s1');
  expect(s).toBeDefined();
  expect((s as any).id).toBe('s1');
  });

  it('remove deletes session', async () => {
    mockPrisma.session.delete.mockResolvedValueOnce({ id: 's1' });
    const r = await repo.remove('s1');
    expect(r.id).toBe('s1');
  });
});
