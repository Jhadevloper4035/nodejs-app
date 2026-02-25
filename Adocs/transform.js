// update-products-tags.js
const fs = require("fs");
const path = require("path");

const INPUT_FILE = path.join(__dirname, "products.json");
const OUTPUT_FILE = path.join(__dirname, "products.updated.json");

function uniq(arr) {
  return [...new Set(arr)];
}

try {
  const raw = fs.readFileSync(INPUT_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!data.products || !Array.isArray(data.products)) {
    throw new Error("Invalid JSON format: expected { products: [] }");
  }

  let updatedCount = 0;

  data.products = data.products.map((p) => {
    if (p.category === "Beds") {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const nextTags = uniq([...tags, "luxury-beds"]);
      updatedCount++;
      return { ...p, tags: nextTags };
    }
    return p;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");

  console.log(`✅ Done! Updated ${updatedCount} bed products.`);
  console.log(`📄 Output written to: ${OUTPUT_FILE}`);
  
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
