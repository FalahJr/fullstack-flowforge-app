import { INestApplication, CanActivate, ExecutionContext } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ValidationPipe } from "@nestjs/common";
import { WorkflowsController } from "../../src/workflows/workflows.controller";
import { WorkflowsService } from "../../src/workflows/workflows.service";
import { JwtAuthGuard } from "../../src/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../src/auth/guards/roles.guard";

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { tenantId: "tenant-1", role: "ADMIN" };
    return true;
  }
}

describe("Workflows API integration", () => {
  let app: INestApplication;
  const workflowsService = {
    create: jest.fn(async (_tenantId: string, dto: { name: string }) => ({
      id: "wf-1",
      name: dto.name,
    })),
    findAll: jest.fn(async () => ({
      data: [{ id: "wf-1", name: "Test Workflow" }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })),
    triggerRunByWebhook: jest.fn(async () => ({ id: "run-1", status: "RUNNING" })),
    health: jest.fn(() => ({ ok: true })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkflowsController],
      providers: [{ provide: WorkflowsService, useValue: workflowsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects invalid workflow payload", async () => {
    await request(app.getHttpServer())
      .post("/workflows")
      .send({ name: "" })
      .expect(400);
  });

  it("creates workflow with validated payload", async () => {
    const res = await request(app.getHttpServer())
      .post("/workflows")
      .send({ name: "My Workflow" })
      .expect(201);

    expect(res.body).toEqual({ id: "wf-1", name: "My Workflow" });
    expect(workflowsService.create).toHaveBeenCalledWith("tenant-1", { name: "My Workflow" });
  });

  it("returns paginated workflows", async () => {
    const res = await request(app.getHttpServer())
      .get("/workflows?page=2&limit=10&search=test")
      .expect(200);

    expect(res.body.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(workflowsService.findAll).toHaveBeenCalledWith("tenant-1", {
      page: "2",
      limit: "10",
      search: "test",
    });
  });

  it("triggers workflow by webhook token", async () => {
    const res = await request(app.getHttpServer())
      .post("/workflows/wf-1/webhook/token-123")
      .send({ data: { hello: "world" } })
      .expect(201);

    expect(res.body).toEqual({ id: "run-1", status: "RUNNING" });
    expect(workflowsService.triggerRunByWebhook).toHaveBeenCalledWith(
      "wf-1",
      "token-123",
      { data: { hello: "world" } },
    );
  });
});
