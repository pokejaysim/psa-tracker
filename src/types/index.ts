export type ServiceLevel =
  | "value_bulk"
  | "value"
  | "value_plus"
  | "value_max"
  | "regular"
  | "express"
  | "super_express"
  | "walk_through";

export type SubmissionStatus =
  | "preparing"
  | "submitted"
  | "arrived"
  | "research_id"
  | "grading"
  | "assembly"
  | "grades_ready"
  | "qa_checks"
  | "processing"
  | "shipped"
  | "delivered";

export interface Submission {
  id: string;
  orderNumber: string;
  submissionNumber: string | null;
  serviceLevel: ServiceLevel;
  status: SubmissionStatus;
  submittedDate: string;
  receivedDate: string | null;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  shipTrackingNumber: string | null;
  shipCarrier: string | null;
  totalCards: number;
  totalDeclaredValue: number;
  notes: string;
  lastApiSync: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  submissionId: string;
  certNumber: string | null;
  lineNumber: number;
  year: string;
  brand: string;
  cardNumber: string;
  subject: string;
  variety: string;
  category: string;
  grade: string | null;
  gradeDescription: string | null;
  declaredValue: number;
  purchasePrice: number | null;
  estimatedGradedValue: number | null;
  frontImageUrl: string | null;
  notes: string;
  lastApiSync: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionWithCards extends Submission {
  cards: Card[];
}

export interface DashboardStats {
  totalSubmissions: number;
  totalCards: number;
  activeSubmissions: number;
  cardsGrading: number;
  averageGrade: number | null;
  gradeDistribution: { grade: string; count: number }[];
  statusCounts: { status: SubmissionStatus; count: number }[];
}

// PSA API types
export interface PSAOrderProgress {
  orderNumber: string;
  orderProgressSteps: PSAOrderProgressStep[];
  gradesReady: boolean;
  shipped: boolean;
  shipTrackingNumber: string | null;
  shipCarrier: string | null;
}

export interface PSAOrderProgressStep {
  step: number;
  description: string;
  completed: boolean;
  completedDate: string | null;
}

export interface PSACertResult {
  CertNumber: string;
  Brand: string;
  Year: string;
  CardNumber: string;
  Subject: string;
  Category: string;
  Variety: string;
  CardGrade: string;
  GradeDescription: string;
  TotalPopulation: number;
  PopulationHigher: number;
  IsDualCert: boolean;
  PSAImageFrontURL: string | null;
  PSAImageBackURL: string | null;
}

export interface PSAAuthToken {
  token: string;
  expiresAt: number;
}

export interface CreateSubmissionInput {
  orderNumber: string;
  submissionNumber?: string;
  serviceLevel: ServiceLevel;
  status?: SubmissionStatus;
  submittedDate: string;
  receivedDate?: string;
  expectedReturnDate?: string;
  totalCards?: number;
  totalDeclaredValue?: number;
  notes?: string;
}

export interface CreateCardInput {
  submissionId: string;
  certNumber?: string;
  lineNumber: number;
  year: string;
  brand: string;
  cardNumber: string;
  subject: string;
  variety?: string;
  category?: string;
  declaredValue?: number;
  purchasePrice?: number;
  estimatedGradedValue?: number;
  notes?: string;
}
