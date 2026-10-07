import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildDirectory = resolve(projectRoot, process.argv[2] ?? "dist-prototype-updated");
const outputPath = resolve(projectRoot, process.argv[3] ?? "prototype-mvp-apps-script-updated.html");
const html = await readFile(resolve(buildDirectory, "prototype-mvp-source-preview.html"), "utf8");
const scriptPath = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/)?.[1];
const stylePath = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];

if (!scriptPath || !stylePath) {
  throw new Error("Could not find the bundled JavaScript and CSS in the Vite preview HTML.");
}

const assetPath = (relativePath) => resolve(buildDirectory, relativePath.replace(/^\.\//, "").split("/").join(sep));
let bundle = await readFile(assetPath(scriptPath), "utf8");
const mockDirectory = resolve(buildDirectory, "mock-lab");

for (const fileName of await readdir(mockDirectory)) {
  if (!fileName.endsWith(".svg")) continue;
  const filePath = resolve(mockDirectory, fileName);
  const encodedSvg = (await readFile(filePath)).toString("base64");
  bundle = bundle.replaceAll(`/mock-lab/${fileName}`, `data:image/svg+xml;base64,${encodedSvg}`);
}

if (bundle.includes("/mock-lab/")) {
  throw new Error("A mock-lab asset path was not inlined.");
}

const styles = (await readFile(assetPath(stylePath), "utf8")).replace(/<\/style/gi, "<\\/style");
const encodedBundle = Buffer.from(bundle, "utf8").toString("base64");
const output = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lexi Prototype</title>
<style>${styles}</style>
</head>
<body>
<div id="root"></div>
<script>
(()=>{
const encodedBundle=${JSON.stringify(encodedBundle)};
const binary=atob(encodedBundle);
const bytes=Uint8Array.from(binary,character=>character.charCodeAt(0));
const source=new TextDecoder("utf-8").decode(bytes);
const blob=new Blob([source],{type:"text/javascript;charset=utf-8"});
const url=URL.createObjectURL(blob);
const script=document.createElement("script");
script.type="module";
script.src=url;
script.onload=()=>URL.revokeObjectURL(url);
document.body.appendChild(script);
})();
</script>
</body>
</html>
`;

await writeFile(outputPath, output);
console.log(`Wrote ${outputPath}`);
console.log(`Bundle size: ${Buffer.byteLength(output).toLocaleString()} bytes`);
