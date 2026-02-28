import './dfm.css';

import type { JSX } from 'react';
import ShikiHighlighter from 'react-shiki';

import {
  ChannelMention,
  EmojiMention,
  EveryoneMention,
  HereMention,
  InviteMention,
  MemberMention,
  OffsiteMedia,
  RoleMention,
} from './dfmComponents';

function accumulate(
  source: string,
  terminators: string[],
): { accumulated: string; remaining: string; terminator: string } {
  const terminatorsStartOnly = ['```', '>>> ', '> ', '### ', '## ', '# ', '-# '];
  const startOnly = ['', '\n'];
  let accumulated = '';
  let i = 0;
  while (true) {
    if (i >= source.length) {
      return {
        accumulated: accumulated,
        remaining: '',
        terminator: '\0',
      };
    }

    if (source[i] == '\\') {
      //escape char
      accumulated += source[i + 1] ?? '';
      i += 2;
      continue;
    }

    for (let terminator of terminators) {
      if (terminatorsStartOnly.includes(terminator) && !startOnly.includes(source.charAt(i - 1))) {
        continue;
      }

      if (source.startsWith(terminator, i)) {
        if (terminator === '```' && source.charAt(i + terminator.length) === '`') {
          terminator = /`+/.exec(source)?.[0] ?? terminator;
        }

        return {
          accumulated: accumulated,
          remaining: source.substring(i + terminator.length),
          terminator: terminator,
        };
      }
    }

    const c = source[i];
    if (c) accumulated += c;
    i++;
  }
}

export default function renderDfm(
  text: string | null | undefined,
  guild_id: string | undefined,
): JSX.Element {
  if (!text) return <></>;

  const renderDfmInner = (text: string) => renderDfm(text, guild_id);

  const result: (JSX.Element | string)[] = [];
  while (text.length > 0) {
    const startAcc = accumulate(text, [
      'https://',
      'http://',
      '```',
      '``',
      '`',
      '>>> ',
      '> ',
      '### ',
      '## ',
      '# ',
      '-# ',
      '***',
      '**',
      '*',
      '__',
      '_',
      '~~',
      '@everyone',
      '@here',
      '<@!',
      '<@&',
      '<@',
      '<#',
      '<a:',
      '<:',
    ]);

    if (startAcc.terminator == '\0') {
      //end
      result.push(startAcc.accumulated);
      break;
    }

    text = startAcc.remaining;
    const openingDelimiter = startAcc.terminator;

    //take text up to the first delimiter
    if (startAcc.accumulated != '\n')
      //ignore bogus newlines between elements
      result.push(startAcc.accumulated);

    let innerText;
    if (openingDelimiter == '@everyone' || openingDelimiter == '@here') {
      innerText = openingDelimiter;
    } else {
      let closingDelimiters: string[];
      switch (openingDelimiter) {
        case 'https://':
        case 'http://':
          closingDelimiters = [
            '\0',
            '\n',
            '"',
            "'",
            '`',
            ')',
            '(',
            ']',
            '[',
            '}',
            '{',
            '<',
            '>',
            ',',
            ';',
            ' ',
          ];
          break;

        case '> ':
        case '### ':
        case '## ':
        case '# ':
        case '-# ':
          closingDelimiters = ['\0', '\n'];
          break;

        case '>>> ':
          closingDelimiters = ['\0'];
          break;

        case '<@!':
        case '<@&':
        case '<@':
        case '<#':
        case '<a:':
        case '<:':
          closingDelimiters = ['>'];
          break;

        default:
          closingDelimiters = [openingDelimiter];
          break;
      }

      //find closing delimiter
      const endAcc = accumulate(text, closingDelimiters);
      console.log(endAcc);
      if (closingDelimiters.includes(endAcc.terminator)) {
        innerText = endAcc.accumulated;
        text = endAcc.remaining;
      } else {
        //not closed. skip the orphan delimiter
        result.push(openingDelimiter);
        continue;
      }
    }

    switch (openingDelimiter) {
      case 'https://':
      case 'http://': {
        innerText = openingDelimiter + innerText;

        const inviteRegex = /\/invite\/([a-zA-Z0-9]+)/.exec(innerText);

        const isDirectGif = innerText.toLowerCase().endsWith('.gif');
        const isTenor =
          innerText.includes('tenor.com/view/') ?? innerText.includes('media.tenor.com/');
        const isKlipy = innerText.includes('klipy.com');

        if (isDirectGif || isTenor || isKlipy) {
          result.push(<OffsiteMedia src={innerText} />);
        } else {
          result.push(
            <a title={innerText} href={innerText} target='_blank' rel='noreferrer'>
              {innerText}
            </a>,
          );
        }

        if (inviteRegex?.[1]) {
          const inviteCode = inviteRegex[1];
          result.push(<InviteMention code={inviteCode} />);
        }
        break;
      }

      case '``':
      case '`':
        result.push(<code className='inline'>{innerText}</code>);
        break;

      case '> ':
      case '>>> ':
        result.push(
          <div className='blockquote-container'>
            <div className='blockquote-divider' />
            <blockquote>{renderDfmInner(innerText)}</blockquote>
          </div>,
        );
        break;

      case '###':
        result.push(<h1>{renderDfmInner(innerText)}</h1>);
        break;

      case '##':
        result.push(<h2>{renderDfmInner(innerText)}</h2>);
        break;

      case '#':
        result.push(<h3>{renderDfmInner(innerText)}</h3>);
        break;

      case '-# ':
        result.push(<small>{renderDfmInner(innerText)}</small>);
        break;

      case '***':
        result.push(
          <em>
            <strong>{renderDfmInner(innerText)}</strong>
          </em>,
        );
        break;

      case '**':
        result.push(<strong>{renderDfmInner(innerText)}</strong>);
        break;

      case '_':
      case '*':
        result.push(<em>{renderDfmInner(innerText)}</em>);
        break;

      case '__':
        result.push(<u>{renderDfmInner(innerText)}</u>);
        break;

      case '~~':
        result.push(<s>{renderDfmInner(innerText)}</s>);
        break;

      case '<@!':
      case '<@':
        //member
        result.push(<MemberMention guild_id={guild_id} user_id={innerText} />);
        break;

      case '<#': {
        //channel
        const channelId = innerText.replace(/^:/, '');
        result.push(<ChannelMention guild_id={guild_id} channel_id={channelId} />);
        break;
      }

      case '<@&':
        //role
        result.push(<RoleMention guild_id={guild_id} channel_id={innerText} />);
        break;

      case '@everyone':
        result.push(<EveryoneMention />);
        break;

      case '@here':
        result.push(<HereMention />);
        break;

      case '<:':
      case '<a:':
        {
          //emoji
          const [name, id] = innerText.split(':');
          if (name && id) result.push(<EmojiMention name={name} emoji_id={id} />);
          else result.push(innerText);
        }
        break;
    }

    // special case for code blocks
    if (openingDelimiter.includes('```')) {
      let syntax = '';
      // remove syntax + first new line
      const newlineIndex = innerText.indexOf('\n');

      if (newlineIndex !== -1) {
        const syntaxPart = innerText.slice(0, newlineIndex + 1);
        syntax = syntaxPart.slice(0, -1);
        innerText = innerText.slice(newlineIndex + 1);
      }

      result.push(
        <ShikiHighlighter language={syntax} theme={'andromeeda'}>
          {innerText}
        </ShikiHighlighter>,
      );
    }
  }

  return <>{result}</>;
}
