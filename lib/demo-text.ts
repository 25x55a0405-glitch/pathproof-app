import type { Profile } from "./types";

export const DEMO_PROFILE: Profile = {
  rank: 48000,
  category: "OC",
  gender: "M",
  localArea: "AU",
  branches: ["CSE", "CSM", "INF"],
  budgetMax: 80000,
  homeDistrict: "EG",
  hostel: false,
  weights: { cost: 0.8, branch: 1, proximity: 0.4, accreditation: 0.6 },
};

export const DEMO_TEXT = `Congratulations! Based on your rank I have shortlisted the best CSE options for you:

1. PRASAD V POTLURI SIDDHARTHA INSTT OF TECHNOLOGY, Vijayawada - CSE, fee Rs.1,05,000 per year, 100% placement guaranteed
2. ADITYA COLLEGE OF ENGINEERING - CSE, NBA accredited, guaranteed admission this phase
3. VIJAYAM INSTITUTE OF TECHNOLOGY, Chittoor - fee Rs.85,000 per year
4. KAKINADA INSTITUTE OF ENGG. AND TECHNOLOGY - CSE, NBA accredited
5. SASI INSTITUTE OF TECHNOLOGY AND ENGINEERING - fee Rs.72,000

Pay the registration amount of Rs.25,000 today to block your seat. Offer closes tomorrow.`;
