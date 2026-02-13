//Discord-Flavored Markdown parser & renderer

import type { JSX } from "react";

export default function renderDfm(text: string): JSX.Element {
  return (<>{text}</>);
};