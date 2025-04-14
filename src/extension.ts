import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand(
    "extension.newCsFile",
    async (uri: vscode.Uri) => {
      const type = await vscode.window.showQuickPick(
        ["class", "interface", "enum", "struct", "record"],
        { title: "Select C# type to create" }
      );

      if (!type) return; // Cancelled

      const name = await vscode.window.showInputBox({
        title: `New C# ${type}`,
        prompt: `Enter ${type} name`,
        validateInput: (value) =>
          /^[A-Za-z_]\w*$/.test(value) ? null : `Invalid C# ${type} name`,
      });

      if (!name) return;

      try {
        const folderPath = uri.fsPath;
        const filePath = path.join(folderPath, `${name}.cs`);
        const fileUri = vscode.Uri.file(filePath);

        const namespace = generateNamespace(folderPath);
        const fileContent = generateClassTemplate(namespace, type, name);

        await vscode.workspace.fs.writeFile(
          fileUri,
          Buffer.from(fileContent, "utf8")
        );

        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to create C# file: ${error.message || error}`
        );
      }
    }
  );

  context.subscriptions.push(command);
}

export function deactivate() {}

/**
 * Converts the folder name into a namespace-safe identifier.
 */
function generateNamespace(folderPath: string): string {
  const csprojPath = findNearestCsproj(folderPath);
  if (!csprojPath) {
    return "MyNamespace";
  }

  const projectRoot = path.dirname(csprojPath);
  const relative = path.relative(projectRoot, folderPath);

  const segments = relative.split(path.sep).filter(Boolean);
  const namespace = [path.basename(projectRoot), ...segments].join(".");

  // Clean up invalid characters just in case
  return namespace.replace(/[^\w.]/g, "_");
}

function findNearestCsproj(startPath: string): string | null {
  let dir = startPath;

  while (true) {
    const files = fs.readdirSync(dir);
    const csproj = files.find((f) => f.endsWith(".csproj"));

    if (csproj) {
      return path.join(dir, csproj);
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break; // Reached root
    }

    dir = parent;
  }

  return null;
}

/**
 * Generates a basic C# class file using file-scoped namespace syntax.
 */
function generateClassTemplate(
  namespace: string,
  type: string,
  name: string
): string {
  return `namespace ${namespace};

public ${type} ${name}
{
}
`;
}
