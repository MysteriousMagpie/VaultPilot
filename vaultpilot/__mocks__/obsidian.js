// Mock implementation of Obsidian API for testing

const request = jest.fn(() => Promise.resolve('{}'));

const Notice = jest.fn().mockImplementation((message, timeout) => ({
  hide: jest.fn(),
}));

const Plugin = jest.fn();
const TFile = jest.fn();
const Editor = jest.fn();
const MarkdownView = jest.fn();
const EditorPosition = jest.fn();

module.exports = {
  request,
  Notice,
  Plugin,
  TFile,
  Editor,
  MarkdownView,
  EditorPosition,
};
