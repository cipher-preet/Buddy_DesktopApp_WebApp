import { Fragment, type ReactNode } from 'react';

type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

const INLINE_REGEX = /(\*\*[^*\n]+?\*\*|`[^`\n]+?`)/g;

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_REGEX)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    if (raw.startsWith('**')) {
      nodes.push(<strong key={`${index}-b`}>{raw.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`${index}-c`}>{raw.slice(1, -1)}</code>);
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
};

const parseBlocks = (content: string): MarkdownBlock[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }

    blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) {
      return;
    }

    blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
    list = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length === 1 ? 2 : 3,
        text: headingMatch[2],
      });
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bulletMatch[1]);
      return;
    }

    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numberedMatch[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
};

export const ChatMarkdown = ({ content }: { content: string }) => {
  const blocks = parseBlocks(content.trim());

  if (!blocks.length) {
    return (
      <div className="assistant-message">
        <p>Buddy did not return a response.</p>
      </div>
    );
  }

  return (
    <div className="assistant-message assistant-message--rich">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level === 2 ? 'h2' : 'h3';
          return <Tag key={index}>{renderInline(block.text)}</Tag>;
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={index}>
            {block.text.split('\n').map((line, lineIndex, lines) => (
              <Fragment key={lineIndex}>
                {renderInline(line)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
