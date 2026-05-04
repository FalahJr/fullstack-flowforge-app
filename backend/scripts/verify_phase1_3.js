#!/usr/bin/env node
/**
 * Phase 1-3 API Verification Script
 * Tests: Auth, Workflow CRUD, Definition Save, Run Trigger, History/Detail
 */

const http = require("http");
const url = require("url");

const API_BASE =
  process.env.FLOWFORGE_API_BASE_URL ||
  process.env.BACKEND_BASE_URL ||
  "http://localhost:3001";
let authToken = "";
let workflowId = "";
let workflowRunId = "";
const timestamp = Date.now();

// Test data
const testEmail = `test-${timestamp}@example.com`;
const testPassword = "Password123";
const testTenant = `Tenant-${timestamp}`;

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(path, API_BASE);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (authToken) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  try {
    console.log("API BASE:", API_BASE);
    console.log("🚀 Starting Phase 1-3 API Verification\n");

    // Test 1: Register
    console.log("1️⃣  Registering new account...");
    const registerRes = await request("POST", "/auth/register", {
      email: testEmail,
      password: testPassword,
      tenantName: testTenant,
    });
    console.log("📌 Register response:", JSON.stringify(registerRes, null, 2));
    if (registerRes.status !== 201) {
      console.error("❌ Register failed:", registerRes);
      process.exit(1);
      return;
    }
    authToken = registerRes.data.accessToken || registerRes.data.token;
    if (!authToken) {
      console.error("❌ No token in response:", registerRes.data);
      process.exit(1);
      return;
    }
    console.log("✅ Registered. Token:", authToken.substring(0, 20) + "...\n");

    // Test 2: Create Workflow
    console.log("2️⃣  Creating workflow...");
    const createRes = await request("POST", "/workflows", {
      name: "Test Workflow Phase 1",
    });
    if (createRes.status !== 201) {
      console.error("❌ Create workflow failed:", createRes);
      process.exit(1);
      return;
    }
    workflowId = createRes.data.id;
    console.log("✅ Created workflow:", workflowId, "\n");

    // Test 3: Get Workflow
    console.log("3️⃣  Getting workflow details...");
    const getRes = await request("GET", `/workflows/${workflowId}`);
    if (getRes.status !== 200) {
      console.error("❌ Get workflow failed:", getRes);
      process.exit(1);
      return;
    }
    console.log("✅ Got workflow. Name:", getRes.data.name, "\n");

    // Test 4: Save Definition (PATCH)
    console.log("4️⃣  Saving workflow definition...");
    const definition = {
      steps: [
        {
          id: "step-1",
          type: "http",
          url: "https://api.example.com/test",
          next: ["step-2"],
        },
        { id: "step-2", type: "delay", duration: 1000, next: [] },
      ],
    };
    const updateDefRes = await request(
      "PATCH",
      `/workflows/${workflowId}/definition`,
      {
        definition,
      },
    );
    if (updateDefRes.status !== 200) {
      console.error("❌ Save definition failed:", updateDefRes);
      process.exit(1);
      return;
    }
    console.log(
      "✅ Saved definition. Version:",
      updateDefRes.data.versions?.[0]?.version,
      "\n",
    );

    // Test 5: Trigger Run
    console.log("5️⃣  Triggering workflow run...");
    const runRes = await request("POST", `/workflows/${workflowId}/run`);
    if (runRes.status !== 202) {
      console.error("❌ Trigger run failed:", runRes);
      process.exit(1);
      return;
    }
    workflowRunId = runRes.data.id;
    console.log("✅ Triggered run:", workflowRunId, "\n");

    // Test 6: Get Run History
    console.log("6️⃣  Fetching run history...");
    const historyRes = await request("GET", `/workflows/${workflowId}/runs`);
    if (historyRes.status !== 200) {
      console.error("❌ Get history failed:", historyRes);
      process.exit(1);
      return;
    }
    console.log("✅ Got run history. Count:", historyRes.data.length, "\n");

    // Test 7: Get Run Detail
    console.log("7️⃣  Getting run details...");
    // Give queue a moment to process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const detailRes = await request(
      "GET",
      `/workflows/${workflowId}/runs/${workflowRunId}`,
    );
    if (detailRes.status !== 200) {
      console.error("❌ Get detail failed:", detailRes);
      process.exit(1);
      return;
    }
    console.log("✅ Got run detail. Status:", detailRes.data.status, "\n");
    console.log(
      "📋 Run logs:",
      detailRes.data.stepRuns?.length || 0,
      "steps\n",
    );

    // Test 8: List Workflows
    console.log("8️⃣  Listing all workflows...");
    const listRes = await request("GET", "/workflows");
    if (listRes.status !== 200) {
      console.error("❌ List workflows failed:", listRes);
      process.exit(1);
      return;
    }
    console.log("✅ Listed workflows. Count:", listRes.data.length, "\n");

    console.log("✨ Phase 1-3 API Verification Complete!");
    console.log("PASS verify_phase1_3");
    process.exit(0);
  } catch (err) {
    console.error("💥 Error:", err.message);
    process.exit(1);
  }
}

run();
