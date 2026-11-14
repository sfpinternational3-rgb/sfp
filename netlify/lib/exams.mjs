// Courses that can be paid for, and the exam questions for each.
// This file only runs on the server (Netlify Functions), so learners
// can never see the correct answers.

export const PASS_MARK = 50; // percent

// id = the short name you use for each course page
export const COURSES = {
  qms: "Quality Management Systems",
  ems: "Environmental Management Systems",
  ohs: "Occupational Health and Safety Management System",
  ism: "Information Security Management", // TODO: confirm the full title of "ism"
  it: "IT Service Management System",
  rms: "Risk Management System",
  energy: "Energy Management System",
  fms: "Food Safety Management System",
};

// answer = the position of the correct option, starting from 0
export const EXAMS = {
  ems: [
    {
      q: "What is the main purpose of an Environmental Management System?",
      options: [
        "To increase production speed",
        "To systematically manage and improve environmental performance",
        "To replace all legal requirements",
        "To reduce staff numbers",
      ],
      answer: 1,
    },
    {
      q: "Which standard sets out requirements for an Environmental Management System?",
      options: ["ISO 9001", "ISO 14001", "ISO 45001", "ISO 50001"],
      answer: 1,
    },
    {
      q: "An environmental aspect is best described as:",
      options: [
        "A change to the environment",
        "An element of an organization's activities that can interact with the environment",
        "A government inspection",
        "A type of waste bin",
      ],
      answer: 1,
    },
  ],
  // SAMPLE exam for Food Safety Management System. Written from the module summary and
  // general food-safety knowledge: check every question against your own course PDF.
  fms: [
    {
      q: "Which three types of hazard are commonly considered in food safety?",
      options: [
        "Biological, chemical and physical",
        "Financial, legal and operational",
        "Visible, audible and tactile",
        "Seasonal, regional and local",
      ],
      answer: 0,
    },
    {
      q: "A food safety hazard is best described as:",
      options: [
        "A food item that is past its best-before date",
        "A food product that is expensive to produce",
        "A biological, chemical or physical agent in food that may cause an adverse health effect",
        "A delay in delivering food to customers",
      ],
      answer: 2,
    },
    {
      q: "Which of the following is an example of a biological hazard?",
      options: [
        "Residue from a cleaning chemical",
        "Salmonella bacteria on raw chicken",
        "A fragment of glass in a jar",
        "A metal shaving from a machine",
      ],
      answer: 1,
    },
    {
      q: "Which of the following is an example of a physical hazard?",
      options: [
        "Listeria bacteria",
        "Pesticide residue on vegetables",
        "Norovirus carried by a food handler",
        "A piece of broken glass in a food product",
      ],
      answer: 3,
    },
    {
      q: "Pesticide residue on fresh vegetables is an example of which type of hazard?",
      options: ["Chemical", "Biological", "Physical", "Financial"],
      answer: 0,
    },
    {
      q: "Which international standard specifies requirements for a food safety management system?",
      options: ["ISO 9001", "ISO 14001", "ISO 22000", "ISO 45001"],
      answer: 2,
    },
    {
      q: "What does HACCP stand for?",
      options: [
        "Health and Cleaning Control Procedures",
        "Hazard Analysis and Critical Control Points",
        "Hygiene and Customer Care Practices",
        "Handling and Cooking Control Plan",
      ],
      answer: 1,
    },
    {
      q: "What is the main benefit of a food safety management system?",
      options: [
        "It removes the need for staff training",
        "It guarantees that food will never be recalled",
        "It makes food cheaper to buy",
        "It helps an organization identify and control hazards so that the food it produces is safe to eat",
      ],
      answer: 3,
    },
    {
      q: "Which of the following is a likely consequence of poor food safety?",
      options: [
        "Foodborne illness and loss of customer trust",
        "Longer shelf life for all products",
        "Lower cleaning costs with no risks",
        "Fewer legal requirements to meet",
      ],
      answer: 0,
    },
    {
      q: "In a HACCP-based system, a critical control point (CCP) is:",
      options: [
        "The place where food is sold to customers",
        "The office where food safety records are filed",
        "A step where control can be applied to prevent, eliminate or reduce a food safety hazard to an acceptable level",
        "The last day on which a product can be sold",
      ],
      answer: 2,
    },
  ],

  // Add the other courses the same way, for example:
  // qms: [ { q: "...", options: ["...", "...", "...", "..."], answer: 0 } ],
};
