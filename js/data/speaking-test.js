// The 4-weekly speaking test: the rubric, a fixed paragraph to read aloud per level and the monologue topics.
// Topics and texts in English on purpose; British spelling. Read texts avoid hyphens and digits so the
// word count matches what speech recognition writes.

// d: what a 1, a 3 and a 5 look like
export const RUBRIC = [
  {k: "flu", n: "Fluência e espontaneidade", d: ["Frases soltas, pausas longas e travadas frequentes.", "Fala por um tempo, com pausas para procurar palavras e turnos curtos.", "Fala com naturalidade e por trechos longos; só para para pensar no conteúdo."]},
  {k: "pron", n: "Pronúncia e inteligibilidade", d: ["Difícil de entender; muitos sons do português no lugar dos do inglês.", "Dá para entender com algum esforço; tropeça em th, -ed, h e vogais longas e curtas.", "Fácil de entender; ritmo, acento das palavras e entonação naturais."]},
  {k: "voc", n: "Vocabulário ativo", d: ["Só palavras muito básicas; recorre ao português.", "Dá conta dos temas do dia a dia, mas repete palavras.", "Variado e preciso, com expressões e collocations; contorna a palavra que falta."]},
  {k: "gram", n: "Gramática na fala", d: ["Erros constantes no básico (tempos verbais, 3ª pessoa, perguntas).", "Básico quase sempre certo; erra ao tentar estruturas mais complexas.", "Boa variedade de estruturas, com poucos erros que não atrapalham."]},
  {k: "coh", n: "Coerência e argumentação", d: ["Ideias soltas, sem ligação nem desenvolvimento.", "Liga as ideias com and, but, because e dá alguns motivos.", "Desenvolve opiniões com motivos e exemplos, em ordem clara e com conectores variados."]}
];

export const READ_TEXTS = {
  A2: "I live in a small flat on the third floor of an old building. There is a bakery opposite, and every morning the smell of fresh bread comes through the window. On Thursdays there is a market in the square, where my neighbour sells cheese and vegetables. Last weekend my brother visited me and we walked along the river. I usually walk to work, but when it rains I take the bus. In the evening I sit by the window with a cup of tea and watch people going home. I think it is the best street in the city.",
  B1: "Last summer I travelled to Edinburgh with two friends. We had planned to stay for three days, but we enjoyed it so much that we decided to stay for a week. The weather changed every hour: one minute it was sunny, the next it was pouring with rain. We climbed Arthur's Seat early one morning and watched the whole city wake up beneath us. In the evenings we listened to live music in tiny pubs, where the locals were surprisingly friendly. Although the accent was hard to follow at first, by the end of the week I could understand much more than I expected.",
  B2: "Working from home has changed the way many people think about their careers. Without a daily commute, workers have gained hours that were previously wasted on crowded trains and motorways. However, the boundary between professional and personal life has become increasingly blurred, and some employees admit that they find it difficult to switch off. Managers, meanwhile, worry that younger staff miss out on the informal learning that happens in an office. Whether hybrid working will remain the norm is still uncertain, but it seems unlikely that we will ever return entirely to the old routine.",
  C1: "It is often assumed that technology inevitably makes our lives more efficient, yet the evidence is rather more ambiguous. Smartphones allow us to answer emails on the train, but they also fragment our attention, and researchers have found that constant interruptions can undermine the quality of our thinking. The challenge, therefore, is not to reject these tools altogether but to use them deliberately. Some organisations have introduced policies that discourage messages outside working hours, while individuals experiment with quieter, more focused routines. Ultimately, the question is less about technology itself than about the habits we choose to build around it."
};

// k: stable key saved with each test; t: the monologue task; hints: what to cover; q: the two follow-up questions
export const TOPICS = {
  A2: [
    {k: "a2-day", t: "Describe a typical day in your life.", hints: ["your morning", "work or studies", "your evening"], q: ["What is your favourite part of the day, and why?", "How was your day different last weekend?"]},
    {k: "a2-place", t: "Talk about the place where you live.", hints: ["your house or flat", "the neighbourhood", "what you like and don't like"], q: ["Would you like to live somewhere else? Why or why not?", "What did you do in your neighbourhood last week?"]},
    {k: "a2-trip", t: "Talk about a trip or holiday you remember well.", hints: ["where and when", "who you went with", "what you did"], q: ["What would you like to do on your next holiday?", "Do you prefer the beach or the city? Why?"]},
    {k: "a2-food", t: "Talk about the food you like and how you eat during the week.", hints: ["breakfast, lunch and dinner", "eating at home or out", "a dish you love"], q: ["What did you eat yesterday?", "Can you cook? Tell me about a dish you know how to make."]}
  ],
  B1: [
    {k: "b1-change", t: "Describe a change in your life that was important to you.", hints: ["what happened", "how you felt", "what you learnt"], q: ["Do you find change easy or difficult? Why?", "What change would you like to make in the next year?"]},
    {k: "b1-person", t: "Talk about a person who has influenced you.", hints: ["who they are", "what they did", "how you are different because of them"], q: ["Do you think people learn more from family or from friends?", "Who do you go to when you need advice, and why?"]},
    {k: "b1-tech", t: "Talk about how you use technology in your daily life.", hints: ["the apps you use most", "what is useful", "what annoys you"], q: ["Do you think people spend too much time on their phones?", "How was life different before smartphones?"]},
    {k: "b1-work", t: "Describe your job or studies and what you would like to do in the future.", hints: ["what you do now", "what you enjoy", "your plans"], q: ["What makes a job satisfying, in your opinion?", "Would you ever move to another country for work?"]}
  ],
  B2: [
    {k: "b2-city", t: "Some people say big cities are better places to live than small towns. What do you think?", hints: ["opportunities", "quality of life", "your own experience"], q: ["How could cities be made more pleasant to live in?", "Do you think more people will move to the countryside in the future?"]},
    {k: "b2-remote", t: "Is working from home better than working in an office? Give your opinion with reasons and examples.", hints: ["productivity", "social life", "who it suits"], q: ["What skills do people need to work well from home?", "How might offices change in the next ten years?"]},
    {k: "b2-learning", t: "What is the best way to learn a foreign language as an adult?", hints: ["classes or self study", "exposure and practice", "what worked for you"], q: ["What role should technology play in education?", "Is it ever too late to learn something new?"]},
    {k: "b2-tourism", t: "Has tourism done more good or harm to the places people visit?", hints: ["the economy", "local people", "the environment"], q: ["How could tourists behave more responsibly?", "Should popular cities limit the number of visitors?"]}
  ],
  C1: [
    {k: "c1-ai", t: "To what extent should we rely on artificial intelligence in our everyday decisions?", hints: ["where it helps", "where it is risky", "where you draw the line"], q: ["Who should be responsible when an automated system makes a mistake?", "What skills will become more valuable as AI improves?"]},
    {k: "c1-success", t: "How should success be measured: by money, by happiness or by something else?", hints: ["what society rewards", "what people regret", "your own definition"], q: ["Does social media distort our idea of success?", "Is it possible to be successful without being ambitious?"]},
    {k: "c1-media", t: "Is it still possible to have a well informed public when anyone can publish news?", hints: ["the benefits of open publishing", "misinformation", "possible solutions"], q: ["Whose responsibility is it to stop misinformation?", "How do you decide which sources to trust?"]}
  ]
};
