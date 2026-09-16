export function isPizzaCategoryName(categoryName: string): boolean {
  const normalized = categoryName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos, se algum dia alguém digitar "pízza"
    .toLowerCase()
    .trim()

  return normalized === "pizza" || normalized === "pizzas"
}
