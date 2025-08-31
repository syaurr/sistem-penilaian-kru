// ...existing code...
/*
  add-cache-control.js
  - Menemukan semua file route.ts di project
  - Untuk setiap panggilan NextResponse.json(...):
    * jika hanya ada 1 argumen (body) -> tambahkan argumen kedua options { headers: { 'Cache-Control': 'no-store' } }
    * jika ada argumen kedua yang adalah object literal -> tambahkan/overwrite headers.'Cache-Control'
    * jika ada argumen kedua tapi bukan object literal -> ganti menjadi object literal yang meng-spread argumen lama dan menambahkan headers
  - Perubahan dilakukan lewat AST (ts-morph) untuk menghindari syntax error
*/
const { Project, SyntaxKind } = require("ts-morph");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const project = new Project({
  tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths(path.join(projectRoot, "**/route.ts"));

function ensureHeadersInObjectLiteral(objLit) {
  // objLit: ObjectLiteralExpression
  // pastikan properti headers ada dan berisi object literal dengan 'Cache-Control': 'no-store'
  const headersProp = objLit.getProperty("headers");
  if (headersProp) {
    // jika headers ada dan adalah property assignment
    if (headersProp.getKind() === SyntaxKind.PropertyAssignment) {
      const initializer = headersProp.getInitializer();
      if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const headersObj = initializer;
        // cari property 'Cache-Control' (name mungkin string)
        const cacheProp = headersObj.getProperty("'Cache-Control'") || headersObj.getProperty('"Cache-Control"') || headersObj.getProperty("Cache-Control");
        if (cacheProp) {
          // replace value
          if (cacheProp.getKind() === SyntaxKind.PropertyAssignment) {
            cacheProp.replaceWithText(`'Cache-Control': 'no-store'`);
          } else {
            cacheProp.replaceWithText(`'Cache-Control': 'no-store'`);
          }
        } else {
          // tambahkan property
          headersObj.addPropertyAssignment({
            name: "'Cache-Control'",
            initializer: `'no-store'`,
          });
        }
      } else {
        // headers ada tapi bukan object literal -> replace menjadi object literal yang spread old initializer
        const oldText = initializer ? initializer.getText() : "";
        headersProp.replaceWithText(`headers: { 'Cache-Control': 'no-store', ...(${oldText}) }`);
      }
    } else {
      // fallback: replace headers prop with object literal
      headersProp.replaceWithText(`headers: { 'Cache-Control': 'no-store' }`);
    }
  } else {
    // tidak ada headers -> tambah property headers di object literal
    objLit.addPropertyAssignment({
      name: "headers",
      initializer: "{ 'Cache-Control': 'no-store' }",
    });
  }
}

for (const sf of project.getSourceFiles()) {
  let changed = false;
  try {
    const callExprs = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of callExprs) {
      // cek apakah ini NextResponse.json(...)
      const expr = call.getExpression();
      if (!expr) continue;
      // bentuk: NextResponse.json
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) continue;
      const propAccess = expr;
      const methodName = propAccess.getName ? propAccess.getName() : propAccess.getText().split('.').pop();
      if (methodName !== "json") continue;
      const leftText = propAccess.getExpression().getText();
      if (!/NextResponse$/.test(leftText) && !/NextResponse\b/.test(leftText)) continue;

      const args = call.getArguments();
      if (args.length === 0) continue; // aneh, skip

      if (args.length === 1) {
        // hanya body -> tambahkan options arg
        call.addArgument("{ headers: { 'Cache-Control': 'no-store' } }");
        changed = true;
        continue;
      }

      // ada arg kedua (options)
      const second = args[1];
      if (second.getKind() === SyntaxKind.ObjectLiteralExpression) {
        ensureHeadersInObjectLiteral(second);
        changed = true;
      } else {
        // bukan object literal -> ganti dengan object literal yang meng-spread arg lama
        const oldText = second.getText();
        call.getArguments()[1].replaceWithText(`{ headers: { 'Cache-Control': 'no-store' }, ...(${oldText}) }`);
        changed = true;
      }
    }

    // juga tangani var/const GET yang berisi arrow function: mereka memanggil NextResponse.json di dalam function body,
    // tetapi di atas kita memeriksa semua CallExpression di file, jadi sudah ter-cover.

    if (changed) {
      console.log("Modified:", sf.getFilePath());
      sf.saveSync();
    }
  } catch (err) {
    console.error("Error processing", sf.getFilePath(), err && err.message ? err.message : err);
  }
}

console.log("Selesai. Periksa perubahan dan jalankan build / tes Anda.");
// ...existing code...