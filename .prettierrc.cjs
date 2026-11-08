module.exports = {
  // 控制单行最大长度，避免代码行过长。
  printWidth: 80,
  // 控制缩进宽度，这里统一使用 2 个空格。
  tabWidth: 2,
  // 语句末尾统一保留分号。
  semi: true,
  // JavaScript 和 TypeScript 字符串统一使用双引号。
  singleQuote: false,
  // 对象属性是否只在必要时加引号。
  quoteProps: "as-needed",
  // JSX 里的字符串是否使用单引号。
  jsxSingleQuote: false,
  // 多行尾部是否保留逗号。
  trailingComma: "all",
  // 对象字面量的大括号内是否保留空格。
  bracketSpacing: true,
  // 多行 HTML / JSX 标签的 `>` 是否单独换行。
  bracketSameLine: false,
  // 箭头函数只有一个参数时是否保留括号。
  arrowParens: "always",
  // 仅当文件带有 @prettier 标记时才格式化，通常关闭。
  requirePragma: false,
  // 是否在格式化后自动插入 @prettier 标记，通常关闭。
  insertPragma: false,
  // Markdown 等文本内容的换行策略，保持原样更适合文档内容。
  proseWrap: "preserve",
  // HTML 空白的敏感度，这里按 CSS 规则处理。
  htmlWhitespaceSensitivity: "css",
};
