export type Opening = {
  id: string;
  type: string;
  ref: string;
  width: string;
  height: string;
  pose: string;
  quantity: string;
  colorRal: string;
  notes: string;
  photos: string[];
};

export type Room = {
  id: string;
  name: string;
  notes: string;
  openings: Opening[];
};

export type Site = {
  id: string;
  author: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  siteType: string;
  workType: string;
  followUpStatus: string;
  poseDate: string;
  reminder1: string;
  reminder2: string;
  generalNotes: string;
  generalPhotos: string[];
  rooms: Room[];
  updatedAt: string;
};
