/**
 * Sample JSON Generator for Handlebars Templates
 *
 * Parses Handlebars templates using AST (Abstract Syntax Tree)
 * and generates sample JSON data with realistic values using faker.js
 */

const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

// Try to import faker, fall back to simple generator if not available
let faker;
try {
  const { faker: fakerInstance } = require("@faker-js/faker");
  faker = fakerInstance;
} catch (err) {
  // Try old faker package
  try {
    faker = require("faker");
  } catch (err2) {
    console.log("faker not available, using simple data generator");
    faker = null;
  }
}

class SampleJsonGenerator {
  constructor() {
    this.extractedFields = new Set();
    this.sampleData = {};
  }

  /**
   * Generate sample JSON from template files
   * @param {string} templatePath - Path to template directory
   * @returns {object} Sample JSON object
   */
  generateSampleJson(templatePath) {
    try {
      // Reset state
      this.extractedFields = new Set();
      this.sampleData = {};

      // Template files to parse
      const templateFiles = ["main.html", "header.html", "footer.html"];

      // Parse each template file
      for (const filename of templateFiles) {
        const filePath = path.join(templatePath, filename);

        // Skip if file doesn't exist
        if (!fs.existsSync(filePath)) {
          console.log(`Template file not found: ${filename}, skipping...`);
          continue;
        }

        try {
          const templateContent = fs.readFileSync(filePath, "utf-8");
          this.parseTemplate(templateContent);
        } catch (err) {
          console.error(`Error reading ${filename}:`, err.message);
          // Continue with other files
        }
      }

      // Generate sample data for all extracted fields
      this.generateSampleData();

      return this.sampleData;
    } catch (err) {
      console.error("Error generating sample JSON:", err);
      return this.getDefaultSampleJson();
    }
  }

  /**
   * Parse Handlebars template using AST
   * @param {string} templateContent - Template content
   */
  parseTemplate(templateContent) {
    try {
      // Parse template to AST
      const ast = Handlebars.parse(templateContent);

      // Walk through AST and extract variables
      this.walkAst(ast);
    } catch (err) {
      console.error("Error parsing template:", err.message);
      // Template might have syntax errors, skip gracefully
    }
  }

  /**
   * Recursively walk through AST nodes
   * @param {object} node - AST node
   * @param {string} context - Current context path
   */
  walkAst(node, context = "") {
    if (!node) return;

    // Handle different node types
    switch (node.type) {
      case "Program":
        // Root node, process all statements
        if (node.body) {
          node.body.forEach((statement) => this.walkAst(statement, context));
        }
        break;

      case "MustacheStatement":
      case "SubExpression":
        // Variable reference: {{variable}} or {{#helper variable}}
        if (node.path && node.path.type === "PathExpression") {
          const fieldPath = this.getFieldPath(node.path);
          if (fieldPath && !this.isHelper(fieldPath)) {
            this.extractedFields.add(fieldPath);
          }
        }
        // Process parameters (for helpers with data references)
        if (node.params) {
          node.params.forEach((param) => {
            if (param.type === "PathExpression") {
              const fieldPath = this.getFieldPath(param);
              if (fieldPath) {
                this.extractedFields.add(fieldPath);
              }
            }
          });
        }
        break;

      case "BlockStatement":
        // Block helpers: {{#each items}}, {{#if condition}}, etc.
        const helperName = node.path.original;

        if (helperName === "each" && node.params && node.params[0]) {
          // Extract the array path
          const arrayPath = this.getFieldPath(node.params[0]);
          if (arrayPath) {
            this.extractedFields.add(arrayPath + "[]"); // Mark as array
          }

          // Process block content (items inside each)
          if (node.program) {
            this.walkAst(node.program, arrayPath);
          }
        } else if (helperName === "if" || helperName === "unless") {
          // Conditional blocks
          if (node.params && node.params[0]) {
            const fieldPath = this.getFieldPath(node.params[0]);
            if (fieldPath) {
              this.extractedFields.add(fieldPath);
            }
          }

          // Process both true and false branches
          if (node.program) {
            this.walkAst(node.program, context);
          }
          if (node.inverse) {
            this.walkAst(node.inverse, context);
          }
        } else {
          // Other block helpers
          if (node.program) {
            this.walkAst(node.program, context);
          }
        }
        break;

      case "PartialStatement":
        // Partials: {{> partial}}
        // Skip for now
        break;

      case "ContentStatement":
      case "CommentStatement":
        // Plain HTML or comments, skip
        break;

      default:
        // Unknown node type, try to recurse
        if (node.body) {
          if (Array.isArray(node.body)) {
            node.body.forEach((child) => this.walkAst(child, context));
          } else {
            this.walkAst(node.body, context);
          }
        }
    }
  }

