const fs = require('fs');

const colorData = JSON.parse(fs.readFileSync('color-tokens.json', 'utf8'));
const typoData = JSON.parse(fs.readFileSync('design-tokens.tokens (2).json', 'utf8'));

let cssContent = `/* Auto-generated CSS variables from design tokens */\n\n`;

// Helper to resolve references like "{color.palette.primary.100}"
function resolveReference(ref, data) {
    if (typeof ref === 'string' && ref.startsWith('{') && ref.endsWith('}')) {
        const path = ref.slice(1, -1).split('.');
        let current = data;
        for (const key of path) {
            if (current[key] !== undefined) {
                current = current[key];
            } else {
                return ref;
            }
        }
        return resolveReference(current, data);
    }
    return ref;
}

// Process color roles
const lightRoles = colorData.color.role.light;
const darkRoles = colorData.color.role.dark;

function formatColorCSS(roles, data) {
    let css = '';
    for (const [key, value] of Object.entries(roles)) {
        const resolvedValue = resolveReference(value, data);
        const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        css += `  ${cssVarName}: ${resolvedValue};\n`;
    }
    return css;
}

cssContent += `:root {\n`;
cssContent += `  /* Light Color Roles */\n`;
cssContent += formatColorCSS(lightRoles, colorData);

// Process typography
cssContent += `\n  /* Typography Tokens */\n`;
const fontData = typoData.font;

function processTypography(categoryData, prefix) {
    let css = '';
    for (const [key, value] of Object.entries(categoryData)) {
        if (value.value) {
            // It's a font style object
            const style = value.value;
            const name = key.replace(/\s+/g, '-').toLowerCase();
            for (const [prop, val] of Object.entries(style)) {
                const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                let cssValue = val;
                if (typeof val === 'number' && ['fontSize', 'lineHeight', 'letterSpacing', 'paragraphIndent', 'paragraphSpacing'].includes(prop)) {
                    cssValue = val + 'px';
                }
                if (prop === 'fontFamily') {
                    cssValue = `"${val}"`;
                }
                css += `  --${name}-${cssProp}: ${cssValue};\n`;
            }
        } else {
             // nested
             css += processTypography(value, prefix);
        }
    }
    return css;
}

cssContent += processTypography(fontData, '');
cssContent += `}\n\n`;

// Dark mode
cssContent += `@media (prefers-color-scheme: dark) {\n`;
cssContent += `  :root {\n`;
cssContent += `    /* Dark Color Roles */\n`;
cssContent += formatColorCSS(darkRoles, colorData);
cssContent += `  }\n`;
cssContent += `}\n`;

fs.writeFileSync('variables.css', cssContent);
console.log('Successfully generated variables.css');
