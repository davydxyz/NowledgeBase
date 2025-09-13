export interface Category {
  id: string;
  name: string;
  path: string[];
  parent_id?: string;
  note_count: number;
  color?: string;
}

export interface CategorySuggestion {
  path: string[];
  confidence: number;
  isExisting: boolean;
}

export interface CategoriesDatabase {
  categories: Category[];
}