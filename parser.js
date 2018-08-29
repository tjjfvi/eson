
let errors = [];
let num = 0;

class Parser {
	constructor(lexer) {
		this.topLevelRule = "topLevel";
		this.rules = {};
		this.lexerRuleNames = [];
		this.lexer = lexer;
	}

	addRule(name, rule){
		this.rules[name] = rule;
	}

	parse(string){
		const tokens = this.lexer.lex(string);
		this.lexerRuleNames = this.lexer.ruleNames;

		const generator = this.evalRule(this.topLevelRule, tokens, 0, true, []);
		let result = generator.next();
		let iterations = 0;

		console.time("parse");
		while(!result.value && !result.done && ++iterations) result = generator.next();
		console.timeEnd("parse");

		//errors.map(e => console.log({ err: e.err, path: e.path.join(" ") }));
		console.log(num, errors.length);
		if(!result.value) throw new Error(`Could not parse`);

		console.log(`${iterations} iterations\n`);
		return result.value.tree;
	}

	*evalRule(ruleName, tokens, ind = 0, mustConsumeAll = true, path){
		num++;
		if(this.typeOf(ruleName) === "token") {
			num--;
			return (
				ind < tokens.length && tokens[ind].name === ruleName && !mustConsumeAll || ind === tokens.length - 1 ?
					{
						tree: {
							leaf: true,
							token: tokens[ind],
							name: ruleName,
						},
						ind: ++ind,
					}
				:	(errors.push({
						err: `e: ${this.lexer.pad(ruleName)} g: ${this.lexer.pad((tokens[ind] || {}).name)} d: ${path}`,
						path
					})) && undefined
			);
		}

		let rule = this.rules[ruleName];

		let generators = rule.map((ar, i) => this.evalAndRule(ar, tokens, ind, mustConsumeAll, {
			ruleName,
			ruleIndex: i,
		}, [...path, `${ruleName}${i}`]));

		for(let i = 0; true; ++i && (i %= generators.length)) {
			if(!generators.length) { num--; return; }

			let {value, done} = generators[i].next();

			if(done) generators.splice(i--, 1);

			yield value;
		}
	}

	*evalAndRule(rule, tokens, ind, mustConsumeAll, treeInfo, path){
		num++;
		if(!rule.length) return (
			!mustConsumeAll || ind === tokens.length ?
				{
					tree: {
						leaf: false,
						children: [],
						...treeInfo,
					},
					ind,
				}
			:	undefined
		);

		yield;

		let generators = [{
			iteration: 0,
			siblings: [],
			gen: this.evalRule(rule[0], tokens, ind, mustConsumeAll && rule.length === 1, [...path, 0]),
		}];

		for(let i = 0; true; ++i && (i %= generators.length)) {
			if(!generators.length) {num--; return;}

			let {gen, iteration, siblings} = generators[i];
			let {value, done} = gen.next();

			if(done) generators.splice(i--, 1);

			if(!value) {
				yield;
				continue;
			}

			if(iteration === rule.length - 1) {
				yield {
					tree: {
						leaf: false,
						children: [...siblings, value.tree],
						...treeInfo,
					},
					ind: value.ind,
				};
				continue;
			}

			let newGen = {
				iteration: ++iteration,
				siblings: [...siblings, value.tree],
				gen: this.evalRule(rule[iteration], tokens, value.ind, mustConsumeAll && iteration === rule.length - 1, [...path, iteration]),
			};

			generators.splice(ind, 0, newGen);

			yield;
		}
	}

	typeOf(name){
		if(this.rules[name]) return "rule";
		if(~this.lexerRuleNames.indexOf(name)) return "token";
		throw new Error(`Unkown rule '${name}'`);
	}
}

module.exports = {
	Parser,
}
