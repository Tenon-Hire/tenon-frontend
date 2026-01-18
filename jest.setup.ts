import '@testing-library/jest-dom';
import React from 'react';

jest.mock('remark-gfm', () => () => null);

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
          React.createElement('h1', { key: `h1-${idx}` }, line.slice(2)),
        );
        return;
      }
      if (line.startsWith('- ')) {
        listItems.push(
          React.createElement('li', { key: `li-${idx}` }, line.slice(2)),
        );
        return;
      }
      flushList();
      if (line.trim()) {
        elements.push(
          React.createElement('p', { key: `p-${idx}` }, line.trim()),
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
