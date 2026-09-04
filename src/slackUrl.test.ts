import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findSlackLinks,
  permalinkToMessageTs,
  toSlackAppUri,
} from "./slackUrl";

const TEAM = "T061A7A7K0U";

describe("permalinkToMessageTs", () => {
  it("inserts a dot before the last six digits", () => {
    assert.equal(permalinkToMessageTs("p1788460005447479"), "1788460005.447479");
    assert.equal(permalinkToMessageTs("1788460005447479"), "1788460005.447479");
  });
});

describe("toSlackAppUri", () => {
  it("passes slack:// through", () => {
    const href = "slack://channel?team=T061A7A7K0U&id=C0BKPQC9RCP";
    assert.equal(toSlackAppUri(href, TEAM), href);
  });

  it("converts an archive permalink with p-id", () => {
    const raw =
      "https://teachxai.slack.com/archives/C0BKPQC9RCP/p1788460005447479?thread_ts=1788453137.643599&cid=C0BKPQC9RCP";
    assert.equal(
      toSlackAppUri(raw, TEAM),
      "slack://channel?team=T061A7A7K0U&id=C0BKPQC9RCP&message=1788460005.447479",
    );
  });

  it("uses the configured team when the permalink has none", () => {
    const raw = "https://teachxai.slack.com/archives/C0BKPQC9RCP";
    assert.equal(
      toSlackAppUri(raw, TEAM),
      "slack://channel?team=T061A7A7K0U&id=C0BKPQC9RCP",
    );
  });

  it("reads team from app.slack.com/client", () => {
    const raw = "https://app.slack.com/client/T061A7A7K0U/C0BKPQC9RCP";
    assert.equal(
      toSlackAppUri(raw, "OTHER"),
      "slack://channel?team=T061A7A7K0U&id=C0BKPQC9RCP",
    );
  });

  it("rejects non-Slack URLs", () => {
    assert.equal(toSlackAppUri("https://example.com", TEAM), undefined);
  });
});

describe("findSlackLinks", () => {
  it("finds archive and slack:// in one line", () => {
    const line =
      "see https://teachxai.slack.com/archives/C0BKPQC9RCP and slack://channel?team=T1&id=C1";
    const hits = findSlackLinks(line);
    assert.equal(hits.length, 2);
    assert.match(hits[0].raw, /archives/);
    assert.match(hits[1].raw, /^slack:/);
  });
});
