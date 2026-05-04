require("dotenv").config();
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    const base = "http://localhost:3000";
    const stamp = Date.now();
    const email = `test-${stamp}@example.com`;
    const password = "secret123";
    const tenantName = `test-tenant-${stamp}`;

    console.log("REGISTER ->", email);
    const regRes = await axios.post(
      `${base}/auth/register`,
      { email, password, tenantName },
      { timeout: 10000 },
    );
    const reg = regRes.data;
    console.log("REGISTERED", reg.user?.id, "tenant", reg.user?.tenantId);

    const token = reg.accessToken;
    console.log("TOKEN", token ? "[REDACTED]" : "(none)");
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    console.log("CREATE WORKFLOW");
    const wfRes = await axios.post(
      `${base}/workflows`,
      { name: "test-fail-workflow" },
      { headers: authHeaders, timeout: 10000 },
    );
    const wf = wfRes.data;
    console.log("WORKFLOW_CREATED", wf.id);

    // insert a new version with a failing HTTP step
    const definition = {
      steps: [
        {
          id: "call-bad-port",
          type: "http",
          next: [],
          config: { url: "http://localhost:59999", method: "GET" },
        },
      ],
    };

    const currentVersion = wf.versions?.[0]?.version ?? 1;
    const version = await prisma.workflowVersion.create({
      data: { workflowId: wf.id, definition, version: currentVersion + 1 },
    });
    console.log("VERSION_CREATED", version.id);

    console.log("TRIGGER RUN");
    // send POST without a JSON body to avoid JSON parse issues on middleware
    const runRes = await axios({
      method: "post",
      url: `${base}/workflows/${wf.id}/run`,
      headers: authHeaders,
      timeout: 10000,
    });
    const run = runRes.data;
    console.log("RUN_CREATED", run.id);

    // Poll for step run to appear and fail
    let stepRun = null;
    const timeoutAt = Date.now() + 60000; // 60s
    while (Date.now() < timeoutAt) {
      stepRun = await prisma.stepRun.findFirst({
        where: { workflowRunId: run.id },
      });
      if (
        stepRun &&
        (stepRun.status === "FAILED" || stepRun.status === "SUCCESS")
      )
        break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(
      "STEP_RUN",
      stepRun ? `${stepRun.id} ${stepRun.status}` : "not-found-or-timeout",
    );
    if (stepRun && stepRun.logs) {
      console.log("STEP_RUN_LOGS", JSON.stringify(stepRun.logs, null, 2));
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("ERROR", err?.response?.data ?? err.message ?? err);
    try {
      await prisma.$disconnect();
    } catch (e) {}
    process.exit(1);
  }
})();
