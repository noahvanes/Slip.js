function SLIP(callbacks, size) {
	"use strict";

	function SLIP_ASM(stdlib, foreign, heap) {
		"use asm";

		macro typecheck {
		    case { typecheck $t => $fun } => {
		       letstx $tag = [makeIdent('tag', #{$t})];
		       letstx $deref = [makeIdent('deref', #{$t})];
		       return #{
		        macro $fun {
		          rule { ($x:expr) } => {
		            ((($tag($x)|0) == $t)|0)
		          }
		        }
		        function makeFun($fun)(x) {
		          x = x|0;
		          return (($tag($deref(x)|0)|0) == $t)|0;
		        }
		      }
		  }
		}

		macro makeLabel {
		    case {_($lab)} => {
		        var label = unwrapSyntax(#{$lab});
		        return [makeIdent('_'+label, #{here})];
		    }
		}

		macro defun {
		    rule {$f $v} => {
		        macro $f {
		          rule {()} => {makeLabel($f)()|0}
		          rule {} => {$v}
		        }
		    }
		}

		macro instructions {
		    case {
		      _ {
		        $($lab {
		            $body ...
		          }) ...
		      } generate $fun
		    } => {
		        function nextPowTwo(x) {
		          var current = 1;
		          while(current < x)
		            current = current<<1;
		          return current;
		        }
		        var len = #{$lab ...}.length;
		        var numbers = new Array(len);
		        for(var i = 0; i < len; ++i)
		            numbers[i] = (makeValue((2*i)+1, #{here}));
		        letstx $nbr ... = numbers;
		        len = nextPowTwo(2*len);
		        var diff = len - ((2*i));
		        var nops = new Array(diff);
		        while(diff--)
		          nops[diff] = (makeIdent('nop', #{here}));
		        letstx $nop ... = nops;
		        letstx $mask = [makeValue(len-1, #{here})];
		        return #{
		            $(defun $lab $nbr) ...
		            $(function makeLabel($lab)() {
		                 $body ...
		            }) ...
		            function nop() { halt; }
		            function $fun(instr) {
		                instr = instr|0;
		                for(;instr;instr=FUNTAB[instr&$mask]()|0);
		            }
		            var FUNTAB = [$(nop, makeLabel($lab)) (,) ..., $nop (,) ...];
		        }
		     }
		 }

		macro goto {
		    rule {$f} => {return $f}
		}

		macro halt {
		    rule {} => {return 0}
		}

		macro makeFun {
		    case {_($lab)} => {
		        var label = unwrapSyntax(#{$lab});
		        return [makeIdent('f'+label, #{here})];
		    }
		}

		macro struct {
		    case {
		            _ $nam {
		                $($prop => $funs (,) ...) (;) ...
		            } as $tag
		        }
		        =>
		        {
		            var siz = #{$prop ...}.length;
		            letstx $siz = [makeValue(siz, #{here})];
		            var idxs = new Array(siz);
		            for(var i = 0; i < siz; ++i)
		                idxs[i] = makeValue(((i+1)<<2), #{here});
		            letstx $idx ... = idxs;
		            letstx $ctor = [makeIdent('makeChunk', #{$nam})];
		            letstx $s = [makeIdent('chunkSet', #{$nam})];
		            return #{
		                function $nam($prop (,) ...) {
		                   $($prop = $prop|0) (;) ...
		                   var chk = 0;
		                   $ctor($tag, $siz) => chk;
		                   $($s(chk, $idx, $prop)) (;) ...
		                   return chk|0;
		                }
		                $(generate $funs (,) ... => $idx) ...
		            }
		        }
		}

		macro generate {
		    case { _ $get => $idx }
		        => { 
		          letstx $g = [makeIdent('chunkGet', #{$get})];
		          letstx $ref = [makeIdent('ref', #{$get})];
		          letstx $deref = [makeIdent('deref', #{$get})];
		          return #{
		            macro $get {
		              rule {($chk:expr)} => {
		                $g($chk,$idx)
		              }
		            }
		            function makeFun($get)(chk) {
		                chk = chk|0;
		                return $ref($g($deref(chk)|0, $idx)|0)|0;
		            }
		          }
		        }
		    case { _ $get, $set => $idx }
		        => { 
		            letstx $g = [makeIdent('chunkGet', #{$get})];
		            letstx $s = [makeIdent('chunkSet', #{$set})];
		            letstx $ref = [makeIdent('ref', #{$get})];
		            letstx $deref = [makeIdent('deref', #{$get})];
		            return #{
		              macro $get {
		                rule {($chk:expr)} => {
		                  $g($chk,$idx)
		                }
		              }
		              function makeFun($get)(chk) {
		                  chk = chk|0;
		                  return $ref($g($deref(chk)|0,$idx)|0)|0;
		              }
		              macro $set {
		                rule {($chk:expr, $val:expr)} => {
		                  $s($chk,$idx,$val)
		                }
		              }
		              function makeFun($set)(chk, val) {
		                chk = chk|0;
		                val = val|0;
		                $s($deref(chk)|0,$idx,$deref(val)|0)
		            }
		           }
		          }
		}

		macro rawstruct {
		    case {
		            _ $nam {
		                $($prop => $funs (,) ...) (;) ...
		            } as $tag
		        }
		        =>
		        {
		            var siz = #{$prop ...}.length;
		            letstx $siz = [makeValue(siz, #{here})];
		            var idxs = new Array(siz);
		            for(var i = 0; i < siz; ++i)
		                idxs[i] = makeValue(((i+1)<<2), #{here});
		            letstx $idx ... = idxs;
		            letstx $ctor = [makeIdent('makeChunk', #{$nam})];
		            letstx $s = [makeIdent('chunkSet', #{$nam})];
		            return #{
		                function $nam($prop (,) ...) {
		                   $($prop = $prop|0) (;) ...
		                   var chk = 0;
		                   $ctor($tag, $siz) => chk;
		                   $($s(chk, $idx, $prop)) (;) ...
		                   return chk|0;
		                }
		                $(generateRaw $funs (,) ... => $idx) ...
		            }
		        }
		}

		macro generateRaw {
		    case { _ $get => $idx }
		        => { 
		          letstx $g = [makeIdent('chunkGet', #{$get})];
		          letstx $ref = [makeIdent('ref', #{$get})];
		          letstx $deref = [makeIdent('deref', #{$get})];
		          return #{
		            macro $get {
		              rule {($chk:expr)} => {
		                $g($chk,$idx)
		              }
		            }
		            function makeFun($get)(chk) {
		                chk = chk|0;
		                return $g($deref(chk)|0, $idx)|0;
		            }
		          }
		        }
		    case { _ $get, $set => $idx }
		        => { 
		            letstx $g = [makeIdent('chunkGet', #{$get})];
		            letstx $s = [makeIdent('chunkSet', #{$set})];
		            letstx $ref = [makeIdent('ref', #{$get})];
		            letstx $deref = [makeIdent('deref', #{$get})];
		            return #{
		              macro $get {
		                rule {($chk:expr)} => {
		                  $g($chk,$idx)
		                }
		              }
		              function makeFun($get)(chk) {
		                  chk = chk|0;
		                  return $g($deref(chk)|0,$idx)|0;
		              }
		              macro $set {
		                rule {($chk:expr, $val:expr)} => {
		                  $s($chk,$idx,$val)
		                }
		              }
		              function makeFun($set)(chk, val) {
		                chk = chk|0;
		                val = val|0;
		                $s($deref(chk)|0,$idx,val)
		            }
		           }
		          }
		}

		/* -- CONSTANT VALUES -- */
		define __TRUE__ 0x7fffffe1
		define __FALSE__ 0x7fffffe5
		define __NULL__ 0x7fffffe9
		define __VOID__ 0x7fffffed
		define __ZERO__ 0x3
		define __ONE__ 0x7
		define __TWO__ 0xB

		/* -- IMPORTS & VARIABLES -- */

		//memory
		var MEM8 = new stdlib.Uint8Array(heap);
		var MEM32 = new stdlib.Uint32Array(heap);
		var FLT32 = new stdlib.Float32Array(heap);
		var STKTOP = foreign.heapSize|0;
		var MEMSIZ = foreign.heapSize|0;
		var MEMTOP = 0;

		//math
		var fround = stdlib.Math.fround;
		var imul = stdlib.Math.imul;
		var sin = stdlib.Math.sin;

		//registers
		var ARG = 0; //arguments
		var DCT = 0; //lexical scope
		var ENV = 0; //environemnt
		var EXP = 0; //expression
		var EXT = 0; //external pool
		var FRM = 0; //frame 
		var FLT = fround(0.0); //float
		var GLB = 0; //globals
		var IDX = 0; //index
		var KON = 0; //continuation
		var LEN = 0; //length
		var LST = 0; //list 
		var OFS = 0; //lexical offset
		var PAR = 0; //parameters
		var PAT = 0; //pattern
		var REA = 0.1; //double
		var SCP = 0; //lexical scope level
		var SIZ = 0; //size
		var TLC = 0; //tail call
		var TMP = 0; //temporary
		var VAL = 0; //value

		//compiler & dictionary
		var fcompile = foreign.compile;
		var dctDefine = foreign.dctDefine;

		//errors
		var err_expectedRBR = foreign.expectedRBR;
		var err_invalidSyntax = foreign.invalidSyntax;
		var err_invalidIf = foreign.invalidIf;
		var err_invalidSequence = foreign.invalidSequence;
		var err_invalidQuote = foreign.invalidQuote;
		var err_invalidDefine = foreign.invalidDefine;
		var err_invalidAssignment = foreign.invalidAssignment;
		var err_invalidLambda = foreign.invalidLambda;
		var err_invalidApplication = foreign.invalidApplication;
		var err_undefinedVariable = foreign.undefinedVariable;
		var err_invalidParamCount = foreign.invalidParamCount;
		var err_invalidParameter = foreign.invalidParameter;
		var err_invalidOperator = foreign.invalidOperator;
		var err_invalidExpression = foreign.invalidExpression;
		var err_invalidArgument = foreign.invalidArgument;
		var err_invalidLength = foreign.invalidLength;
		var err_invalidRange = foreign.invalidRange;
		var err_fatalMemory = foreign.fatalMemory;
		var err_globalOverflow = foreign.globalOverflow;

		//timer
		var clock = foreign.clock;
		var reset = foreign.reset;

		//symbols
		var loadQuo = foreign.loadQuo;
		var loadVec = foreign.loadVec;
		var loadDef = foreign.loadDef;
		var loadLmb = foreign.loadLmb;
		var loadIff = foreign.loadIff;
		var loadBeg = foreign.loadBeg;
		var loadSet = foreign.loadSet;
		var loadPls = foreign.loadPls;
		var loadMns = foreign.loadMns;
		var loadMul = foreign.loadMul;
		var loadDiv = foreign.loadDiv;
		var loadCns = foreign.loadCns;
		var loadCar = foreign.loadCar;
		var loadCdr = foreign.loadCdr;
		var loadSca = foreign.loadSca;
		var loadScd = foreign.loadScd;
		var loadLst = foreign.loadLst;
		var loadNeq = foreign.loadNeq;
		var loadSma = foreign.loadSma;
		var loadLrg = foreign.loadLrg;
		var loadLeq = foreign.loadLeq;
		var loadSeq = foreign.loadSeq;
		var loadAss = foreign.loadAss;
		var loadMap = foreign.loadMap;
		var loadVcm = foreign.loadVcm;
		var loadVcr = foreign.loadVcr;
		var loadVcs = foreign.loadVcs;
		var loadVcl = foreign.loadVcl;
		var loadEqu = foreign.loadEqu;
		var loadEql = foreign.loadEql;
		var loadEva = foreign.loadEva;
		var loadApl = foreign.loadApl;
		var loadRea = foreign.loadRea;
		var loadLoa = foreign.loadLoa;
		var loadIpa = foreign.loadIpa;
		var loadInu = foreign.loadInu;
		var loadIsy = foreign.loadIsy;
		var loadIve = foreign.loadIve;
		var loadIst = foreign.loadIst;
		var loadDis = foreign.loadDis;
		var loadNew = foreign.loadNew;
		var loadSre = foreign.loadSre;
		var loadSse = foreign.loadSse;
		var loadSle = foreign.loadSle;
		var loadAvl = foreign.loadAvl;
		var loadCol = foreign.loadCol;
		var loadClk = foreign.loadClk;
		var loadSlp = foreign.loadSlp;
		var loadRnd = foreign.loadRnd;
		var loadErr = foreign.loadErr;
		var loadRst = foreign.loadRst;
		var loadCcc = foreign.loadCcc;
		var loadCce = foreign.loadCce;
		var loadQtt = foreign.loadQtt;
		var loadRem = foreign.loadRem;
		var loadLen = foreign.loadLen;
		var loadSin = foreign.loadSin;
		var loadExi = foreign.loadExi;
		var loadFre = foreign.loadFre;
		var loadRef = foreign.loadRef;

		//IO
		var promptUserInput = foreign.promptUserInput;
		var printNewline = foreign.printNewline;
		var promptInput = foreign.promptInput;
		var fprintOutput = foreign.printOutput;
		var fprintError = foreign.printError;
		var fprintLog = foreign.printLog;
		var floadFile = foreign.loadFile;
		var initREPL = foreign.initREPL;

		//custom
		var random = foreign.random;

		//other
		var __EMPTY_VEC__ = 0;
		var __GC_COUNT__ = 0;
		var __POOL_TOP__ = 0;
		var __POOL_SIZ__ = 0;
		var __EXT_FREE__ = 0;
		var __EXT_SIZ__ = 0;

		//callbacks

		function printOutput(exp) {
			exp = exp|0;
			fprintOutput(ref(exp)|0); 
		}

		function printLog(exp) {
			exp = exp|0;
			fprintLog(ref(exp)|0);
		}

		function printError(exp) {
			exp = exp|0;
			fprintError(ref(exp)|0);
		}

		function loadFile(arg) {
			arg = arg|0;
			floadFile(ref(arg|0));
		}

		function compile(exp,tailc) {
			exp = exp|0;
			tailc = tailc|0;
			return deref(fcompile(ref(exp)|0,tailc|0)|0)|0;
		}

		/* -- FUNCTIONS -- */

// **********************************************************************
// ***************************** MEMORY *********************************
// **********************************************************************

		/* MEMORY MANAGEMENT & GARBAGE COLLECTION */

		define __MEMBOTTOM__ 0x20

		function initMemory() {
			MEMTOP = __MEMBOTTOM__;
		}

		macro available {
			case {_()} => {
				letstx $STK = [makeIdent('STKTOP', #{here})];
				letstx $MEM = [makeIdent('MEMTOP', #{here})];
				return #{
					($STK - $MEM)
				}
			}
		}

		function collectGarbage() {
			STKTOP = (STKTOP - 4)|0;
			MEM32[STKTOP >> 2] = makeBusy(STKTOP)|0;
			mark((MEMSIZ - 4)|0);
			update();
			crunch();
			zap();
		}

		function mark(pos) {
			pos = pos|0;
			var cel = 0;
			var ptr = 0;
			var len = 0;
			for(;;) {
				cel = MEM32[pos >> 2]|0;
				switch(cel & 0x3) { //last 2 bits
					case 0x0: //bp
						ptr = cel;
						cel = MEM32[ptr >> 2]|0;
						switch (cel & 0x7) { //last 3 bits
							case 0x0: //rbp
								MEM32[ptr >> 2] = makeBusy(pos)|0;
								MEM32[pos >> 2] = cel;
								len = headerSize(cel)|0;
								pos = (len ? (ptr + (len<<2))|0 : (pos - 4)|0);
								continue;
							case 0x2: //rBp
							case 0x6: //RBp
								ptr = makeFree(cel)|0;
								cel = MEM32[ptr >> 2]|0;
							case 0x4: //Rbp
								MEM32[ptr >> 2] = makeBusy(pos)|0;
								MEM32[pos >> 2] = cel;
								pos = (pos - 4)|0;
						}
						continue;
					case 0x2: //Bp
						pos = makeFree(cel)|0;
						if((pos|0) == (STKTOP|0))
							return;
					case 0x1: //bP
					case 0x3: //BP
						pos = (pos - 4)|0;
				}
			}
		}

		function update() {
			var src = 0;
			var dst = 0;
			var cel = 0;
			var ptr = 0;
			var len = 0;
			var siz = 0;
			var cur = 0;
			src = __MEMBOTTOM__;
			dst = __MEMBOTTOM__;
			while((src|0) < (MEMTOP|0)) {
				cel = MEM32[src >> 2]|0;
				if(cel & 0x2) { //marked chunk
					do {
						ptr = cel;
						cel = MEM32[ptr >> 2]|0;
						MEM32[ptr >> 2] = dst;
					} while(cel & 0x2);
					MEM32[src >> 2] = makeBusy(cel)|0;
					len = ((headerSize(cel)|0)+1) << 2;
					src = (src + len)|0;
					dst = (dst + len)|0;
				} else { //unmarked chunk
					siz = ((headerSize(cel)|0)+1) << 2;
					for(cur = (src+siz)|0;
						(cur|0) < (MEMTOP|0);
						cur = (cur+len)|0, siz = (siz+len)|0) {
						cel = MEM32[cur >> 2]|0;
						if(cel & 0x2) break; //busy
						len = ((headerSize(cel)|0)+1) << 2;
						if(((siz+len)|0) > 0x3FFFFFC) break; //size overflow
					}
					MEM32[src >> 2] = makeHeader(0,((siz>>2)-1)|0)|0;
					src = (src + siz)|0;
				}
			}
		}

		function crunch() {
			var src = 0;
			var dst = 0;
			var len = 0;
			var cel = 0;
			src = __MEMBOTTOM__;
			dst = __MEMBOTTOM__;
			while((src|0) < (MEMTOP|0)) {
				cel = MEM32[src>>2]|0;
				len = headerSize(cel)|0;
				if(cel & 0x2) { //busy
					MEM32[dst>>2] = makeFree(cel)|0;
					src=(src+4)|0;
					dst=(dst+4)|0;
					for(;(len|0)>0;len=(len-1)|0) {
						MEM32[dst>>2] = MEM32[src>>2];
						src=(src+4)|0;
						dst=(dst+4)|0;
					}
				} else {
					len = (len + 1) << 2;
					src = (src + len)|0;
				}
			}
			MEMTOP = dst;
		}

		/* CELLS */

		macro makeHeader {
			case {_($tag:lit,$siz:lit)} => {
				var siz = unwrapSyntax(#{$siz});
				var tag = unwrapSyntax(#{$tag});
				var hdr = (((siz<<6)|tag)<<2);
				letstx $hdr = [makeValue(hdr,#{here})];
				return #{
					$hdr
				}
			}
			rule {($tag,$siz:expr)} => {
				((($siz<<6)|$tag)<<2)
			}
		}

		macro headerSize {
			rule {($hdr:expr)} => {
				($hdr >>> 8)
			}
		}

		macro makeFree {
			rule {($ofs:expr)} => {
				($ofs & 0xFFFFFFFD)
			}
		}

		macro makeBusy {
			rule {($ofs:expr)} => {
				($ofs | 0x2)
			}
		}

		/* CHUNKS */

		macro makeChunk {
			case {_($tag,$siz:lit) => $v:ident;} => {
				var nbr = unwrapSyntax(#{$siz});
				letstx $M32 = [makeIdent('MEM32', #{here})];
				letstx $MTP = [makeIdent('MEMTOP', #{here})];
				letstx $HDR = [makeIdent('makeHeader', #{here})];
				letstx $INC = [makeValue((nbr+1)<<2, #{here})];
				return #{
					$v = $MTP;
					$MTP = ($MTP + $INC)|0;
					$M32[$v>>2] = $HDR($tag,$siz);
				}
			}
			case {_($tag,$siz:expr) => $v:ident;} => {
				letstx $M32 = [makeIdent('MEM32', #{here})];
				letstx $MTP = [makeIdent('MEMTOP', #{here})];
				letstx $HDR = [makeIdent('makeHeader', #{here})];
				return #{
					$v = $MTP;
					$MTP = ($MTP+(($siz+1)<<2))|0;
					$M32[$v>>2] = $HDR($tag,$siz);
				}
			}
		}

		macro chunkTag {
			case {_($ptr:expr)} => {
				letstx $mem = [makeIdent('MEM32', #{here})];
				return #{
					(((MEM32[$ptr>>2]|0)>>>2)&0x3F)
				}
			}
		}

		macro chunkSize {
			case {_($ptr:expr)} => {
				letstx $mem = [makeIdent('MEM32', #{here})];
				letstx $siz = [makeIdent('headerSize', #{here})];
				return #{
					(headerSize(MEM32[$ptr>>2]|0))
				}
			}
		}

		macro chunkGet {
			case {_($ptr:expr, $idx:expr)} => {
				letstx $mem = [makeIdent('MEM32', #{here})];
				return #{
					$mem[($ptr + $idx) >> 2]
				}
			}
		}

		macro chunkGetByte {
			case {_($ptr:expr, $idx:expr)} => {
				letstx $mem = [makeIdent('MEM8', #{here})];
				return #{
					$mem[($ptr + $idx)|0]
				}
			}
		}

		macro chunkGetFloat {
			case {_($ptr:expr, $idx:expr)} => {
				letstx $mem = [makeIdent('FLT32', #{here})];
				return #{
					$mem[($ptr + $idx) >> 2]
				}
			}
		}

		macro chunkSet {
			case {_($ptr:expr, $idx:expr, $val:expr)} => {
				letstx $mem = [makeIdent('MEM32', #{here})];
				return #{
					$mem[($ptr + $idx) >> 2] = $val
				}
			}
		}

		macro chunkSetByte {
			case {_($ptr:expr, $idx:expr, $val:expr)} => {
				letstx $mem = [makeIdent('MEM8', #{here})];
				return #{
					$mem[($ptr + $idx)|0] = $val
				}
			}
		}

		macro chunkSetFloat {
			case {_($ptr:expr, $idx:expr, $val:expr)} => {
				letstx $mem = [makeIdent('FLT32', #{here})];
				return #{
					$mem[($ptr + $idx) >> 2] = $val
				}
			}
		}

		/* STACK */

		function push(el) {
			el = el|0;
			STKTOP = (STKTOP - 4)|0;
			MEM32[STKTOP >> 2] = el;
		}

		function pop() {
			var tmp = 0;
			tmp = MEM32[STKTOP >> 2]|0;
			STKTOP = (STKTOP + 4)|0;
			return tmp|0;
		}

		function peek() {
			return STK[0]|0;
		}

		function poke(el) {
			el = el|0;
			MEM32[STKTOP >> 2] = el;
		}

		function zap() {
			STKUNWIND(1);
		}

		function emptyStk() {
			STKTOP = MEMSIZ;
		}

		function stkSize() {
			return ((MEMSIZ - STKTOP)|0) >> 2;
		}

		macro STK {
			rule {[0]} => {
				(MEM32[STKTOP >> 2])
			}
			case {_[$idx:lit]} => {
			  var i = unwrapSyntax(#{$idx});
			  letstx $i = [makeValue(i<<2,#{h})];
			  return #{
				(MEM32[(STKTOP+($i))>>2])
			  }
			}
			rule{[$idx:expr]} => {
				(MEM32[(STKTOP+($idx<<2))>>2])
			}
		}

		macro STKUNWIND {
			case {_($n:lit)} => {
				var nbr = unwrapSyntax(#{$n});
				var val = makeValue(nbr<<2,#{h});
				letstx $inc = [val];
				return #{
					(STKTOP = (STKTOP + $inc)|0)
				}
			}			
			case {_($n:ident)} => {
				return #{
					(STKTOP = (STKTOP + ($n << 2))|0)
				}
			}
		}

		macro STKALLOC {
			case {_($n:lit)} => {
				var nbr = unwrapSyntax(#{$n});
				var val = makeValue(nbr<<2,#{h});
				letstx $dec = [val];
				return #{
					(STKTOP = (STKTOP - $dec)|0)
				}
			}
			case {_($n:ident)} => {
				return #{
					(STKTOP = (STKTOP - ($n << 2))|0)
				}
			}
		}

// **********************************************************************
// ************************* ABSTRACT GRAMMAR ***************************
// **********************************************************************

		macro tag {
			case {_($v:expr)} => {
				letstx $mem = [makeIdent('MEM8',#{here})];
				return #{
					($v&0x1?$mem[$v&0x1F]|0:chunkTag($v)|0)
				}
			}
		}

		function ftag(exp) {
			exp = exp|0;
			return tag(deref(exp)|0)|0;
		}

		function initTags() {
			MEM8[0x3] = __NBR_TAG__;
			MEM8[0x7] = __NBR_TAG__;
			MEM8[0xB] = __NBR_TAG__;
			MEM8[0xF] = __NBR_TAG__;
			MEM8[0x13] = __NBR_TAG__;
			MEM8[0x17] = __NBR_TAG__;
			MEM8[0x1B] = __NBR_TAG__;
			MEM8[0x1F] = __NBR_TAG__;
			MEM8[0x1] = __TRU_TAG__;
			MEM8[0x5] = __FLS_TAG__;
			MEM8[0x9] = __NUL_TAG__;
			MEM8[0xD] = __VOI_TAG__;
			MEM8[0x11] = __CHR_TAG__;
			MEM8[0x15] = __NAT_TAG__;
			MEM8[0x19] = __LCL_TAG__;
			MEM8[0x1D] = __GLB_TAG__;
		}

		function fmake(tag,siz) {
			tag = tag|0;
			siz = siz|0;
			var chk = 0;
			claimSiz(siz)
			makeChunk(tag,siz) => chk;
			while(siz) {
				chunkSet(chk,siz<<2,__VOID__);
				siz = (siz-1)|0;
			}
			return ref(chk)|0;
		}

		function fset(chk,idx,itm) {
			chk = chk|0;
			idx = idx|0;
			itm = itm|0;
			chunkSet(deref(chk)|0,idx<<2,deref(itm)|0);
		}

		function fsetRaw(chk,idx,itm) {
			chk = chk|0;
			idx = idx|0;
			itm = itm|0;
			chunkSet(deref(chk)|0,idx<<2,itm);
		}

		function feq(x,y) {
			x = x|0;
			y = y|0;
			x = deref(x)|0;
			y = deref(y)|0;
			return ((x|0)==(y|0))|0;
		}

		/*==================*/
		/* -- IMMEDIATES -- */
		/*==================*/

		function slipVoid() {
			return ref(__VOID__)|0;
		}

		function slipNull() {
			return ref(__NULL__)|0;
		}

		function slipTrue() {
			return ref(__TRUE__)|0;
		}

		function slipFalse() {
			return ref(__FALSE__)|0;
		}

		/* ---- CHARS ---- */

		function fmakeChar(code) {
			code = code|0;
			return ref(makeChar(code)|0)|0;
		}

		function fcharCode(ch) {
			ch = ch|0;
			return charCode(deref(ch)|0)|0;
		}

		function makeChar(charCode) {
			charCode = charCode|0;
			return (charCode << 5)|0x11;
		}

		function charCode(ch) {
			ch = ch|0;
			return (ch >>> 5)|0;
		}

		typecheck __CHR_TAG__ => isChar

		/* ---- SPECIAL VALUES ---- */

		typecheck __TRU_TAG__ => isTrue
		typecheck __FLS_TAG__ => isFalse
		typecheck __VOI_TAG__ => isVoid
		typecheck __NUL_TAG__ => isNull

		/* ---- SMALL INTEGERS/NUMBERS ---- */

		macro makeNumber {
			rule {($v:expr)} => {
				(($v<<2)|0x3)
			}
		}

		macro numberVal {
			rule {($v:expr)} => {
				($v>>2)
			}
		}

		function fmakeNumber(val) {
			val = val|0;
			return ref((val << 2)|0x3)|0;
		}

		function fnumberVal(val) {
			val = val|0;
			return ((deref(val)|0) >> 2)|0;
		}

		typecheck __NBR_TAG__ => isNumber

		/* ---- NATIVES ----- */		

		macro nativePtr {
			rule {($v:expr)} => {
				($v>>>5)
			}
		}

		function makeNative(nat) {
			nat = nat|0;
			return (nat << 5)|0x15;
		}

		function fnativePtr(nat) {
			nat = nat|0;
			return ((deref(nat)|0) >>> 5)|0;
		}

		typecheck __NAT_TAG__ => isNative

		/* ---- LOCAL VARIABLE ---- */

		function fmakeLocal(lcl) {
			lcl = lcl|0;
			return ref(makeLocal(lcl)|0)|0;
		}

		function makeLocal(lcl) {
			lcl = lcl|0;
			return (lcl << 5)|0x19;
		}

		function flocalOfs(lcl) {
			lcl = lcl|0;
			return ((deref(lcl)|0) >>> 5)|0;
		}

		macro localOfs {
			rule {$ofs} => {
				($ofs>>>5)
			}
		}

		typecheck __LCL_TAG__ => isLocal

		/* ---- GLOBAL VARIABLE ---- */

		function fmakeGlobal(ofs) {
			ofs = ofs|0;
			return ref(makeGlobal(ofs)|0)|0;
		}

		function makeGlobal(ofs) {
			ofs = ofs|0;
			return (ofs << 5)|0x1D;
		}		

		macro globalOfs {
			rule {$ofs} => {
				($ofs>>>5)
			}
		}

		function fglobalOfs(glb) {
			glb = glb|0;
			return ((deref(glb)|0) >>> 5)|0;
		}

		typecheck __GLB_TAG__ => isGlobal

		/*==================*/
		/* ---- CHUNKS ---- */
		/*==================*/

		/* ---- PAIR ---- */

		struct makePair {
			car => pairCar, pairSetCar;
			cdr => pairCdr, pairSetCdr;
		} as __PAI_TAG__

		typecheck __PAI_TAG__ => isPair;

		function reverse(lst) {
			lst = lst|0;
			var prv = 0;
			var nxt = 0;
			prv = __NULL__;
			while(isPair(lst)|0) {
				nxt = pairCdr(lst)|0;
				pairSetCdr(lst, prv);
				prv = lst;
				lst = nxt;
			}
			return prv|0;
		}

		/* ---- VECTOR ---- */

		macro makeVector {
			case {_($siz) => $v:ident;} => {
				letstx $VEC = [makeIdent('makeChunk',#{here})];
				return #{
					$VEC(__VCT_TAG__, $siz) => $v;
				}
			}
		}

		macro fillVector {
			case {_($siz,$exp) => $v:ident;} => {
				letstx $VEC = [makeIdent('makeChunk',#{here})];
				letstx $SET = [makeIdent('chunkSet',#{here})];
				letstx $IDX = [makeIdent('IDX',#{here})];
				return #{
					$VEC(__VCT_TAG__, $siz) => $v;
					for($IDX=1;($IDX|0)<=($siz|0);$IDX=($IDX+1)|0)
						{ $SET($v,$IDX<<2,$exp) }
				}
			}
		}

		macro vectorRef {
			case { _($vct:expr, $idx:lit) } => {
				var idx = unwrapSyntax(#{$idx});
				letstx $nbr = [makeValue(idx<<2, #{here})];
				letstx $get = [makeIdent('chunkGet', #{$vct})];
				return #{
					$get($vct, $nbr)
				}
			}
			case { _($vct:expr, $idx:expr) } => {
				letstx $get = [makeIdent('chunkGet', #{$vct})];
				return #{
					$get($vct, $idx<<2)
				}
			}
		}

		function vectorAt(vct, idx) {
			vct = vct|0;
			idx = idx|0;
			return ref(chunkGet(deref(vct)|0,idx<<2)|0)|0;
		}

		macro vectorSet {
			case { _($vct:expr, $idx:lit, $val:expr) } => {
				var idx = unwrapSyntax(#{$idx});
				letstx $nbr = [makeValue(idx<<2, #{here})];
				letstx $set = [makeIdent('chunkSet', #{$vct})];
				return #{
					$set($vct, $nbr, $val)
				}
			}
			case { _($vct:expr, $idx:expr, $val:expr) } => {
				letstx $set = [makeIdent('chunkSet', #{$vct})];
				return #{
					$set($vct, $idx<<2, $val)
				}
			}
		}

		macro vectorLength {
			case {_($vct:expr)} => {
				letstx $siz = [makeIdent('chunkSize', #{$vct})];
				return #{
					$siz($vct)
				}
			}
		}

		function ffillVector(siz,fill) {
			siz = siz|0;
			fill = fill|0;
			var vct = 0;
			fill = deref(fill)|0;
			fillVector(siz,fill) => vct;
			return vct|0;
		}

		function fvectorLength(vct) {
			vct = vct|0;
			return chunkSize(deref(vct)|0)|0;
		}

		function currentStack() {
			var len = 0;
			var idx = 0;
			var vct = 0;
			var cur = 0;
			len = stkSize()|0;
			claimSiz(len)
			makeVector(len) => vct;
			while((idx|0) < (len|0)) {
				cur = STK[idx]|0;
				idx = (idx+1)|0;
				vectorSet(vct, idx, cur);
			}
			return vct|0;
		}

		function restoreStack() {
			var len = 0;
			var exp = 0;
			emptyStk();
			len = vectorLength(PAR)|0;
			claimSiz(len)
			STKALLOC(len);
			while(len) {
				exp = vectorRef(PAR, len)|0;
				len = (len - 1)|0;
				STK[len] = exp;
			}
		}

		typecheck __VCT_TAG__ => isVector

		/* ---- SEQUENCE ---- */

		function makeSequence(siz) {
			siz = siz|0;
			var seq = 0;
			makeChunk(__SEQ_TAG__, siz) => seq;
			return seq|0;
		}

		macro sequenceRef {
			case { _($seq:expr, $idx:lit) } => {
				var idx = unwrapSyntax(#{$idx});
				letstx $nbr = [makeValue(idx<<2, #{here})];
				letstx $get = [makeIdent('chunkGet', #{$here})];
				return #{
					$get($seq, $nbr)
				}
			}
			case { _($seq:expr, $idx:expr) } => {
				letstx $get = [makeIdent('chunkGet', #{$here})];
				return #{
					$get($seq, $idx<<2)
				}
			}
		}

		function sequenceAt(seq, idx) {
			seq = seq|0;
			idx = idx|0;
			return ref(chunkGet(deref(seq)|0,idx<<2)|0)|0;
		}

		function sequenceSet(seq, idx, val) {
			seq = seq|0;
			idx = idx|0;
			val = val|0;
			chunkSet(deref(seq)|0,idx<<2,deref(val)|0);
		}

		function sequenceLength(seq) {
			seq = seq|0;
			return chunkSize(deref(seq)|0)|0;
		}

		typecheck __SEQ_TAG__ => isSequence

		/* ---- IFS ---- */

		struct makeIfs {
			pre => ifsPredicate;
			csq => ifsConsequence;
		} as __IFS_TAG__

		typecheck __IFS_TAG__ => isIfs

		/* ---- IFF ---- */

		struct makeIff {
			pre => iffPredicate;
			csq => iffConsequence;
			alt => iffAlternative;
		} as __IFF_TAG__

		typecheck __IFF_TAG__ => isIff

		/* ---- QUO ---- */

		struct makeQuo {
			quo => quoExpression;
		} as __QUO_TAG__;

		typecheck __QUO_TAG__ => isQuo

		/* ---- DEFINE VARIABLE ---- */

		struct makeDfv {
			ofs => dfvOfs;
			val => dfvVal;
		} as __DFV_TAG__

		typecheck __DFV_TAG__ => isDfv

		/* ---- DEFINE FUNCTION (FIXED ARGUMENT COUNT) ---- */

		struct makeDff {
			ofs => dffOfs;
			arc => dffArgc;
			frc => dffFrmSiz;
			bdy => dffBdy;
		} as __DFF_TAG__

		typecheck __DFF_TAG__ => isDff

		/* ---- DEFINE FUNCTION (VARIABLE ARGUMENT COUNT) ---- */

		struct makeDfz {
			ofs => dfzOfs;
			arc => dfzArgc;
			frc => dfzFrmSiz;
			bdy => dfzBdy;
		} as __DFZ_TAG__

		typecheck __DFZ_TAG__ => isDfz

		/* ---- ASSIGNMENT (LOCAL) ---- */

		struct makeSlc {
			ofs => slcOfs;
			val => slcVal;
		} as __SLC_TAG__

		typecheck __SLC_TAG__ => isSlc

		/* ---- ASSIGNMENT (NON-LOCAL) ---- */

		struct makeSgl {
			scp => sglScp;
			ofs => sglOfs;
			val => sglVal;
		} as __SGL_TAG__

		typecheck __SGL_TAG__ => isSgl

		/* ---- CONTINUATION ---- */

		struct makeContinuation {
			kon => continuationKon;
			frm => continuationFrm;
			env => continuationEnv;
			stk => continuationStk;
		} as __CNT_TAG__

		typecheck __CNT_TAG__ => isContinuation

		/* ---- THUNK ---- */

		struct makeThk {
			exp => thunkExp;
			siz => thunkSiz;
		} as __THK_TAG__

		typecheck __THK_TAG__ => isThunk

		/* ---- TAIL THUNK ---- */

		struct makeTtk {
			exp => ttkExp;
			siz => ttkSiz;
		} as __TTK_TAG__

		typecheck __TTK_TAG__ => isTtk

		/* ---- LAMBDA (FIXED ARGUMENTS) ---- */

		struct makeLmb {
			arc => lmbArgc;
			frc => lmbFrmSiz;
			bdy => lmbBdy;
		} as __LMB_TAG__

		typecheck __LMB_TAG__ => isLmb

		/* ---- LAMBDA (VARIABLE ARGUMENTS) ---- */

		struct makeLmz {
			arc => lmzArgc;
			frc => lmzFrmSiz;
			bdy => lmzBdy;
		} as __LMZ_TAG__

		typecheck __LMZ_TAG__ => isLmz

		/* ---- PROCEDURE (FIXED ARGC) ---- */

		struct makePrc {
			arc => prcArgc;
			frc => prcFrmSiz;
			bdy => prcBdy;
			env => prcEnv;
		} as __PRC_TAG__

		typecheck __PRC_TAG__ => isPrc

		/* ---- PROCEDURE (VARIABLE ARGC) ---- */

		struct makePrz {
			arc => przArgc;
			frc => przFrmSiz;
			bdy => przBdy;
			env => przEnv;
		} as __PRZ_TAG__

		typecheck __PRZ_TAG__ => isPrz

		/* ---- APPLICATION (ZERO ARG) ---- */

		struct makeApz {
			opr => apzOpr;
		} as __APZ_TAG__

		typecheck __APZ_TAG__ => isApz

		/* ---- LOCAL APPLICATION (ZERO ARG) ---- */

		rawstruct makeAlz {
			ofs => alzOfs;
		} as __ALZ_TAG__

		typecheck __ALZ_TAG__ => isAlz

		/* ---- NON-LOCAL APPLICATION (ZERO ARG) ---- */

		rawstruct makeAnz {
			scp => anzScp;
			ofs => anzOfs;
		} as __ANZ_TAG__

		typecheck __ANZ_TAG__ => isAnz

		/* ---- GLOBAL APPLICATION (ZERO ARG) ---- */

		rawstruct makeAgz {
			ofs => agzOfs;
		} as __AGZ_TAG__

		typecheck __AGZ_TAG__ => isAgz

		/* ---- TAIL CALL (ZERO ARG) ---- */

		struct makeTpz {
			opr => tpzOpr;
		} as __TPZ_TAG__

		typecheck __TPZ_TAG__ => isTpz

		/* ---- LOCAL TAIL CALL (ZERO ARG) ---- */

		rawstruct makeTlz {
			ofs => tlzOfs;
		} as __TLZ_TAG__

		typecheck __TLZ_TAG__ => isTlz

		/* ---- NON-LOCAL TAIL CALL (ZERO ARG) ---- */

		rawstruct makeTnz {
			scp => tnzScp;
			ofs => tnzOfs;
		} as __TNZ_TAG__

		typecheck __TNZ_TAG__ => isTnz

		/* ---- GLOBAL TAIL CALL (ZERO ARG) ---- */

		rawstruct makeTgz {
			ofs => tgzOfs;
		} as __TGZ_TAG__

		typecheck __TGZ_TAG__ => isTgz


		/* ---- APPLICATION (WITH ARGUMENTS) ---- */

		struct makeApl {
			opr => aplOpr;
			opd => aplOpd;
		} as __APL_TAG__

		typecheck __APL_TAG__ => isApl

		/* ---- LOCAL APPLICATION (WITH ARGUMENTS) ---- */

		struct makeAll {
			ofs => allOfs;
			opd => allOpd;
		} as __ALL_TAG__

		typecheck __ALL_TAG__ => isAll

		/* ---- NON-LOCAL APPLICATION (WITH ARGUMENTS) ---- */

		struct makeAnl {
			scp => anlScp;
			ofs => anlOfs;
			opd => anlOpd;
		} as __ANL_TAG__

		typecheck __ANL_TAG__ => isAnl	

		/* ---- GLOBAL APPLICATION (WITH ARGUMENTS) ---- */

		struct makeAgl {
			ofs => aglOfs;
			opd => aglOpd;
		} as __AGL_TAG__

		typecheck __AGL_TAG__ => isAgl	
	
		/* ---- TAIL CALL (WITH ARGUMENTS) ---- */

		struct makeTpl {
			opr => tplOpr;
			opd => tplOpd;
		} as __TPL_TAG__

		typecheck __TPL_TAG__ => isTpl

		/* ---- LOCAL TAIL CALL (WITH ARGUMENTS) ---- */

		struct makeTll {
			ofs => tllOfs;
			opd => tllOpd;
		} as __TLL_TAG__

		typecheck __TLL_TAG__ => isTll		

		/* ---- NON-LOCAL TAIL CALL (WITH ARGUMENTS) ---- */

		struct makeTnl {
			scp => tnlScp;
			ofs => tnlOfs;
			opd => tnlOpd;
		} as __TNL_TAG__

		typecheck __TNL_TAG__ => isTnl	

		/* ---- GLOBAL TAIL CALL (WITH ARGUMENTS) ---- */

		struct makeTgl {
			ofs => tglOfs;
			opd => tglOpd;
		} as __TGL_TAG__

		typecheck __TGL_TAG__ => isTgl

		/* ---- SEQUENCE TAIL ---- */

		struct makeStl {
			exp => stlExp;
		} as __STL_TAG__

		typecheck __STL_TAG__ => isStl

		/* ---- PROTECTED REF ---- */

		struct makePrt {
			exp => prtExp;
		} as __PRT_TAG__

		typecheck __PRT_TAG__ => isPrt

		/* ---- NON-LOCAL VARIABLE ---- */

		rawstruct makeNlc {
			scp => nlcScp;
			ofs => nlcOfs;
		} as __NLC_TAG__

		typecheck __NLC_TAG__ => isNlc

		/* --- FLOATS --- */

		define __FLOAT_SIZ__ 1
		define __FLOAT_NBR__ 4

		macro makeFloat {
			case {_($v:expr) => $reg:ident;} => {
				letstx $CHK = [makeIdent('makeChunk',#{here})];
				letstx $SET = [makeIdent('chunkSetFloat',#{here})];
				return #{
					$CHK(__FLT_TAG__, __FLOAT_SIZ__) => $reg;
					$SET($reg, __FLOAT_NBR__, $v);
				}
			}
		}


		macro floatNumber {
			case {_($v:expr)} => {
				letstx $get = [makeIdent('chunkGetFloat',#{here})];
				return #{
					$get($v, __FLOAT_NBR__)
				}
			}
		}		

		function fmakeFloat(nbr) {
			nbr = fround(nbr);
			var flt = 0;
			claim();
			makeChunk(__FLT_TAG__, __FLOAT_SIZ__) => flt;
			chunkSetFloat(flt, __FLOAT_NBR__, nbr);
			return ref(flt)|0;
		}

		function ffloatNumber(flt) {
			flt = flt|0;
			return fround(chunkGetFloat(deref(flt)|0,__FLOAT_NBR__));
		}

		typecheck __FLT_TAG__ => isFloat

		/* --- TEXT --- */

		function fmakeText(tag,len) {
			tag = tag|0;
			len = len|0;
			return ref(makeText(tag,len)|0)|0;
		}

		function ftextSetChar(txt,idx,chr) {
			txt = txt|0;
			idx = idx|0;
			chr = chr|0;
			textSetChar(deref(txt)|0,idx,chr);
		}

		function ftextGetChar(txt,idx) {
			txt = txt|0;
			idx = idx|0;
			return textGetChar(deref(txt)|0,idx)|0;
		}

		function ftextLength(txt) {
			txt = txt|0;
			return textLength(deref(txt)|0)|0;
		}

		function makeText(tag, len) {
			tag = tag|0;
			len = len|0;
			var chk = 0;
			var siz = 0;
			claimSiz(siz>>2)
			for(siz = len; siz&0x3; siz=(siz+1)|0);
			makeChunk(tag, siz>>2) => chk;
			for(len = (len+4)|0, siz = (siz+4)|0;
				(len|0) < (siz|0);
				len = (len + 1)|0)
				chunkSetByte(chk, len, 0);
			return chk|0;
		}

		function textSetChar(txt, idx, chr) {
			txt = txt|0;
			idx = idx|0;
			chr = chr|0;
			chunkSetByte(txt,(idx+4)|0,chr);
		}

		function textGetChar(txt, idx) {
			txt = txt|0;
			idx = idx|0;
			return chunkGetByte(txt,(idx+4)|0)|0;
		}

		function textLength(txt) {
			txt = txt|0;
			var len = 0;
			len = (chunkSize(txt)|0) << 2;
			if (len)
				for(;!(chunkGetByte(txt,(len+3)|0)|0);len=(len-1)|0);
			return len|0;
		}

		typecheck __STR_TAG__ => isString
		typecheck __SYM_TAG__ => isSymbol

// **********************************************************************
// **************************** EXTERNAL ********************************
// **********************************************************************

		function initExt() {
			__EXT_FREE__ = 1;
			__EXT_SIZ__ = 64;
			makeVector(__EXT_SIZ__) => EXT;
			initFreeList();
		}

		function initFreeList() {
			var idx = 0;
			var nbr = 0;
			for(idx = __EXT_FREE__;
			   (idx|0) <= (__EXT_SIZ__|0);
			    idx = (idx+1)|0) 
			{				
				nbr = makeNumber((idx+1)|0)|0;	
				vectorSet(EXT,idx,nbr);	
			}
		}

		function growExt() {
			var idx = 0;
			var val = 0;
			__EXT_SIZ__ = imul(__EXT_SIZ__,2)|0;
			claimSiz(__EXT_SIZ__)
			makeVector(__EXT_SIZ__) => TMP;
			for(idx=1;(idx|0)<(__EXT_FREE__|0);idx=(idx+1)|0) {
				val = vectorRef(EXT,idx)|0;
				vectorSet(TMP, idx, val);
			}
			EXT = TMP;
			initFreeList();
		}

		function ref(val) {
			val = val|0;
			VAL = val;
			if ((__EXT_FREE__|0) > (__EXT_SIZ__|0)) {
				growExt();
			}
			IDX = __EXT_FREE__;
			__EXT_FREE__ = vectorRef(EXT,__EXT_FREE__)|0;
			__EXT_FREE__ = numberVal(__EXT_FREE__)|0;
			vectorSet(EXT,IDX,VAL);
			return IDX|0;
		}

		function free(idx) {
			idx = idx|0;
			VAL = vectorRef(EXT,idx)|0;
			IDX = makeNumber(__EXT_FREE__)|0;
			__EXT_FREE__ = idx|0;
			vectorSet(EXT,idx,IDX);
			return unpack(VAL)|0;
		}

		function clearRefs() {
			var i = 0;
			__EXT_FREE__ = (__EXT_SIZ__+1)|0;
			for(i=1;(i|0)<=(__EXT_SIZ__|0);i=(i+1)|0)
				if(!(isPrt(vectorRef(EXT,i)|0)|0))
					free(i)|0;
		}

		function unpack(exp) {
			exp = exp|0;
			if((isPrt(exp)|0)|0)
				return prtExp(exp)|0;
			return exp|0;
		}

		function deref(idx) {
			idx = idx|0;
			var exp = 0;
			exp = vectorRef(EXT,idx)|0;
			return unpack(exp)|0;
		}

		function protect(idx) {
			idx = idx|0;
			VAL = vectorRef(EXT,idx)|0;
			if(!(isPrt(VAL)|0)) {
				claim();
				VAL = makePrt(VAL)|0;
				vectorSet(EXT,idx,VAL);
			}
		}

// **********************************************************************
// *************************** ENVIRONMENT ******************************
// **********************************************************************

		function initEnvironment() {
			fillVector(__GLOBAL_SIZ__, __VOID__) => GLB;
			FRM = GLB;
			ENV = __EMPTY_VEC__;
		}

		function extendEnv() {
			var env = 0;
			var len = 0;
			var idx = 0;
			len = ((vectorLength(ENV)|0)+1)|0;
			claimSiz(len)
			makeVector(len) => env;
			for(idx=1;(idx|0)<(len|0);idx=(idx+1)|0)
				vectorSet(env,idx,vectorRef(ENV,idx)|0);
			vectorSet(env,len,FRM);
			return env|0;
		}

// **********************************************************************
// ********************** EVALUATOR AUXILIARIES *************************
// **********************************************************************

		macro lookupLocal {
			case {_ $R1 => $R2} => {
				letstx $FRM = [makeIdent('FRM', #{$R1})];
				return #{
					$R2 = vectorRef($FRM,localOfs($R1)|0)|0;
				}
			} 
		}

		macro lookupGlobal {
			case {_ $R1 => $R2} => {
				letstx $GLB = [makeIdent('GLB', #{$R1})];
				return #{
					$R2 = vectorRef($GLB,globalOfs($R1)|0)|0;
				}
			} 
		}

		macro lookupNlc {
			case {_ $R1 => $R2} => {
				letstx $ENV = [makeIdent('ENV', #{$R1})];
				return #{
					$R2 = vectorRef(vectorRef($ENV, nlcScp($R1)|0)|0,
							 		nlcOfs($R1)|0)|0;
				}
			} 
		}

		macro capturePrc {
			case {_($exp)} => {
				letstx $lmbArgc = [makeIdent('lmbArgc', #{$exp})];
				letstx $lmbFrmSiz = [makeIdent('lmbFrmSiz', #{$exp})];
				letstx $lmbBdy = [makeIdent('lmbBdy', #{$exp})];
				letstx $extendEnv = [makeIdent('extendEnv', #{$exp})];
				letstx $makePrc = [makeIdent('makePrc', #{$exp})];
				letstx $DCT = [makeIdent('DCT', #{$exp})];
				return #{
					($DCT = $extendEnv()|0,
					$makePrc($lmbArgc($exp)|0,
						   $lmbFrmSiz($exp)|0,
						   $lmbBdy($exp)|0,
						   $DCT)|0)
				}
			}
		}

		macro capturePrz {
			case {_($exp)} => {
				letstx $lmzArgc = [makeIdent('lmzArgc', #{$exp})];
				letstx $lmzFrmSiz = [makeIdent('lmzFrmSiz', #{$exp})];
				letstx $lmzBdy = [makeIdent('lmzBdy', #{$exp})];
				letstx $extendEnv = [makeIdent('extendEnv', #{$exp})];
				letstx $makePrz = [makeIdent('makePrz', #{$exp})];
				letstx $DCT = [makeIdent('DCT', #{$exp})];
				return #{
					($DCT = $extendEnv()|0,
					$makePrz($lmzArgc($exp)|0,
						   $lmzFrmSiz($exp)|0,
						   $lmzBdy($exp)|0,
						   $DCT)|0)
				}
			}
		}

		function preserveEnv() {
			if((KON|0) != E_c_return) {
				STKALLOC(3);
				STK[2] = KON;
				STK[1] = ENV;
				STK[0] = FRM;
				KON = E_c_return;
			}
		}

// **********************************************************************
// ***************************** NATIVES ********************************
// **********************************************************************

		function initNatives() {
			addNative(loadFre()|0, N_free);
			addNative(loadRef()|0, N_ref);
			addNative(loadExi()|0, N_exit);
			addNative(loadSin()|0, N_sin);
			addNative(loadLen()|0, N_length);
			addNative(loadRem()|0, N_remainder);
			addNative(loadQtt()|0, N_quotient);
			addNative(loadErr()|0, N_error);
			addNative(loadLoa()|0, N_load);
			addNative(loadRnd()|0, N_random);
			addNative(loadSle()|0, N_stringLength);
			addNative(loadSse()|0, N_stringSet);
			addNative(loadSre()|0, N_stringRef);
			addNative(loadCcc()|0, N_callcc);
			addNative(loadAvl()|0, N_available);
			addNative(loadCol()|0, N_collect);
			addNative(loadRst()|0, N_reset);
			addNative(loadClk()|0, N_clock);
			addNative(loadIst()|0, N_isString);
			addNative(loadIve()|0, N_isVector);
			addNative(loadIsy()|0, N_isSymbol);
			addNative(loadInu()|0, N_isNull);
			addNative(loadIpa()|0, N_isPair);
			addNative(loadRea()|0, N_read);
			addNative(loadNew()|0, N_newline);
			addNative(loadDis()|0, N_display);
			addNative(loadEva()|0, N_eval);
			addNative(loadApl()|0, N_applyNat);
			addNative(loadCce()|0, N_callcc);	//TODO: optimize implementation of call/ec
			addNative(loadMap()|0, N_map);
			addNative(loadAss()|0, N_assoc);
			addNative(loadVec()|0, N_vector);
			addNative(loadVcl()|0, N_vectorLength);
			addNative(loadVcs()|0, N_vectorSet);
			addNative(loadVcr()|0, N_vectorRef);
			addNative(loadVcm()|0, N_makeVector);
			addNative(loadEql()|0, N_equal);
			addNative(loadEqu()|0, N_eq);
			addNative(loadNeq()|0, N_nbrEq);
			addNative(loadLeq()|0, N_leq);
			addNative(loadSeq()|0, N_seq);
			addNative(loadSma()|0, N_sma);
			addNative(loadLrg()|0, N_lrg);
			addNative(loadLst()|0, N_list);
			addNative(loadScd()|0, N_scd);
			addNative(loadSca()|0, N_sca);
			addNative(loadCdr()|0, N_cdr);
			addNative(loadCar()|0, N_car);
			addNative(loadCns()|0, N_cons);
			addNative(loadDiv()|0, N_div);
			addNative(loadMul()|0, N_multiply);
			addNative(loadPls()|0, N_add);
			addNative(loadMns()|0, N_sub);
		}

		function addNative(nam, ptr) {
			nam = nam|0;
			ptr = ptr|0;
			OFS = dctDefine(nam|0)|0;
			VAL = makeNative(ptr)|0;
			vectorSet(FRM,OFS,VAL);
		}

// **********************************************************************
// ****************************** MAIN **********************************
// **********************************************************************

		function initRegs() {
			EXP = __VOID__;
			VAL = __VOID__;
			PAR = __VOID__;
			ARG = __VOID__;
			LST = __VOID__;
			ENV = __VOID__;
			FRM = __VOID__;
			GLB = __VOID__;
			PAT = __VOID__;
		}

		function init() {
			initMemory();
			initTags();
			initRegs();
			makeVector(0) => __EMPTY_VEC__;
			initExt();
			initEnvironment();
			initNatives();
		}

		function Slip_REPL() {
			initREPL();
			run(REPL);
		}

		function inputReady(exp) {
			exp = exp|0;
			VAL = deref(exp)|0;;
			run(KON);
		}

		define __MARGIN__ 128
		define __UNIT_SIZ__ 4

		function claimCollect() {
			reclaim()
			if((available()|0) < __MARGIN__) {
				err_fatalMemory();
			}
		}

		function claimSizCollect(siz) {
			siz = siz|0;
			reclaim()
			if((available()|0) < (siz|0)) {
				err_fatalMemory();
			}
		}

		macro claim {
			case {_()} => {
				letstx $avail = [makeIdent('available', #{here})];
				letstx $coll = [makeIdent('claimCollect', #{here})];
				return #{
					if(($avail()|0) < __MARGIN__) { $coll(); }
				}
			}
		}

		macro claimSiz {
			case {_($a:expr)} => {
				letstx $avail = [makeIdent('available', #{here})];
				letstx $coll = [makeIdent('claimSizCollect', #{here})];
				return #{
					if(($avail()|0) < (((imul($a,__UNIT_SIZ__)|0)+__MARGIN__)|0)) 
					  { $coll(((imul($a,__UNIT_SIZ__)|0)+__MARGIN__)|0) }
				} 
			}
		}

		function reclaim() {

			STKALLOC(11);
			STK[10] = __EMPTY_VEC__;
			STK[9] = EXT;
			STK[8] = PAT;
			STK[7] = GLB;
			STK[6] = FRM;
			STK[5] = ENV;
			STK[4] = LST;
			STK[3] = ARG;
			STK[2] = PAR;
			STK[1] = VAL;
			STK[0] = EXP;

			collectGarbage();

			EXP = STK[0]|0;
			VAL = STK[1]|0;
			PAR = STK[2]|0;
			ARG = STK[3]|0;
			LST = STK[4]|0;
			ENV = STK[5]|0;
			FRM = STK[6]|0;
			GLB = STK[7]|0;
			PAT = STK[8]|0;
			EXT = STK[9]|0;
			__EMPTY_VEC__ = STK[10]|0;
			STKUNWIND(11);

			__GC_COUNT__ = (__GC_COUNT__+1)|0;
		}

// **********************************************************************
// ************************** INSTRUCTIONS ******************************
// **********************************************************************


		instructions {

// **********************************************************************
// *************************** NATIVES PT1 ******************************
// **********************************************************************

			N_add {

				for(TMP=0,IDX=0;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
					EXP = STK[IDX]|0;
					switch(tag(EXP)|0) {
						case __NBR_TAG__:
							TMP = (TMP + (numberVal(EXP)|0))|0;
							break;
						case __FLT_TAG__:
							FLT = fround(fround(TMP|0)+fround(floatNumber(EXP)));
							goto N_addFloats();
						default:
							err_invalidArgument(EXP|0);
							goto error;
					}
				}

				VAL = makeNumber(TMP)|0;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_sub {

				if(!LEN) {
					err_invalidParamCount();
					goto error;
				}

				VAL = STK[0]|0;

				if((LEN|0) == 1) {
					STKUNWIND(1);
					switch(tag(VAL)|0) {
						case __NBR_TAG__:
							VAL = makeNumber(-(numberVal(VAL)|0)|0)|0;
							goto KON|0;
						case __FLT_TAG__:
							claim()
							makeFloat(fround(-fround(floatNumber(VAL)))) => VAL;
							goto KON|0;
						default:
							err_invalidArgument(VAL|0);
							goto error;
					}
				}

				switch(tag(VAL)|0) {
					case __NBR_TAG__:
						TMP = numberVal(VAL)|0;
						for(IDX=1;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
							EXP = STK[IDX]|0;
							switch(tag(EXP)|0) {
								case __NBR_TAG__:
									TMP = (TMP - (numberVal(EXP)|0))|0;
									break;
								case __FLT_TAG__:
									FLT = fround(fround(TMP|0) - fround(floatNumber(EXP)));
									goto N_substractFloats();
								default:
									err_invalidArgument(EXP|0);
									goto error;
							}
						}
						VAL = makeNumber(TMP)|0;
						STKUNWIND(LEN);
						goto KON|0;

					case __FLT_TAG__:
						FLT = fround(floatNumber(VAL));
						goto N_substractFloats();
				}

				err_invalidArgument(VAL|0);
				goto error;
			}

			N_multiply {

				for(TMP=1,IDX=0;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
					EXP = STK[IDX]|0;
					switch(tag(EXP)|0) {
						case __NBR_TAG__:
							TMP = imul(TMP,numberVal(EXP)|0)|0;
							break;
						case __FLT_TAG__:
							FLT = fround(fround(TMP|0)*fround(floatNumber(EXP)));
							goto N_multiplyFloats();
						default:
							err_invalidArgument(EXP|0);
							goto error;
					}
				}

				VAL = makeNumber(TMP)|0;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_div {

				if(!LEN) {
					err_invalidParamCount();
					goto error;
				}

				claim()
				VAL = STK[0]|0;

				if((LEN|0) == 1) {
					STKUNWIND(1);
					switch(tag(VAL)|0) {
						case __NBR_TAG__:
							makeFloat(fround(fround(1.0)/fround(numberVal(VAL)|0))) => VAL;
							goto KON|0;
						case __FLT_TAG__:
							makeFloat(fround(fround(1.0)/fround(floatNumber(VAL)))) => VAL;
							goto KON|0;
						default:
							err_invalidArgument(VAL|0);
							goto error;
					}
				}

				switch(tag(VAL)|0) {
					case __NBR_TAG__:
						FLT = fround(numberVal(VAL)|0);
						break;
					case __FLT_TAG__:
						FLT = fround(floatNumber(VAL));
						break;
					default:
						err_invalidArgument(VAL|0);
						goto error;
				}

				for(IDX=1;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
					EXP = STK[IDX]|0;
					switch(tag(EXP)|0) {
						case __NBR_TAG__:
							FLT = fround(FLT/fround(numberVal(EXP)|0));
							 break;
						case __FLT_TAG__:
							FLT = fround(FLT/fround(floatNumber(EXP)));
							break;
						default:
							err_invalidArgument(EXP|0);
							goto error;
					}
				}

				makeFloat(FLT) => VAL;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_cons {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				claim()
				VAL = makePair(STK[0]|0,STK[1]|0)|0;
				STKUNWIND(2);
				goto KON|0;
			}

			N_free {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = free(numberVal(STK[0]|0)|0)|0;
				printLog(EXT|0);
				STKUNWIND(1);
				goto KON|0;
			}

			N_ref {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = makeNumber(ref(STK[0]|0)|0)|0;
				printLog(EXT|0);
				STKUNWIND(1);
				goto KON|0;
			}


			N_car {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				STKUNWIND(1);
				if(isPair(ARG)|0) {
					VAL = pairCar(ARG)|0;
					goto KON|0;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_cdr {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				STKUNWIND(1);
				if(isPair(ARG)|0) {
					VAL = pairCdr(ARG)|0;
					goto KON|0;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_sca {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				VAL = STK[1]|0;
				STKUNWIND(2);

				if(isPair(ARG)|0) {
					pairSetCar(ARG, VAL);
					goto KON|0;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_scd {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				VAL = STK[1]|0;
				STKUNWIND(2);

				if(isPair(ARG)|0) {
					pairSetCdr(ARG, VAL);
					goto KON|0;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_list {

				claimSiz(imul(3,LEN)|0)
				VAL = __NULL__;
				for(IDX=(LEN-1)|0;(IDX|0)>=0;IDX=(IDX-1)|0)
					VAL = makePair(STK[IDX]|0, VAL)|0;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_nbrEq {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (((numberVal(ARG)|0) == (numberVal(EXP)|0)) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(numberVal(ARG)|0) == fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (fround(floatNumber(ARG)) == fround(numberVal(EXP)|0) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(floatNumber(ARG)) == fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_seq {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (((numberVal(ARG)|0) <= (numberVal(EXP)|0)) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(numberVal(ARG)|0) <= fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (fround(floatNumber(ARG)) <= fround(numberVal(EXP)|0) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(floatNumber(ARG)) <= fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_leq {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (((numberVal(ARG)|0) >= (numberVal(EXP)|0)) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(numberVal(ARG)|0) >= fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (fround(floatNumber(ARG)) >= fround(numberVal(EXP)|0) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(floatNumber(ARG)) >= fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_sma {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (((numberVal(ARG)|0) < (numberVal(EXP)|0)) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(numberVal(ARG)|0) < fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (fround(floatNumber(ARG)) < fround(numberVal(EXP)|0) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(floatNumber(ARG)) < fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_lrg {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (((numberVal(ARG)|0) > (numberVal(EXP)|0)) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(numberVal(ARG)|0) > fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								VAL = (fround(floatNumber(ARG)) > fround(numberVal(EXP)|0) ?
											__TRUE__ : __FALSE__);
								goto KON|0;
							case __FLT_TAG__:
								VAL = (fround(floatNumber(ARG)) > fround(floatNumber(EXP)) ?
									   		__TRUE__ : __FALSE__);
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}
				err_invalidArgument(ARG|0);
				goto error;
			}

			N_assoc {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				PAT = STK[0]|0;
				LST = STK[1]|0;
				STKUNWIND(2);

				while(isPair(LST)|0) {
					VAL = pairCar(LST)|0;
					if(!(isPair(VAL)|0)) {
						err_invalidArgument(LST|0);
						goto error;
					}
					if((pairCar(VAL)|0) == (PAT|0)) {
						goto KON|0;
					}
					LST = pairCdr(LST)|0;
				}

				VAL = __FALSE__;
				goto KON|0;
			}

			N_map {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				VAL = STK[0]|0;
				LST = STK[1]|0;
				STKUNWIND(2);

				if((LST|0) == __NULL__) {
					VAL = __NULL__;
					goto KON|0;
				}

				if(!(isPair(LST)|0)) {
					err_invalidArgument(LST|0);
					goto error;
				}

				claim()
				ARG = makePair(pairCar(LST)|0, __NULL__)|0;
				LST = pairCdr(LST)|0;

				if(isNull(LST)|0) {
					STKALLOC(2);
					STK[1] = KON;
					STK[0] = __NULL__;
					KON = N_c1_map;
				} else {
					STKALLOC(4);
					STK[3] = KON;
					STK[2] = __NULL__;
					STK[1] = VAL;
					STK[0] = LST;
					KON = N_c2_map;
				}

				goto N_apply;
			}

			N_eval {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				claim()
				EXP = STK[0]|0;
				STKALLOC(2);
				STK[2] = KON;
				STK[1] = ENV;
				STK[0] = FRM;
				EXP = compile(EXP,1)|0;
				FRM = GLB;
				ENV = __EMPTY_VEC__;
				KON = E_c_return;
				goto E_eval;
			}

			N_applyNat {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				VAL = STK[0]|0;
				ARG = STK[1]|0;
				STKUNWIND(2);
				
				goto N_apply();
			}

			N_display {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				printLog(STK[0]|0);
				VAL = __VOID__;
				STKUNWIND(1);
				goto KON|0;
			}

			N_newline {

				printNewline();
				VAL = __VOID__;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_read {

				switch(LEN|0) {
					case 0:
						promptUserInput();
						halt;
					case 1:
						EXP = STK[0]|0;
						STKUNWIND(1);
						loadFile(EXP|0);
						halt;
				}
				err_invalidParamCount();
				goto error;
			}

			N_isPair {

				if ((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = ((tag(STK[0]|0)|0) == __PAI_TAG__? __TRUE__ : __FALSE__ );
				STKUNWIND(1);
				goto KON|0;
			}

			N_isNull {

				if ((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = ((tag(STK[0]|0)|0) == __NUL_TAG__ ? __TRUE__ : __FALSE__ );
				STKUNWIND(1);
				goto KON|0;
			}

			N_isSymbol {

				if ((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = ((tag(STK[0]|0)|0) == __SYM_TAG__ ? __TRUE__ : __FALSE__ );
				STKUNWIND(1);
				goto KON|0;
			}

			N_isVector {

				if ((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = ((tag(STK[0]|0)|0) == __VCT_TAG__ ? __TRUE__ : __FALSE__ );
				STKUNWIND(1);
				goto KON|0;
			}

			N_isString {

				if ((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = ((tag(STK[0]|0)|0) == __STR_TAG__ ? __TRUE__ : __FALSE__ );
				STKUNWIND(1);
				goto KON|0;
			}

			N_makeVector {

				if(!LEN) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				STKUNWIND(1);

				if(!(isNumber(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				LEN = numberVal(ARG)|0;
				if ((LEN|0) < 0) {
					err_invalidLength(LEN|0);
					goto error;
				}

				if (LEN) {
					claimSiz(LEN)
					TMP = (LEN? __ZERO__:(vectorRef(PAR, 2)|0));
					fillVector(LEN, TMP) => VAL;
				} else {
					VAL = __EMPTY_VEC__;
				}

				goto KON|0;
			}

			N_vectorRef {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				if (!(isVector(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				if(!(isNumber(EXP)|0)) {
					err_invalidArgument(EXP|0);
					goto error;
				}

				IDX = numberVal(EXP)|0;
				LEN = vectorLength(ARG)|0;
				if(0 <= (IDX|0) & (IDX|0) < (LEN|0)) {
					VAL = vectorRef(ARG, (IDX+1)|0)|0;
					goto KON|0;
				}

				err_invalidRange(IDX|0, 0, (LEN-1)|0);
				goto error;
			}

			N_vectorSet {

				if ((LEN|0) != 3) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				VAL = STK[2]|0;
				STKUNWIND(3);

				if (!(isVector(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				if(!(isNumber(EXP)|0)) {
					err_invalidArgument(EXP|0);
					goto error;
				}

				IDX = numberVal(EXP)|0;
				LEN = vectorLength(ARG)|0;
				if(0 <= (IDX|0) & (IDX|0) < (LEN|0)) {
					vectorSet(ARG, (IDX+1)|0, VAL);
					goto KON|0;
				}

				err_invalidRange(IDX|0, 0, (LEN-1)|0);
				goto error;
			}

			N_vectorLength {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				STKUNWIND(1);
				if(!(isVector(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				LEN = vectorLength(ARG)|0;
				VAL = makeNumber(LEN)|0;
				goto KON|0;
			}

			N_vector {

				claimSiz(LEN)
				makeVector(LEN) => VAL;
				for(IDX=0;(IDX|0)<(LEN|0);IDX=TMP) {
					EXP = STK[IDX]|0;
					TMP = (IDX+1)|0;
					vectorSet(VAL,TMP,EXP);
				}
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_clock {

				if(LEN) {
					err_invalidParamCount();
					goto error;
				}

				VAL = makeNumber(clock()|0)|0;
				goto KON|0;
			}

			N_reset {

				if(LEN) {
					err_invalidParamCount();
					goto error;
				}

				reset();
				VAL = __VOID__;
				goto KON|0;
			}

			N_eq {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				VAL = ((STK[0]|0)==(STK[1]|0)? __TRUE__:__FALSE__);
				STKUNWIND(2);
				goto KON|0;
			}

			N_equal {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				EXP = STK[0]|0;
				ARG = STK[1]|0;
				STKUNWIND(2);

				goto N_compare();
			}

			N_collect {

				reclaim()
				VAL = makeNumber(available()|0)|0;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_available {

				VAL = makeNumber(available()|0)|0;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_callcc {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				VAL = STK[0]|0;
				STKUNWIND(1);

				switch(tag(VAL)|0) {
					case __PRC_TAG__:
					case __PRZ_TAG__:
					case __NAT_TAG__:
					case __CNT_TAG__:
						ARG = currentStack()|0;
						ARG = makeContinuation(KON, FRM, ENV, ARG)|0;
						ARG = makePair(ARG, __NULL__)|0;
						goto N_apply();
				}

				err_invalidArgument(VAL|0);
				goto error;
			}

			N_stringRef {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				if(!(isString(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				if(!(isNumber(EXP)|0)) {
					err_invalidArgument(EXP|0);
					goto error;
				}

				IDX = numberVal(EXP)|0;
				LEN = textLength(ARG)|0;
				if(0 <= (IDX|0) & (IDX|0) < (LEN|0)) {
					VAL = makeChar(textGetChar(ARG, IDX)|0)|0;
					goto KON|0;
				}

				err_invalidRange(IDX|0, 0, (LEN-1)|0);
				goto error;
			}

			N_stringSet {

				if((LEN|0) != 3) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				VAL = STK[2]|0;
				STKUNWIND(3);

				if (!(isString(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				if(!(isNumber(EXP)|0)) {
					err_invalidArgument(EXP|0);
					goto error;
				}

				if(!(isChar(VAL)|0)) {
					err_invalidArgument(VAL|0);
					goto error;
				}

				IDX = numberVal(EXP)|0;
				LEN = textLength(ARG)|0;
				if(0 <= (IDX|0) & (IDX|0) < (LEN|0)) {
					textSetChar(ARG, IDX, charCode(VAL)|0);
					goto KON|0;
				}

				err_invalidRange(IDX|0, 0, (LEN-1)|0);
				goto error;
			}

			N_stringLength {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				STKUNWIND(1);
				if(!(isString(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				VAL = makeNumber(textLength(ARG)|0)|0;
				goto KON|0;
			}

			N_random {

				if(LEN) {
					err_invalidParamCount();
					goto error;
				}

				claim()
				makeFloat(fround(+random())) => VAL;
				goto KON|0;
			}

			N_load {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				if(!(isString(ARG)|0)) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				claim()
				STKALLOC(2);
				STK[2] = KON;
				STK[1] = ENV;
				STK[0] = FRM;
				KON = N_c1_load;
				loadFile(ARG|0);
				halt;
			}

			N_quotient {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:

						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								TMP = ((numberVal(ARG)|0)/(numberVal(EXP)|0))|0;
								VAL = makeNumber(TMP)|0;
								goto KON|0;
							case __FLT_TAG__:
								FLT = fround(numberVal(ARG)|0);
								FLT = fround(FLT/fround(floatNumber(EXP)));
								VAL = makeNumber(~~FLT)|0;
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:

						FLT = fround(floatNumber(ARG));
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								FLT = fround(FLT/fround(numberVal(EXP)|0));
								VAL = makeNumber(~~FLT)|0;
								goto KON|0;
							case __FLT_TAG__:
								FLT = fround(FLT/fround(floatNumber(EXP)));
								VAL = makeNumber(~~FLT)|0;
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_remainder {

				if((LEN|0) != 2) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				EXP = STK[1]|0;
				STKUNWIND(2);

				switch(tag(ARG)|0) {

					case __NBR_TAG__:

						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								TMP = ((numberVal(ARG)|0)%(numberVal(EXP)|0))|0;
								VAL = makeNumber(TMP)|0;
								goto KON|0;
							case __FLT_TAG__:
								claim()
								REA = +((+(numberVal(ARG)|0))%(+(fround(floatNumber(EXP)))))
							 	makeFloat(fround(REA)) => VAL;
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;

					case __FLT_TAG__:

						claim()
						REA = +fround(floatNumber(ARG));
						switch(tag(EXP)|0) {
							case __NBR_TAG__:
								REA = +(REA%(+(numberVal(EXP)|0)));
								makeFloat(fround(REA)) => VAL;
								goto KON|0;
							case __FLT_TAG__:
								REA = +(REA%(+fround(floatNumber(EXP))));
								makeFloat(fround(REA)) => VAL;
								goto KON|0;
						}
						err_invalidArgument(EXP|0);
						goto error;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_error {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = vectorRef(PAR, 1)|0;
				STKUNWIND(1);
				printError(ARG|0);
				goto error;
			}

			N_length {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				LEN = 0;
				ARG = STK[0]|0;
				STKUNWIND(1);
				while(isPair(ARG)|0) {
					ARG = pairCdr(ARG)|0;
					LEN = (LEN + 1)|0;
				}

				if((ARG|0) != __NULL__) {
					err_invalidArgument(ARG|0);
					goto error;
				}

				VAL = makeNumber(LEN)|0;
				goto KON|0;
			}

			N_sin {

				if((LEN|0) != 1) {
					err_invalidParamCount();
					goto error;
				}

				ARG = STK[0]|0;
				STKUNWIND(1);
				claim()

				switch(tag(ARG)|0) {
					case __NBR_TAG__:
						REA = +sin(+(numberVal(ARG)|0));
						makeFloat(fround(REA)) => VAL;
						goto KON|0;
					case __FLT_TAG__:
						REA = +sin(+(fround(floatNumber(ARG))));
						makeFloat(fround(REA)) => VAL;
						goto KON|0;
				}

				err_invalidArgument(ARG|0);
				goto error;
			}

			N_exit {

				halt;
			}

// **********************************************************************
// *************************** EVALUATOR ********************************
// **********************************************************************

			E_eval {

				switch(tag(EXP)|0) {

					case __NUL_TAG__:
					case __VOI_TAG__:
					case __TRU_TAG__:
					case __FLS_TAG__:
					case __NBR_TAG__:
					case __CHR_TAG__:
					case __PAI_TAG__:
					case __PRC_TAG__:
					case __VCT_TAG__:
					case __STR_TAG__:
					case __FLT_TAG__:
					case __NAT_TAG__:
					case __CNT_TAG__:
						VAL = EXP;
						goto KON|0;
					case __QUO_TAG__:
						VAL = quoExpression(EXP)|0;
						goto KON|0;
					case __LCL_TAG__:
						lookupLocal EXP => VAL
						goto KON|0;
					case __GLB_TAG__:
						lookupGlobal EXP => VAL
						goto KON|0;
					case __NLC_TAG__:
						lookupNlc EXP => VAL
						goto KON|0;
					case __LMB_TAG__:
						VAL = capturePrc(EXP);
						goto KON|0;
					case __LMZ_TAG__:
						VAL = capturePrz(EXP);
						goto KON|0;
					case __SLC_TAG__:
						goto E_setLocal();
					case __SGL_TAG__:
						goto E_setGlobal();
					case __DFV_TAG__:
						goto E_evalDfv();
					case __DFF_TAG__:
						goto E_evalDff();
					case __DFZ_TAG__:
						goto E_evalDfz();
					case __SEQ_TAG__:
					 	goto E_evalSeq();
					case __STL_TAG__:
						goto E_evalStl();
					case __IFS_TAG__:
						goto E_evalIfs();
					case __IFF_TAG__:
						goto E_evalIff();
					case __TTK_TAG__:
						goto E_evalTtk();
					case __THK_TAG__:
						goto E_evalThk();
					case __ALZ_TAG__:
						goto E_evalAlz();
					case __ANZ_TAG__:
						goto E_evalAnz();
					case __AGZ_TAG__:
						goto E_evalAgz();
					case __APZ_TAG__: 
						goto E_evalApz();
					case __APL_TAG__:
						goto E_evalApl();
					case __ALL_TAG__:
						goto E_evalAll();
					case __ANL_TAG__:
						goto E_evalAnl();
					case __AGL_TAG__:
						goto E_evalAgl();
					case __TLZ_TAG__:
						goto E_evalTlz();
					case __TNZ_TAG__:
						goto E_evalTnz();
					case __TGZ_TAG__:
						goto E_evalTgz();
					case __TPZ_TAG__:
						goto E_evalTpz();
					case __TPL_TAG__:
						goto E_evalTpl();
					case __TLL_TAG__:
						goto E_evalTll();
					case __TNL_TAG__:
						goto E_evalTnl();
					case __TGL_TAG__:
						goto E_evalTgl();
				}

				err_invalidExpression(EXP|0);
				goto error;
			}

			E_setLocal {
				
				claim()
				STKALLOC(2);
				STK[1] = KON;
				STK[0] = slcOfs(EXP)|0;
				EXP = slcVal(EXP)|0;
				KON = E_c_setLocal;
				goto E_eval();
			}

			E_c_setLocal {

				OFS = numberVal(STK[0]|0)|0;
				KON = STK[1]|0;
				vectorSet(FRM, OFS, VAL);
				STKUNWIND(2);
				goto KON|0;
			}

			E_setGlobal {

				claim()
				STKALLOC(3);
				STK[2] = KON;
				STK[1] = sglScp(EXP)|0;
				STK[0] = sglOfs(EXP)|0;
				EXP = sglVal(EXP)|0;
				KON = E_c_setGlobal;
				goto E_eval();
			}

			E_c_setGlobal {

				OFS = numberVal(STK[0]|0)|0;
				SCP = numberVal(STK[1]|0)|0;
				KON = STK[2]|0;
				vectorSet(vectorRef(ENV,SCP)|0,OFS,VAL);
				STKUNWIND(3);
				goto KON|0;
			}

			E_evalDfv {

				claim()
				STKALLOC(2);
				STK[1] = KON;
				STK[0] = dfvOfs(EXP)|0;
				EXP = dfvVal(EXP)|0;
				KON = E_c_evalDfv;
				goto E_eval();
			}

			E_c_evalDfv {

				OFS = numberVal(STK[0]|0)|0;
				KON = STK[1]|0;
				vectorSet(FRM, OFS, VAL);
				STKUNWIND(2);
				goto KON|0;
			}

			E_evalDff {

				DCT = extendEnv()|0;
				VAL = makePrc(dffArgc(EXP)|0,
							  dffFrmSiz(EXP)|0,
							  dffBdy(EXP)|0,
							  DCT)|0;
				OFS = numberVal(dffOfs(EXP)|0)|0;
				vectorSet(FRM, OFS, VAL);
				goto KON|0;
			}	

			E_evalDfz {

				DCT = extendEnv()|0;
				VAL = makePrz(dfzArgc(EXP)|0,
							  dfzFrmSiz(EXP)|0,
							  dfzBdy(EXP)|0,
							  DCT)|0;
				OFS = numberVal(dfzOfs(EXP)|0)|0;
				vectorSet(FRM, OFS, VAL);
				goto KON|0;
			}		

			E_evalSeq {

				claim()
				STKALLOC(3);
				STK[2] = KON;
				STK[1] = EXP;
				STK[0] = __TWO__;
				EXP = sequenceRef(EXP, 1)|0;
				KON = E_c_sequence;
				goto E_eval();
			}

			E_c_sequence {

				IDX = numberVal(STK[0]|0)|0;
				EXP = sequenceRef(STK[1]|0, IDX)|0;
				STK[0] = makeNumber((IDX+1)|0)|0;
				goto E_eval();
			}

			E_evalStl {

				EXP = stlExp(EXP)|0;
				KON = STK[2]|0;
				STKUNWIND(3);
				goto E_eval();
			}

			E_evalIfs {

				claim()
				STKALLOC(2);
				STK[1] = KON;
				STK[0] = ifsConsequence(EXP)|0;
				EXP = ifsPredicate(EXP)|0;
				KON = E_c_ifs;
				goto E_eval();
			}

			E_c_ifs {

				KON = STK[1]|0;		

				if((VAL|0) != __FALSE__) {
					EXP = STK[0]|0;
					STKUNWIND(2);			
					goto E_eval();
				}

				VAL = __VOID__;
				STKUNWIND(2);
				goto KON|0;
			}

			E_evalIff {

				claim()
				STKALLOC(2);
				STK[1] = KON;
				STK[0] = EXP;
				EXP = iffPredicate(EXP)|0;
				KON = E_c_iff;
				goto E_eval();
			}

			E_c_iff {

				EXP = ((VAL|0) == __FALSE__? 
						iffAlternative(STK[0]|0)|0: 
						iffConsequence(STK[0]|0)|0);
				KON = STK[1]|0;
				STKUNWIND(2);
				goto E_eval();
			}

			E_evalTtk {

				SIZ = numberVal(ttkSiz(EXP)|0)|0;
				claimSiz(SIZ)
				ENV = extendEnv()|0;
				fillVector(SIZ, __VOID__) => FRM;
				EXP = ttkExp(EXP)|0;
				goto E_eval();
			}

			E_evalThk {

				SIZ = numberVal(thunkSiz(EXP)|0)|0;
				claimSiz(SIZ)
				STKALLOC(3);
				STK[2] = KON;
				STK[1] = ENV;
				STK[0] = FRM;
				ENV = extendEnv()|0;
				fillVector(SIZ, __VOID__) => FRM;
				EXP = thunkExp(EXP)|0;
				KON = E_c_return;
				goto E_eval();
			}

			/* --- APPLICATIONS (ZERO ARGUMENT) --- */

			E_evalAlz {

				VAL = vectorRef(FRM, alzOfs(EXP)|0)|0;
				goto E_evalAZ();
			}

			E_evalAnz {

				VAL = vectorRef(vectorRef(ENV,anzScp(EXP)|0)|0,
								anzOfs(EXP)|0)|0;
				goto E_evalAZ();
			}

			E_evalAgz {

				VAL = vectorRef(GLB, agzOfs(EXP)|0)|0;
				goto E_evalAZ();
			}

			E_evalApz {

				claim()
				STKALLOC(1);
				STK[0] = KON;
				EXP = apzOpr(EXP)|0;
				KON = E_c_evalApz;
				goto E_eval();
			}

			E_c_evalApz {

				KON = STK[0]|0;
				STKUNWIND(1);
				goto E_evalAZ();
			}

			E_evalAZ {

				switch(tag(VAL)|0) {

					case __PRC_TAG__: 
						if(numberVal(prcArgc(VAL)|0)|0) {
							err_invalidParamCount();
							goto error;
						}
						SIZ = numberVal(prcFrmSiz(VAL)|0)|0;
						claimSiz(SIZ)
						STKALLOC(3);
						STK[2] = KON;
						STK[1] = ENV;
						STK[0] = FRM;
						if(SIZ)
							{ fillVector(SIZ, __VOID__) => FRM; }
						else
							{ FRM = __EMPTY_VEC__ }
						ENV = prcEnv(VAL)|0;
						EXP = prcBdy(VAL)|0;
						KON = E_c_return;
						goto E_eval;
						
					case __PRZ_TAG__:
						if(numberVal(przArgc(VAL)|0)|0) {
							err_invalidParamCount();
							goto error;
						}
						SIZ = numberVal(przFrmSiz(VAL)|0)|0;
						claimSiz(SIZ)
						STKALLOC(3);
						STK[2] = KON;
						STK[1] = ENV;
						STK[0] = FRM;
						fillVector(SIZ, __NULL__) => FRM;
						ENV = przEnv(VAL)|0;
						EXP = przBdy(VAL)|0;
						KON = E_c_return;
						goto E_eval;

					case __NAT_TAG__:
						LEN = 0;
						goto nativePtr(VAL)|0;

					case __CNT_TAG__:
						err_invalidParamCount();
						goto error;
				}

				err_invalidOperator(VAL|0);
				goto error;
			}

			/* --- TAIL CALLS (ZERO ARGUMENTS) --- */

			E_evalTlz {

				VAL = vectorRef(FRM,tlzOfs(EXP)|0)|0;
				goto E_evalTZ();
			}

			E_evalTnz {

				VAL = vectorRef(vectorRef(ENV,tnzScp(EXP)|0)|0,
								tnzOfs(EXP)|0)|0;
				goto E_evalTZ();
			}

			E_evalTgz {

				VAL = vectorRef(GLB,tgzOfs(EXP)|0)|0;
				goto E_evalTZ();
			}

			E_evalTpz {

				claim()
				STKALLOC(1);
				STK[0] = KON;
				EXP = tpzOpr(EXP)|0;
				KON = E_c_evalTpz;
				goto E_eval();
			}

			E_c_evalTpz {

				KON = STK[0]|0;
				STKUNWIND(1);
				goto E_evalTZ();
			}

			E_evalTZ {

				switch(tag(VAL)|0) {

					case __PRC_TAG__: 
						if(numberVal(prcArgc(VAL)|0)|0) {
							err_invalidParamCount();
							goto error;
						}
						SIZ = numberVal(prcFrmSiz(VAL)|0)|0;
						if(SIZ) {
							claimSiz(SIZ)
							fillVector(SIZ, __VOID__) => FRM;
						} else {
							FRM = __EMPTY_VEC__;
						}
						ENV = prcEnv(VAL)|0;
						EXP = prcBdy(VAL)|0;
						goto E_eval;
						
					case __PRZ_TAG__:
						if(numberVal(przArgc(VAL)|0)|0) {
							err_invalidParamCount();
							goto error;
						}
						SIZ = numberVal(przFrmSiz(VAL)|0)|0;
						claimSiz(SIZ)
						fillVector(SIZ, __NULL__) => FRM;
						ENV = przEnv(VAL)|0;
						EXP = przBdy(VAL)|0;
						goto E_eval;

					case __NAT_TAG__:
						LEN = 0;
						goto nativePtr(VAL)|0;

					case __CNT_TAG__:
						err_invalidParamCount();
						goto error;
				}

				err_invalidOperator(VAL|0);
				goto error;
			}

			/* --- APPLICATIONS (WITH ARGUMENTS) --- */

			E_evalAll {

				VAL = vectorRef(FRM,numberVal(allOfs(EXP)|0)|0)|0;
				ARG = allOpd(EXP)|0;
				goto E_evalAL();
			}

			E_evalAnl {

				VAL = vectorRef(vectorRef(ENV, numberVal(anlScp(EXP)|0)|0)|0,
								numberVal(anlOfs(EXP)|0)|0)|0;
				ARG = anlOpd(EXP)|0;
				goto E_evalAL();
			}

			E_evalAgl {

				VAL = vectorRef(GLB,numberVal(aglOfs(EXP)|0)|0)|0;
				ARG = aglOpd(EXP)|0;
				goto E_evalAL();
			}

			E_evalApl {

				claim()
				STKALLOC(2);
				STK[1] = KON;
				STK[0] = aplOpd(EXP)|0;
				EXP = aplOpr(EXP)|0;
				KON = E_c_evalApl;
				goto E_eval();
			}

			E_c_evalApl {

				ARG = STK[0]|0;
				KON = STK[1]|0;
				STKUNWIND(2);
				goto E_evalAL();
			}

			E_evalAL {

				switch(tag(VAL)|0) {

					case __PRC_TAG__:
						LEN = numberVal(prcArgc(VAL)|0)|0;
						SIZ = numberVal(prcFrmSiz(VAL)|0)|0;
						if((LEN|0) != (vectorLength(ARG)|0)) {
							err_invalidParamCount();
							goto error;
						}
						claimSiz(SIZ)
						makeVector(SIZ) => PAR;
						STKALLOC(3);
						STK[2] = KON;
						STK[1] = ENV;
						STK[0] = FRM;
						KON = E_c_return;
						goto E_prcEvalArgs();

					case __PRZ_TAG__:
						LEN = numberVal(przArgc(VAL)|0)|0;
						SIZ = numberVal(przFrmSiz(VAL)|0)|0;
						if((LEN|0) > (vectorLength(ARG)|0)) {
							err_invalidParamCount();
							goto error;
						}
						claimSiz(SIZ)
						fillVector(SIZ, __NULL__) => PAR;
						STKALLOC(3);
						STK[2] = KON;
						STK[1] = ENV;
						STK[0] = FRM;
						KON = E_c_return;
						if (LEN) { 
							goto E_przArgs(); 
						}
						IDX = 0; LEN = 1;
						goto E_przVarArgs();	

					case __NAT_TAG__:
						LEN = vectorLength(ARG)|0;
						claimSiz(LEN)
						STKALLOC(LEN);
						goto E_nativeArgs();

					case __CNT_TAG__:
						LEN = vectorLength(ARG)|0;
						if((LEN|0)!=1) {
							err_invalidParamCount();
							goto error;
						}
						goto E_continuationArg();
				}

				err_invalidOperator(VAL|0);
				goto error;					
			}

			/* --- TAIL CALLS (WITH ARGUMENTS) --- */

			E_evalTll {

				VAL = vectorRef(FRM,numberVal(tllOfs(EXP)|0)|0)|0;
				ARG = tllOpd(EXP)|0;
				goto E_evalTL();
			}

			E_evalTnl {

				VAL = vectorRef(vectorRef(ENV,numberVal(tnlScp(EXP)|0)|0)|0,
								numberVal(tnlOfs(EXP)|0)|0)|0;
				ARG = tnlOpd(EXP)|0;
				goto E_evalTL();
			}

			E_evalTgl {

				VAL = vectorRef(GLB,numberVal(tglOfs(EXP)|0)|0)|0;
				ARG = tglOpd(EXP)|0;
				goto E_evalTL();
			}

			E_evalTpl {

				claim()
				STKALLOC(2);
				STK[1] = KON;
				STK[0] = tplOpd(EXP)|0;
				EXP = tplOpr(EXP)|0;
				KON = E_c_evalTpl;
				goto E_eval();
			}

			E_c_evalTpl {

				ARG = STK[0]|0;
				KON = STK[1]|0;
				STKUNWIND(2);
				goto E_evalTL();
			}

			E_evalTL {

				switch(tag(VAL)|0) {

					case __PRC_TAG__:
						LEN = numberVal(prcArgc(VAL)|0)|0;
						SIZ = numberVal(prcFrmSiz(VAL)|0)|0;
						if((LEN|0) != (vectorLength(ARG)|0)) {
							err_invalidParamCount();
							goto error;
						}
						claimSiz(SIZ)
						makeVector(SIZ) => PAR;
						goto E_prcEvalArgs();

					case __PRZ_TAG__:
						LEN = numberVal(przArgc(VAL)|0)|0;
						SIZ = numberVal(przFrmSiz(VAL)|0)|0;
						if((LEN|0) > (vectorLength(ARG)|0)) {
							err_invalidParamCount();
							goto error;
						}
						claimSiz(SIZ)
						fillVector(SIZ, __NULL__) => PAR;
						if (LEN) { 
							goto E_przArgs(); 
						}
						IDX = 0; LEN = 1;
						goto E_przVarArgs();	

					case __NAT_TAG__:
						LEN = vectorLength(ARG)|0;
						claimSiz(LEN)
						STKALLOC(LEN);
						goto E_nativeArgs();

					case __CNT_TAG__:
						LEN = vectorLength(ARG)|0;
						if((LEN|0)!=1) {
							err_invalidParamCount();
							goto error;
						}
						goto E_continuationArg();
				}

				err_invalidOperator(VAL|0);
				goto error;					
			}

			/* ---- ARGUMENTS (CONTINUATION) ---- */

			E_continuationArg {

				EXP = vectorRef(ARG,1)|0;

				switch(tag(EXP)|0) {
					case __NUL_TAG__: case __VOI_TAG__:
					case __TRU_TAG__: case __FLS_TAG__:
					case __NBR_TAG__: case __CHR_TAG__:
					case __PAI_TAG__: case __PRC_TAG__:
					case __VCT_TAG__: case __STR_TAG__:
					case __FLT_TAG__: case __NAT_TAG__:
					case __CNT_TAG__: case __PRZ_TAG__:
						break;
					case __QUO_TAG__:
						EXP = quoExpression(EXP)|0;
						break;
					case __LCL_TAG__:
						lookupLocal EXP => EXP
						break;
					case __GLB_TAG__:
						lookupGlobal EXP => EXP
						break;
					case __NLC_TAG__:
						lookupNlc EXP => EXP
						break;
					case __LMB_TAG__:
						EXP = capturePrc(EXP);
						break;
					case __LMZ_TAG__:
						EXP = capturePrz(EXP);
						break;				
					default:
						claim()
						STKALLOC(1);
						STK[0] = VAL;
						KON = E_c_continuationArg;
						goto E_eval();	 
				}

				KON = continuationKon(VAL)|0;
				PAR = continuationStk(VAL)|0;
				FRM = continuationFrm(VAL)|0;
				ENV = continuationEnv(VAL)|0;
				restoreStack();
				VAL = EXP;
				goto KON|0;
			}

			E_c_continuationArg {

				EXP = STK[0]|0; //no need to unwind
				KON = continuationKon(EXP)|0;
				PAR = continuationStk(EXP)|0;
				FRM = continuationFrm(EXP)|0;
				ENV = continuationEnv(EXP)|0;
				restoreStack();
				goto KON|0;
			}

			/* ---- ARGUMENTS (NATIVE) ---- */

			E_nativeArgs {

				for(IDX=0;(IDX|0)<(LEN|0);IDX=TMP) {

					TMP = (IDX + 1)|0;
					EXP = vectorRef(ARG,TMP)|0;

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						default:
							if((TMP|0) == (LEN|0)) { //last argument
								STK[IDX] = __VOID__; //for GC
								STKALLOC(3);
								STK[2] = KON;
								STK[1] = VAL;
								STK[0] = makeNumber(TMP)|0;
								KON = E_applyNative;
							} else {
								for(;(IDX|0)<(LEN|0);IDX=(IDX+1)|0)
									STK[IDX] = __VOID__;
								STKALLOC(4);								
								STK[3] = KON;
								STK[2] = VAL;
								STK[1] = makeNumber(TMP)|0;
								STK[0] = ARG;
								KON = E_c_nativeArgs;
							}
							goto E_eval();
					}
					STK[IDX] = EXP;
				}

				goto nativePtr(VAL)|0;
			}

			E_c_nativeArgs {

				ARG = STK[0]|0;
				IDX = numberVal(STK[1]|0)|0;
				LEN = vectorLength(ARG)|0;
				STK[IDX+3] = VAL;

				for(;(IDX|0)<(LEN|0);IDX=TMP) {

					TMP = (IDX + 1)|0;
					EXP = vectorRef(ARG, TMP)|0;

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						case __LMB_TAG__:
							EXP = capturePrc(EXP);
							break;
						case __LMZ_TAG__:
							EXP = capturePrz(EXP);
							break;				
						default:
							if((TMP|0) == (LEN|0)) { //last argument
								STKUNWIND(1);
								STK[0] = makeNumber(TMP)|0;
								KON = E_applyNative;
							} else {
								STK[1] = makeNumber(TMP)|0;
							}
							goto E_eval();
					}
					STK[IDX+4] = EXP;
				}
				
				VAL = STK[2]|0;
				KON = STK[3]|0;
				STKUNWIND(4);
				goto nativePtr(VAL)|0;
			}

			E_applyNative {

				LEN = numberVal(STK[0]|0)|0;
				STK[LEN+2] = VAL;
				VAL = STK[1]|0;
				KON = STK[2]|0;
				STKUNWIND(3);
				goto nativePtr(VAL)|0;
			}

			/* ---- ARGUMENTS (PRC) ---- */

			E_prcEvalArgs {

				for(IDX=0;(IDX|0)<(LEN|0);) {

					IDX = (IDX + 1)|0;
					EXP = vectorRef(ARG, IDX)|0;

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;	
						default:
							TMP = makeNumber(IDX)|0;
							for(;(IDX|0)<=(SIZ|0);IDX=(IDX+1)|0)
								{ vectorSet(PAR,IDX,__VOID__); }
							if((IDX|0) == (LEN|0)) { //last argument
								STKALLOC(4);
								STK[3] = KON;
								STK[2] = VAL;
								STK[1] = PAR;
								STK[0] = TMP;
								KON = E_prcApply;
							} else {
								STKALLOC(5);
								STK[4] = KON;
								STK[3] = VAL;
								STK[2] = PAR;
								STK[1] = TMP;
								STK[0] = ARG;
								KON = E_c_prcArgs;
							}
							goto E_eval();
					}
					vectorSet(PAR, IDX, EXP);
				}
				
				while((IDX|0)<(SIZ|0)) { 
					IDX=(IDX+1)|0;
					vectorSet(PAR,IDX,__VOID__); 
				}
				FRM = PAR;
				ENV = prcEnv(VAL)|0;
				EXP = prcBdy(VAL)|0;
				goto E_eval;
			}

			E_c_prcArgs {

				ARG = STK[0]|0;
				IDX = numberVal(STK[1]|0)|0;
				PAR = STK[2]|0;
				LEN = vectorLength(ARG)|0;
				vectorSet(PAR, IDX, VAL);

				while((IDX|0)<(LEN|0)) {

					IDX = (IDX + 1)|0;
					EXP = vectorRef(ARG, IDX)|0;

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:	
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						case __LMB_TAG__:
							EXP = capturePrc(EXP);
							break;
						case __LMZ_TAG__:
							EXP = capturePrz(EXP);
							break;				
						default:
							STK[1] = makeNumber(IDX)|0;
							if((IDX|0) == (LEN|0)) { //last argument
								KON = E_prcApply;
								STKUNWIND(1);
							}
							goto E_eval();
					}
					vectorSet(PAR, IDX, EXP);
				}
				
				FRM = PAR;
				VAL = STK[3]|0;
				ENV = prcEnv(VAL)|0;
				EXP = prcBdy(VAL)|0;
				KON = STK[4]|0;
				STKUNWIND(5);
				goto E_eval();
			}

			E_prcApply {

				IDX = numberVal(STK[0]|0)|0;
				PAR = STK[1]|0;
				EXP = STK[2]|0; 
				vectorSet(PAR, IDX, VAL);
				FRM = PAR;
				ENV = prcEnv(EXP)|0;
				EXP = prcBdy(EXP)|0;
				KON = STK[3]|0;
				STKUNWIND(4);
				goto E_eval();
			}

			/* ---- ARGUMENTS (PRZ) ---- */

			E_przArgs {

				for(IDX=0;(IDX|0)<(LEN|0);) {

					IDX = (IDX + 1)|0;
					EXP = vectorRef(ARG, IDX)|0;

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:	
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						case __LMB_TAG__:
							EXP = capturePrc(EXP);
							break;
						case __LMZ_TAG__:
							EXP = capturePrz(EXP);
							break;				
						default:
							claim()
							if((IDX|0) == (LEN|0)) { 					//last mandatory argument
								if((IDX|0) == (vectorLength(ARG)|0)) {	//last argument
									STKALLOC(4);
									STK[3] = KON;
									STK[2] = VAL;
									STK[1] = PAR;
									STK[0] = makeNumber(IDX)|0;
									KON = E_przApply;
								} else {									
									STKALLOC(5);
									STK[4] = KON;
									STK[3] = VAL;
									STK[2] = PAR;
									STK[1] = makeNumber(IDX)|0;
									STK[0] = ARG;
									KON = E_c2_przArgs;
								}
							} else {									
								STKALLOC(6);
								STK[5] = KON;
								STK[4] = VAL;
								STK[3] = PAR;
								STK[2] = makeNumber(IDX)|0;
								STK[1] = ARG;
								STK[0] = makeNumber(LEN)|0;
								KON = E_c1_przArgs;
							}
							goto E_eval();
					}
					vectorSet(PAR, IDX, EXP);
				}

				if((IDX|0) == (vectorLength(ARG)|0)) { //no more arguments
					FRM = PAR;
					ENV = przEnv(VAL)|0;
					EXP = przBdy(VAL)|0;
					goto E_eval;
				}

				LEN = (IDX + 1)|0;
				goto E_przVarArgs();
			}

			E_c1_przArgs {

				LEN = numberVal(STK[0]|0)|0;
				ARG = STK[1]|0;
				IDX = numberVal(STK[2]|0)|0;
				PAR = STK[3]|0;
				vectorSet(PAR, IDX, VAL);

				while((IDX|0)<(LEN|0)) {

					IDX = (IDX + 1)|0;
					EXP = vectorRef(ARG, IDX)|0;

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						case __LMB_TAG__:
							EXP = capturePrc(EXP);
							break;
						case __LMZ_TAG__:
							EXP = capturePrz(EXP);
							break;				
						default:
							STK[2] = makeNumber(IDX)|0;
							if((IDX|0) == (LEN|0)) { 					//last mandatory argument
								if((IDX|0) == (vectorLength(ARG)|0)) {	//last argument
									KON = E_przApply;
									STKUNWIND(2);
								} else {
									KON = E_c2_przArgs;
									STKUNWIND(1);
								}
							}
							goto E_eval();
					}
					vectorSet(PAR, IDX, EXP);
				}

				if((IDX|0) == (vectorLength(ARG)|0)) { //no more arguments
					VAL = STK[4]|0;
					FRM = PAR;
					ENV = przEnv(VAL)|0;
					EXP = przBdy(VAL)|0;
					KON = STK[5]|0;
					STKUNWIND(6);
					goto E_eval();
				}

				STKUNWIND(4);
				LEN = (IDX + 1)|0;
				goto E_przVarArgs2();
			}

			E_c2_przArgs {

				ARG = STK[0]|0;
				IDX = numberVal(STK[1]|0)|0;
				PAR = STK[2]|0;
				STKUNWIND(3);
				vectorSet(PAR, IDX, VAL);
				LEN = (IDX + 1)|0;
				goto E_przVarArgs2();
			}

			E_przVarArgs {

				SIZ = vectorLength(ARG)|0;

				while((IDX|0) < (SIZ|0)) {

					IDX = (IDX + 1)|0;
					EXP = vectorRef(ARG, IDX)|0;
					claim()

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						case __LMB_TAG__:
							EXP = capturePrc(EXP);
							break;
						case __LMZ_TAG__:
							EXP = capturePrz(EXP);
							break;				
						default:
							if((IDX|0) == (SIZ|0)) {
								STKALLOC(4);
								STK[3] = KON;
								STK[2] = VAL;
								STK[1] = PAR;
								STK[0] = makeNumber(LEN)|0; 			
								KON = E_przApplyVarArgs;	
							} else {
								STKALLOC(6);
								STK[5] = KON;
								STK[4] = VAL;
								STK[3] = PAR;
								STK[2] = makeNumber(LEN)|0; 	
								STK[1] = makeNumber(IDX)|0;
								STK[0] = ARG; 
								KON = E_c_przVarArgs;
							}
							goto E_eval();
					}
					TMP = vectorRef(PAR, LEN)|0;
					vectorSet(PAR, LEN, makePair(EXP, TMP)|0);
				}

				TMP = vectorRef(PAR, LEN)|0;
				vectorSet(PAR, LEN, reverse(TMP)|0);
				FRM = PAR;
				ENV = przEnv(VAL)|0;
				EXP = przBdy(VAL)|0;
				goto E_eval;
			}

			E_przVarArgs2 {

				SIZ = vectorLength(ARG)|0;

				while((IDX|0) < (SIZ|0)) {

					IDX = (IDX + 1)|0;
					EXP = vectorRef(ARG, IDX)|0;
					claim()

					switch(tag(EXP)|0) {
						case __NUL_TAG__: case __VOI_TAG__:
						case __TRU_TAG__: case __FLS_TAG__:
						case __NBR_TAG__: case __CHR_TAG__:
						case __PAI_TAG__: case __PRC_TAG__:
						case __VCT_TAG__: case __STR_TAG__:
						case __FLT_TAG__: case __NAT_TAG__:
						case __CNT_TAG__: case __PRZ_TAG__:
							break;
						case __QUO_TAG__:
							EXP = quoExpression(EXP)|0;
							break;
						case __LCL_TAG__:
							lookupLocal EXP => EXP
							break;
						case __GLB_TAG__:
							lookupGlobal EXP => EXP
							break;
						case __NLC_TAG__:
							lookupNlc EXP => EXP
							break;
						case __LMB_TAG__:
							EXP = capturePrc(EXP);
							break;
						case __LMZ_TAG__:
							EXP = capturePrz(EXP);
							break;				
						default:
							if((IDX|0) == (SIZ|0)) { 
								STKALLOC(2);
								STK[1] = PAR;
								STK[0] = makeNumber(LEN)|0;	
								KON = E_przApplyVarArgs;	
							} else {
								STKALLOC(4);
								STK[3] = PAR;
								STK[2] = makeNumber(LEN)|0;
								STK[1] = makeNumber(IDX)|0;
								STK[0] = ARG; 
								KON = E_c_przVarArgs;
							}
							goto E_eval();
					}
					TMP = vectorRef(PAR, LEN)|0;
					vectorSet(PAR, LEN, makePair(EXP, TMP)|0);
				}

				TMP = vectorRef(PAR, LEN)|0;
				vectorSet(PAR, LEN, reverse(TMP)|0);

				VAL = STK[0]|0;
				FRM = PAR;
				ENV = przEnv(VAL)|0;
				EXP = przBdy(VAL)|0;
				KON = STK[1]|0;
				STKUNWIND(2);
				goto E_eval();
			}

			E_c_przVarArgs {

				claim()
				ARG = STK[0]|0;
				IDX = numberVal(STK[1]|0)|0;
				LEN = numberVal(STK[2]|0)|0;
				PAR = STK[3]|0;
				VAL = makePair(VAL,vectorRef(PAR,LEN)|0)|0;
				vectorSet(PAR, LEN, VAL);
				STKUNWIND(4);
				goto E_przVarArgs2();
			}

			E_przApplyVarArgs {

				claim()
				IDX = numberVal(STK[0]|0)|0;
				PAR = STK[1]|0;
				EXP = STK[2]|0;
				VAL = makePair(VAL, vectorRef(PAR, IDX)|0)|0;
				vectorSet(PAR, IDX, reverse(VAL)|0);
				FRM = PAR;
				ENV = przEnv(EXP)|0;
				EXP = przBdy(EXP)|0;
				KON = STK[3]|0;
				STKUNWIND(4);
				goto E_eval();
			}

			E_przApply {

				IDX = numberVal(STK[0]|0)|0;
				PAR = STK[1]|0;
				EXP = STK[2]|0;
				vectorSet(PAR, IDX, VAL);
				FRM = PAR;
				ENV = przEnv(EXP)|0;
				EXP = przBdy(EXP)|0;
				KON = STK[3]|0;
				STKUNWIND(4);
				goto E_eval();
			}

			/* ---- RETURN ---- */

			E_c_return {

				FRM = STK[0]|0;
				ENV = STK[1]|0;
				KON = STK[2]|0;
				STKUNWIND(3);
				goto KON|0;
			}

// **********************************************************************
// *************************** NATIVES PT2 ******************************
// **********************************************************************

			N_addFloats {

				for(IDX=(IDX+1)|0;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
					EXP = STK[IDX]|0;
					switch(tag(EXP)|0) {
						case __NBR_TAG__:
							FLT = fround(FLT + fround(numberVal(EXP)|0));
							break;
						case __FLT_TAG__:
							FLT = fround(FLT + fround(floatNumber(EXP)));
							break;
						default:
							err_invalidArgument(EXP|0);
							goto error;
					}
				}
				claim()
				makeFloat(FLT) => VAL;
				STKUNWIND(LEN);
				goto KON|0;
			}

	 		N_substractFloats {

				for(IDX=(IDX+1)|0;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
					EXP = STK[IDX]|0;
	 				switch(tag(EXP)|0) {
	 					case __NBR_TAG__:
	 						FLT = fround(FLT - fround(numberVal(EXP)|0));
	 						break;
	 					case __FLT_TAG__:
	 						FLT = fround(FLT - fround(floatNumber(EXP)));
	 						break;
	 					default:
	 						err_invalidArgument(EXP|0);
	 						goto error;
	 				}
	 			}
	 			claim()
	 			makeFloat(FLT) => VAL;
				STKUNWIND(LEN);
	 			goto KON|0;
	 		}

	 		N_multiplyFloats {

				for(IDX=(IDX+1)|0;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
					EXP = STK[IDX]|0;
					switch(tag(EXP)|0) {
						case __NBR_TAG__:
							FLT = fround(FLT * fround(numberVal(EXP)|0));
							break;
						case __FLT_TAG__:
							FLT = fround(FLT * fround(floatNumber(EXP)));
							break;
						default:
							err_invalidArgument(EXP|0);
							goto error;
					}
				}
				claim()
				makeFloat(FLT) => VAL;
				STKUNWIND(LEN);
				goto KON|0;
			}

			N_c1_map {

				claim()
				VAL = reverse(makePair(VAL,STK[0]|0)|0)|0;
				KON = STK[1]|0;
				STKUNWIND(2);
				goto KON|0;
			}

			N_c2_map {

				claim()
				STK[2] = makePair(VAL,STK[2]|0)|0;
				LST = STK[0]|0;

				if(!(isPair(LST)|0)) {
					err_invalidArgument(LST|0);
					goto error;
				}
				
				VAL = STK[1]|0;
				ARG = makePair(pairCar(LST)|0, __NULL__)|0;
				LST = pairCdr(LST)|0;

				if(isNull(LST)|0) {
					KON = N_c1_map;
					STKUNWIND(2);
				} else {
					STK[0] = LST;
				}

				goto N_apply;
			}

			N_apply {

				switch(tag(VAL)|0) {

					case __PRC_TAG__:
						LEN = numberVal(prcArgc(VAL)|0)|0; 
						SIZ = numberVal(prcFrmSiz(VAL)|0)|0;
						claimSiz(SIZ)
						preserveEnv();
						fillVector(SIZ, __VOID__) => FRM;
						for(IDX=1;(IDX|0)<=(LEN|0);IDX=(IDX+1)|0) {
							if(!(isPair(ARG)|0)) {
								err_invalidParamCount();
								goto error;
							}
							TMP = pairCar(ARG)|0;
							ARG = pairCdr(ARG)|0;
							vectorSet(FRM, IDX, TMP);
						}
						if(!(isNull(ARG)|0)) {
							err_invalidParamCount();
							goto error;
						}
						ENV = prcEnv(VAL)|0;
						EXP = prcBdy(VAL)|0;
						goto E_eval;

					case __PRZ_TAG__:
						LEN = numberVal(przArgc(VAL)|0)|0; 
						SIZ = numberVal(przFrmSiz(VAL)|0)|0;
						claimSiz(SIZ)
						preserveEnv();
						fillVector(SIZ, __VOID__) => FRM;
						for(IDX=1;(IDX|0)<=(LEN|0);IDX=(IDX+1)|0) {
							if(!(isPair(ARG)|0)) {
								err_invalidParamCount();
								goto error;
							}
							TMP = pairCar(ARG)|0;
							ARG = pairCdr(ARG)|0;
							vectorSet(FRM, IDX, TMP);
						}						
						vectorSet(FRM, IDX, ARG);
						ENV = przEnv(VAL)|0;
						EXP = przBdy(VAL)|0;
						goto E_eval;

					case __NAT_TAG__: 
						for(LEN=0,LST=ARG;isPair(LST)|0;LEN=(LEN+1)|0)
							LST = pairCdr(LST)|0;
						if(!(isNull(LST)|0)) {
							err_invalidArgument(ARG|0);
							goto error;
						}
						claimSiz(LEN)
						STKALLOC(LEN);
						for(IDX=0;(IDX|0)<(LEN|0);IDX=(IDX+1)|0) {
							TMP = pairCar(ARG)|0;
							ARG = pairCdr(ARG)|0;
							STK[IDX] = TMP;
						}
						goto nativePtr(VAL)|0;
				
					case __CNT_TAG__: 
						if(!(isPair(ARG)|0)) {
							err_invalidParamCount();
							goto error;
						}
						if(!(isNull(pairCdr(ARG)|0)|0)) {
							err_invalidParamCount();
							goto error;
						}
						KON = continuationKon(VAL)|0;
						FRM = continuationFrm(VAL)|0;
						PAR = continuationStk(VAL)|0;
						ENV = continuationEnv(VAL)|0; 
						VAL = pairCar(ARG)|0;
						restoreStack();
						goto KON|0;
				}

				err_invalidOperator(VAL|0);
				goto error;
			}

			N_c1_load {

				EXP = compile(VAL,1)|0;
				FRM = GLB;
				ENV = __EMPTY_VEC__;
				KON = E_c_return;
				goto E_eval;
			}

			N_compare {

				TMP = tag(EXP)|0;
				if((TMP|0) != (tag(ARG)|0)) {
					VAL = __FALSE__;
					goto KON|0;
				}

				switch(TMP|0) {
					case __FLT_TAG__: goto N_compareFloat();
					case __STR_TAG__: goto N_compareString();
					case __PAI_TAG__: goto N_comparePair();
					case __VCT_TAG__: goto N_compareVector();
				}

				VAL = ((ARG|0) == (EXP|0) ? __TRUE__ : __FALSE__);
				goto KON|0;
			}

			N_compareFloat {

				VAL = (fround(floatNumber(EXP)) == fround(floatNumber(ARG)) ?
						__TRUE__ : __FALSE__);
				goto KON|0;
			}

			N_compareString {

				LEN = textLength(ARG)|0;
				if((textLength(EXP)|0) != (LEN|0)) {
					VAL = __FALSE__;
					goto KON|0;
				}

				while(LEN) {
					LEN = (LEN - 1)|0;
					if((textGetChar(ARG, LEN)|0) != (textGetChar(EXP, LEN)|0)) {
						VAL = __FALSE__;
						goto KON|0;
					}
				}

				VAL = __TRUE__;
				goto KON|0;
			}

			N_comparePair {

				claim()
				STKALLOC(3);
				STK[2] = pairCdr(EXP)|0;
				STK[1] = pairCdr(ARG)|0;
				EXP = pairCar(EXP)|0;
				ARG = pairCar(ARG)|0;
				STK[0] = KON;
				KON = N_c_comparePair;
				goto N_compare;
			}

			N_c_comparePair {

				KON = STK[0]|0;

				if((VAL|0) == __FALSE__) {
					STKUNWIND(3);
					goto KON|0;
				}

				ARG = STK[1]|0;
				EXP = STK[2]|0;
				STKUNWIND(3);
				goto N_compare;
			}

			N_compareVector {

				LEN = vectorLength(ARG)|0;
				if((vectorLength(EXP)|0) != (LEN|0)) {
					VAL = __FALSE__;
					goto KON|0;
				}
				if(!LEN) {
					VAL = __TRUE__;
					goto KON|0;
				}

				if((LEN|0) > 1) {
					claim()
					STKALLOC(4);
					STK[3] = KON;
					STK[2] = EXP;
					STK[1] = ARG;
					STK[0] = __ONE__;
					KON = N_c_compareVector;
				}

				ARG = vectorRef(ARG,1)|0;
				EXP = vectorRef(EXP,1)|0;
				goto N_compare;
			}

			N_c_compareVector {

				if((VAL|0) == __FALSE__) {
					KON = STK[3]|0;
					STKUNWIND(4);
					goto KON|0;
				}

				IDX = numberVal(((STK[0]|0)+1)|0)|0;
				ARG = STK[1]|0;
				EXP = STK[2]|0;

				if((IDX|0) == (vectorLength(ARG)|0)) {
					KON = STK[3]|0;
					STKUNWIND(4);
				} else {
					STK[0] = makeNumber(IDX)|0;
					KON = N_c_compareVector;
				}

				ARG = vectorRef(ARG, IDX)|0;
				EXP = vectorRef(EXP, IDX)|0;
				goto N_compare;
			}

// **********************************************************************
// ****************************** REPL **********************************
// **********************************************************************

			REPL {

				clearRefs();
				KON = c1_repl;
				promptInput();
				halt;
			}

			c1_repl {

				EXP = compile(VAL,0)|0;
				KON = c2_repl;
				goto E_eval;
			}

			c2_repl {

				printOutput(VAL|0);
				goto REPL;
			}

			error {

				FRM = GLB;
				ENV = __EMPTY_VEC__;
				emptyStk();
				goto REPL;
			}

		} generate run

	/* -- EXPORTS -- */

		return {

			/**************/
			/**** MAIN ****/
			/**************/

			init: init,
			Slip_REPL: Slip_REPL,
			inputReady: inputReady,

			/************************/
			/*** ABSTRACT GRAMMAR ***/
			/************************/

			//generic
			ftag: ftag,
			fmake: fmake,
			fset: fset,
			fsetRaw: fsetRaw,
			//text 
			fmakeText: fmakeText,
			ftextGetChar: ftextGetChar,
			ftextSetChar: ftextSetChar,
			ftextLength: ftextLength,
			fisString: fisString,
			fisSymbol: fisSymbol,
			//specials
			fisTrue: fisTrue,
			fisFalse: fisFalse,
			fisNull: fisNull,
			fisVoid: fisVoid,
			//numbers
			fmakeNumber: fmakeNumber,
			fnumberVal: fnumberVal,
			fisNumber: fisNumber,
			//characters
			fmakeChar: fmakeChar,
			fcharCode: fcharCode,
			fisChar: fisChar,
			//pairs
			fpairCar: fpairCar,
			fpairCdr: fpairCdr,
			fpairSetCar: fpairSetCar,
			fpairSetCdr: fpairSetCdr,
			fisPair: fisPair,
			//procedures
			fprcArgc: fprcArgc,
			fprcFrmSiz: fprcFrmSiz,
			fprcBdy: fprcBdy,
			fprcEnv: fprcEnv,
			fprzArgc: fprzArgc,
			fprzFrmSiz: fprzFrmSiz,
			fprzBdy: fprzBdy,
			fprzEnv: fprzEnv,
			fisPrc: fisPrc,
			fisPrz: fisPrz,
			//vectors
			vectorAt: vectorAt,
			fvectorLength: fvectorLength,
			ffillVector: ffillVector,
			fisVector: fisVector,
			//floats
			fmakeFloat: fmakeFloat,
			ffloatNumber: ffloatNumber,
			fisFloat: fisFloat,
			//natives
			fnativePtr: fnativePtr,
			fisNative: fisNative,
			//sequences
			sequenceAt: sequenceAt,
			sequenceSet: sequenceSet,
			sequenceLength: sequenceLength,
			fisSequence: fisSequence,
			//single if-statements
			fifsPredicate: fifsPredicate,
			fifsConsequence: fifsConsequence,
			fisIfs: fisIfs,
			//full if-statements
			fiffPredicate: fiffPredicate,
			fiffConsequence: fiffConsequence,
			fiffAlternative: fiffAlternative,
			fisIff: fisIff,
			//quotes
			fquoExpression: fquoExpression,
			fisQuo: fisQuo,
			//thunks
			fthunkExp: fthunkExp,
			fthunkSiz: fthunkSiz,
			fisThunk: fisThunk,
			fttkSiz: fttkSiz,
			fttkExp: fttkExp,
			fisTtk: fisTtk,
			//lambdas
			flmbFrmSiz: flmbFrmSiz,
			flmbArgc: flmbArgc,
			flmbBdy: flmbBdy,
			fisLmb: fisLmb,
			flmzFrmSiz: flmzFrmSiz,
			flmzArgc: flmzArgc,
			flmzBdy: flmzBdy,
			fisLmz: fisLmz,
			//variable definitions
			fdfvOfs: fdfvOfs,
			fdfvVal: fdfvVal,
			fisDfv: fisDfv,
			//function definitions
			fdffBdy: fdffBdy,
			fdffArgc: fdffArgc,
			fdffFrmSiz: fdffFrmSiz,
			fdffOfs: fdffOfs,
			fdfzBdy: fdfzBdy,
			fdfzArgc: fdfzArgc,
			fdfzFrmSiz: fdfzFrmSiz,
			fdfzOfs: fdfzOfs,
			fisDff: fisDff,
			fisDfz: fisDfz,
			//assignments
			fsglScp: fsglScp,
			fsglOfs: fsglOfs,
			fsglVal: fsglVal,
			fslcOfs: fslcOfs,
			fslcVal: fslcVal,
			fisSgl: fisSgl,
			fisSlc: fisSlc,
			//local & global variables
			flocalOfs: flocalOfs,
			fglobalOfs: fglobalOfs,
			fisLocal: fisLocal,
			fisGlobal: fisGlobal,
			fmakeLocal: fmakeLocal,
			fmakeGlobal: fmakeGlobal,
			//applications (zero arg)
			fapzOpr: fapzOpr,
			fisApz: fisApz,
			falzOfs: falzOfs,
			fisAlz: fisAlz,
			fagzOfs: fagzOfs,
			fisAgz: fisAgz,
			fanzScp: fanzScp,
			fanzOfs: fanzOfs,
			fisAnz: fisAnz,
			//tail calls (zero arg)
			ftpzOpr: ftplOpr,
			fisTpz: fisTpz,
			ftlzOfs: ftlzOfs,
			fisTlz: fisTlz,
			ftgzOfs: ftgzOfs,
			fisTgz: fisTgz,
			ftnzScp: ftnzScp,
			ftnzOfs: ftnzOfs,
			fisTnz: fisTnz,
			//applications
			faplOpr: faplOpr,
			faplOpd: faplOpd,
			fisApl: fisApl,
			fallOfs: fallOfs,
			fallOpd: fallOpd,
			fisAll: fisAll,
			faglOfs: faglOfs,
			faglOpd: faglOpd,
			fisAgl: fisAgl,
			fanlScp: fanlScp,
			fanlOfs: fanlOfs,
			fanlOpd: fanlOpd,
			fisAnl: fisAnl,
			//tail calls
			ftplOpr: ftplOpr,
			ftplOpd: ftplOpd,
			fisTpl: fisTpl,
			ftllOfs: ftllOfs,
			ftllOpd: ftllOpd,
			fisTll: fisTll,
			ftglOfs: ftglOfs,
			ftglOpd: ftglOpd,
			fisTgl: fisTgl,
			ftnlScp: ftnlScp,
			ftnlOfs: ftnlOfs,
			ftnlOpd: ftnlOpd,
			fisTnl: fisTnl,
			//non-locals
			fnlcScp: fnlcScp,
			fnlcOfs: fnlcOfs,
			fisNlc: fisNlc,
			//sequence tail
			fstlExp: fstlExp,
			fisStl: fisStl,
			//other
			slipVoid: slipVoid,
			slipNull: slipNull,
			slipTrue: slipTrue,
			slipFalse: slipFalse,
			protect: protect,
			feq: feq
		};
	}

	/* --- INITIALISATION --- */

	//memory
	var __DEFAULT_MEM__ = 24;
	var memSiz = 0x1 << (size || __DEFAULT_MEM__);
	var buffer = new ArrayBuffer(memSiz);

	//foreign modules
	var reader = READER();
	var compiler = COMPILER();
	var dictionary = DICTIONARY();
	var printer = PRINTER();
	var errors = ERRORS();
	var pool = SYMBOLS();
	var timer = TIMER();
	var io = IO();

	var foreign = {
		heapSize: memSiz,
		loadQuo: pool.loadQuo,
		loadIff: pool.loadIff,
		loadDef: pool.loadDef,
		loadBeg: pool.loadBeg,
		loadVec: pool.loadVec,
		loadSet: pool.loadSet,
		loadLmb: pool.loadLmb,
		loadPls: pool.loadPls,
		loadMns: pool.loadMns,
		loadMul: pool.loadMul,
		loadDiv: pool.loadDiv,
		loadCns: pool.loadCns,
		loadCar: pool.loadCar,
		loadCdr: pool.loadCdr,
		loadSca: pool.loadSca,
		loadScd: pool.loadScd,
		loadLst: pool.loadLst,
		loadNeq: pool.loadNeq,
		loadSeq: pool.loadSeq,
		loadLeq: pool.loadLeq,
		loadLrg: pool.loadLrg,
		loadSma: pool.loadSma,
		loadAss: pool.loadAss,
		loadMap: pool.loadMap,
		loadAvl: pool.loadAvl,
		loadCol: pool.loadCol,
		loadClk: pool.loadClk,
		loadSlp: pool.loadSlp,
		loadErr: pool.loadErr,
		loadSre: pool.loadSre,
		loadSse: pool.loadSse,
		loadSle: pool.loadSle,
		loadIpa: pool.loadIpa,
		loadInu: pool.loadInu,
		loadIsy: pool.loadIsy,
		loadIve: pool.loadIve,
		loadIst: pool.loadIst,
		loadVcm: pool.loadVcm,
		loadVcr: pool.loadVcr,
		loadVcs: pool.loadVcs,
		loadVcl: pool.loadVcl,
		loadEqu: pool.loadEqu,
		loadEql: pool.loadEql,
		loadEva: pool.loadEva,
		loadRea: pool.loadRea,
		loadLoa: pool.loadLoa,
		loadApl: pool.loadApl,
		loadDis: pool.loadDis,
		loadNew: pool.loadNew,
		loadRst: pool.loadRst,
		loadCcc: pool.loadCcc,
		loadRnd: pool.loadRnd,
		loadQtt: pool.loadQtt,
		loadRem: pool.loadRem,
		loadLen: pool.loadLen,
		loadSin: pool.loadSin,
		loadExi: pool.loadExi,
		loadCce: pool.loadCce,
		loadRef: pool.loadRef,
		loadFre: pool.loadFre,
		clock: timer.getTime,
		reset: timer.reset,
		invalidIf: errors.invalidIf,
		expectedRBR: errors.expectedRBR,
		invalidQuote: errors.invalidQuote,
		invalidDefine: errors.invalidDefine,
		invalidLambda: errors.invalidLambda,
		invalidSyntax: errors.invalidSyntax,
		invalidSequence: errors.invalidSequence,
		invalidAssignment: errors.invalidAssignment,
		invalidParameter: errors.invalidParameter,
		invalidApplication: errors.invalidApplication,
		invalidExpression: errors.invalidExpression,
		undefinedVariable: errors.undefinedVariable,
		invalidParamCount: errors.invalidParamCount,
		invalidArgument: errors.invalidArgument,
		invalidOperator: errors.invalidOperator,
		globalOverflow: errors.globalOverflow,
		invalidLength: errors.invalidLength,
		invalidRange: errors.invalidRange,
		fatalMemory: errors.fatalMemory,
		promptUserInput: io.promptUserInput,
		printError: io.printCustomError,
		printNewline: io.printNewline,
		printOutput: io.printOutput,
		promptInput: io.promptInput,
		printLog: io.printLog,
		loadFile: io.loadFile,
		initREPL: io.initREPL,
		random: Math.random,
		dctDefine: dictionary.defineVar,
		compile: compiler.compile
	};

	//asm module
	var asm = SLIP_ASM(callbacks.stdlib, foreign, buffer);
	asm.stringText = function(chk) {
		var len = asm.ftextLength(chk);
		var arr = new Array(len);
		for(var i = 0; i < len; ++i)
			arr[i] = asm.ftextGetChar(chk,i);
		return String.fromCharCode.apply(null, arr);
	}

	//linking
	pool.link(asm);
	reader.link(asm, errors, pool);
	compiler.link(asm, dictionary, pool, errors, printer);
	dictionary.link(asm, errors);
	printer.link(asm);
	io.link(asm, callbacks, reader, printer);
	errors.link(io, printer);
	timer.reset();

	//initialization
	asm.init();


	/* ---- EXPORTS ---- */

	return {
		Slip_REPL: asm.Slip_REPL
	}
}