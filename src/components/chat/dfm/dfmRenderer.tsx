//Discord-Flavored Markdown parser & renderer

import './dfm.css';

import type { JSX } from "react";

import { ChannelMention, Emoji, EveryoneMention, HereMention, MemberMention, RoleMention } from "./dfmComponents";

function accumulate(source: string, terminators: string[]): { accumulated: string, remaining: string, terminator: string | null } {
  let accumulated = "";
  let i = 0;
  for (; ;) {
    if (i >= source.length) {
      return {
        accumulated: accumulated,
        remaining: "",
        terminator: null,
      }
    }

    if (source[i] == '\\') {
      //escape char
      accumulated += source[i + 1] ?? '';
      i += 2;
      continue;
    }

    for (const terminator of terminators) {
      if (source.startsWith(terminator, i)) {
        return {
          accumulated: accumulated,
          remaining: source.substring(i + terminator.length),
          terminator: terminator
        };
      }
    }

    const c = source[i];
    if (c)
      accumulated += c;
    i++;
  }
}

export default function renderDfm(text: string, guild_id: string | undefined): JSX.Element {
  const renderDfmInner = (text: string) => renderDfm(text, guild_id);

  const result: (JSX.Element | string)[] = [];
  while (text.length > 0) {
    const startAcc = accumulate(text, ['```', '``', '`', '>>> ', '> ', `### `, `## `, `# `, '***', '**', '*', '__', '_', '~~', '@everyone', '@here', '<@!', '<@&', '<@', '<#', '<a:', '<:']);
    if (!startAcc.terminator) {
      //end
      result.push(startAcc.accumulated);
      break;
    }

    text = startAcc.remaining;
    const openingDelimiter = startAcc.terminator;

    //take text up to the first delimiter
    if (startAcc.accumulated.trim().length > 0 || startAcc.accumulated.length > 1) //ignore bogus newlines between elements
      result.push(startAcc.accumulated);

    let innerText;
    if (openingDelimiter == "@everyone" || openingDelimiter == "@here") {
      innerText = openingDelimiter;
    } else {
      let closingDelimiter: string = openingDelimiter;
      switch (openingDelimiter) {
        case '> ':
        case '### ':
        case '## ':
        case '# ':
          closingDelimiter = '\n';
          break;

        case '>>> ':
          closingDelimiter = '\0';
          break;

        case '<@!':
        case '<@&':
        case '<@':
        case '<#':
        case '<a:':
        case '<:':
          closingDelimiter = '>';
          break;
      }

      //find closing delimiter
      const endAcc = accumulate(text, [closingDelimiter]);
      innerText = endAcc.accumulated;
      text = endAcc.remaining;

      if (!endAcc.terminator && closingDelimiter != '\n' && closingDelimiter != '\0') {
        //not closed
        result.push(closingDelimiter);
        result.push(text);
        break;
      }
    }

    switch (openingDelimiter) {
      case '```':
        result.push(<code className="block">{innerText}</code>);
        break;

      case '``':
      case '`':
        result.push(<code className="inline">{innerText}</code>);
        break;

      case '> ':
      case '>>> ':
        result.push(
          <div className="blockquoteContainer">
            <div className="blockquoteDivider"/>
            <blockquote>{renderDfmInner(innerText)}</blockquote>
          </div>
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

      case '***':
        result.push(<em><strong>{renderDfmInner(innerText)}</strong></em>);
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
        result.push(<MemberMention guild_id={guild_id} user_id={innerText}/>);
        break;

      case '<#':
        //channel
        result.push(<ChannelMention guild_id={guild_id} channel_id={innerText} />);
        break;

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
        {
          //emoji
          const [name, id] = innerText.split(':');
          if (name && id)
            result.push(<Emoji name={name} emoji_id={id} />);
          else
            result.push(innerText);
        }
        break;
    }
  }

  return (<>{result}</>);
};