  /**
   * Get field path from PathExpression node
   * @param {object} pathNode - PathExpression node
   * @returns {string|null} Field path (e.g., "user.name")
   */
  getFieldPath(pathNode) {
    if (!pathNode || pathNode.type !== "PathExpression") return null;

    // Handle "this" keyword
    if (pathNode.original === "this" || pathNode.original === ".") {
      return null; // Skip "this" references
    }

    // Get full path
    if (pathNode.parts && pathNode.parts.length > 0) {
      return pathNode.parts.join(".");
    }

    return pathNode.original;
  }

  /**
   * Check if a field is a Handlebars helper (not data)
   * @param {string} fieldPath - Field path
   * @returns {boolean} True if it's a helper
   */
  isHelper(fieldPath) {
    const helpers = [
      "if",
      "unless",
      "each",
      "with",
      "lookup",
      "log",
      "blockHelperMissing",
      "helperMissing",
    ];
    const firstPart = fieldPath.split(".")[0];
    return helpers.includes(firstPart);
  }

  /**
   * Generate sample data for all extracted fields
   */
  generateSampleData() {
    const sortedFields = Array.from(this.extractedFields).sort();

    sortedFields.forEach((fieldPath) => {
      const isArray = fieldPath.endsWith("[]");
      const cleanPath = isArray ? fieldPath.slice(0, -2) : fieldPath;
      const parts = cleanPath.split(".");

      // Generate value based on field name
      let value;
      if (isArray) {
        // Generate array with 3 sample items
        value = [
          this.generateValueForField(parts[parts.length - 1], 0),
          this.generateValueForField(parts[parts.length - 1], 1),
          this.generateValueForField(parts[parts.length - 1], 2),
        ];
      } else {
        value = this.generateValueForField(parts[parts.length - 1]);
      }

      // Set nested value in sample data
      this.setNestedValue(this.sampleData, parts, value);
    });
  }

