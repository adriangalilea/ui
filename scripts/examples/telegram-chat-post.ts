// The post parser against the embed's own markup, offline: what a channel post's HTML
// becomes as runs, and what it refuses.
import assert from "node:assert/strict"
import { parseTelegramText } from "../../registry/base-nova/lib/telegram-chat-post"

// The widget wraps a custom emoji around its fallback glyph in a <b> of its own: the
// glyph survives, the bold does not.
assert.deepEqual(
  parseTelegramText(
    `<tg-emoji emoji-id="1"><i class="emoji" style="background-image:url('x.png')"><b>💡</b></i></tg-emoji><b>AI as an API</b> fast`,
  ),
  [
    { text: "💡" },
    { text: "AI as an API", marks: ["bold"] },
    { text: " fast" },
  ],
)

// A code block ends the line before and after it, so the widget's own <br/> on each
// side is not drawn twice; the author's blank line survives as one \n.
assert.deepEqual(
  parseTelegramText(
    `a:<br/><br/><pre><br/>def f():<br/>    pass<br/></pre><br/><br/>b <code>x</code>`,
  ),
  [
    { text: "a:\n" },
    { pre: "def f():\n    pass" },
    { text: "\nb " },
    { text: "x", marks: ["code"] },
  ],
)

// A named language rides on the block.
assert.deepEqual(
  parseTelegramText(`<pre><code class="language-python">x = 1</code></pre>`),
  [{ pre: "x = 1", lang: "python" }],
)

// Marks nest, links carry them, entities decode.
assert.deepEqual(
  parseTelegramText(
    `<a href="https://x.com/?a=1&amp;b=2"><b>go &amp; <i>see</i></b></a>`,
  ),
  [
    { text: "go & ", marks: ["bold"], href: "https://x.com/?a=1&b=2" },
    { text: "see", marks: ["bold", "italic"], href: "https://x.com/?a=1&b=2" },
  ],
)

assert.deepEqual(parseTelegramText(`<span class="tg-spoiler">it</span>`), [
  { text: "it", marks: ["spoiler"] },
])

// What it does not know, it refuses: a dropped quote must not render as plain text.
assert.throws(
  () => parseTelegramText(`<blockquote>q</blockquote>`),
  /<blockquote> in a post's text is not drawn yet/,
)
assert.throws(() => parseTelegramText(`<b>open`), /unclosed bold/)

console.log("telegram-chat-post: ok")
