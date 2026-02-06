import '@testing-library/jest-dom';
import React from 'react';

// Suppress noisy warnings that clutter CI output (baseline-browser-mapping age,
// React act(...) notices) so precommit logs stay clean.
const shouldSilence = (message: unknown) =>
  typeof message === 'string' &&
  (message.includes('baseline-browser-mapping') ||
    message.includes('not wrapped in act('));

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (shouldSilence(args[0])) return;
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (shouldSilence(args[0])) return;
  originalError(...args);
};

const originalLog = console.log;
console.log = (...args: unknown[]) => {
  if (shouldSilence(args[0])) return;
  originalLog(...args);
};

jest.mock('remark-gfm', () => () => null);
jest.mock('remark-breaks', () => () => null);

jest.mock('react-markdown', () => {
  return function MockReactMarkdown({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    const asString = Array.isArray(children)
      ? children.join('')
      : ((children as string) ?? '');
    const lines = String(asString ?? '').split(/\n+/);
    const elements: Array<React.ReactNode> = [];
    let listItems: Array<React.ReactNode> = [];

    const parseInline = (text: string) => {
      const nodes: Array<React.ReactNode> = [];
      let remaining = text;
      const matcher = /(\*\*(.+?)\*\*|\*(.+?)\*)/;

      while (remaining.length) {
        const match = matcher.exec(remaining);
        if (!match) {
          nodes.push(remaining);
          break;
        }
        if (match.index > 0) {
          nodes.push(remaining.slice(0, match.index));
        }
        const tag = match[1].startsWith('**') ? 'strong' : 'em';
        const content = match[2] ?? match[3] ?? '';
        nodes.push(
          React.createElement(tag, { key: `inline-${nodes.length}` }, content),
        );
        remaining = remaining.slice(match.index + match[1].length);
      }

      return nodes;
    };

    const flushList = () => {
      if (listItems.length === 0) return;
      elements.push(
        React.createElement('ul', { key: `list-${elements.length}` }, [
          ...listItems,
        ]),
      );
      listItems = [];
    };

    lines.forEach((line, idx) => {
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          React.createElement(
            'h1',
            { key: `h1-${idx}` },
            parseInline(line.slice(2)),
          ),
        );
        return;
      }
      if (line.startsWith('- ')) {
        listItems.push(
          React.createElement(
            'li',
            { key: `li-${idx}` },
            parseInline(line.slice(2)),
          ),
        );
        return;
      }
      flushList();
      if (line.trim()) {
        elements.push(
          React.createElement('p', { key: `p-${idx}` }, parseInline(line)),
        );
      }
    });
    flushList();

    return React.createElement(
      'div',
      { 'data-testid': 'react-markdown', className },
      elements,
    );
  };
});
