import type { BaseRecipe, RecipeCategory } from '../types';
import recipesData from '../assets/recipes-db.json';

const recipes: BaseRecipe[] = recipesData as BaseRecipe[];

export const recipeService = {
  getAll(): BaseRecipe[] {
    return recipes;
  },

  getByCategory(category: RecipeCategory): BaseRecipe[] {
    return recipes.filter(r => r.category === category);
  },
};
