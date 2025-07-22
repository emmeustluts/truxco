const { execSync } = require("child_process");
const { join } = require("path");
const { existsSync, readFileSync } = require("fs");
const fs = require("fs");
const chalk = require("chalk");

const resultsFile = join(__dirname, "jest-results.json");
const testDir = join(__dirname, "tests", "generated");

const PASS = chalk.green.bold;
const FAIL = chalk.red.bold;
const WARN = chalk.yellow;
const INFO = chalk.cyan;
const TITLE = chalk.white.bold.underline;
const HIGHLIGHT = chalk.magenta.bold;

console.log(chalk.bgBlue("🚀 API Test Suite Runner") + "\n");

if (!existsSync(testDir)) {
  console.error(FAIL(`❌ Test directory not found: ${testDir}`));
  process.exit(1);
}

const testFiles = fs.readdirSync(testDir).filter((f) => f.endsWith(".test.js"));
if (testFiles.length === 0) {
  console.warn(WARN("⚠️ No test files found in:"), testDir);
  process.exit(0);
}

console.log(INFO(`📁 Found ${testFiles.length} test file(s):`));
testFiles.forEach((file) => console.log(`   • ${INFO(file)}`));

console.log("\n" + INFO("🔄 Running Jest..."));
console.log(`   Command: npx jest <dir> --json --outputFile=jest-results.json`);

try {
  execSync(
    `npx jest ${testDir} --json --outputFile=${resultsFile} --runInBand`,
    { stdio: "pipe", encoding: "utf8" }
  );
  console.log(PASS("✅ Jest completed successfully."));
} catch (error) {
  console.error(FAIL("🚨 Jest finished with failed tests (see above)."));
}

if (!existsSync(resultsFile)) {
  console.error(FAIL(`\n❌ Results file was not created: ${resultsFile}`));
  console.log(`💡 Possible causes:`);
  console.log(
    `   • Jest is not installed (run: npm install jest supertest --save-dev)`
  );
  console.log(`   • Syntax error in a test or DTO file`);
  console.log(`   • Permission issue`);
  process.exit(1);
}

const raw = readFileSync(resultsFile, "utf8").trim();
if (!raw) {
  console.error(FAIL(`\n❌ Jest results file is empty!`));
  process.exit(1);
}

let results;
try {
  results = JSON.parse(raw);
} catch (err) {
  console.error(FAIL(`\n❌ Failed to parse Jest results: ${err.message}`));
  console.log(`📄 Raw content:\n---\n${raw}\n---`);
  process.exit(1);
}

const totalSuites = results.numTotalTestSuites || 0;
const passedSuites = results.numPassedTestSuites || 0;
const failedSuites = results.numFailedTestSuites || 0;
const pendingSuites = results.numPendingTestSuites || 0;

const totalTests = results.numTotalTests || 0;
const passedTests = results.numPassedTests || 0;
const failedTests = results.numFailedTests || 0;

console.log("\n" + TITLE("📋 TEST RESULTS SUMMARY"));
console.log("=".repeat(60));

if (Array.isArray(results.testResults)) {
  results.testResults.forEach((testFile) => {
    const fileName = testFile.name.split("/").pop();
    const status = testFile.status === "passed" ? PASS("PASS") : FAIL("FAIL");
    const testName = HIGHLIGHT(fileName);

    console.log(`\n📄 ${testName} [${status}]`);

    if (Array.isArray(testFile.testResults)) {
      testFile.testResults.forEach((test) => {
        const icon = test.status === "passed" ? "🟢" : "🔴";
        const name = test.fullName;
        const duration = test.duration ? `(${test.duration}ms)` : "";
        console.log(`   ${icon} ${name} ${chalk.gray(duration)}`);
      });
    }
  });
}

console.log("\n" + TITLE("📊 FINAL STATS"));
console.log("=".repeat(40));
console.log(`🧪 Total Test Suites: ${totalSuites}`);
console.log(`✅ Passed:            ${PASS(passedSuites)}`);
console.log(`❌ Failed:            ${FAIL(failedSuites)}`);
console.log(`🟡 Skipped:           ${WARN(pendingSuites)}`);
console.log("-".repeat(40));
console.log(`🧩 Total Tests:       ${totalTests}`);
console.log(
  `📈 Pass Rate:         ${passedTests}/${totalTests} (${Math.round(
    (passedTests / totalTests) * 100
  )}%)`
);

if (failedTests > 0) {
  console.log(
    FAIL(`\n❗ ${failedTests} test(s) failed. Please fix the issues above.`)
  );
} else {
  console.log(PASS(`\n🎉 All tests passed! Great job!`));
}

process.exit(failedSuites > 0 ? 1 : 0);
