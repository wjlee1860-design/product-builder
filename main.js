document.addEventListener('DOMContentLoaded', () => {
    const htmlInput = document.getElementById('html-input');
    const cssInput = document.getElementById('css-input');
    const htmlFileInput = document.getElementById('html-file-input');
    const cssFileInput = document.getElementById('css-file-input');
    const previewFrame = document.getElementById('preview-frame');
    const convertBtn = document.getElementById('convert-btn');
    const yamlOutput = document.getElementById('yaml-output');
    const copyYamlBtn = document.getElementById('copy-yaml-btn');

    let currentHtml = '';
    let currentCss = '';

    // --- Tab Functionality ---
    const tabs = document.querySelectorAll('.tab-link');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.getElementById(tab.dataset.tab);
            
            // Deactivate all tabs and content
            document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Activate clicked tab and its content
            tab.classList.add('active');
            target.classList.add('active');
            updatePreview(); // Refresh preview when switching tabs
        });
    });

    // --- Live Preview Update ---
    const updatePreview = () => {
        const source = `
            <html>
                <head>
                    <style>${currentCss}</style>
                </head>
                <body>${currentHtml}</body>
            </html>
        `;
        previewFrame.srcdoc = source;
    };

    // --- Event Listeners for Input ---
    htmlInput.addEventListener('input', () => { 
        currentHtml = htmlInput.value; 
        updatePreview(); 
    });
    cssInput.addEventListener('input', () => { 
        currentCss = cssInput.value; 
        updatePreview(); 
    });

    htmlFileInput.addEventListener('change', async (e) => {
        if (e.target.files[0]) {
            currentHtml = await e.target.files[0].text();
            updatePreview();
        }
    });

    cssFileInput.addEventListener('change', async (e) => {
        if (e.target.files[0]) {
            currentCss = await e.target.files[0].text();
            updatePreview();
        }
    });

    // --- Conversion Logic ---
    convertBtn.addEventListener('click', () => {
        if (!currentHtml) {
            alert("Please provide some HTML content first.");
            return;
        }

        try {
            const yaml = generateYamlFromHtml(currentHtml, currentCss);
            yamlOutput.value = yaml;
            copyYamlBtn.disabled = false;
        } catch (error) {
            console.error("Error generating YAML:", error);
            yamlOutput.value = `Error: ${error.message}`;
            copyYamlBtn.disabled = true;
        }
    });

    // --- Copy Button ---
    copyYamlBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(yamlOutput.value).then(() => {
            const originalText = copyYamlBtn.textContent;
            copyYamlBtn.textContent = 'Copied!';
            setTimeout(() => { copyYamlBtn.textContent = originalText; }, 2000);
        }).catch(err => {
            console.error('Failed to copy YAML: ', err);
        });
    });
});

function generateYamlFromHtml(html, css) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;

    const styleSheet = new CSSStyleSheet();
    styleSheet.replaceSync(css);

    let yamlString = 'ComponentDefinitions:\n'; // Starting point

    // Process each top-level element in the provided HTML
    Array.from(tempContainer.children).forEach(element => {
        yamlString += processElement(element, styleSheet, 2); // Start with indentation level 2
    });

    return yamlString;
}

function processElement(element, styleSheet, indentLevel) {
    let controlName = getControlName(element);
    let controlType = getControlType(element);
    let indent = ' '.repeat(indentLevel);
    let yaml = `${indent}- ${controlName}:\n`;
    indent += '  ';

    yaml += `${indent}Control: ${controlType}\n`;
    yaml += `${indent}Properties:\n`;
    indent += '  ';

    // --- Apply Styles ---
    let styles = {};
    try {
         // Get matching CSS rules
        for (const rule of styleSheet.cssRules) {
            if (element.matches(rule.selectorText)) {
                for (const style of rule.style) {
                     styles[style] = rule.style[style];
                }
            }
        }
    } catch(e) {
        console.warn("Could not process stylesheet:", e);
    }

    // Basic properties mapping
    if (element.textContent.trim()) {
        yaml += `${indent}Text: |=\n${indent}  ="${element.textContent.trim()}"\n`;
    }
    if (styles['background-color']) {
        yaml += `${indent}Fill: =RGBA(${cssColorToRgba(styles['background-color'])})\n`;
    }
    if (styles['color']) {
        yaml += `${indent}Color: =RGBA(${cssColorToRgba(styles['color'])})\n`;
    }
    // Add more property mappings here based on styles and element attributes
    // e.g., Width, Height, Padding, Border, etc.
    if (styles['width']) yaml += `${indent}Width: =${parseInt(styles['width'])}\n`;
    if (styles['height']) yaml += `${indent}Height: =${parseInt(styles['height'])}\n`;

    // --- Children ---
    if (element.children.length > 0) {
        yaml += `${indent.substring(0, indent.length - 2)}Children:\n`;
        Array.from(element.children).forEach(child => {
            yaml += processElement(child, styleSheet, indentLevel + 4);
        });
    }

    return yaml;
}

function getControlName(element) {
    // Generate a name from ID, class, or tag
    if (element.id) {
        return element.id.charAt(0).toUpperCase() + element.id.slice(1); // Capitalize
    }
    if (element.className) {
        // Basic conversion from CSS class to a PascalCase name
        return element.className.split(' ')[0].replace(/-(\w)/g, (m, w) => w.toUpperCase());
    }
    return `${element.tagName.charAt(0)}${element.tagName.slice(1).toLowerCase()}Control`;
}

function getControlType(element) {
    // A more sophisticated mapping could be implemented here
    switch (element.tagName.toLowerCase()) {
        case 'div':
        case 'section':
        case 'header':
        case 'footer':
        case 'main':
            return 'GroupContainer@1.4.0';
        case 'button':
            return 'Button@0.0.45';
        case 'p':
        case 'span':
        case 'h1':
        case 'h2':
        case 'h3':
            return 'Label@2.5.1';
        case 'img':
            return 'Image@2.2.3';
        case 'input':
             return 'TextInput@0.0.54';
        default:
            return 'Label@2.5.1'; // Default fallback
    }
}

// Helper to convert CSS color to RGBA for Power Apps
function cssColorToRgba(colorStr) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return '0, 0, 0, 1'; 
  ctx.fillStyle = colorStr;
  const color = ctx.fillStyle; // This will be in #rrggbb or rgba() format
  if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `${r}, ${g}, ${b}, 1`;
  } 
  if (color.startsWith('rgb')) { // handles rgb() and rgba()
      return color.match(/\d+/g).join(', ');
  }
  return '0, 0, 0, 1'; // fallback
}
