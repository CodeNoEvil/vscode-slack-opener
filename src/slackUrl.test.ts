import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findSlackLinks,
  permalinkToMessageTs,
  toSlackAppUri,
} from "./slackUrl";

const TEAM = "T01234567";

describe("permalinkToMessageTs", () => {
  it("inserts a dot before the last six digits", () => {
    assert.equal(permalinkToMessageTs("p1234567890123456"), "1234567890.123456");
    assert.equal(permalinkToMessageTs("1234567890123456"), "1234567890.123456");
  });
});

describe("toSlackAppUri", () => {
  it("passes slack:// through", () => {
    const href = "slack://channel?team=T01234567&id=C01234567";
    assert.equal(toSlackAppUri(href, TEAM), href);
  });

  it("converts an archive permalink with p-id", () => {
    const raw =
      "https://acme.slack.com/archives/C01234567/p1234567890123456?thread_ts=1234567890.123456&cid=C01234567";
    assert.equal(
      toSlackAppUri(raw, TEAM),
      "slack://channel?team=T01234567&id=C01234567&message=1234567890.123456",
    );
  });

  it("uses the configured team when the permalink has none", () => {
    const raw = "https://acme.slack.com/archives/C01234567";
    assert.equal(
      toSlackAppUri(raw, TEAM),
      "slack://channel?team=T01234567&id=C01234567",
    );
  });

  it("reads team from app.slack.com/client", () => {
    const raw = "https://app.slack.com/client/T01234567/C01234567";
    assert.equal(
      toSlackAppUri(raw, "OTHER"),
      "slack://channel?team=T01234567&id=C01234567",
    );
  });

  it("rejects non-Slack URLs", () => {
    assert.equal(toSlackAppUri("https://example.com", TEAM), undefined);
  });
});

describe("findSlackLinks", () => {
  it("finds archive and slack:// in one line", () => {
    const line =
      "see https://acme.slack.com/archives/C01234567 and slack://channel?team=T1&id=C1";
    const hits = findSlackLinks(line);
    assert.equal(hits.length, 2);
    assert.match(hits[0].raw, /archives/);
    assert.match(hits[1].raw, /^slack:/);
  });
});
