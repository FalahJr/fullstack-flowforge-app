require("dotenv").config();
const axios = require("axios");
const { io } = require("socket.io-client");
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    // pick the most-recent user created by previous test (we used password 'secret123')
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!user) {
      console.error("No users found in DB");
      process.exit(2);
    }

    const base = "http://localhost:3000";
    const email = user.email;
    const password = "secret123";

    console.log("Login as", email);
    const loginRes = await axios.post(
      `${base}/auth/login`,
      { email, password },
      { timeout: 10000 },
    );
    const token = loginRes.data.accessToken;
    const tenantId = user.tenantId;

    console.log("Tenant", tenantId);

    // find the most recent workflow for this tenant
    const workflow = await prisma.workflow.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    if (!workflow) {
      console.error("No workflow found for tenant");
      process.exit(2);
    }

    console.log("Using workflow", workflow.id);

    const socket = io("http://localhost:3000/ws", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("WS connected, joining tenant room", tenantId);
      socket.emit("join", { tenantId });
    });

    socket.on("workflow.started", (p) => console.log("WS workflow.started", p));
    socket.on("workflow.completed", (p) =>
      console.log("WS workflow.completed", p),
    );
    socket.on("step.started", (p) => console.log("WS step.started", p));
    socket.on("step.success", (p) => console.log("WS step.success", p));
    socket.on("step.failed", (p) => {
      console.log("WS step.failed", p);
      process.exit(0);
    });

    // trigger the run
    console.log("Triggering run for workflow", workflow.id);
    const runRes = await axios.post(
      `${base}/workflows/${workflow.id}/run`,
      null,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 },
    );
    console.log("Run triggered:", runRes.data.id);

    // timeout
    setTimeout(() => {
      console.error("Timeout waiting for WS event");
      process.exit(3);
    }, 30000);
  } catch (err) {
    console.error("ERROR", err?.response?.data ?? err?.message ?? err);
    process.exit(1);
  } finally {
    // keep process alive while listening, Prisma will be disconnected on exit
  }
})();
