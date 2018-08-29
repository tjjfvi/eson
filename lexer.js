
const Regex = require("becke-ch--regex--s0-0-v1--base--pl--lib");

class Token {
	constructor(name, text, priority, start, end, paddedName){
		this.name = name;
		this.paddedName = paddedName || name;
		this.text = text;
		this.priority = priority;
		this.start = start;
		this.end = end;
	}
}

class Lexer {
	constructor(){
		this.rules = [];
		this.ruleNames = [];
		this.ruleNameMaxLength = 0;
		this.discard = [];
	}

	addRule(rule){
		rule.regex = new Regex(rule.regex.source, rule.regex.flags);
		rule.captures = rule.captures || {};
		if(rule.tokenName && rule.priority) rule.captures[0] = {
			tokenName: rule.tokenName,
			priority: rule.priority,
		};
		this.ruleNames.push(...Object.values((rule.captures)).map(c => c.tokenName));
		this.rules.push(rule);
		this.ruleNameMaxLength = Math.max(...this.ruleNames.map(n => n.length));
	}

	lex(string){
		let tokens = [];
		this.rules.sort((a, b) => b.priority - a.priority);
		this.rules.forEach((rule) => {
			let regex = rule.regex;
			let m;
			while ((m = regex.exec(string)) !== null) {
				tokens.push(...Object.keys(rule.captures).map(ind => new Token(
					rule.captures[ind].tokenName,
					m[ind],
					rule.captures[ind].priority,
					m.index[ind],
					m.index[ind] + (m[ind] || "").length - 1,
					this.pad(rule.captures[ind].tokenName),
				)));
			}
		});

		let check = Array(string.length);
		tokens.forEach(function(t){
			const is = [...Array(t.end - t.start + 1)].map((_,i) => i + t.start);

			if(is.map(i => check[i]).filter(c => c).length)
				return t.discard = true;

			check.splice(t.start, t.end - t.start + 1, ...[...Array(t.end - t.start + 1)].map(() => t.name));
		});

		tokens = tokens.filter(t => !t.discard);

		if(check.filter(b => !b).length)
			throw new Error("Extra char.");

		tokens = tokens.filter(t => !~this.discard.indexOf(t.name));

		tokens.sort((a, b) => a.start - b.start);

		return tokens;
	}

	pad(ruleName){
		return ruleName + " ".repeat(this.ruleNameMaxLength - (ruleName || "").length);
	}
}

module.exports = {
	Token,
	Lexer,
}
