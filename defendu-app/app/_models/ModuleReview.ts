// models/ModuleReview.ts
export interface ModuleReview {
  moduleId: string;
  userId: string;
  userName?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
}

export interface ModuleRatingSummary {
  averageRating: number;
  reviewCount: number;
}
