import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthModule } from '../src/health/health.module';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';

describe('Health API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PrismaModule, HealthModule] })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]) })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('reports application and database health without infrastructure details', async () => {
    const response = await app.get(HealthController).check();
    expect(response).toMatchObject({
      status: 'ok',
      services: { application: 'up', database: 'up' },
    });
    expect(response).not.toHaveProperty('credentials');
  });
});
