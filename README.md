# Pyodide

This fork of pyodide is for experimenting with getting eos from Pyfa running in the browser.


[![Build Status](https://circleci.com/gh/iodide-project/pyodide.png)](https://circleci.com/gh/iodide-project/pyodide)

The Python scientific stack, compiled to WebAssembly.

It provides transparent conversion of objects between Javascript and Python.
When inside a browser, this means Python has full access to the Web APIs.

**While closely related to the [iodide project](https://iodide.io), Pyodide may
be used standalone in any context where you want to run Python inside a web
browser.**

For more information, see [the demo](https://iodide.io/pyodide-demo/python.html) and the
[documentation](https://github.com/iodide-project/pyodide/tree/master/docs).

# Building

Building is easiest on Linux. For other platforms, we recommend using
the Docker image (described below) to build Pyodide.

Make sure the prerequisites for [emsdk](https://github.com/juj/emsdk) are
installed. Pyodide will build a custom, patched version of emsdk, so there is no
need to build it yourself prior.

Additional build prerequisites are:

- A working native compiler toolchain, enough to build CPython.
- A native Python 3.7 to run the build scripts.
- PyYAML
- [lessc](https://lesscss.org/) to compile less to css.
- [uglifyjs](https://github.com/mishoo/UglifyJS) to minify Javascript builds.
- [ccache](https://ccache.samba.org) (optional) recommended for much faster rebuilds.


`make`

## Using Docker

We provide a Debian-based Docker image on Docker Hub with the dependencies
already installed to make it easier to build Pyodide.

1. Install Docker

2. From a git checkout of Pyodide, run `./run_docker`

3. cd `/src`

4. Run `make` to build.

You can edit the files in your source checkout on your host machine, and then
repeatedly run `make` inside the Docker environment to test your changes.

# Testing

Install the following dependencies into the default Python installation:

   `pip install pytest selenium pytest-instafail`

Install [geckodriver](https://github.com/mozilla/geckodriver/releases) and
[chromedriver](https://sites.google.com/a/chromium.org/chromedriver/downloads) somewhere
on your `PATH`.

`pytest test/`

# Benchmarking

Install the same dependencies as for testing.

`make benchmark`

# Linting

Python is linted with `flake8`.  C and Javascript are linted with `clang-format`.

`make lint`
