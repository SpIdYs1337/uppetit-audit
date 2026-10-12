const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function loader(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
    const realRequire = createRequire(filename);
    function requireModule(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      let target = id.startsWith('@/') ? path.join(root, 'src', id.slice(2))
        : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (target) {
        if (path.basename(target) === 'prisma') {
          if (!mocks.prisma) throw new Error('Unmocked database access');
          return mocks.prisma;
        }
        if (Object.hasOwn(mocks, target)) return mocks[target];
        target = ['.ts', '.tsx', '.js'].map(ext => target + ext).find(fs.existsSync);
        if (target) return load(target);
      }
      return realRequire(id);
    }
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    new Function('require', 'module', 'exports', '__filename', '__dirname', source)(requireModule, compiledModule, compiledModule.exports, filename, path.dirname(filename));
    return compiledModule.exports;
  }
  return load;
}

module.exports = { loader };
