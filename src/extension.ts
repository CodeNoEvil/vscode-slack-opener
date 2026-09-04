import * as vscode from "vscode";
import { findSlackLinks, toSlackAppUri } from "./slackUrl";

const COMMAND = "slackOpener.open";

function teamId(): string {
  return vscode.workspace
    .getConfiguration("slackOpener")
    .get<string>("teamId", "");
}

function channelId(): string {
  return vscode.workspace
    .getConfiguration("slackOpener")
    .get<string>("channelId", "");
}

function convert(raw: string): string | undefined {
  return toSlackAppUri(raw, teamId(), channelId());
}

function homeUri(): string | undefined {
  const team = teamId().trim();
  const channel = channelId().trim();
  if (!team || !channel) {
    return undefined;
  }
  return `slack://channel?team=${encodeURIComponent(team)}&id=${encodeURIComponent(channel)}`;
}

async function openSlack(raw: string): Promise<boolean> {
  const href = convert(raw);
  if (!href) {
    vscode.window.showErrorMessage(`Not a Slack link I understand: ${raw}`);
    return false;
  }
  const ok = await vscode.env.openExternal(vscode.Uri.parse(href));
  if (!ok) {
    vscode.window.showErrorMessage(
      `Slack app did not accept ${href}. Is Slack.app installed?`,
    );
  }
  return ok;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND, async (arg?: string) => {
      if (typeof arg === "string" && arg.trim()) {
        await openSlack(arg);
        return;
      }
      const editor = vscode.window.activeTextEditor;
      const selected = editor?.document.getText(editor.selection).trim();
      const clip = await vscode.env.clipboard.readText();
      const guess =
        (selected && convert(selected) && selected) ||
        (clip && convert(clip) && clip) ||
        homeUri() ||
        "";
      const raw = await vscode.window.showInputBox({
        title: "Open in Slack app",
        prompt: "Archive permalink or slack:// URL",
        value: guess,
        ignoreFocusOut: true,
      });
      if (raw) {
        await openSlack(raw);
      }
    }),
  );

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        const u = uri.query.startsWith("u=")
          ? decodeURIComponent(uri.query.slice(2))
          : new URLSearchParams(uri.query).get("u");
        if (u) {
          void openSlack(u);
        }
      },
    }),
  );

  type SlackTerminalLink = vscode.TerminalLink & { raw: string };
  context.subscriptions.push(
    vscode.window.registerTerminalLinkProvider({
      provideTerminalLinks(context) {
        return findSlackLinks(context.line).map(
          (hit): SlackTerminalLink => ({
            startIndex: hit.start,
            length: hit.end - hit.start,
            tooltip: "Open in Slack app",
            raw: hit.raw,
          }),
        );
      },
      async handleTerminalLink(link: vscode.TerminalLink) {
        await openSlack((link as SlackTerminalLink).raw);
      },
    }),
  );

  const selector: vscode.DocumentSelector = { scheme: "file" };
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(selector, {
      provideDocumentLinks(document) {
        const links: vscode.DocumentLink[] = [];
        for (let i = 0; i < document.lineCount; i++) {
          const line = document.lineAt(i);
          for (const hit of findSlackLinks(line.text)) {
            const range = new vscode.Range(i, hit.start, i, hit.end);
            const args = encodeURIComponent(JSON.stringify([hit.raw]));
            const target = vscode.Uri.parse(`command:${COMMAND}?${args}`);
            const link = new vscode.DocumentLink(range, target);
            link.tooltip = "Open in Slack app";
            links.push(link);
          }
        }
        return links;
      },
    }),
  );
}

export function deactivate(): void {}
