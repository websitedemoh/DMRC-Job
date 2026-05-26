export const SITE_DISCLAIMER =
  "This is an unofficial information/demo website. We are not affiliated with Delhi Metro Rail Corporation Limited. Candidates must verify all details through the official DMRC website.";

export const OFFICIAL_DMRC_URL = "https://www.delhimetrorail.com/";

export const applicationFees = {
  GEN: 400,
  OBC: 350,
  SC: 250,
  ST: 250
} as const;

export type CandidateCategory = keyof typeof applicationFees;

export const categoryLabels: Record<CandidateCategory, string> = {
  GEN: "General",
  OBC: "OBC",
  SC: "SC",
  ST: "ST"
};

export const vacancyRows = [
  {
    postName: "Junior Grade",
    posts: 86,
    eligibility: "ITI or Graduation with 60% marks."
  },
  {
    postName: "Security Incharge",
    posts: 281,
    eligibility: "Class 10+2 with 50% marks."
  },
  {
    postName: "Station Controller / Train Operator",
    posts: 165,
    eligibility: "ITI or Class 10+2 with 60% marks."
  },
  {
    postName: "Customer Relations Assistant",
    posts: 118,
    eligibility: "Class 10+2 with 65% marks."
  },
  {
    postName: "Electrician",
    posts: 187,
    eligibility: "Class 10+2 and ITI."
  },
  {
    postName: "Maintainer Electronic Mechanic",
    posts: 241,
    eligibility: "ITI or Graduation."
  },
  {
    postName: "Office Assistant",
    posts: 93,
    eligibility: "Class 10 with 60% marks."
  },
  {
    postName: "Supervisor",
    posts: 132,
    eligibility: "Class 10+2 with 60% marks."
  },
  {
    postName: "Technician",
    posts: 180,
    eligibility: "Class 10 with 80% marks."
  }
] as const;

export const totalPosts = vacancyRows.reduce((total, row) => total + row.posts, 0);

export const jobHighlights = [
  { label: "Total posts", value: `${totalPosts} posts` },
  { label: "Application dates", value: "12 May 2026 to 11 June 2026" },
  { label: "Age limit", value: "18 to 30 years" },
  { label: "Salary range", value: "Rs 24,200 to Rs 65,400" },
  { label: "Working hours", value: "8 hours, 5 days a week" },
  { label: "Selection", value: "Merit list and document verification" }
];
