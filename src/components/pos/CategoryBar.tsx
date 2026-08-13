import { type Category } from "@/data/products";
import { cn } from "@/lib/utils";

interface CategoryBarProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

const CategoryBar = ({ categories, selected, onSelect }: CategoryBarProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pb-2 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            "flex min-w-[104px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-all sm:min-w-[120px] sm:px-5 sm:text-base",
            selected === category.id
              ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg"
              : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
          )}
        >
          <span className="text-xl">{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
