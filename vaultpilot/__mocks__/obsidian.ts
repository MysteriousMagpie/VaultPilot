// Mock implementation of Obsidian API for testing

export const request = jest.fn(() => Promise.resolve('{}'));

export const Notice = jest.fn().mockImplementation((message: string, timeout?: number) => ({
  hide: jest.fn(),
}));

export const Plugin = jest.fn();
export const TFile = jest.fn();
export const Editor = jest.fn();
export const MarkdownView = jest.fn();
export const EditorPosition = jest.fn();
