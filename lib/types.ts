export type Category =
  | "OC" | "EWS" | "SC1" | "SC2" | "SC3" | "ST"
  | "BCA" | "BCB" | "BCC" | "BCD" | "BCE";

export type Gender = "M" | "F";
export type LocalArea = "AU" | "SVU" | "NL";

export interface Profile {
  rank: number;
  category: Category;
  gender: Gender;
  localArea: LocalArea;
  branches: string[];
  budgetMax: number;
  homeDistrict: string | null;
  hostel: boolean;
  weights: { cost: number; branch: number; proximity: number; accreditation: number };
}

export interface ShortlistItem {
  inst_code: string;
  name: string;
  district: string;
  district_code: string;
  type: string;
  branch_code: string;
  branch_name: string;
  fee: number | null;
  band_min: number | null;
  band_max: number | null;
  nba_valid_to: string | null;
  naac_grade: string | null;
  utility: number;
  contribution: Record<string, number>;
  verdict: "safe" | "borderline" | "reach";
  unstable: boolean;
}

export interface ClaimCheck {
  claim_text: string;
  claim_type: "fee" | "accreditation" | "cutoff" | "guarantee" | "college" | "other";
  inst_code: string | null;
  branch_code: string | null;
  verdict: "verified" | "not_verified" | "contradicted" | "flagged" | "not_found";
  actual: string | null;
  source: string | null;
  source_id: number | null;
  note: string | null;
}

export interface AuditReport {
  claims: ClaimCheck[];
  audit: {
    budget_violations: { inst_code: string; name: string; fee: number | null; budget: number }[];
    omissions: { inst_code: string; name: string; branch_code: string; fee: number | null; band_high: number | null }[];
    guarantee_flags: string[];
  };
  shortlist: ShortlistItem[];
  data_version: string;
  generated_at: string;
}

export const DATA_VERSION = "ap-eapcet-2025-26.v1";
