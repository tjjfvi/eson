
const eson = require("./eson.js");

class Person {
	constructor(name, age) {
		this.name = name;
		this.age = age;
	}

	birthday(){
		console.log(`${this.name} turned ${++this.age}!`);
	}
}

class Person2 {
	constructor({ name, age }) {
		this.name = name;
		this.age = age;
	}

	birthday(){
		console.log(`${this.name} turned ${++this.age}!`);
	}
}

eson.config({
	symbolDictionary: {
		abc: Symbol("this is abc"),
		test4: Symbol("this is test4"),
	},
	classDictionary: {
		Person: ({ name, age }) => new Person(name, age),
		Person2,
	},
	stringify: {

	}
})

let data = require("./test.eson");

console.log("test7", data.abc123.test7)

data.abc123.p1.birthday();
data.abc123.p2.birthday();

require("fs").writeFileSync("./test.eson", eson.stringify(data), "utf8");
