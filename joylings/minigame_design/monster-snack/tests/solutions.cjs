const G = require('../game.js');
const block = (type, extra = {}) => Object.assign(G.createBlock(type), extra);
const serve = () => block('serve');
const add = () => block('add');
const sub = () => block('sub');
const condition = (op, yes, no) => block(no ? 'ifElse' : 'if', { op, then: yes, ...(no ? { else: no } : {}) });
const menu = () => block('switch', { cases: { fire: [block('warm')], snow: [block('cold')], slime: [block('jam')], default: [block('plain')] } });
module.exports = [
  [serve()],
  [add(), serve()],
  [sub(), serve()],
  [condition('=', [serve()])],
  [condition('<', [add()]), serve()],
  [condition('>', [sub()]), serve()],
  [condition('=', [serve()], [add(), serve()])],
  [condition('<', [add()], [sub()]), serve()],
  [block('mul'), serve()],
  [block('div'), serve()],
  [menu(), serve()],
  [condition('<', [add()]), condition('>', [sub()]), menu(), serve()],
];
