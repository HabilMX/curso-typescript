import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "No insertes HTML sin sanitizar: usa texto como hijo de JSX.",
      },
      {
        selector: "AssignmentExpression[left.property.name='innerHTML']",
        message: "No asignes innerHTML: usa textContent o un componente de React.",
      },
    ],
  },
});
