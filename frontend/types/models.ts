// Shapes returned by the backend API. Dates are ISO strings over the wire.

export type CandidateStatus =
  | "INVITED"
  | "SCHEDULED"
  | "INTERVIEWED"
  | "PASSED"
  | "REJECTED";

export interface Candidate {
  id: number;
  name: string;
  email: string;
  interviewToken: string;
  status: CandidateStatus;
  appliedAt: string;
  interviewedAt: string | null;
  campaignId: number;
}

export interface Campaign {
  id: number;
  title: string;
  role: string;
  description: string | null;
  recruiterId: number;
  createdAt: string;
  updatedAt: string;
}

// GET /api/campaigns — list items carry the candidate count.
export interface CampaignListItem extends Campaign {
  _count: { candidates: number };
}

// GET /api/campaigns/:id — detail carries the candidates.
export interface CampaignDetail extends Campaign {
  candidates: Candidate[];
}

export type ParseStatus = "PENDING" | "SUCCESS" | "FAILED";

export type DiscrepancyStatus = "supported" | "unsupported" | "contradicted" | "not_discussed";

// How the interview conversation measured up against a résumé claim.
export interface Discrepancy {
  claim: string;
  finding: string;
  status: DiscrepancyStatus;
}

export interface InterviewResult {
  id: number;
  candidateId: number;
  transcript: string;
  summary: string;
  score: number;
  strengths: string[] | null;
  concerns: string[] | null;
  discrepancies: Discrepancy[] | null;
  createdAt: string;
}

export interface ParsedResume {
  name: string;
  skills: string[];
  education: { degree: string; institution: string; year?: string | null }[];
  experience: {
    role: string;
    company: string;
    startDate?: string | null;
    endDate?: string | null;
    summary?: string | null;
  }[];
  projects: { name: string; technologies: string[]; description?: string | null }[];
  research: { title: string; description?: string | null }[];
}

// POST /api/candidates/:id/resume response.
export interface Resume {
  id: number;
  candidateId: number;
  rawFilePath: string;
  parseStatus: ParseStatus;
  parseError: string | null;
  parsedData: ParsedResume | null;
  parsedAt: string | null;
}
