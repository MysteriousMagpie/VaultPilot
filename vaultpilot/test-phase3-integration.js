/**
 * Phase 3 Integration Test
 * Simple test to verify Phase 3 components are integrated correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Phase 3 Integration...');

// Check if main.ts has Phase3Integration import
const mainPath = path.join(__dirname, 'src/main.ts');
const mainContent = fs.readFileSync(mainPath, 'utf8');

const tests = [
  {
    name: 'Phase3Integration import',
    test: () => mainContent.includes("import { Phase3Integration } from './components/Phase3Integration'"),
    required: true
  },
  {
    name: 'Phase3Integration property',
    test: () => mainContent.includes('phase3Integration?: Phase3Integration'),
    required: true
  },
  {
    name: 'initializePhase3 method',
    test: () => mainContent.includes('initializePhase3()'),
    required: true
  },
  {
    name: 'Phase 3 initialization call',
    test: () => mainContent.includes('this.initializePhase3()'),
    required: true
  },
  {
    name: 'Phase 3 cleanup in onunload',
    test: () => mainContent.includes('this.disablePhase3()'),
    required: true
  }
];

// Check if build output exists
const distPath = path.join(__dirname, 'dist/main.js');
const buildExists = fs.existsSync(distPath);

tests.push({
  name: 'Build output exists',
  test: () => buildExists,
  required: true
});

// Run tests
let passed = 0;
let failed = 0;

console.log('\n📋 Test Results:');
console.log('================');

tests.forEach(test => {
  const result = test.test();
  if (result) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`${test.required ? '❌' : '⚠️'} ${test.name}`);
    if (test.required) {
      failed++;
    }
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 All Phase 3 integration tests passed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Copy the plugin files to your Obsidian plugins directory');
  console.log('2. Enable the VaultPilot plugin in Obsidian');
  console.log('3. The onboarding wizard should appear on first launch');
  console.log('4. Use Ctrl+P and search for "VaultPilot" commands to access Phase 3 features');
  process.exit(0);
} else {
  console.log('\n💥 Some tests failed. Please check the integration.');
  process.exit(1);
}
