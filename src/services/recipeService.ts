import type { BaseRecipe, RecipeCategory } from '../types';
import recipesData from '../assets/recipes-db.json';

const recipes: BaseRecipe[] = recipesData as BaseRecipe[];

export const recipeService = {
  getAll(): BaseRecipe[] {
    return recipes;
  },

  getById(id: string): BaseRecipe | undefined {
    return recipes.find(r => r.id === id);
  },

  getByCategory(category: RecipeCategory): BaseRecipe[] {
    return recipes.filter(r => r.category === category);
  },

  getByName(name: string): BaseRecipe | undefined {
    return recipes.find(
      r => r.name.toLowerCase() === name.toLowerCase()
    );
  },

  getRandomByCategory(category: RecipeCategory, excludeIds: string[] = []): BaseRecipe | null {
    const available = recipes.filter(
      r => r.category === category && !excludeIds.includes(r.id)
    );
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  },

  getAllIds(): string[] {
    return recipes.map(r => r.id);
  },

  getAllNames(): string[] {
    return recipes.map(r => r.name);
  },
};
