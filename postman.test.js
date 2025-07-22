require("dotenv").config();
const fs = require("fs");
const path = require("path");

const COLLECTION_FILE = "postman_collection.json";
const DTO_DIR = path.join(__dirname, "dtos");
const TEST_DIR = path.join(__dirname, "tests", "generated");

const BEARER_TOKEN = process.env.BEARER_TOKEN;
if (!BEARER_TOKEN) {
  console.error("❌ BEARER_TOKEN not found in .env file");
  process.exit(1);
}
console.log("🔑 Bearer token loaded from .env");

let collection;
try {
  const data = fs.readFileSync(COLLECTION_FILE, "utf8");
  collection = JSON.parse(data);
} catch (err) {
  console.error(`❌ Failed to load ${COLLECTION_FILE}:`, err.message);
  process.exit(1);
}

function updateAuthHeaders(items) {
  return items.map((item) => {
    if (item.item) {
      item.item = updateAuthHeaders(item.item);
    }

    if (Array.isArray(item.request?.header)) {
      item.request.header = item.request.header.map((h) => {
        if (
          h.key &&
          h.key.toLowerCase() === "authorization" &&
          typeof h.value === "string" &&
          h.value.startsWith("Bearer ")
        ) {
          return { ...h, value: `Bearer ${BEARER_TOKEN}` };
        }
        return h;
      });
    }

    return item;
  });
}

if (Array.isArray(collection.item)) {
  collection.item = updateAuthHeaders(collection.item);
  console.log("✅ Authorization headers updated");
} else {
  console.warn('⚠️ No valid "item" array found');
}

[DTO_DIR, TEST_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9]/g, " ").trim();
}

function toPascalCase(str) {
  return str
    .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
    .replace(/\s+/g, "");
}

function getMeaningfulNameFromUrl(url) {
  try {
    const parsed = new URL(url.trim());
    const parts = parsed.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (!isNaN(part)) continue;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(part)) continue;
      return part;
    }
    return parsed.hostname.split(".")[0] || "Endpoint";
  } catch (e) {
    return "Endpoint";
  }
}

function extractDTOs(item) {
  const dto = {};
  if (item.request?.body?.mode === "raw") {
    try {
      dto.input = JSON.parse(item.request.body.raw);
    } catch (e) {
      console.warn(`⚠️ Failed to parse input DTO for "${item.name}"`);
    }
  }

  if (item.response?.[0]?.body) {
    try {
      dto.output = JSON.parse(item.response[0].body);
    } catch (e) {
      console.warn(`⚠️ Failed to parse output DTO for "${item.name}"`);
    }
  }
  return dto;
}

function traverseItems(items, parentName = "") {
  let flatItems = [];
  items.forEach((item) => {
    const name = parentName ? `${parentName} ${item.name}` : item.name;
    if (item.item) {
      flatItems = flatItems.concat(traverseItems(item.item, name));
    } else {
      flatItems.push({ ...item, name });
    }
  });
  return flatItems;
}

const allRequests = traverseItems(collection.item);

function generateMatcher(value, depth = 0) {
  if (depth > 10) return "expect.any(Object)";

  if (value === null || value === undefined) {
    return "expect.anything()";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "expect.arrayContaining([])";
    }
    const sample = generateMatcher(value[0], depth + 1);
    return `expect.arrayContaining([${sample}])`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([key, val]) => val !== null && val !== undefined)
      .map(([key, val]) => `"${key}": ${generateMatcher(val, depth + 1)}`)
      .join(", ");

    return `expect.objectContaining({ ${entries} })`;
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return "expect.any(String)";
    if (value.includes("@")) return "expect.any(String)";
    return "expect.any(String)";
  }

  if (typeof value === "number") return "expect.any(Number)";
  if (typeof value === "boolean") return "expect.any(Boolean)";

  return "expect.any(Object)";
}

