// Jest setup file
// This file is executed before running tests

// Mock global functions if needed
global.console = {
  ...console,
  // Uncomment to ignore specific console outputs during tests
  // warn: jest.fn(),
  // error: jest.fn(),
};
