//Discord-Flavored Markdown parser & renderer

import './dfm.css';

import type { JSX } from "react";

import { ChannelMention, Emoji, EveryoneMention, HereMention, MemberMention, RoleMention } from "./dfmComponents";

export function indexOfAny(str: string, substrings: string[]): { index: number; match: string } | null {
  let earliestIndex = Infinity;
  let found: string | null = null;

  for (const sub of substrings) {
    const i = str.indexOf(sub);
    if (i !== -1 && i < earliestIndex) {
      earliestIndex = i;
      found = sub;
    }
  }

  return found === null ? null : { index: earliestIndex, match: found };
}

export default function renderDfm(text: string, guild_id: string | undefined): JSX.Element {
  const renderDfmInner = (text: string) => renderDfm(text, guild_id);

  const result: (JSX.Element | string)[] = [];
  while (text.length > 0) {
    const openingDelimiter = indexOfAny(text, ['```', '``', '`', '>>> ', '> ', '***', '**', '*', '__', '_', '~~', '@everyone', '@here', '<@!', '<@&', '<@', '<#', '<a:', '<:']);
    if (openingDelimiter == null) {
      //no more dfm
      result.push(text);
      break;
    }

    //take text up to the first delimiter
    const initialText = text.substring(0, openingDelimiter.index);
    if (initialText.trim().length > 0 || initialText.length > 1) //ignore bogus newlines between elements
      result.push(initialText);
    text = text.substring(openingDelimiter.index + openingDelimiter.match.length);

    let innerText;
    if (openingDelimiter.match == "@everyone" || openingDelimiter.match == "@here") {
      text = text.substring(openingDelimiter.index + openingDelimiter.match.length);
      innerText = openingDelimiter.match;
    } else {
      let closingDelimiter: string = openingDelimiter.match;
      switch (openingDelimiter.match) {
        case '> ':
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

      let closingDelimiterIndex = closingDelimiter == '\0' ? text.length : text.indexOf(closingDelimiter);
      if (closingDelimiterIndex == -1) {
        if (closingDelimiter == '\n') {
          closingDelimiterIndex = text.length;
        } else {
          //spuriously was not closed
          result.push(closingDelimiter);
          result.push(text);
          break;
        }
      }

      //take inner text
      innerText = text.substring(0, closingDelimiterIndex);
      text = text.substring(closingDelimiterIndex + closingDelimiter.length);
    }

    switch (openingDelimiter.match) {
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