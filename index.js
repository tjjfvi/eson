console.log();

const util = require("util");

const { Lexer } = require("./lexer.js");
const { Parser } = require("./parser.js")

const lexer = new Lexer();

const parser = new Parser(lexer, false);

lexer.addRule({ regex: /W/g, tokenName: "W" });
lexer.addRule({ regex: /X/g, tokenName: "X" });
lexer.addRule({ regex: /Y/g, tokenName: "Y" });
lexer.addRule({ regex: /Z/g, tokenName: "Z" });

parser.topLevelRule = "a";

parser.addRule("a", [ ["b", "c"] ]);
parser.addRule("b", [ ["d"], ["X"] ]);
parser.addRule("c", [ ["Y", "Z"] ]);
parser.addRule("d", [ ["X", "Y"] ]);

// parser.addRule("a", [ {
// 	b: {
// 		w: "W",
// 		x: "X",
// 		quantity: 2,
// 	},
// 	_y: "Y",
// 	y: "Z",
// } ]);

function formatTree(tree){
	return (
		tree.leaf ?
			`${tree.token.name} ${util.inspect(tree.token.text)}`
		:	`${tree.ruleName}\n${tree.children.map(formatTree).join("\n").split("\n").map(l => `  ${l}`).join("\n")}`
	);
}

let input = require("fs").readFileSync("./test.txt").toString();
//
// console.log(lexer.lex(input).map(t => `${t.paddedName} '${t.text}'`).join("\n"));
//
let tree = parser.parse(input);

console.log(formatTree(tree));
