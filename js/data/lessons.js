// Free British Council LearnEnglish lessons used by the route.
export const BC_URL = "https://learnenglish.britishcouncil.org/free-resources/";
export const LINKS = {
  levelTest: "https://learnenglish.britishcouncil.org/english-levels/online-english-level-test",
  efset: "https://www.efset.org/",
  wi: "https://writeandimprove.com/",
  oxford: "https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000",
  podcasts: "https://learnenglish.britishcouncil.org/general-english/audio-series/podcasts",
  audioSeries: BC_URL + "general/audio-series",
  storyA: BC_URL + "general/story-zone/a2-b1",
  storyB: BC_URL + "general/story-zone/b2-c1",
  magazine: BC_URL + "general/magazine-zone",
  audioZone: BC_URL + "general/audio-zone",
  videoZone: BC_URL + "general/video-zone",
  videoSeries: BC_URL + "general/video-series",
  business: BC_URL + "business-english",
  gramRef: BC_URL + "grammar/english-grammar-reference",
  c1g: BC_URL + "grammar/c1", c1l: BC_URL + "listening/c1", c1r: BC_URL + "reading/c1", c1w: BC_URL + "writing/c1",
  eerQuiz: "https://english-e-reader.net/find-level",
  nil2: "https://www.newsinlevels.com/level/level-2/",
  nil3: "https://www.newsinlevels.com/level/level-3/"
};
export const EER_LEVEL_URL = "https://english-e-reader.net/level/";
export const LESSON_INDEXES = {
  ga: ["índice gramática A1–A2", BC_URL+"grammar/a1-a2"], gb: ["índice gramática B1–B2", BC_URL+"grammar/b1-b2"],
  la2: ["índice listening A2", BC_URL+"listening/a2"], lb1: ["índice listening B1", BC_URL+"listening/b1"], lb2: ["índice listening B2", BC_URL+"listening/b2"],
  ra2: ["índice reading A2", BC_URL+"reading/a2"], rb1: ["índice reading B1", BC_URL+"reading/b1"], rb2: ["índice reading B2", BC_URL+"reading/b2"],
  wa2: ["índice writing A2", BC_URL+"writing/a2"], wb1: ["índice writing B1", BC_URL+"writing/b1"], wb2: ["índice writing B2", BC_URL+"writing/b2"],
  sa2: ["índice speaking A2", BC_URL+"speaking/a2"], sb1: ["índice speaking B1", BC_URL+"speaking/b1"], sb2: ["índice speaking B2", BC_URL+"speaking/b2"],
  va: ["índice vocabulário A1–A2", BC_URL+"vocabulary/a1-a2"], vb: ["índice vocabulário B1–B2", BC_URL+"vocabulary/b1-b2"]
};

