// models/TrainerApplication.ts
export interface TrainerApplication {
  uid: string;
  // Basic Info
  fullLegalName: string;
  professionalAlias?: string;
  email: string;
  academyName?: string;
  appliedDate: Date;
  status: 'awaiting review' | 'approved' | 'rejected';
  
  // Personal Information
  dateOfBirth: string;
  phone: string;
  physicalAddress: string;
  
  // Credentials & Certifications
  defenseStyles: string[]; // Selected martial arts
  yearsOfExperience: string;
  yearsOfTeaching: string;
  currentRank?: string;
  aboutMe?: string;
  
  // Social Media Links
  facebookLink?: string;
  instagramLink?: string;
  otherLink?: string;
  
  // Uploaded Files
  uploadedFiles: {
    name: string;
    uri: string;
    type: string;
    size: number;
  }[];
  
  // Background Questions
  credentialsRevoked: string | null; // 'yes' | 'no' | null
  credentialsRevokedExplanation?: string;
  felonyConviction: string | null; // 'yes' | 'no' | null
  felonyExplanation?: string;
  
  // Certifications
  certifyAccurate: boolean;
  agreeConduct: boolean;
}