function generateDTOContent(inputSchema, outputSchema) {
  let content = "";

  if (inputSchema) {
    content += `exports.Input = ${generateMatcher(inputSchema)};\n`;
  }

  if (outputSchema) {
    content += `exports.Output = ${generateMatcher(outputSchema)};\n`;
  }

  return content;
}

allRequests.forEach((item) => {
  const url = item.request.url;
  const cleanName = sanitize(getMeaningfulNameFromUrl(url));
  const dtoName = toPascalCase(cleanName);

  const { input, output } = extractDTOs(item);
  if (!input && !output) return;

  const dtoContent = generateDTOContent(input, output);
  if (!dtoContent.trim()) return;

  const filePath = path.join(DTO_DIR, `${dtoName}.dto.js`);
  fs.writeFileSync(
    filePath,
    `// Auto-generated DTO for ${dtoName}\n${dtoContent}`
  );
  console.log(`📄 Generated DTO: ${dtoName}.dto.js`);
});

function getTestHeaders(request) {
  const safeHeaders = {};

  const allowedKeys = [
    "authorization",
    "content-type",
    "referer",
    "user-agent",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
  ];

  if (Array.isArray(request.header)) {
    request.header.forEach((h) => {
      if (!h.key || !h.value) return;
      const keyLower = h.key.toLowerCase();
      if (allowedKeys.includes(keyLower)) {
        safeHeaders[h.key] = h.value.trim();
      }
    });
  }

  return safeHeaders;
}

allRequests.forEach((item) => {
  const url = item.request.url;

  let baseUrl, pathOnly;
  try {
    const parsedUrl = new URL(url.trim());
    baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const params = new URLSearchParams(parsedUrl.search);
    const cleanedParams = new URLSearchParams();
    for (let [k, v] of params) if (k && v) cleanedParams.append(k, v.trim());
    pathOnly =
      parsedUrl.pathname +
      (cleanedParams.toString() ? `?${cleanedParams}` : "");
  } catch (err) {
    console.warn(`⚠️ Invalid URL skipped: ${url}`);
    return;
  }

  const cleanName = sanitize(getMeaningfulNameFromUrl(url));
  const dtoName = toPascalCase(cleanName);
  const method = item.request.method.toLowerCase();

  const { input, output } = extractDTOs(item);

  const imports = [];
  if (input && output) {
    imports.push(
      `const { Input: ${dtoName}Input, Output: ${dtoName}Output } = require('../../dtos/${dtoName}.dto');`
    );
  } else if (output) {
    imports.push(
      `const { Output: ${dtoName}Output } = require('../../dtos/${dtoName}.dto');`
    );
  } else if (input) {
    imports.push(
      `const { Input: ${dtoName}Input } = require('../../dtos/${dtoName}.dto');`
    );
  }

  // Headers & Body
  const headers = getTestHeaders(item.request);
  const setHeaders = Object.keys(headers).length
    ? `.set(${JSON.stringify(headers)})`
    : "";
  const hasBody = ["POST", "PUT", "PATCH"].includes(item.request.method);
  const sendLine = hasBody && input ? `.send(${dtoName}Input)` : "";
  const expectOutput = output
    ? `expect(res.body).toMatchObject(${dtoName}Output);`
    : "";

  const testContent = `
${imports.join("\n")}

const request = require('supertest');

describe('${item.request.method} ${url}', () => {
  it('should return status 200 and match expected structure', async () => {
    const res = await request('${baseUrl}')
      .${method}('${pathOnly}')
      ${setHeaders}
      ${sendLine};

    expect(res.status).toBe(200);
    ${expectOutput}
  });
});
`.trim();

  const testPath = path.join(TEST_DIR, `${dtoName}.test.js`);
  fs.writeFileSync(testPath, testContent);
  console.log(`🧪 Generated Test: ${dtoName}.test.js`);
});

console.log("🎉 All tests and DTOs generated successfully!");
