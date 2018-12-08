/**
 * The main bootstrap script for loading pyodide.
 */

//resolve = function(){};
//reject = function() {};

if ('function' !== typeof importScripts) {
  console.error("NO IMPORTS!");
}

var baseURL = '';

importScripts(`${baseURL}pyodide.asm.data.js`);
importScripts(`${baseURL}pyodide.asm.js`);

////////////////////////////////////////////////////////////
// Package loading
let loadedPackages = new Array();
var loadPackagePromise = new Promise((resolve) => resolve());

let _loadPackage = (names, messageCallback) => {
  // DFS to find all dependencies of the requested packages
  let packages = pyodide._module.packages.dependencies;
  let loadedPackages = pyodide.loadedPackages;
  let queue = [].concat(names || []);
  let toLoad = new Array();
  while (queue.length) {
    const package = queue.pop();

    if (package in toLoad) {
      continue;
    }

    toLoad[package] = package;
    if (packages.hasOwnProperty(package)) {
      packages[package].forEach((subpackage) => {
        if (!(subpackage in loadedPackages) && !(subpackage in toLoad)) {
          queue.push(subpackage);
        }
      });
    } else {
      console.error(`Unknown package '${package}'`);
      return;
    }
  }

  let promise = new Promise((resolve, reject) => {
    if (Object.keys(toLoad).length === 0) {
      resolve('No new packages to load');
      return;
    }

    const packageList = Array.from(Object.keys(toLoad)).join(', ');
    if (messageCallback !== undefined) {
      messageCallback(`Loading ${packageList}`);
    }

    pyodide._module.monitorRunDependencies = (n) => {
      if (n === 0) {
        for (let package in toLoad) {
          pyodide.loadedPackages[package] = toLoad[package];
        }
        delete pyodide._module.monitorRunDependencies;
        resolve(`Loaded ${packageList}`);
      }
    };

    for (let package in toLoad) {
      importScripts(`${baseURL}${package}.js`);
    }

    // We have to invalidate Python's import caches, or it won't
    // see the new files. This is done here so it happens in parallel
    // with the fetching over the network.
    pyodide.runPython('import importlib as _importlib\n' +
                             '_importlib.invalidate_caches()\n');
  });

  return promise;
};

let loadPackage = (names, messageCallback) => {
  /* We want to make sure that only one loadPackage invocation runs at any
   * given time, so this creates a "chain" of promises. */
  loadPackagePromise =
      loadPackagePromise.then(() => _loadPackage(names, messageCallback));
  return loadPackagePromise;
};

////////////////////////////////////////////////////////////
// Fix Python recursion limit
function fixRecursionLimit(pyodide) {
  // The Javascript/Wasm call stack may be too small to handle the default
  // Python call stack limit of 1000 frames. This is generally the case on
  // Chrom(ium), but not on Firefox. Here, we determine the Javascript call
  // stack depth available, and then divide by 50 (determined heuristically)
  // to set the maximum Python call stack depth.

  let depth = 0;
  function recurse() {
    depth += 1;
    recurse();
  }
  try {
    recurse();
  } catch (err) {
    ;
  }

  let recursionLimit = depth / 50;
  if (recursionLimit > 1000) {
    recursionLimit = 1000;
  }
  pyodide.runPython(
      `import sys; sys.setrecursionlimit(int(${recursionLimit}))`);
};

////////////////////////////////////////////////////////////
// Rearrange namespace for public API
let PUBLIC_API = [
  'loadPackage',
  'loadedPackages',
  'pyimport',
  'repr',
  'runPython',
  'runPythonAsync',
  'version',
];

function makePublicAPI(module, public_api) {
  var namespace = {_module : module};
  for (let name of public_api) {
    namespace[name] = module[name];
  }
  return namespace;
}

////////////////////////////////////////////////////////////
// Loading Pyodide
let wasmURL = `${baseURL}pyodide.asm.wasm`;
//let Module = {};

Module.noImageDecoding = true;
Module.noAudioDecoding = true;
Module.noWasmDecoding = true;
Module.preloadedWasm = {};

//WebAssembly.instantiateStreaming(fetch(wasmURL));
let wasm_promise = WebAssembly.compileStreaming(fetch(wasmURL));
  Module.instantiateWasm = (info, receiveInstance) => {
    wasm_promise.then(module => WebAssembly.instantiate(module, info))
        .then(instance => receiveInstance(instance));
    return {};
};

Module.locateFile = (path) => baseURL + path;
var postRunPromise = new Promise((resolve, reject) => {
  Module.postRun = () => {
    delete Module;
    fetch(`${baseURL}packages.json`)
        .then((response) => response.json())
        .then((json) => {
          fixRecursionLimit(pyodide);
          pyodide = makePublicAPI(pyodide, PUBLIC_API);
          pyodide._module.packages = json;
          resolve();
        });
  };
});

var dataLoadPromise = new Promise((resolve, reject) => {
  Module.monitorRunDependencies =
      (n) => {
        if (n === 0) {
          delete Module.monitorRunDependencies;
          resolve();
        }
      }
});

var _loaded = Promise.all([ postRunPromise, dataLoadPromise ]);

pyodide = pyodide(Module);
pyodide.loadedPackages = new Array();
pyodide.loadPackage = loadPackage;
pyodide.loaded = _loaded;
