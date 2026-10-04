import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { rich } from "./rich";

describe("rich", () => {
  it("renders inline tags", () => {
    expect(renderToStaticMarkup(<p>{rich("a <b>bold</b> and <link>go</link>.", { link: (c) => <a href="/x">{c}</a> })}</p>)).toBe('<p>a <strong>bold</strong> and <a href="/x">go</a>.</p>');
  });
  it("passes plain strings through", () => {
    expect(renderToStaticMarkup(<p>{rich("plain")}</p>)).toBe("<p>plain</p>");
  });
});
