# slip.js
A Performant Scheme Interpreter in [asm.js](http://asmjs.org).

## Introduction

Slip.js is a handwritten [asm.js](http://asmjs.org) implementation of [Slip](http://soft.vub.ac.be/~tjdhondt/PLE). The language was originally designed as a variant of Scheme and implemented in C by Prof. T. D'Hondt at the Vrije Universiteit Brussel. This version aims to bring that same language to the web while maintaining similar performance as the original native Slip. For this reason, the interpreter runs on top of asm.js, a very optimizable low-level subset of JavaScript.

Read the full paper [here](http://soft.vub.ac.be/Publications/2015/vub-soft-tr-15-12.pdf) or have a look at our [slideshow](http://www.slideshare.net/noahves/a-performant-scheme-interpreter-in-asmjs) presented at SAC2016.

## Running slip.js

To run slip.js, simply open ```index.html``` for an interactive slip.js REPL in your browser of choice (preferably Firefox). An up-to-date version is also hosted on [this link](http://noahvanes.github.io/slipjs) if you just want to try it out quickly!

Alternatively, one can also open a slip.js REPL in a shell using either:
  - ```js spiderslip.js``` (for SpiderMonkey)
  - ```d8 d8slip.js``` (for V8/d8 shell)
  - ```jsc jscslip.js``` (for JavaScriptCore)

## Building slip.js

Slip.js makes use of the [sweet.js](http://sweetjs.org) macro expander to facilitate the writing of asm.js code by hand.

The file ```slip.js``` contains the asm.js that was generated by the sweet.js macro expander. The original source code
can be found in ```slip.sjs```. If you want to make changes to this file, you can rebuild ```slip.js``` by running ```./build.sh```, assuming you have sweet.js installed on your system.