  /**
   * Generate a sample value for a field based on its name
   * @param {string} fieldName - Field name
   * @param {number} index - Array index (for arrays)
   * @returns {any} Sample value
   */
  generateValueForField(fieldName, index = 0) {
    const name = fieldName.toLowerCase();

    // If faker is available, use it for realistic data
    if (faker) {
      // Name fields
      if (name.includes("name") && !name.includes("username")) {
        return (
          faker.person?.fullName?.() || faker.name?.findName?.() || "John Doe"
        );
      }
      if (name.includes("firstname") || name === "first") {
        return (
          faker.person?.firstName?.() || faker.name?.firstName?.() || "John"
        );
      }
      if (name.includes("lastname") || name === "last") {
        return faker.person?.lastName?.() || faker.name?.lastName?.() || "Doe";
      }

      // Email
      if (name.includes("email")) {
        return faker.internet?.email?.() || "user@example.com";
      }

      // Date fields
      if (
        name.includes("date") ||
        name.includes("time") ||
        name.includes("created") ||
        name.includes("updated")
      ) {
        const date = faker.date?.past?.() || new Date();
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      }

      // Phone
      if (name.includes("phone") || name.includes("mobile")) {
        return (
          faker.phone?.number?.() ||
          faker.phone?.phoneNumber?.() ||
          "+1-555-0100"
        );
      }

      // Address
      if (name.includes("address")) {
        return (
          faker.location?.streetAddress?.() ||
          faker.address?.streetAddress?.() ||
          "123 Main St"
        );
      }
      if (name.includes("city")) {
        return (
          faker.location?.city?.() || faker.address?.city?.() || "New York"
        );
      }
      if (name.includes("country")) {
        return (
          faker.location?.country?.() ||
          faker.address?.country?.() ||
          "United States"
        );
      }
      if (name.includes("zipcode") || name.includes("postal")) {
        return (
          faker.location?.zipCode?.() || faker.address?.zipCode?.() || "12345"
        );
      }

      // Company
      if (name.includes("company")) {
        return (
          faker.company?.name?.() ||
          faker.company?.companyName?.() ||
          "Acme Corp"
        );
      }

      // Price/Amount
      if (
        name.includes("price") ||
        name.includes("amount") ||
        name.includes("cost")
      ) {
        const price = faker.commerce?.price?.() || "99.99";
        return parseFloat(price);
      }

      // Title
      if (name.includes("title")) {
        const sentence = faker.lorem?.sentence?.(3) || "Sample Title";
        return sentence.replace(/\.$/, "");
      }

      // Description/Content/Text
      if (
        name.includes("description") ||
        name.includes("content") ||
        name.includes("text") ||
        name.includes("summary") ||
        name.includes("feedback") ||
        name.includes("guidance") ||
        name.includes("evidence")
      ) {
        return faker.lorem?.paragraph?.() || "Sample paragraph text content.";
      }

      // Items (generic list items)
      if (name.includes("item") || name.includes("strength")) {
        return faker.lorem?.sentence?.() || "Sample item text.";
      }

      // URL
      if (name.includes("url") || name.includes("link")) {
        return faker.internet?.url?.() || "https://example.com";
      }

      // Image
      if (name.includes("image") || name.includes("photo")) {
        return (
          faker.image?.url?.() ||
          faker.image?.imageUrl?.() ||
          "https://via.placeholder.com/300"
        );
      }

      // ID
      if (name === "id" || name.includes("_id")) {
        return (
          faker.string?.uuid?.() ||
          faker.datatype?.uuid?.() ||
          "uuid-" + Math.random().toString(36).substr(2, 9)
        );
      }

      // Boolean
      if (
        name.includes("is") ||
        name.includes("has") ||
        name.includes("active")
      ) {
        return faker.datatype?.boolean?.() || Math.random() > 0.5;
      }

      // Number
      if (
        name.includes("count") ||
        name.includes("number") ||
        name.includes("qty")
      ) {
        return (
          faker.number?.int?.({ min: 1, max: 100 }) ||
          faker.datatype?.number?.({ min: 1, max: 100 }) ||
          42
        );
      }
    }

    // Fallback to simple sample data (no faker)
    if (name.includes("name")) return `Sample Name ${index + 1}`;
    if (name.includes("email")) return `user${index + 1}@example.com`;
    if (name.includes("date")) return "2024-01-15";
    if (name.includes("phone")) return "+1 (555) 123-4567";
    if (name.includes("title")) return `Sample Title ${index + 1}`;
    if (
      name.includes("description") ||
      name.includes("text") ||
      name.includes("content") ||
      name.includes("summary") ||
      name.includes("feedback")
    ) {
      return `Sample ${fieldName} text content goes here. This is a placeholder that demonstrates the expected format.`;
    }
    if (name.includes("price") || name.includes("amount")) return 99.99;
    if (name.includes("id"))
      return `id_${Math.random().toString(36).substr(2, 9)}`;
    if (name.includes("url")) return "https://example.com";

    // Default: generic string
    return `Sample ${fieldName}`;
  }

  /**
   * Set a nested value in an object using a path
   * @param {object} obj - Target object
   * @param {string[]} path - Path parts
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = path[path.length - 1];
    current[lastKey] = value;
  }

  /**
   * Get default fallback sample JSON
   * @returns {object} Default sample JSON
   */
  getDefaultSampleJson() {
    return {
      title: "Sample Document",
      content: "This is sample content. Replace with your actual data.",
      items: ["Sample item 1", "Sample item 2", "Sample item 3"],
    };
  }

  /**
   * Get required fields from templates (for validation)
   * @param {string} templatePath - Path to template directory
   * @returns {Set<string>} Set of required field paths
   */
  getRequiredFields(templatePath) {
    try {
      // Reset state
      this.extractedFields = new Set();

      // Template files to parse
      const templateFiles = ["main.html", "header.html", "footer.html"];

      // Parse each template file
      for (const filename of templateFiles) {
        const filePath = path.join(templatePath, filename);

        // Skip if file doesn't exist
        if (!fs.existsSync(filePath)) {
          continue;
        }

        try {
          const templateContent = fs.readFileSync(filePath, "utf-8");
          this.parseTemplate(templateContent);
        } catch (err) {
          console.error(`Error reading ${filename}:`, err.message);
        }
      }

      return this.extractedFields;
    } catch (err) {
      console.error("Error getting required fields:", err);
      return new Set();
    }
  }
}

// Export singleton instance
module.exports = new SampleJsonGenerator();
