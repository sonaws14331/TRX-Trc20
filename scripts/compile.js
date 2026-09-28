import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

export const root = fileURLToPath(new URL("../", import.meta.url));
export function compile() {
  const names = ["EagleToken", "EagleRewards"];
  const input = {
    language: "Solidity",
    sources: Object.fromEntries(
      names.map((name) => [
        `${name}.sol`,
        {
          content: fs.readFileSync(
            path.join(root, "contracts", `${name}.sol`),
            "utf8",
          ),
        },
      ]),
    ),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (name) => {
        try {
          return {
            contents: fs.readFileSync(
              path.join(root, "node_modules", name),
              "utf8",
            ),
          };
        } catch {
          return { error: `Import not found: ${name}` };
        }
      },
    }),
  );
  const errors =
    output.errors?.filter((error) => error.severity === "error") ?? [];
  if (errors.length)
    throw new Error(errors.map((error) => error.formattedMessage).join("\n"));
  return Object.fromEntries(
    names.map((name) => {
      const contract = output.contracts[`${name}.sol`][name];
      return [
        name,
        { abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` },
      ];
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const artifacts = compile();
  fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
  for (const [name, artifact] of Object.entries(artifacts))
    fs.writeFileSync(
      path.join(root, "artifacts", `${name}.json`),
      JSON.stringify(artifact, null, 2),
    );
  console.log(
    `Compiled ${Object.keys(artifacts).join(", ")} with solc ${solc.version()}`,
  );
}