export const LESSONS = {};
function lessons(skill, lvl, idx, base, list){
  list.forEach(([id, t, slug]) => {
    LESSONS[id] = {id, t, s: skill, lvl, idx, u: slug ? BC_URL + (slug.indexOf("/") > -1 ? slug : base + slug) : LESSON_INDEXES[idx][1]};
  });
}
lessons("gram","A2","ga","",[
  ["GA01","Present simple: ‘to be’","grammar/a1-a2/present-simple-be"],
  ["GA02","Present simple","grammar/a1-a2/present-simple"],
  ["GA03","Present simple: ‘have got’","grammar/a1-a2/present-simple-have-got"],
  ["GA04","Question forms","grammar/a1-a2/question-forms"],
  ["GA05","Using ‘there is’ and ‘there are’","grammar/a1-a2/using-there-there-are"],
  ["GA06","Nouns: countable and uncountable","grammar/a1-a2/nouns-countable-uncountable"],
  ["GA07","Quantifiers: ‘few’, ‘a few’, ‘little’ and ‘a bit of’","grammar/a1-a2-grammar/quantifiers-few-a-few-little-a-bit"],
  ["GA08","Articles: ‘a’, ‘an’, ‘the’","grammar/a1-a2-grammar/articles-a-an-the"],
  ["GA09","Articles: ‘the’ or no article","grammar/a1-a2-grammar/articles-the-or-no-article"],
  ["GA10","Possessive ’s","grammar/a1-a2/possessive-s"],
  ["GA11","Prepositions of place: ‘in’, ‘on’, ‘at’","grammar/a1-a2/prepositions-place"],
  ["GA12","Prepositions of time: ‘at’, ‘in’, ‘on’","grammar/a1-a2-grammar/prepositions-of-time-at-in-on"],
  ["GA13","Past continuous and past simple","grammar/a1-a2/past-continuous-past-simple"],
  ["GA14","Comparative adjectives","grammar/a1-a2/comparative-adjectives"],
  ["GA15","Adjectives ending in ‘-ed’ and ‘-ing’","grammar/a1-a2/adjectives-ending-ed-ing"],
  ["GA16","Adjectives and prepositions","grammar/a1-a2/adjectives-prepositions"],
  ["GA17","Verbs followed by ‘-ing’ or infinitive","grammar/a1-a2/verbs-followed-ing-or-infinitive"],
  ["GA18","Infinitive of purpose","grammar/a1-a2/infinitive-purpose"]
]);
lessons("gram","B1","gb","",[
  ["GB01","Present perfect","grammar/b1-b2/present-perfect"],
  ["GB02","Present perfect: ‘just’, ‘yet’, ‘still’ and ‘already’","grammar/b1-b2/present-perfect-just-yet-still-already"],
  ["GB03","Future forms: ‘will’, ‘be going to’ and present continuous","grammar/b1-b2/future-forms-will-be-going-present-continuous"],
  ["GB04","Stative verbs","grammar/b1-b2/stative-verbs"],
  ["GB05","Past habits: ‘used to’, ‘would’ and the past simple","grammar/b1-b2-grammar/past-habits-used-to-would-past-simple"],
  ["GB06","Conditionals: zero, first and second","grammar/b1-b2/conditionals-zero-first-second"],
  ["GB07","Modals: permission and obligation","grammar/b1-b2/modals-permission-obligation"],
  ["GB08","Modals: deductions about the present","grammar/b1-b2/modals-deductions-about-present"],
  ["GB09","Past perfect","grammar/b1-b2/past-perfect"],
  ["GB10","Passives","grammar/b1-b2/passives"],
  ["GB11","Relative clauses: defining relative clauses","grammar/b1-b2/relative-clauses-defining-relative-clauses"],
  ["GB12","Reported speech: statements","grammar/b1-b2/reported-speech-statements"],
  ["GB13","Reported speech: questions","grammar/b1-b2/reported-speech-questions"],
  ["GB14","Verbs and prepositions","grammar/b1-b2/verbs-prepositions"],
  ["GB15","Phrasal verbs","grammar/b1-b2/phrasal-verbs"],
  ["GB16","Reflexive pronouns","grammar/b1-b2/reflexive-pronouns"],
  ["GB17","Modifying comparatives","grammar/b1-b2/modifying-comparatives"],
  ["GB18","Using ‘enough’","grammar/b1-b2/using-enough"],
  ["GB19","Intensifiers: ‘so’ and ‘such’","grammar/b1-b2/intensifiers-so-such"],
  ["GB20","Past ability","grammar/b1-b2/past-ability"],
  ["GB21","Capital letters and apostrophes","grammar/b1-b2/capital-letters-apostrophes"]
]);
lessons("gram","B2","gb","",[
  ["GB22","Present perfect simple and continuous","grammar/b1-b2/present-perfect-simple-continuous"],
  ["GB23","Future continuous and future perfect","grammar/b1-b2/future-continuous-future-perfect"],
  ["GB24","The future: degrees of certainty","grammar/b1-b2/future-degrees-certainty"],
  ["GB25","Conditionals: third and mixed","grammar/b1-b2/conditionals-third-mixed"],
  ["GB26","Wishes: ‘wish’ and ‘if only’","grammar/b1-b2/wishes-wish-if-only"],
  ["GB27","Modals: deductions about the past","grammar/b1-b2/modals-deductions-about-past"],
  ["GB28","Relative clauses: non-defining relative clauses","grammar/b1-b2/relative-clauses-non-defining-relative-clauses"],
  ["GB29","Reported speech: reporting verbs","grammar/b1-b2/reported-speech-reporting-verbs"],
  ["GB30","Different uses of ‘used to’","grammar/b1-b2-grammar/different-uses-of-used-to"],
  ["GB31","Verbs followed by ‘-ing’ or infinitive to change meaning","grammar/b1-b2/verbs-followed-ing-or-infinitive-change-meaning"],
  ["GB32","Contrasting ideas: ‘although’, ‘despite’ and others","grammar/b1-b2/contrasting-ideas-although-despite-others"],
  ["GB33","Adjectives: gradable and non-gradable","grammar/b1-b2/adjectives-gradable-non-gradable"],
  ["GB34","Question tags","grammar/b1-b2/question-tags"],
  ["GB35","Using ‘as’ and ‘like’","grammar/b1-b2-grammar/using-as-like"],
  ["GB36","British English and American English","grammar/b1-b2/british-english-american-english"]
]);
lessons("list","A2","la2","listening/a2/",[
  ["LA01","A morning briefing","morning-briefing"],["LA02","An invitation to a party","invitation-party"],["LA03","Changing a meeting time","changing-meeting-time"],
  ["LA04","Changing plans","changing-plans"],["LA05","Facts and figures","facts-figures"],["LA06","Four conversations","four-conversations"],
  ["LA07","Instructions for an assignment","instructions-assignment"],["LA08","Leaving a message","leaving-message"],["LA09","Missing a class","missing-class"],
  ["LA10","Transport announcements","transport-announcements"],["LA11","Understanding an explanation","understanding-explanation"],["LA12","Who’s who in the office","whos-who-office"]
]);
lessons("list","B1","lb1","listening/b1/",[
  ["LB01","A phone call from a customer","phone-call-customer"],["LB02","A student discussion","student-discussion"],["LB03","A team meeting about diversity","team-meeting-about-diversity"],
  ["LB04","A weather forecast","weather-forecast"],["LB05","An interview about listening skills","interview-about-listening-skills"],["LB06","An introduction to a lecture","introduction-lecture"],
  ["LB07","Arriving late to class","arriving-late-class"],["LB08","At the chemist","chemist"],["LB09","Chatting about a series","chatting-about-series"],
  ["LB10","Making a decision","making-decision"],["LB11","Meeting an old friend","meeting-old-friend"],["LB12","Work–life balance","work-life-balance"]
]);
lessons("list","B2","lb2","listening/b2/",[
  ["L2-01","A business interview","business-interview"],["L2-02","A design presentation","design-presentation"],["L2-03","A digital detox podcast","digital-detox-podcast"],
  ["L2-04","A lecture about an experiment","lecture-about-experiment"],["L2-05","A talk about motivation","talk-about-motivation"],["L2-06","Business news","business-news"],
  ["L2-07","Creating a study group","creating-study-group"],["L2-08","Film reviews","film-reviews"],["L2-09","Getting advice","getting-advice"],
  ["L2-10","Joining a gym","joining-gym"],["L2-11","Office party planning","office-party-planning"],["L2-12","Talking about rumours","talking-about-rumours"]
]);
lessons("read","A2","ra2","reading/a2/",[
  ["RA01","A message to a new friend","message-new-friend"],["RA02","An airport notice","airport-notice"],["RA03","An email from a friend","email-friend"],
  ["RA04","An end of term report","end-term-report"],["RA05","An infographic on the forgetting curve","infographic-forgetting-curve"],["RA06","An invitation to a job interview","invitation-job-interview"],
  ["RA07","Choosing a conference venue","choosing-conference-venue"],["RA08","English course prospectus","english-course-prospectus"],["RA09","Professional profile summaries","professional-profile-summaries"],
  ["RA10","Study skills tips","study-skills-tips"]
]);
lessons("read","B1","rb1","reading/b1/",[
  ["RB01","A conference programme","conference-programme"],["RB02","A flyer for a gym","flyer-gym"],["RB03","A travel guide","travel-guide"],
  ["RB04","An email request for help","email-request-help"],["RB05","Digital habits across generations","digital-habits-across-generations"],["RB06","Encyclopedia entry","encyclopedia-entry"],
  ["RB07","How to spot fake news","how-spot-fake-news"],["RB08","Innovation in business","innovation-business"],["RB09","Planning an event","planning-event"],
  ["RB10","Robot teachers","robot-teachers"],["RB11","Social media influencers","social-media-influencers"],["RB12","The legend of fairies","legend-fairies"],
  ["RB13","The Martian: a book review","martian-book-review"]
]);
lessons("read","B2","rb2","reading/b2/",[
  ["R2-01","A Plastic Ocean: a film review","plastic-ocean-film-review"],["R2-02","A short story extract","short-story-extract"],["R2-03","An email from a friend","email-friend"],
  ["R2-04","Asteroids","asteroids"],["R2-05","Cultural expectations and leadership","cultural-expectations-leadership"],["R2-06","Instant messages","instant-messages"],
  ["R2-07","Millennials in the workplace","millennials-workplace"],["R2-08","Star Wars and the hero myth","star-wars-hero-myth"],["R2-09","The Buy Nothing movement","buy-nothing-movement"],
  ["R2-10","The sharing economy","sharing-economy"],["R2-11","Why bridges collapse",""]
]);
lessons("writ","A2","wa2","writing/a2/",[
  ["WA01","A personal profile","personal-profile"],["WA02","An accommodation form","accommodation-form"],["WA03","An email about a business event","email-about-business-event"],
  ["WA04","An email cover letter","email-cover-letter"],["WA05","An email explaining a problem","email-explaining-problem"],["WA06","An email to ask a colleague to do something","email-ask-colleague-do-something"],
  ["WA07","An expression of interest","expression-interest"],["WA08","An online discussion forum","online-discussion-forum"],["WA09","Instructions for a colleague","instructions-colleague"],
  ["WA10","Messaging to cancel a plan","messaging-cancel-plan"],["WA11","Messaging to make plans","messaging-make-plans"],["WA12","My last holiday","my-last-holiday"]
]);
lessons("writ","B1","wb1","writing/b1/",[
  ["WB01","A class forum","class-forum"],["WB02","A professional profile","professional-profile"],["WB03","A report on a student meeting","report-student-meeting"],
  ["WB04","A restaurant review","restaurant-review"],["WB05","A thank-you message","thank-you-message"],["WB06","An email giving holiday advice","email-giving-holiday-advice"],
  ["WB07","An email to explain an accommodation problem","email-explain-accommodation-problem"],["WB08","An email to invite someone to a job interview","email-invite-someone-job-interview"],
  ["WB09","Describing a bar chart","describing-bar-chart"],["WB10","Describing charts","describing-charts"],["WB11","New Year’s resolutions","new-years-resolutions"],
  ["WB12","Reflective writing","reflective-writing"]
]);
lessons("writ","B2","wb2","writing/b2/",[
  ["W2-01","A covering email","covering-email"],["W2-02","A CV","cv"],["W2-03","A letter of complaint","letter-complaint"],
  ["W2-04","A report on working abroad","report-working-abroad"],["W2-05","A summary of a line graph","summary-line-graph"],["W2-06","An advert","advert"],
  ["W2-07","An email to request time off","email-request-time"],["W2-08","An email to your professor","email-your-professor"],["W2-09","An informal email to a friend","informal-email-friend"],
  ["W2-10","An opinion essay","opinion-essay"],["W2-11","Comparing two charts","comparing-two-charts"],["W2-12","Giving instructions by email","giving-instructions-email"]
]);
lessons("speak","A2","sa2","speaking/a2/",[
  ["SA01","Apologising","apologising"],["SA02","Giving instructions","giving-instructions"],["SA03","Showing interest","showing-interest"],
  ["SA04","Talking about personal interests","talking-about-personal-interests"],["SA05","Talking about your job","talking-about-your-job"]
]);
lessons("speak","B1","sb1","speaking/b1/",[
  ["SB01","Agreeing and disagreeing","agreeing-disagreeing"],["SB02","Asking a favour","asking-favour"],["SB03","Keeping a conversation going","keeping-conversation-going"],
  ["SB04","Meeting face-to-face","meeting-face-face"],["SB05","Responding to news","responding-news"]
]);
lessons("speak","B2","sb2","speaking/b2/",[
  ["S2-01","Challenging someone’s ideas","challenging-someones-ideas"],["S2-02","Dealing with a problem","dealing-problem"],["S2-03","Discussing advantages and disadvantages","discussing-advantages-disadvantages"],
  ["S2-04","Giving advice","giving-advice"],["S2-05","Persuading someone to do something","persuading-someone-do-something"]
]);

const idsOf = s => Object.keys(LESSONS).filter(k => LESSONS[k].s === s);
export const GRAM_IDS = idsOf("gram");
export const GA_IDS = GRAM_IDS.filter(k => k.indexOf("GA") === 0);
export const GB1_IDS = GRAM_IDS.filter(k => LESSONS[k].lvl === "B1");
export const GB2_IDS = GRAM_IDS.filter(k => LESSONS[k].lvl === "B2");
export const SKILL_IDS = Object.keys(LESSONS).filter(k => LESSONS[k].s !== "gram");
