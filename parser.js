
let errors = [];
let num = 0;

let log = false ? console.log : ()=>{};

class Parser {
	constructor(lexer, breadthFirst = false) {
		this.topLevelRule = "topLevel";
		this.rules = {};
		this.lexerRuleNames = [];
		this.lexer = lexer;
		this.breadthFirst = breadthFirst;
	}

	addRule(name, rule){
		this.rules[name] = rule;
	}

	parse(string){
		console.time("lex");
		const tokens = this.lexer.lex(string);
		console.timeEnd("lex");
		this.lexerRuleNames = this.lexer.ruleNames;

		console.time("parse");
		const generator = this.evalRule(this.topLevelRule, tokens, 0, true, []);
		let result = generator.next();
		let iterations = 0;

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

		log(" ".repeat(path.length), ruleName, "spawn")

		let rule = this.rules[ruleName];

		let generators = rule.map((ar, i) => this.evalAndRule(ar, tokens, ind, mustConsumeAll, {
			ruleName,
			ruleIndex: i,
		}, [...path, `${ruleName}${i}`]));

		for(let i = 0; true; ++i && (i %= generators.length)) {
			if(!generators.length) { num--; return; }

			let {value, done} = generators[i].next();

			if(done) generators.splice(i--, 1);

			if(value || this.breadthFirst) yield value;
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

		log(" ".repeat(path.length), treeInfo.ruleName + treeInfo.ruleIndex, "spawn");

		if(this.breadthFirst) yield;

		let generators = [{
			iteration: 0,
			siblings: [],
			gen: this.evalRule(rule[0], tokens, ind, mustConsumeAll && rule.length === 1, [...path, 0]),
		}];

		for(let i = 0; true; (this.breadthFirst ? ++i : true) && (i %= generators.length)) {
			log(" ".repeat(path.length), treeInfo	.ruleName + treeInfo.ruleIndex, "iteration");
			if(!generators.length) {log(" ".repeat(path.length), treeInfo.ruleName + treeInfo.ruleIndex, "return"); num--; return;}

			let {gen, iteration, siblings} = generators[i];
			let {value, done} = gen.next();

			if(done) generators.splice(i--, 1);

			i += generators.length;

			if(!value) {
				if(this.breadthFirst) yield;
				continue;
			}

			if(iteration === rule.length - 1) {
				log(" ".repeat(path.length), treeInfo.ruleName + treeInfo.ruleIndex, "yield");
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

			generators.splice(i, 0, newGen);

			if(this.breadthFirst) yield;
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
