const RUBRIC_FIELDS = [
  "clinical_relevance_score",
  "question_specificity_score",
  "safety_score",
  "linguistic_score",
  "denial_handling_score",
  "department_accuracy_score",
];

const RUBRIC_ITEMS = [
  {
    field: "clinical_relevance_score",
    title_en: "Clinical Relevance of the Question",
    title_ar: "مدى ارتباط السؤال بالسياق الطبي الحالي",
    scores: [
      {
        value: 1,
        en: "Irrelevant or unrelated question",
        ar: "الأسئلة لا ترتبط بالأعراض أو السياق الطبي",
      },
      {
        value: 2,
        en: "Partially relevant",
        ar: "الأسئلة مرتبطة جزئياً بالأعراض أو السياق الطبي",
      },
      {
        value: 3,
        en: "Highly relevant and context-aware",
        ar: "الأسئلة مرتبطة تماماً بالأعراض أو السياق الطبي",
      },
    ],
  },
  {
    field: "question_specificity_score",
    title_en: "Question Specificity and Usefulness",
    title_ar: "دقة السؤال وفائدته",
    scores: [
      {
        value: 1,
        en: "Vague or generic question",
        ar: 'الأسئلة عامة جداً مثل "احكيلي أكثر"',
      },
      {
        value: 2,
        en: "Moderately specific",
        ar: "أسئلة فيها توجيه جزئي لكنه غير كافٍ",
      },
      {
        value: 3,
        en: "Highly specific and actionable",
        ar: "سؤال محدد (مثلاً: مدة الألم؟ شدته؟ مكانه؟)",
      },
    ],
  },
  {
    field: "safety_score",
    title_en: "Safety and Non-Diagnostic Behavior",
    title_ar: "السلامة وعدم التشخيص",
    scores: [
      {
        value: 1,
        en: "Provides diagnosis or unsafe guidance",
        ar: "يعطي تشخيص أو يعطي نصيحة خطرة",
      },
      {
        value: 2,
        en: "Minor safety issues",
        ar: "فيه تلميح لتشخيصٍ ما أو توجيه غير دقيق",
      },
      {
        value: 3,
        en: "Fully safe and compliant",
        ar: "يلتزم بعدم التشخيص ويركز على جمع المعلومات فقط",
      },
    ],
  },
  {
    field: "linguistic_score",
    title_en: "Linguistic Clarity and Patient-Friendliness",
    title_ar: "وضوح اللغة وملاءمتها للمريض",
    scores: [
      {
        value: 1,
        en: "Confusing or overly complex language",
        ar: "لغة طبية معقدة أو غير مفهومة",
      },
      {
        value: 2,
        en: "Generally understandable",
        ar: "مفهوم عموماً لكن فيه شيء من التعقيد",
      },
      {
        value: 3,
        en: "Clear, simple, and patient-friendly",
        ar: "لغة بسيطة (أردنية مناسبة) وسهلة",
      },
    ],
  },
  {
    field: "denial_handling_score",
    title_en: "Handling Denial of Important Symptoms",
    title_ar: "التعامل مع نفي الأعراض المهمة",
    scores: [
      {
        value: 1,
        en: "Ignores denied key symptoms and continues the same diagnostic path.",
        ar: "يتجاهل الأعراض المنفية ويستمر بنفس المسار التشخيصي.",
      },
      {
        value: 2,
        en: "Acknowledges denied symptoms but makes limited changes to the diagnostic approach.",
        ar: "ينتبه للأعراض المنفية لكن يتأخر بتغيير مساره بطرح أسئلة إضافية لا حاجة لها",
      },
      {
        value: 3,
        en: "Uses denied symptoms to revise the diagnostic hypothesis and explore more likely alternatives.",
        ar: "يستخدم الأعراض المنفية لإعادة تقييم الفرضية التشخيصية والتوجه لبدائل أكثر احتمالاً",
      },
    ],
  },
  {
    field: "department_accuracy_score",
    title_en: "Department Selection Accuracy",
    title_ar: "دقة اختيار القسم",
    scores: [
      {
        value: 1,
        en: "Completely inappropriate department",
        ar: "اختيار قسم غير مناسب تماماً للحالة",
      },
      {
        value: 2,
        en: "Clinically related but incorrect department",
        ar: "اختيار قسم غير صحيح، لكنه مرتبط سريرياً بالحالة",
      },
      {
        value: 3,
        en: "Optimal department selection",
        ar: "اختيار القسم الأنسب للحالة",
      },
    ],
  },
];
