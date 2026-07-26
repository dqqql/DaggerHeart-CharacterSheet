export type RhodesIslandRelationshipPrompts = {
  backgroundQuestions: readonly string[]
  relationships: readonly string[]
}

export const RHODES_ISLAND_RELATIONSHIP_PROMPTS: Record<string, RhodesIslandRelationshipPrompts> = {
  辅助: {
    backgroundQuestions: [
      "你通过什么样的方式为你的队友提供支援？",
      "你是出于什么原因而加入罗德岛的？",
      "你认为对于辅助职能而言，最重要的是什么？",
    ],
    relationships: [
      "你曾在一场模拟战斗中得到了我的支援，那一次你对我留下了怎样的印象？",
      "我上次帮助你的时候，你为什么沉默寡言的？",
      "我们上次一起出任务的时候，你为什么希望让我去帮助那个孩子？",
    ],
  },
  近卫: {
    backgroundQuestions: [
      "你通过怎样的方式磨砺或取得了足以参与战斗的力量？",
      "你通过什么来判断你面对的敌人强度？",
      "你认为对于近卫职能而言，最重要的是什么？",
    ],
    relationships: [
      "我曾和你一不小心弄坏了训练场中的某样东西，我们最后是怎么解决这个问题的？",
      "我曾在一次和敌人的战斗中身受重伤，你那时是怎么救下我的？",
      "我们上次在食堂聊了些有关故乡的事情，我口中的故乡给你留下了怎样的印象？",
    ],
  },
  狙击: {
    backgroundQuestions: [
      "你的武器对你而言有怎样的意义？",
      "你通过什么来判断最适合你发起攻击的位置？",
      "你认为对于狙击职能而言，最重要的是什么？",
    ],
    relationships: [
      "你曾经旁观过我的一次模拟战斗，那一次你对我留下了怎样的印象？",
      "我们曾在一次任务中发生过争执，争执的原因是什么，我们最后是如何解决的？",
      "你为什么总想知道我的过往？",
    ],
  },
  术师: {
    backgroundQuestions: [
      "你是如何运用你的施术单元进行施法的？",
      "在你的理解中，你的法术在空间中展现的性质是怎样的？",
      "你认为对于术师职能而言，最重要的是什么？",
    ],
    relationships: [
      "你第一次见到我施展法术是在什么时候，那时给你留下了怎样的印象？",
      "你上一次帮我修好施术单元是什么时候，那次我们是怎么修好它的？",
      "你为什么总是跟我在罗德岛舰船上“偶然”遭遇？",
    ],
  },
  特种: {
    backgroundQuestions: [
      "你过往的人生中，最重要的一次经历是怎样的？",
      "你在战场中以何种方式收集情报并验证情报可信度？",
      "你认为对于特种职能而言，最重要的是什么？",
    ],
    relationships: [
      "我曾在一次模拟战斗中和你一同取得了胜利，那次你对我留下了怎样的印象？",
      "你为何在上次任务中对我的独自侦察表达了担忧？",
      "我们上次在训练室的“比赛”内容是怎样的，谁取得了胜利？",
    ],
  },
  先锋: {
    backgroundQuestions: [
      "你因什么原因而总是主动选择冲在队伍的最前方？",
      "你通过什么来判断敌人阵线最薄弱的位置？",
      "你认为对于先锋职能而言，最重要的是什么？",
    ],
    relationships: [
      "我曾与你一起参与过一场测试战斗，那一次你对我留下了怎样的印象？",
      "我曾深陷敌人围困之中，你那时做了什么帮助我脱离困境？",
      "你为什么总想和我在训练场上较量一番？",
    ],
  },
  重装: {
    backgroundQuestions: [
      "你为何想要成为抵御敌人威胁的“盾”？",
      "你通过什么来判断你是否还能维持在阵线上？",
      "你认为对于重装职能而言，最重要的是什么？",
    ],
    relationships: [
      "我们曾在训练场上作为临时小队进行训练，那一次你对我的印象如何？",
      "我曾冒险突破阵线将你护至身后，那是怎样的一场战斗，我们最后胜利了吗？",
      "我们曾尝试交换武器原型进行练习，你觉得我的武器带给你怎样的感觉？",
    ],
  },
}

export function getRhodesIslandRelationshipPrompts(
  professionName?: string,
): RhodesIslandRelationshipPrompts | undefined {
  if (!professionName) return undefined
  return RHODES_ISLAND_RELATIONSHIP_PROMPTS[professionName.trim()]
}
