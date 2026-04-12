// models/Module.ts
export interface Module {
  moduleId: string; // Auto-generated unique ID
  trainerId: string; // UID of the trainer who created it
  trainerName?: string; // Trainer's name for display
  
  // Basic Information
  moduleTitle: string;
  description: string;
  category: string;

  /** Admin warm-up / cool-down entries (not a technique category). Omitted for normal modules. */
  moduleSegment?: 'warmup' | 'cooldown';
  
  // Introduction (text or video)
  introductionType: 'text' | 'video';
  introduction?: string; // Text introduction
  introductionVideoUrl?: string; // Video URL if introductionType is 'video'
  
  // Technique Video
  techniqueVideoUrl?: string; // Uploaded video URL
  /** Legacy / alternate uploaded video field from database */
  techniqueVideoUrl2?: string;
  techniqueVideoLink?: string; // External video link
  videoDuration?: number; // Duration in seconds
  
  // Thumbnail
  thumbnailUrl?: string;

  // Reference guide (single image or GIF for user guidance)
  referenceGuideUrl?: string;
  
  // AI Training Specifications
  intensityLevel: number; // 1-5
  spaceRequirements: string[]; // Selected space requirements
  physicalDemandTags: string[]; // Selected physical demand tags
  repRange?: string; // e.g. "4-6", "8-10", "12", "15"
  trainingDurationSeconds?: number; // e.g. 30, 60, 120, ... 900 (15 min)
  
  // Difficulty Level
  difficultyLevel?: 'basic' | 'intermediate' | 'advanced';

  /** Technique camera stance (admin). Used for pose / display consistency. */
  stancePosition?: 'front view' | 'side view' | null;
  
  // Status & Metadata
  status: 'draft' | 'pending review' | 'approved' | 'rejected' | 'disabled';
  /** Display order for approved modules (lower = first). Used in admin active-modules list. */
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date; // When submitted for review
  reviewedAt?: Date; // When reviewed by admin
  reviewedBy?: string; // Admin UID who reviewed
  
  // Certification
  certificationChecked: boolean; // Trainer certified the technique
  
  // Rejection reason (if rejected)
  rejectionReason?: string;
}
