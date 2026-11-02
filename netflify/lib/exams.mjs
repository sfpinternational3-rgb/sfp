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
  // Add the other courses the same way, for example:
  // qms: [ { q: "...", options: ["...", "...", "...", "..."], answer: 0 } ],
};
