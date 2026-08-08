const LEVELS = [
  { id: 'stock', icon: '🏢', title: '股票究竟是什么', description: '理解买入股票代表拥有一家公司的部分所有权。', minutes: 6, questions: 1, available: true },
  { id: 'price', icon: '⚖️', title: '价格为什么变化', description: '认识买卖、信息和市场预期如何共同影响价格。', minutes: 8, questions: 2, available: true },
  { id: 'market-cap', icon: '🏷️', title: '股价不等于公司大小', description: '用股价和总股数理解市值，避开常见比较误区。', minutes: 7, questions: 3 },
  { id: 'returns', icon: '🌿', title: '收益与风险从哪里来', description: '理解价差、分红、波动和永久损失的区别。', minutes: 8, questions: 3 },
  { id: 'candles', icon: '🕯️', title: '读懂第一根 K 线', description: '从模拟数据认识开盘、收盘、最高和最低价格。', minutes: 8, questions: 3 },
  { id: 'diversification', icon: '🧺', title: '在模拟市场管理风险', description: '通过虚构公司事件比较集中与分散持有的差异。', minutes: 10, questions: 3 }
];

const LESSONS = {
  stock: {
    id: 'stock', title: '股票究竟是什么',
    steps: [
      { type: 'concept', eyebrow: '知识点', title: '一张股票，代表一小部分所有权', icon: '🏢', body: ['公司为了筹集发展资金，可以把所有权分成许多小份。每一份就是一股。', '当你买入一家公司的股票，你买到的不是屏幕上的数字，而是这家公司的一小部分所有权。'], callout: '股东可能分享公司成长带来的价值，也要承担公司经营不佳和股价下跌的风险。' },
      { type: 'case', eyebrow: '案例', title: '一起开一家面包店', icon: '🥖', body: ['小林的面包店价值 100 万元。她把所有权平均分成 10 万股，那么每股对应面包店十万分之一的所有权。', '你买入 1,000 股后，就持有这家虚构面包店 1% 的股份。你没有买到一袋面包，也不是把钱借给面包店。'], facts: [{ value: '100 万', label: '公司价值' }, { value: '10 万股', label: '总股数' }, { value: '1%', label: '持有比例' }] },
      { type: 'question', id: 'stock-ownership-01', questionType: 'singleChoice', eyebrow: '互动问题', title: '买入股票后，你真正获得了什么？', prompt: '假设你买入了“暖阳面包店”的一部分股票。下面哪项描述最准确？', options: [{ id: 'a', label: '面包店必须按固定日期归还你的本金' }, { id: 'b', label: '你拥有了面包店的一小部分所有权' }, { id: 'c', label: '你获得了每天免费领取面包的权利' }], correctOptionId: 'b', feedback: { correct: '答对了。股票代表公司所有权的一部分，你成为了股东。', incorrect: { a: '这更像借款。股票没有固定还本日期，股东承担企业经营风险。', c: '股票不等于获得公司产品。股东拥有的是公司的一部分所有权。' }, explanation: '买入股票意味着取得公司的一部分所有权。股东可能从公司成长和分红中受益，也可能因经营不佳或市场价格变化而亏损。' } },
      { type: 'complete', eyebrow: '本关完成', title: '你已经抓住了股票的核心', icon: '🌱', summary: ['股票不是一张彩票，而是一小部分公司所有权。', '股东既有机会分享公司成长，也必须承担风险。', '股票和借款不同，公司不会承诺固定归还本金。'], nextMessage: '第二关“价格为什么变化”现在已经可以开始。' }
    ]
  },
  price: {
    id: 'price', title: '价格为什么变化',
    steps: [
      { type: 'concept', eyebrow: '知识点', title: '价格是买卖双方此刻达成的结果', icon: '⚖️', body: ['股票价格不是公司自己决定的，也不是由某一条消息单独决定的。市场中愿意买的人和愿意卖的人不断报价，成交价格就在双方能够接受的位置形成。', '新信息会改变人们对公司的预期，资金需求和情绪也会改变买卖意愿，所以价格会持续波动。'], callout: '价格变化说明市场参与者的判断正在变化，不代表公司的真实价值在每一秒都同步变化。' },
      { type: 'case', eyebrow: '案例', title: '同一份成绩，两种预期', icon: '🍞', body: ['暖阳面包店本月利润增长 10%。听起来是好消息，但市场原本期待它增长 20%。消息公布后，一些人降低了预期并愿意用更低价格卖出。', '因此，“公司利润增长”和“股价当天上涨”并不是必然关系。价格反映的是事实与原有预期之间的差异，以及买卖双方当时的选择。'], facts: [{ value: '+10%', label: '实际增长' }, { value: '+20%', label: '原本预期' }, { value: '不确定', label: '价格方向' }] },
      { type: 'question', id: 'price-expectation-01', questionType: 'trueFalse', eyebrow: '判断题', title: '好消息一定会让股价上涨吗？', prompt: '一家公司公布利润增长，这只股票当天一定会上涨。', options: [{ id: 'true', marker: '对', label: '正确，一有好消息价格就会上涨' }, { id: 'false', marker: '错', label: '错误，还要看原有预期和买卖双方反应' }], correctOptionId: 'false', feedback: { correct: '判断正确。消息本身只是一个因素，市场原有预期同样重要。', incorrect: { true: '“好消息”不等于“超出预期”。如果结果低于原有预期，价格仍可能下跌。' }, explanation: '股价反映买卖双方对未来的综合判断。实际结果、原有预期、资金和情绪都会影响交易，因此不能从一条消息直接推出确定的涨跌方向。' } },
      { type: 'question', id: 'price-market-02', questionType: 'singleChoice', eyebrow: '情境选择', title: '哪种解释更完整？', prompt: '暖阳面包店客流增加，但股价下跌。下面哪项解释最合理？', options: [{ id: 'a', label: '客流数据一定是假的' }, { id: 'b', label: '股价下跌证明公司已经没有价值' }, { id: 'c', label: '市场可能原本期待更高增长，或同时出现了其他影响因素' }], correctOptionId: 'c', feedback: { correct: '答对了。价格通常由多个因素和市场预期共同影响。', incorrect: { a: '价格下跌不能证明某一项经营数据是假的，还需要独立证据。', b: '短期价格下跌不等于公司价值归零，价格和企业基本面并非时刻同步。' }, explanation: '面对价格变化，先区分已知事实、市场预期和其他可能因素。不要用单一原因解释复杂的市场结果。' } },
      { type: 'complete', eyebrow: '本关完成', title: '你已经能更理性地看待价格变化', icon: '🌿', summary: ['成交价格来自当时买卖双方的报价。', '消息是否超出原有预期，可能比消息表面好坏更重要。', '不要用一个原因确定地解释市场涨跌。'], nextMessage: '第三关已经解锁，正式内容将在下一阶段加入。' }
    ]
  }
};

