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
