console.log();

const fs = require("fs-extra");

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

parser.topLevelRule = "expression";

parser.addRule("expression", [ [], ["object"], ["array"], ["symbol"], ["number"], ["string"], ["true"], ["false"], ["undefined"], ["null"] ]);
parser.addRule("expressions", [ ["expression"], ["expression", "comma"], ["expression", "comma", "expressions"] ]);

parser.addRule("keyValPair", [ [], ["varname", "colon", "expression"], ["string", "colon", "expression"], ["openBracket", "expression", "closeBracket", "colon", "expression"] ]);
parser.addRule("keyValPairs", [ ["keyValPair"], ["keyValPair", "comma"], ["keyValPair", "comma", "keyValPairs"] ]);

parser.addRule("object", [ ["openBrace", "keyValPairs", "closeBrace"], ["varname", "openBrace", "keyValPairs", "closeBrace"] ]);
parser.addRule("array", [ ["openBracket", "expressions", "closeBracket"] ]);
parser.addRule("symbol", [ ["symbolClass", "openParen", "string", "closeParen"] ]);

function consumeParseTree(tree){
	if(tree.ruleName === "expression" && tree.children.length) return consumeParseTree(tree.children[0]);

	if(tree.leaf) return (
		tree.token.name === "number" ?
			+tree.token.text :
		tree.token.name === "string" ?
			tree.token.text.slice(1, -1)
				.replace("\\\n", "")
				.replace("\\'", "'")
				.replace('\\"', '"')
				.replace("\\\\", "\\")
				.replace("\\n", "\n")
				.replace("\\\r", "\r")
				.replace("\\v", "\v")
				.replace("\\t", "\t")
				.replace("\\b", "\b")
				.replace("\\f", "\f")
				.replace(/\\\d\d\d|\\x\d\d|\\u\d\d\d\d|\\u\{\d{1,6}\}/g, escape => eval(`"${escape}"`))
			:
		tree.token.name === "true" ?
			true :
		tree.token.name === "false" ?
			false :
		tree.token.name === "undefined" ?
			undefined :
		tree.token.name === "null" ?
			null :
		tree.token.name === "varname" ?
			tree.token.text :
		new Error(`Cannot convert '${tree.token.name}' to JS type`)
	);

	if(tree.ruleName === "symbol") {
		let key = consumeParseTree(tree.children[2]);
		config.symbolDictionary = config.symbolDictionary || {};
		return config.symbolDictionary[key] = config.symbolDictionary[key] || Symbol(key);
	}

	if(tree.ruleName === "array")
		return consumeParseTree(tree.children[1]);

	if(tree.ruleName === "object") {
		if(tree.ruleIndex !== 1) return consumeParseTree(tree.children[1]);
		let f = config.classDictionary[consumeParseTree(tree.children[0])];
		try {
			new (new Proxy(f, {
				construct() { return {}; },
			}))();

			return new f(consumeParseTree(tree.children[2]));
		} catch(err) {
			return f(consumeParseTree(tree.children[2]));
		}
	}

	if(tree.ruleName === "keyValPairs") return Object.assign(
		consumeParseTree(tree.children[0]),
		tree.children[2] ? consumeParseTree(tree.children[2]) : {},
	);

	if(tree.ruleName === "keyValPair")
		return { [consumeParseTree(tree.children[tree.ruleIndex === 3 ? 1 : 0])]: consumeParseTree(tree.children[tree.ruleIndex === 3 ? 4 : 2]) };

	if(tree.ruleName === "expressions") return [
		consumeParseTree(tree.children[0]),
		...(tree.children[2] ? consumeParseTree(tree.children[2]) : []),
	];
}

function config(options){
	/* {
		symbolDictionary: { key: Symbol("value"), ... },
		classDictionary: {
			Person: ({ name, age }) => new Person(name, age),
			Animal,
		}
	} */
	Object.assign(config, options);
}

function parse(filename){
	const eson = fs.readFileSync(filename, "utf8");
	return consumeParseTree(parser.parse(eson));
}

function registerRequireExtension(){
	require.extensions[".eson"] = (module, filename) => {
		module.exports = parse(filename);
	};
}

registerRequireExtension();

module.exports = {
	parse,
	config,
}
