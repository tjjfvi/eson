console.log();

const fs = require("fs-extra");

const { Lexer } = require("./lexer.js");
const { Parser } = require("./parser.js");

const jsStringEscape = require("js-string-escape");

const lexer = new Lexer();

const parser = new Parser(lexer, false);

const varnameRegex = /[^\s:,()\[\]\{\}?\~"'+\-*\/\\#!$^&|`=\.\d](?:[^\s:,()\[\]\{\}?\~"'+\-*\/\\#!$^&|`=\.])*/g;
const varnameRegexAll = /^[^\s:,()\[\]\{\}?\~"'+\-*\/\\#!$^&|`=\.\d](?:[^\s:,()\[\]\{\}?\~"'+\-*\/\\#!$^&|`=\.])*$/;

lexer.addRule({ regex: /(['"])(([^\\\n]|\\[^])*?)\1/g, tokenName: "string", priority: 5 });

lexer.addRule({ regex: /\/\/.+$/gm, tokenName: "singleComment", priority: 4 });
lexer.addRule({ regex: /\/\*[^]+?\*\//gm, tokenName: "multiComment", priority: 4 });

lexer.addRule({ regex: /Symbol/g, tokenName: "symbolClass", priority: 3 });
lexer.addRule({ regex: /true/g, tokenName: "true", priority: 3 });
lexer.addRule({ regex: /false/g, tokenName: "false", priority: 3 });
lexer.addRule({ regex: /undefined/g, tokenName: "undefined", priority: 3 });
lexer.addRule({ regex: /null/g, tokenName: "null", priority: 3 });

lexer.addRule({ regex: varnameRegex, tokenName: "varname", priority: 2 });
lexer.addRule({ regex: /-?(\d+(\.\d*)?|(\d*\.)?\d+)(e[+-]?\d+)?|NaN|[+-]?Infinity/g, tokenName: "number", priority: 1.5 });

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
parser.addRule("expressions", [ [], ["expression"], ["expression", "comma"], ["expression", "comma", "expressions"] ]);

parser.addRule("keyValPair", [ ["varname", "colon", "expression"], ["string", "colon", "expression"], ["openBracket", "expression", "closeBracket", "colon", "expression"] ]);
parser.addRule("keyValPairs", [ [], ["keyValPair"], ["keyValPair", "comma"], ["keyValPair", "comma", "keyValPairs"] ]);

parser.addRule("object", [ ["openBrace", "keyValPairs", "closeBrace"], ["varname", "openBrace", "keyValPairs", "closeBrace"] ]);
parser.addRule("array", [ ["openBracket", "expressions", "closeBracket"] ]);
parser.addRule("symbol", [ ["symbolClass", "openParen", "string", "closeParen"] ]);

function consumeParseTree(tree){
	if(tree.ruleName === "expression" && tree.children.length) return tree.children.length ? consumeParseTree(tree.children[0]) : undefined;

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

	if(tree.ruleName === "keyValPairs") return tree.children.length ? Object.assign(
		consumeParseTree(tree.children[0]),
		tree.children[2] ? consumeParseTree(tree.children[2]) : {},
	) : {};

	if(tree.ruleName === "keyValPair") return (
		tree.children.length ?
			{ [consumeParseTree(tree.children[tree.ruleIndex === 2 ? 1 : 0])]: consumeParseTree(tree.children[tree.ruleIndex === 2 ? 4 : 2]) } :

			{}
	);

	if(tree.ruleName === "expressions") return tree.children.length ? [].concat(
		tree.children[0].ruleIndex ? [consumeParseTree(tree.children[0])] : [,],
		tree.children[2] ? consumeParseTree(tree.children[2]) : [],
	) : [];
}

function config(options){
	/* {
		symbolDictionary: { key: Symbol("value"), ... },
		classDictionary: {
			Person: ({ name, age }) => new Person(name, age),
			Animal,
		},
		stringify: {
			minify: false,
			quote: '"',
			tab: "\t",
			arrayTrailingComma: true,
			objectTrailingComma: true,
		},
	} */
	Object.assign(config, options);
}

function formatTree(tree){
	return (
		tree.leaf ?
			`${tree.token.name} ${require("util").inspect(tree.token.text)}`
		:	`${tree.ruleName}\n${tree.children.map(formatTree).join("\n").split("\n").map(l => `  ${l}`).join("\n")}`
	);
}

function parse(filename){
	const eson = fs.readFileSync(filename, "utf8");

	let tree = parser.parse(eson);

	// console.log(formatTree(tree));

	return consumeParseTree(tree);
}

function registerRequireExtension(){
	require.extensions[".eson"] = (module, filename) => {
		module.exports = parse(filename);
	};
}

function stringify(obj, options = config.stringify || {}){
	options = Object.assign({
		minify: false,
		quote: '"',
		tab: "\t",
		arrayTrailingComma: true,
		objectTrailingComma: true,
	}, options);

	minify = ((strs, ...keys) => options.minify ? "" : strs.slice(0, -1).reduce((p, s, i) => p + s + keys[i].toString(), "") + strs[strs.length - 1]);

	let type = typeof obj;

	if(type === "symbol") return `Symbol(${stringify(obj.toString().slice(7, -1))})`;

	if(type === "number") return obj.toString();

	if(type === "string") return options.quote + jsStringEscape(obj) + options.quote;

	if(type === "undefined") return "undefined";

	if(type === "function") return "undefined /* function */";

	if(type === "boolean") return obj+"";

	if(obj === null) return "null";

	if(Array.prototype.isPrototypeOf(obj)) {
		console.log(obj);
		return `[${
			obj.map(o => stringify(o)).map(s => {
				return minify`\n` + minify`${options.tab}` + s.replace(/([^\\]|$)\n/g, `$1\n${options.tab}`);
			}).join(`,`)
		}${options.arrayTrailingComma && obj.length ? "," : ""}${obj.filter(e=>e).length ? minify`\n` : ""}]`;
	}

	let keys = [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)];

	return `${obj.constructor.name in config.classDictionary ? `${obj.constructor.name}${minify` `}` : ""}{${
		keys.map(key => {
			let keyText = typeof key === "symbol" ? `[${stringify(key)}]` : varnameRegexAll.exec(key) ? key : stringify(key);
			let valueText = stringify(obj[key]);
			return minify`\n` + `${minify`${options.tab}`}${keyText}:${minify` `}${valueText.replace(/([^\\])\n/g, `$1\n${options.tab}`)}`;
		}).join(`,`)
	}${options.objectTrailingComma && keys.length ? "," : ""}${keys.length ? minify`\n` : ""}}`;
}

registerRequireExtension();

module.exports = {
	parse,
	stringify,
	config,
}
