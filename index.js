console.log();

const { Lexer } = require("./lexer.js");
const { Parser } = require("./parser.js")

const lexer = new Lexer();

const parser = new Parser(lexer);

lexer.addRule({ regex: /(['"])(([^\\\n]|\\[^])*?)\1/g, tokenName: "string", priority: 5 });

lexer.addRule({ regex: /\/\/.+$/gm, tokenName: "singleComment", priority: 4 });
lexer.addRule({ regex: /\/\*[^]+?\*\//gm, tokenName: "multiComment", priority: 4 });

lexer.addRule({ regex: /Symbol/g, tokenName: "symbolClass", priority: 3 });
lexer.addRule({ regex: /true/g, tokenName: "true", priority: 3 });
lexer.addRule({ regex: /false/g, tokenName: "false", priority: 3 });
lexer.addRule({ regex: /undefined/g, tokenName: "undefined", priority: 3 });
lexer.addRule({ regex: /null/g, tokenName: "null", priority: 3 });

lexer.addRule({ regex: /[^\s:,()\[\]\{\}?\~"'+\-*\/\\#!$^&|`=\.\d](?:[^\s:,()\[\]\{\}?\~"'+\-*\/\\#!$^&|`=\.])*/g, tokenName: "varname", priority: 2 });
lexer.addRule({ regex: /-?(\d+(\.\d*)?|(\d*\.)?\d+)/g, tokenName: "number", priority: 1.5 });

lexer.addRule({ regex: /\{/g, tokenName: "openBrace", priority: 1 });
lexer.addRule({ regex: /\}/g, tokenName: "closeBrace", priority: 1 });
lexer.addRule({ regex: /\[/g, tokenName: "openBracket", priority: 1 });
lexer.addRule({ regex: /\]/g, tokenName: "closeBracket", priority: 1 });
lexer.addRule({ regex: /\(/g, tokenName: "openParen", priority: 1 });
lexer.addRule({ regex: /\)/g, tokenName: "closeParen", priority: 1 });
lexer.addRule({ regex: /\,/g, tokenName: "comma", priority: 1 });
lexer.addRule({ regex: /\:/g, tokenName: "colon", priority: 1 });

lexer.addRule({ regex: /\s+/g, tokenName: "white", priority: 0.5 });

lexer.discard = "white, singleComment, multiComment".split(", ");

// lexer.addRule({ regex: /^(\t*)\t[^\n\t]*(\n(?=\1[^\n\t]|$)|(?![^]))/gm, captures: { 2: { tokenName: "tabEnd", priority: 2 } } });
// lexer.addRule({ regex: /\w+/g, tokenName: "word", priority: 1 });
// lexer.addRule({ regex: /^(\t*)[^\t\n]+(\n)(?=\1\t)/gm, captures: { 2: { tokenName: "tabStart", priority: 2 } } });
// lexer.addRule({ regex: /\n\t*/g, tokenName: "newline", priority: 1});
// lexer.addRule({ regex: /\s/g, tokenName: "white", priority: 0 });
//
// lexer.discard = "white";

// parser.topLevelRule = "expression";
//
// parser.addRule("expression", [ [], ["object"], ["array"], ["symbol"], ["number"], ["string"], ["true"], ["false"], ["undefined"], ["null"] ]);
// parser.addRule("expressions", [ ["expression"], ["expression", "comma"], ["expression", "comma", "expressions"] ]);
//
// parser.addRule("keyValPair", [ [], ["varname", "colon", "expression"], ["string", "colon", "expression"], ["openBracket", "expression", "closeBracket", "colon", "expression"] ]);
// parser.addRule("keyValPairs", [ ["keyValPair"], ["keyValPair", "comma"], ["keyValPair", "comma", "keyValPairs"] ]);
//
// parser.addRule("object", [ ["openBrace", "keyValPairs", "closeBrace"], ["varname", "openBrace", "keyValPairs", "closeBrace"] ]);
// parser.addRule("array", [ ["openBracket", "expressions", "closeBracket"] ]);
// parser.addRule("symbol", [ ["symbolClass", "openParen", "string", "closeParen"] ]);

lexer.addRule({ regex: /W/g, tokenName: "W", priority: 1 });
lexer.addRule({ regex: /X/g, tokenName: "X", priority: 1 });
lexer.addRule({ regex: /Y/g, tokenName: "Y", priority: 1 });
lexer.addRule({ regex: /Z/g, tokenName: "Z", priority: 1 });

parser.topLevelRule = "a";

parser.addRule("a", [ {
	b: {
		w: "W",
		x: "X",
		quantity: 2,
	},
	_y: "Y",
	y: "Z",
} ]);

function formatTree(tree){
	return (
		tree.leaf ?
			`${tree.token.name} ${util.inspect(tree.token.text)}`
		:	`${tree.ruleName}\n${tree.children.map(formatTree).join("\n").split("\n").map(l => `  ${l}`).join("\n")}`
	);
}

// let input = require("fs").readFileSync("./test.txt").toString();
//
// console.log(lexer.lex(input).map(t => `${t.paddedName} '${t.text}'`).join("\n"));
//
// let tree = parser.parse(input);
//
// console.log(formatTree(tree));

}, 0*5000)
