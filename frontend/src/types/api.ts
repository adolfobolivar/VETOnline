/** Mirrors backend/app/schemas/*.py — only the shapes the screens built so far actually use. */

export interface OwnerCreate {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  telephone: string;
}

export interface OwnerOut {
  id: number;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  telephone: string;
}

export interface PetCreate {
  name: string;
  birth_date: string; // ISO yyyy-mm-dd
  pet_type_id: number;
}

export interface PetOut {
  id: number;
  name: string;
  birth_date: string;
  owner_id: number;
  pet_type_id: number;
}

export interface PetTypeOut {
  id: number;
  name: string;
}

export interface PetSummary {
  id: number;
  name: string;
}

export interface OwnerListOut {
  id: number;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  telephone: string;
  pets: PetSummary[];
}

export interface VisitOut {
  id: number;
  visit_date: string;
  description: string;
}

export interface PetDetailOut {
  id: number;
  name: string;
  birth_date: string;
  pet_type: string;
  visits: VisitOut[];
}

export interface OwnerDetailOut {
  id: number;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  telephone: string;
  pets: PetDetailOut[];
}

export interface PetUpdate {
  name: string;
  birth_date: string;
  pet_type_id?: number;
}

export interface VisitCreate {
  visit_date: string;
  description: string;
}
